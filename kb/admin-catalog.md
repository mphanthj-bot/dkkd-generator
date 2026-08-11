# Admin catalog (dual snapshot + bridge)

## Fact

- **Cutover**: `2025-07-01` (`CUTOVER_ISO` in `src/lib/adminCatalog.js`) — ĐK date **before** → catalog `v1`; **on/after** → `v2`.
- **Override**: `info.json` may set `adminCatalog: "v1"|"v2"` (read by `resolveCatalog`); GUI does **not** auto-persist it — catalog follows ĐK date via `/api/admin/catalog`.
- **Missing ĐK date** → defaults to `v2` with `warning: missing_dk_date`. **Invalid calendar date** → `error: invalid_dk_date`; API rejects save/print.
- **Offline snapshots** under `data/admin/`:
  - `v1/provinces.json` — province → district → ward (pre-reform)
  - `v2/provinces.json` — province → ward (post-reform)
  - `bridge/legacy-to-new.json` — legacy ward → new ward (reverse-indexed from open-api.vn)
- **Seed source**: [provinces.open-api.vn](https://provinces.open-api.vn); runtime is fully offline (no network during render).
- **`location_id` format** (`src/lib/locationId.js`):
  - v1: `v1:{PP}-{DDD}-{WWWWW}` (district/ward optional)
  - v2: `v2:{PP}-{WWWWW}` (ward optional)
  - Example: `v1:01-005-00166` (Hà Nội / Cầu Giấy / Dịch Vọng)
- **Signatory lookup** uses **trụ sở** `location_id` only (`src/lib/pdf.js` → `loadSignatory`). Chain: exact ward file → parent district/province → `default.json`. Filename: replace `:` with `_` (`v1:01-005` → `v1_01-005.json`) — safe on Windows.
- **Bridge** (`src/lib/adminBridge.js`): `fromLegacy({ legacyName, legacyWardCode })` returns candidate new wards; never invents codes; does not flip catalog version.

## How to

1. Refresh national snapshots (dev only, needs network):
   ```bash
   npm run seed:admin
   ```
   Updates `data/admin/v1|v2/provinces.json`, `bridge/legacy-to-new.json`, and `data/admin/README.md` timestamp.
2. Pick trụ sở in GUI (`npm start`) — cascading province/district/ward by catalog; saves `location_id` + composed `diaChi`.
3. Add a district signatory: copy `data/signatories/v1_01-005.json`, set `location_id` + ring texts; filename = sanitized id.
4. Verify cutover logic: `npm test` (`test/adminCatalog.test.js`).

## Do not

- Call open-api.vn at PDF render time — snapshots must be committed under `data/admin/`.
- Add PostgreSQL or a full national signatory roster in-repo (sample `v1_01-005.json` only).
- Use `:` in signatory JSON filenames on disk.
- Let bridge conversion change `adminCatalog` / ĐK-date-derived catalog.
- Drive signatory from `noiThuongTru` or `noiOHienTai` — only trụ sở `location_id`.
