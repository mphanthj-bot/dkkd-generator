# Design: New customer profile + VSIC industry picker with tax notes

**Date:** 2026-08-11  
**Status:** Approved for planning  
**Project:** dkkd-generator

## Problem

1. Creating a customer today means copying `_template` (pre-filled sample) and editing by hand — GUI has no **Thêm hồ sơ** flow that opens a true blank certificate form.
2. Section 3 (ngành, nghề) is read-only text; users need a searchable dropdown/table of official industry codes plus household-business tax rate notes (GTGT / TNCN).

There is **no official public REST API** for VSIC. Canonical source is the annex to **Quyết định 36/2025/QĐ-TTg** (effective 15/11/2025). HKD primary industry must be **cấp 4** (NĐ 168/2025). Tax percentages for HKD come from **Thông tư 40/2021/TT-BTC** by **industry group**, not per 4-digit code from a government endpoint.

## Decision

- **New profile:** GUI button creates empty `customers/<safe_name>/` with all `FIELDS` blank; open immediately.
- **Industries:** Offline snapshot under `data/industries/` (VSIC level-4 from QĐ 36) + local tax-group map (TT 40). Serve via internal `/api/industries`.
- **UI:** Combobox opens a searchable panel/table (code, name, GTGT%, TNCN%, tax group). Tax notes on GUI only — PDF stays name + code as on the blank certificate.
- Same pattern as admin catalog: seed once, runtime offline.

## New profile flow

1. Rail button **+ Thêm hồ sơ**.
2. Modal: `hoTen` and/or `tenHKD` (enough to slugify).
3. `safe_name` via existing `src/lib/slug.js` rules; reject invalid / duplicate (400).
4. Create folder: empty `info.json` with every `FIELDS` key (`industry: []`, strings `""`, no leftover sample). Optional empty `images/`.
5. Select new customer in GUI → all certificate sections show blank inputs (including ĐK date and industry editor).

## Industry data layout

```text
data/industries/
  vsic-level4.json      # [{ code, name, level: 4, ... }]
  tax-groups.json       # [{ id, label, gtgtPercent, tncnPercent, codePrefixes[] or rules }]
  README.md             # QĐ 36 / TT 40 sources, dump date
scripts/seed-industries.js   # ops: build JSON from official annex (manual/network once)
```

`src/lib/industries.js`:
- `searchIndustries(q, { limit })` — accent-insensitive
- `getIndustry(code)` — detail + resolved tax note
- `resolveTax(code)` — map to TT 40 group or `{ unknown: true }`

### Tax groups (TT 40/2021 — HKD)

Store as config (exact % as in circular), e.g.:

| Group (illustrative) | GTGT | TNCN |
|----------------------|------|------|
| Phân phối, cung cấp hàng hóa | 1% | 0.5% |
| Sản xuất, vận tải, dịch vụ gắn HH, XD có NVL | 3% | 1.5% |
| Dịch vụ, XD không bao NVL | 5% | 2% |
| Cho thuê tài sản | 5% | 5% |
| Khác | 2% | 1% |

Mapping from VSIC code → group is maintained in `tax-groups.json` (prefix / explicit lists). Unmapped → GUI warning, never invent rates.

## Industry UI (section 3)

- Replace read-only list with editor:
  - **+ Thêm ngành**
  - Per row: search opens **panel table**: Mã | Tên | GTGT% | TNCN% | Nhóm
  - Realtime filter; select fills row
  - One **Chính** primary; printable `maNganh` like `4641 (Chính)`
  - Subline note: `GTGT x% · TNCN y% (TT 40/2021)` — GUI only
  - Delete row

### `info.json` shape

```json
"industry": [
  {
    "tenNganh": "Bán buôn vải, hàng may sẵn, giày dép",
    "maNganh": "4641 (Chính)",
    "code": "4641",
    "isPrimary": true
  }
]
```

- `code`: bare VSIC level-4
- `maNganh` / `tenNganh`: what PDF template already prints
- Tax not required on disk (recompute from `code` in GUI)

Legacy rows with only `tenNganh`/`maNganh` still render; prompt re-pick if code missing from QĐ 36 set.

## HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/customers` | Create blank profile `{ hoTen?, tenHKD? }` → `{ name, ... }` |
| `GET` | `/api/industries?q=&limit=` | Search level-4 + tax summary |
| `GET` | `/api/industries/:code` | One industry + tax |

Keep existing PUT/print. Invalid create → 400.

## Modules / files

| Path | Role |
|------|------|
| `src/lib/industries.js` | Load/search/tax resolve |
| `src/lib/customers.js` (touch) | `createCustomer(safeName, blankInfo)` |
| `src/lib/slug.js` | Existing slugify |
| `src/server.js` | New routes |
| `public/app.js` (+ CSS) | New-profile modal; industry panel |
| `src/fields.js` | Ensure blank detection for empty `industry[]` |
| `data/industries/*` | Snapshots |
| `scripts/seed-industries.js` | Seed |
| `kb/industries.md` + INDEX | Agent runbook |

## Error handling

| Case | Behavior |
|------|----------|
| Duplicate / bad slug | 400 + modal message |
| Empty search | Empty table + “Không tìm thấy” |
| Legacy code not in QĐ 36 | Keep saved text; suggest re-select |
| Tax unmapped | “Chưa map thuế — kiểm tra thủ công” |
| Missing industry seed files | Fail loud on API with path hint |

## Out of scope

- Live scrape of dangkykinhdoanh.gov.vn
- Printing tax % on PDF
- Full conditional-business-license workflow
- Making already-filled ✓ fields editable (except brand-new blank profiles)
- PostgreSQL

## Verification

- Create profile → appears in list; all sections blank
- Search `4641` / `vải` → select → `industry[]` + GUI tax note
- PDF: industry table name + code only
- `npm test`; API smoke for `/api/industries` and `POST /api/customers`

## Success criteria

1. One-click blank hồ sơ covering all certificate fields.
2. Offline VSIC cấp-4 search with reputable legal source (QĐ 36 dump).
3. TT 40 tax notes on GUI when selecting ngành.
4. PDF unchanged in tax content; primary industry printable as today.
