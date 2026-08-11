# Signatory assets (Phase 3)

Local master data for stamping PDFs. No database — one default record for now.

## Layout

```
data/signatories/
  default.json              # authority + stamp ring text + signature path
  default/signature.png     # wet-ink signature (RGBA PNG, transparent bg)
  README.md
```

## Replace the signature

1. Export a transparent PNG of the officer's signature.
2. Overwrite `default/signature.png`.
3. Edit `default.json` (`signatory_name`, ring texts, authority lines) as needed.
4. Regenerate: `node src/render.js <customer>`.

The red stamp is generated in memory at render time from `stamp_ring_text` / `stamp_bottom_text` — it is never written to `output/`.

## Missing signature

If `signature.png` is absent, the PDF still gets the red stamp and title/name text.
