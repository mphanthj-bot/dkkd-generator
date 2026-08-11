# AGENTS.md

## What this is

PDF generator for Giấy chứng nhận đăng ký hộ kinh doanh (Vietnamese business registration certificate). Uses Puppeteer to render HTML→PDF because the original PDF uses subset fonts that cannot encode Vietnamese diacritical characters (ẵ, é, ễ, etc.) via `pdf_edit_engine`.

## Quick commands

```bash
npm start                              # GUI + API at http://localhost:3000
npm run list                           # List all customers
npm run generate -- nguyen_thi_phuong  # Generate PDF for one customer
npm run generate:all                   # Generate all PDFs
```

Equivalent direct calls:

```bash
node src/render.js list
node src/render.js nguyen_thi_phuong
node src/render.js all
```

## Architecture

- `src/template.html` — HTML template with `{{placeholder}}` fields + signature/stamp overlay
- `src/lib/` — Shared modules: `paths`, `slug`, `html`, `template`, `customers`, `pdf`, `stamp`, `adminCatalog`, `adminBridge`, `locationId`
- `data/admin/` — Offline v1/v2 province snapshots + legacy bridge; cutover `2025-07-01` (see `kb/admin-catalog.md`)
- `src/lib/stamp.js` — In-memory red stamp (`@napi-rs/canvas`) + load signatory assets
- `src/render.js` — Thin CLI + re-export facade over `src/lib/*`
- `src/fields.js` — Field metadata + empty-field detection (shared by API/GUI)
- `src/server.js` — Express API + static GUI (`public/`), uses `src/lib/*`
- `public/` — Local fill-in UI for missing certificate fields
- `data/signatories/` — Local signatory master (`default.json` + `default/signature.png`)
- `input/DKKD_template.pdf` — Original PDF (reference only, not used in rendering)
- `customers/_template/` — Copy this to create a new customer
- `output/<name>/DKKD_<CCCD>.pdf` — Generated output (gitignored)

### Stamping (Phase 3)

On each generate, `loadSignatory(data.location_id || 'default')` builds a red circular stamp in RAM and injects it (plus optional signature PNG) as `data:image/png;base64,...` into the HTML before Puppeteer prints. Signatory JSON is keyed by sanitized `location_id` (exact → parent → `default`). Rendered stamps are never written under `output/`. Edit `data/signatories/default.json` / `signature.png` to customize (see `data/signatories/README.md`).

### API (local)

- `GET /api/fields` — field metadata + sections
- `GET /api/customers` — list customers with empty-field counts
- `GET /api/customers/:name` — full `info.json` + `_empty`
- `PUT /api/customers/:name` — save allowed fields into `info.json`
- `POST /api/customers/:name/print` — save + render PDF, return `/output/...` URL
- `GET /api/admin/catalog` — resolve v1/v2 from ĐK date (or `adminCatalog` override)
- `GET /api/admin/provinces|districts|wards` — offline picker data by catalog
- `GET /api/admin/bridge/from-legacy` — legacy ward → new ward candidates
- `GET /api/admin/build-location-id` — build versioned `location_id` from codes

## Adding a new customer

1. `cp -r customers/_template customers/<safe_name>`
2. Edit `customers/<safe_name>/info.json` with customer data
3. Run `node src/render.js <safe_name>` (or fill via `npm start`)

Customer folder name is slugified from the name (no diacritics, lowercase, underscores).

Canonical subject field key is `chuThe` (not `ownerType`). Older files with `ownerType` still render via a read fallback.

## Knowledge base

- `kb/INDEX.md` — durable runbooks (schema, stamping, admin catalog, decisions)

## Key constraints

- `customers/*/images/*.{jpg,png,jpeg}` are gitignored — do not commit customer ID photos
- `output/` is gitignored — generated PDFs are not tracked
- Template uses `split().join()` for replacement (not regex) to avoid special-char issues
- Text values are HTML-escaped before injection; industry rows are built as HTML with escaped cell text
- Stamp/signature images are injected as in-memory data URLs only
- Puppeteer args: `--no-sandbox --disable-setuid-sandbox` required in CI/container environments
