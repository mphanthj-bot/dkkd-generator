# info.json schema

## Fact

- Customer data: `customers/<safe_name>/info.json`
- Template: `customers/_template/info.json`
- Canonical subject key: **`chuThe`** (legacy `ownerType` read-only fallback)
- Empty-field detection metadata: `src/fields.js` (`FIELDS`, `SECTIONS`, `collectEmpty`)
- Industry rows: `industry: [{ tenNganh, maNganh }]`
- Extra persisted keys (not certificate form fields): `location_id`, `adminCatalog` (`EXTRA_SAVE_KEYS` in `fields.js`)

## How to

1. Copy `_template` → new slug folder (`safe_name` = exact rules in `src/lib/slug.js`, including collapsing `__`)
2. Overwrite **all** `FIELDS` keys — template is pre-filled sample data, not an empty form. Keep `chuThe`
3. GUI (`npm start`) only writes keys present in `FIELDS` (+ extra save keys above)

## Do not

- Reintroduce `ownerType` as the write path
- Commit `customers/*/images/*`
