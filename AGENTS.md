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

- `src/template.html` — HTML template with `{{placeholder}}` fields
- `src/lib/` — Shared modules: `paths`, `slug`, `html`, `template`, `customers`, `pdf`
- `src/render.js` — Thin CLI + re-export facade over `src/lib/*`
- `src/fields.js` — Field metadata + empty-field detection (shared by API/GUI)
- `src/server.js` — Express API + static GUI (`public/`), uses `src/lib/*`
- `public/` — Local fill-in UI for missing certificate fields
- `input/DKKD_template.pdf` — Original PDF (reference only, not used in rendering)
- `customers/_template/` — Copy this to create a new customer
- `output/<name>/DKKD_<CCCD>.pdf` — Generated output (gitignored)

### API (local)

- `GET /api/fields` — field metadata + sections
- `GET /api/customers` — list customers with empty-field counts
- `GET /api/customers/:name` — full `info.json` + `_empty`
- `PUT /api/customers/:name` — save allowed fields into `info.json`
- `POST /api/customers/:name/print` — save + render PDF, return `/output/...` URL

## Adding a new customer

1. `cp -r customers/_template customers/<safe_name>`
2. Edit `customers/<safe_name>/info.json` with customer data
3. Run `node src/render.js <safe_name>` (or fill via `npm start`)

Customer folder name is slugified from the name (no diacritics, lowercase, underscores).

Canonical subject field key is `chuThe` (not `ownerType`). Older files with `ownerType` still render via a read fallback.

## Key constraints

- `customers/*/images/*.{jpg,png,jpeg}` are gitignored — do not commit customer ID photos
- `output/` is gitignored — generated PDFs are not tracked
- Template uses `split().join()` for replacement (not regex) to avoid special-char issues
- Text values are HTML-escaped before injection; industry rows are built as HTML with escaped cell text
- Puppeteer args: `--no-sandbox --disable-setuid-sandbox` required in CI/container environments
