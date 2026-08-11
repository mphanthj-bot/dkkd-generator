# Industry catalog (VSIC)

## Fact
- Level-4 codes from Hệ thống ngành kinh tế Việt Nam (Quyết định 36/2025/QĐ-TTg), parsed from public annex table (Bizcom mirror of official list). ~495 cấp-4 codes.
- Tax notes for HKD: Thông tư 40/2021/TT-BTC — mapped by VSIC code prefix → group (GTGT% + TNCN%). Not an official per-code API.
- Runtime offline: `data/industries/vsic-level4.json` + `tax-groups.json`.

## How to
- Search: `GET /api/industries?q=vải&limit=30`
- Detail: `GET /api/industries/4641`
- Refresh dump: `node scripts/seed-industries.js` (when annex source updated)

## Do not
- Call live government sites at PDF render time
- Invent tax % for unmapped codes (show “Chưa map”)
- Print tax % on the certificate PDF
