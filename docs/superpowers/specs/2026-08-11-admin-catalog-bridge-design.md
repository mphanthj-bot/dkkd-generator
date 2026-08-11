# Design: Dual admin catalog + bridge (v1/v2 by registration date)

**Date:** 2026-08-11  
**Status:** Approved for planning  
**Project:** dkkd-generator (Giấy chứng nhận ĐKKD hộ kinh doanh)

## Problem

After **2025-07-01**, Vietnam’s administrative divisions changed from 63 provinces / 3 levels (Tỉnh → Quận/Huyện → Xã) to 34 provinces / 2 levels (Tỉnh → Xã). Numeric ward codes can be **reused with different meanings** across eras (e.g. code `166`: v1 = Phường Dịch Vọng, v2 = Phường Cầu Giấy).

The certificate needs:

1. Address text normalized for the era of the document (`diaChi`, `noiThuongTru`, `noiOHienTai`).
2. Issuing authority + stamp + signatory title/name mapped from the **business headquarters** locality (not residence alone).
3. Support for **both** eras and **convert** between them when users paste legacy or new names.

National division APIs do **not** return trưởng/phó phòng names; that stays in local signatory master data.

## Decision

Keep **two offline snapshots** + a **bridge table**, and select catalog from registration date (`ngayDK` / `thangDK` / `namDK`). Optional override `adminCatalog` for transitional prints.

Canonical HTTP reference for seeding (not required at print time):

- Pre-cutover: `https://provinces.open-api.vn/api/v1/`
- Post-cutover: `https://provinces.open-api.vn/api/v2/`
- Bridge: `/api/v2/w/from-legacy/`, `/api/v2/w/{code}/to-legacies/`

Legal source of codes: Quyết định 19/2025/QĐ-TTg (and prior GSO catalogs for v1). GSO SOAP alone is not relied on for the 34-province set.

## Cutover rule

```text
CUTOVER = 2025-07-01

effectiveDate = date(namDK, thangDK, ngayDK)

effectiveDate <  CUTOVER  →  catalog = "v1"
effectiveDate >= CUTOVER  →  catalog = "v2"
```

- Missing date parts → default **v2** + GUI warning.
- Invalid date → reject save/print.
- Optional `info.json` field: `"adminCatalog": "v1" | "v2"` overrides auto selection (transitional header/stamp cases).

## Data layout

```text
data/admin/
  v1/provinces.json          # 63 provinces + districts + wards
  v2/provinces.json          # 34 provinces + wards
  bridge/legacy-to-new.json  # dump of from-legacy / to-legacies mappings
  README.md                  # source URL, dump date, license notes
```

Runtime reads local files only. Refresh via a small seed script calling open-api.vn (manual/ops, not per PDF).

## `location_id`

Always version-prefixed:

| Catalog | Form | Example |
|--------|------|---------|
| v1 | `v1:{province}-{district}-{ward}` | `v1:01-005-00166` |
| v2 | `v2:{province}-{ward}` | `v2:01-00166` |

Zero-pad consistently (province 2 digits, district 3, ward 5) in the string form.

Never store a bare numeric ward code without catalog.

## Address fields vs signatory

| Field | Normalize names to active catalog | Drives signatory / header / stamp |
|-------|-----------------------------------|-----------------------------------|
| `diaChi` (trụ sở) | Yes (keep house/street free text) | **Yes** → `location_id` |
| `noiThuongTru` | Yes | No |
| `noiOHienTai` | Yes | No |

Observed on real blank (Apr 2026 sample): address lines may already be 2-level while header/stamp still say `UBND QUẬN …`. Treat **division catalog** and **authority naming** as related but not identical; override + signatory records cover transitional wording.

## GUI / fill flow

1. User enters `ngayDK` / `thangDK` / `namDK` → resolve catalog.
2. Address pickers reload for that catalog:
   - v1: Province → District → Ward
   - v2: Province → Ward
3. User enters street/number → compose printable address string.
4. `location_id` from headquarters finest unit.
5. `loadSignatory(location_id)` fills `coQuanChuQuan`, `phongKinhTe`, title, name, stamp, signature.
6. Fallback: walk parent keys → `default`; show warning in GUI.

Changing registration date reloads pickers; if current selection is invalid in the new catalog, clear selection and prompt convert via bridge.

## Bridge (convert)

- Lookup in `bridge/legacy-to-new.json` when pasted/selected unit belongs to the other era.
- Suggest units valid for the **currently selected** catalog; do not silently change catalog.
- If no mapping: keep free text; do not invent a unit.

## Signatory master

Extend `data/signatories/` records:

```json
{
  "location_id": "v1:01-005",
  "authority_l1": "UBND QUẬN CẦU GIẤY",
  "authority_l2": "PHÒNG KINH TẾ, HẠ TẦNG VÀ ĐÔ THỊ",
  "signatory_title": "KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG",
  "signatory_name": "Đặng Thục Phương"
}
```

Lookup order:

1. Exact `location_id`
2. Parent (v2 ward → province; v1 ward → district → province)
3. `default`

- v1 keys often at **district** (matches `UBND QUẬN …` blanks).
- v2 keys at **ward/commune** (post-reform authority).

## Modules (Node)

| Module | Responsibility |
|--------|----------------|
| `src/lib/adminCatalog.js` | Date → catalog; load snapshots |
| `src/lib/adminBridge.js` | Legacy ↔ new lookups |
| `src/lib/locationId.js` | Build / parse / parent keys |
| `src/lib/stamp.js` (touch) | `loadSignatory(location_id)` + fallback |
| `public/` | Catalog-aware pickers; date-change reload |
| `scripts/seed-admin-data.js` (optional) | Dump v1/v2/bridge from open-api.vn |

Stay on Node; no PostgreSQL in this phase (per existing project decisions). Shared logic in `src/lib/*`; CLI/server keep thin facades.

## Error handling

| Case | Behavior |
|------|----------|
| Missing ĐK date | catalog v2 + warning |
| Invalid ĐK date | block save/print |
| Bridge miss | keep user text |
| Signatory miss | `default` + warn with `location_id` |
| Offline seed missing | fail loud at startup/list with path hint |

## Verification

- Unit: `2025-06-30` → v1; `2025-07-01` → v2.
- Unit: same numeric ward code differs under `v1:` vs `v2:` `location_id`.
- Smoke: `npm run list` then `node src/render.js <safe_name>` with a sample `location_id`.

## Out of scope (this design)

- PostgreSQL / production multi-tenant `location_id` warehouse
- Full national roster of all trưởng/phó phòng
- Street/geocode validation
- DOCX pipeline
- Relying on live open-api.vn at PDF render time

## Success criteria

1. Date fields alone select v1 vs v2 pickers and IDs.
2. Both snapshots + bridge exist under `data/admin/` and are used offline.
3. Headquarters `location_id` selects header, stamp, and signatory with documented fallback.
4. Convert suggests mappings without corrupting catalog choice.
5. Existing `default` signatory path still prints when mapping is absent.
