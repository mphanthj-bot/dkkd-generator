# Signatory assets (Phase 3)

Local master data for stamping PDFs. No database — one default record plus optional per-location files.

## Layout

```
data/signatories/
  default.json              # fallback authority + stamp ring text + signature path
  v1_01-005.json            # example district signatory (location_id v1:01-005)
  default/signature.png     # wet-ink signature (RGBA PNG, transparent bg)
  README.md
```

## Location-based signatories

`loadSignatory(location_id)` resolves a signatory JSON by `location_id` (e.g. `v1:01-005-00166`):

1. Exact ward/district file (`v1_01-005-00166.json`)
2. Parent locations (`v1_01-005.json`, then `v1_01.json`)
3. `default.json`

Filename convention: replace `:` with `_` — `v1:01-005` → `v1_01-005.json`.

## Replace the signature

1. Export a transparent PNG of the officer's signature.
2. Overwrite `default/signature.png`.
3. Edit `default.json` (`signatory_name`, ring texts, authority lines) as needed.
4. Regenerate: `node src/render.js <customer>`.

The red stamp is generated in memory at render time from `stamp_ring_text` / `stamp_bottom_text` — it is never written to `output/`.

## Missing signature

If `signature.png` is absent, the PDF still gets the red stamp and title/name text.
