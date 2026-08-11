# Stamping (Phase 3)

## Fact

- Engine: `src/lib/stamp.js` + `@napi-rs/canvas`
- Master: `data/signatories/default.json`
- Signature asset: `data/signatories/default/signature.png` (optional; wet-ink blue/black — **not** seal color)
- Red seal = phòng-level frame: double ring + outer arcs + side stars + **stacked center lines** (not quốc huy)
- Texts: `stamp_outer_top`, `stamp_outer_bottom`, `stamp_center_lines`
- Default asset: `stamp_file` → `default/stamp.png` (from `stamp.svg` via `node scripts/rasterize-stamp.js`)
- Online makers (MyStampReady/Stampdy) need paid export (~$2.5+); not wired into the repo
- Injected as in-memory `data:image/png;base64,...` before Puppeteer
- Overlay: `.stamp-overlay` (~37mm) in `src/template.html`
- Per-location JSON: `resolveSignatoryId(location_id)` — exact → parent → `default` (see [admin-catalog.md](admin-catalog.md))

## How to

1. Edit arc/center texts in `default.json` (or set `stamp_file`)
2. Replace `signature.png` if needed
3. `node src/render.js <safe_name>`

## Do not

- Write rendered stamps under `output/`
- Treat blue pen ink as the seal (seal is red)
- Expect perfect 1:1 from a skewed phone photo without a cleaned PNG
