# Industries (VSIC + TT 40)

## Fact
- Offline snapshot: `data/industries/vsic-level4.json` (~495 cấp-4 from QĐ 36/2025/QĐ-TTg) + `tax-groups.json` (TT 40/2021 HKD %).
- Lib: `src/lib/industries.js` — search / get / resolveTax. Tax notes are GUI-only; PDF prints `tenNganh` + `maNganh` only.
- New blank profile: `POST /api/customers` → `createCustomer` in `src/lib/customers.js`.

## How to
- GUI: **+ Thêm hồ sơ** → blank form; section 3 → **+ Thêm ngành** → search panel.
- API: `GET /api/industries?q=vải`, `GET /api/industries/4641`
- Validate seed: `npm run seed:industries`

## Do not
- Scrape dangkykinhdoanh.gov.vn at render time
- Invent tax % when `resolveTax` returns `unknown`
- Write tax fields into the PDF template
