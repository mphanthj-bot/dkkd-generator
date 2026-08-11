# Dual Admin Catalog + Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline v1/v2 Vietnamese admin catalogs with date-based selection, legacy bridge, versioned `location_id`, and headquarters-driven signatory lookup for ĐKKD PDFs/GUI.

**Architecture:** Pure Node libs under `src/lib/` read snapshots from `data/admin/`. Registration date (`ngayDK`/`thangDK`/`namDK`) or optional `adminCatalog` picks `v1` vs `v2`. HQ selection builds `location_id`; `loadSignatory` resolves exact → parent → `default`. Seed script dumps open-api.vn once; render never calls the network.

**Tech Stack:** Node.js (built-in `node:test` / `node:assert`), Express GUI/API, existing Puppeteer PDF pipeline, local JSON under `data/admin/` and `data/signatories/`.

## Global Constraints

- Stay on **Node.js**; no Python/PostgreSQL/DOCX in this phase.
- Shared logic in `src/lib/*`; thin CLI/server facades.
- Template replacement stays `split().join()`; escape text fields.
- Canonical subject key remains `chuThe`.
- Never write rendered stamp images under `output/`.
- Runtime admin data is **offline only** (`data/admin/`); live open-api.vn only in seed script.
- `CUTOVER = 2025-07-01`; missing date → catalog `v2` + warning; invalid date → reject save/print.
- `location_id` always version-prefixed; never bare ward codes.
- Only `diaChi` (trụ sở) drives signatory/header/stamp.

**Spec:** `docs/superpowers/specs/2026-08-11-admin-catalog-bridge-design.md`

---

## File structure

| Path | Responsibility |
|------|----------------|
| `data/admin/v1/provinces.json` | Offline 63-province tree (province→district→ward) |
| `data/admin/v2/provinces.json` | Offline 34-province tree (province→ward) |
| `data/admin/bridge/legacy-to-new.json` | Legacy↔new ward mappings |
| `data/admin/README.md` | Source URLs, dump date, usage |
| `test/fixtures/admin/*` | Tiny fixtures for unit tests (not full nation dump) |
| `src/lib/paths.js` | Add `ADMIN_DIR` |
| `src/lib/adminCatalog.js` | Date→catalog; load/list provinces/districts/wards |
| `src/lib/locationId.js` | Build/parse/parentKeys for `location_id` |
| `src/lib/adminBridge.js` | Bridge lookups against offline JSON |
| `src/lib/stamp.js` | `resolveSignatoryId` + `loadSignatory` fallback chain |
| `src/lib/pdf.js` | Pass `data.location_id` into signatory load |
| `src/fields.js` | Allow `location_id`, `adminCatalog`; validate ĐK date on save/print paths |
| `src/server.js` | Admin list/bridge API; validate date; surface catalog warning |
| `public/app.js` (+ minimal HTML/CSS if needed) | Catalog-aware pickers; date reload |
| `scripts/seed-admin-data.js` | Dump v1/v2/bridge from open-api.vn |
| `test/*.test.js` | `node:test` unit tests |
| `package.json` | Add `"test": "node --test test"` |
| `kb/admin-catalog.md` + `kb/INDEX.md` | Durable facts for agents |
| `AGENTS.md` | One short pointer to admin catalog behavior |

---

### Task 1: `locationId` build / parse / parents

**Files:**
- Create: `src/lib/locationId.js`
- Create: `test/locationId.test.js`

**Interfaces:**
- Consumes: none
- Produces:
  - `padCode(n, width) → string`
  - `buildLocationId({ catalog, provinceCode, districtCode?, wardCode? }) → string`
  - `parseLocationId(id) → { catalog, provinceCode, districtCode?, wardCode? } | null`
  - `parentLocationIds(id) → string[]` (nearest parent first, excludes self and `default`)

- [ ] **Step 1: Write the failing test**

```js
// test/locationId.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildLocationId,
  parseLocationId,
  parentLocationIds
} = require('../src/lib/locationId');

describe('locationId', () => {
  it('builds v1 and v2 with zero-padding', () => {
    assert.equal(
      buildLocationId({ catalog: 'v1', provinceCode: 1, districtCode: 5, wardCode: 166 }),
      'v1:01-005-00166'
    );
    assert.equal(
      buildLocationId({ catalog: 'v2', provinceCode: 1, wardCode: 166 }),
      'v2:01-00166'
    );
  });

  it('same numeric ward differs by catalog prefix', () => {
    const a = buildLocationId({ catalog: 'v1', provinceCode: 1, districtCode: 5, wardCode: 166 });
    const b = buildLocationId({ catalog: 'v2', provinceCode: 1, wardCode: 166 });
    assert.notEqual(a, b);
    assert.equal(parseLocationId(a).wardCode, '00166');
    assert.equal(parseLocationId(b).wardCode, '00166');
    assert.equal(parseLocationId(a).catalog, 'v1');
    assert.equal(parseLocationId(b).catalog, 'v2');
  });

  it('parentLocationIds walks ward→district→province (v1) and ward→province (v2)', () => {
    assert.deepEqual(parentLocationIds('v1:01-005-00166'), ['v1:01-005', 'v1:01']);
    assert.deepEqual(parentLocationIds('v2:01-00166'), ['v2:01']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/locationId.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/locationId.js
function padCode(n, width) {
  return String(Number(n)).padStart(width, '0');
}

function buildLocationId({ catalog, provinceCode, districtCode, wardCode }) {
  if (catalog !== 'v1' && catalog !== 'v2') {
    throw new Error(`Invalid catalog: ${catalog}`);
  }
  const p = padCode(provinceCode, 2);
  if (catalog === 'v2') {
    if (wardCode == null) return `v2:${p}`;
    return `v2:${p}-${padCode(wardCode, 5)}`;
  }
  const d = districtCode == null ? null : padCode(districtCode, 3);
  if (d == null) return `v1:${p}`;
  if (wardCode == null) return `v1:${p}-${d}`;
  return `v1:${p}-${d}-${padCode(wardCode, 5)}`;
}

function parseLocationId(id) {
  if (!id || typeof id !== 'string') return null;
  let m = id.match(/^v1:(\d{2})(?:-(\d{3}))?(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v1', provinceCode: m[1] };
    if (m[2]) out.districtCode = m[2];
    if (m[3]) out.wardCode = m[3];
    return out;
  }
  m = id.match(/^v2:(\d{2})(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v2', provinceCode: m[1] };
    if (m[2]) out.wardCode = m[2];
    return out;
  }
  return null;
}

function parentLocationIds(id) {
  const p = parseLocationId(id);
  if (!p) return [];
  const parents = [];
  if (p.catalog === 'v1') {
    if (p.wardCode && p.districtCode) {
      parents.push(buildLocationId({ catalog: 'v1', provinceCode: p.provinceCode, districtCode: p.districtCode }));
    }
    if (p.wardCode || p.districtCode) {
      parents.push(buildLocationId({ catalog: 'v1', provinceCode: p.provinceCode }));
    }
  } else if (p.wardCode) {
    parents.push(buildLocationId({ catalog: 'v2', provinceCode: p.provinceCode }));
  }
  return parents;
}

module.exports = { padCode, buildLocationId, parseLocationId, parentLocationIds };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/locationId.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/locationId.js test/locationId.test.js
git commit -m "feat: add versioned location_id helpers"
```

---

### Task 2: `adminCatalog` date cutover + fixture loader

**Files:**
- Modify: `src/lib/paths.js`
- Create: `src/lib/adminCatalog.js`
- Create: `test/fixtures/admin/v1/provinces.json`
- Create: `test/fixtures/admin/v2/provinces.json`
- Create: `test/adminCatalog.test.js`

**Interfaces:**
- Consumes: `ROOT_DIR` from `paths.js`
- Produces:
  - `CUTOVER_ISO = '2025-07-01'`
  - `resolveCatalog({ ngayDK, thangDK, namDK, adminCatalog }) → { catalog: 'v1'|'v2', warning?: string, error?: string }`
  - `loadProvinces(catalog, { baseDir? }) → array`
  - `listDistricts(catalog, provinceCode, opts) → array` (v1 only; v2 → `[]`)
  - `listWards(catalog, { provinceCode, districtCode? }, opts) → array`

- [ ] **Step 1: Write fixtures + failing test**

`test/fixtures/admin/v1/provinces.json`:

```json
[
  {
    "name": "Thành phố Hà Nội",
    "code": 1,
    "districts": [
      {
        "name": "Quận Cầu Giấy",
        "code": 5,
        "wards": [
          { "name": "Phường Dịch Vọng", "code": 166 },
          { "name": "Phường Yên Hoà", "code": 172 }
        ]
      }
    ]
  }
]
```

`test/fixtures/admin/v2/provinces.json`:

```json
[
  {
    "name": "Thành phố Hà Nội",
    "code": 1,
    "wards": [
      { "name": "Phường Cầu Giấy", "code": 166 },
      { "name": "Phường Yên Hòa", "code": 172 }
    ]
  }
]
```

```js
// test/adminCatalog.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  resolveCatalog,
  loadProvinces,
  listWards
} = require('../src/lib/adminCatalog');

const FIX = path.join(__dirname, 'fixtures', 'admin');

describe('resolveCatalog', () => {
  it('uses v1 before cutover and v2 on/after 2025-07-01', () => {
    assert.equal(resolveCatalog({ ngayDK: '30', thangDK: '06', namDK: '2025' }).catalog, 'v1');
    assert.equal(resolveCatalog({ ngayDK: '01', thangDK: '07', namDK: '2025' }).catalog, 'v2');
  });

  it('defaults missing date to v2 with warning', () => {
    const r = resolveCatalog({ ngayDK: '', thangDK: '', namDK: '' });
    assert.equal(r.catalog, 'v2');
    assert.ok(r.warning);
  });

  it('rejects invalid calendar dates', () => {
    const r = resolveCatalog({ ngayDK: '31', thangDK: '02', namDK: '2025' });
    assert.ok(r.error);
  });

  it('honors adminCatalog override', () => {
    assert.equal(
      resolveCatalog({ ngayDK: '01', thangDK: '07', namDK: '2025', adminCatalog: 'v1' }).catalog,
      'v1'
    );
  });
});

describe('loadProvinces fixtures', () => {
  it('v1 ward 166 is Dịch Vọng; v2 ward 166 is Cầu Giấy', () => {
    const v1w = listWards('v1', { provinceCode: 1, districtCode: 5 }, { baseDir: FIX });
    const v2w = listWards('v2', { provinceCode: 1 }, { baseDir: FIX });
    assert.equal(v1w.find((w) => w.code === 166).name, 'Phường Dịch Vọng');
    assert.equal(v2w.find((w) => w.code === 166).name, 'Phường Cầu Giấy');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/adminCatalog.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `paths` + `adminCatalog`**

Add to `src/lib/paths.js`:

```js
const ADMIN_DIR = path.join(ROOT_DIR, 'data', 'admin');
module.exports = { ROOT_DIR, TEMPLATE_PATH, CUSTOMERS_DIR, OUTPUT_DIR, SIGNATORIES_DIR, ADMIN_DIR };
```

Implement `src/lib/adminCatalog.js`:

- `resolveCatalog`: parse ints; if any part empty → `{ catalog:'v2', warning:'missing_dk_date' }`; build UTC/local date; if invalid → `{ catalog:'v2', error:'invalid_dk_date' }` (caller blocks save); if `adminCatalog` is `v1`|`v2` use it; else compare to `2025-07-01`.
- Load JSON from `opts.baseDir || ADMIN_DIR` + `/{catalog}/provinces.json`; throw clear error if missing.
- `listDistricts` / `listWards` filter by codes (number or string).

- [ ] **Step 4: Run tests**

Run: `node --test test/adminCatalog.test.js test/locationId.test.js`  
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paths.js src/lib/adminCatalog.js test/adminCatalog.test.js test/fixtures/admin
git commit -m "feat: resolve admin catalog from registration date"
```

---

### Task 3: Bridge lookups

**Files:**
- Create: `src/lib/adminBridge.js`
- Create: `test/fixtures/admin/bridge/legacy-to-new.json`
- Create: `test/adminBridge.test.js`

**Interfaces:**
- Consumes: none (file path via `baseDir`)
- Produces:
  - `loadBridge({ baseDir? }) → object`
  - `fromLegacy({ legacyName?, legacyWardCode?, targetCatalog }, opts) → array of suggestions`
  - `toLegacies({ newWardCode }, opts) → array`

Fixture shape (keep small):

```json
{
  "fromLegacyByCode": {
    "166": [
      { "code": 160, "name": "Phường Nghĩa Đô", "province_code": 1 },
      { "code": 166, "name": "Phường Cầu Giấy", "province_code": 1 }
    ]
  },
  "toLegaciesByCode": {
    "166": [
      { "code": 166, "name": "Phường Dịch Vọng", "district_code": 5, "province_code": 1 },
      { "code": 167, "name": "Phường Dịch Vọng Hậu", "district_code": 5, "province_code": 1 }
    ]
  },
  "fromLegacyByName": {
    "dich vong": [
      { "code": 166, "name": "Phường Cầu Giấy", "province_code": 1 }
    ]
  }
}
```

- [ ] **Step 1: Write failing test**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { fromLegacy, toLegacies } = require('../src/lib/adminBridge');
const FIX = path.join(__dirname, 'fixtures', 'admin');

describe('adminBridge', () => {
  it('maps legacy ward code 166 to new suggestions without inventing extras', () => {
    const hits = fromLegacy({ legacyWardCode: 166, targetCatalog: 'v2' }, { baseDir: FIX });
    assert.ok(hits.some((h) => h.code === 166 && h.name.includes('Cầu Giấy')));
  });

  it('returns empty array on miss', () => {
    assert.deepEqual(fromLegacy({ legacyName: 'xyz-not-real', targetCatalog: 'v2' }, { baseDir: FIX }), []);
  });

  it('lists legacies for new ward 166', () => {
    const legs = toLegacies({ newWardCode: 166 }, { baseDir: FIX });
    assert.ok(legs.some((l) => l.name.includes('Dịch Vọng')));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `adminBridge.js`** — normalize names (lowercase, strip accents via simple NFD replace); never throw on miss; return `[]`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBridge.js test/adminBridge.test.js test/fixtures/admin/bridge
git commit -m "feat: add offline legacy↔new admin bridge"
```

---

### Task 4: Seed script + real `data/admin` snapshots

**Files:**
- Create: `scripts/seed-admin-data.js`
- Create: `data/admin/README.md`
- Create (generated): `data/admin/v1/provinces.json`, `data/admin/v2/provinces.json`, `data/admin/bridge/legacy-to-new.json`
- Modify: `package.json` — add `"seed:admin": "node scripts/seed-admin-data.js"` and `"test": "node --test test"`

**Interfaces:**
- Consumes: HTTPS GET to `provinces.open-api.vn`
- Produces: files under `data/admin/` as in spec

- [ ] **Step 1: Write seed script**

Behavior:

1. Fetch `GET https://provinces.open-api.vn/api/v1/p/` then for each province `GET /api/v1/p/{code}?depth=2` and for each district `GET /api/v1/d/{code}?depth=2` (avoid single `depth=3` megacall). Write slim objects `{ name, code, districts:[{ name, code, wards:[{ name, code }]}] }`.
2. Fetch v2: `GET /api/v2/p/` then each `GET /api/v2/p/{code}?depth=2` → `{ name, code, wards:[{ name, code }] }`.
3. Bridge: for each v2 ward code, `GET /api/v2/w/{code}/to-legacies/`; also build `fromLegacyByCode` reverse index. Persist `{ fromLegacyByCode, toLegaciesByCode, fromLegacyByName, dumpedAt }`.
4. Write `data/admin/README.md` with source URLs, cutover date, dump timestamp.
5. Rate-limit politely (e.g. 50–100ms between calls); fail loud on non-200.

- [ ] **Step 2: Run seed**

Run: `node scripts/seed-admin-data.js`  
Expected: files created; v1 province count 63; v2 province count 34.

- [ ] **Step 3: Smoke-load via adminCatalog**

```bash
node -e "const a=require('./src/lib/adminCatalog'); console.log(a.loadProvinces('v1').length, a.loadProvinces('v2').length)"
```

Expected: `63 34`

- [ ] **Step 4: Commit data + script**

```bash
git add scripts/seed-admin-data.js data/admin package.json
git commit -m "chore: seed offline v1/v2 admin snapshots and bridge"
```

---

### Task 5: Signatory resolve by `location_id`

**Files:**
- Modify: `src/lib/stamp.js`
- Create: `data/signatories/v1_01-005.json` (sample Cầu Giấy district — synthetic or from blank)
- Create: `test/signatoryResolve.test.js`

**Interfaces:**
- Consumes: `parentLocationIds` from `locationId.js`; existing `loadSignatory` file layout
- Produces:
  - `locationIdToFilename(id) → string` e.g. `v1:01-005` → `v1_01-005.json`
  - `resolveSignatoryId(locationId) → { id, usedFallback: boolean, tried: string[] }`
  - `loadSignatory(idOrLocationId)` — if looks like `v1:`/`v2:`, resolve first; else legacy behavior

- [ ] **Step 1: Write failing test**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveSignatoryId, locationIdToFilename } = require('../src/lib/stamp');

describe('resolveSignatoryId', () => {
  it('maps location_id to safe filename', () => {
    assert.equal(locationIdToFilename('v1:01-005'), 'v1_01-005');
  });

  it('falls back from ward to district file then default', () => {
    // assumes data/signatories/v1_01-005.json exists and v1_01-005-00166.json does not
    const r = resolveSignatoryId('v1:01-005-00166');
    assert.equal(r.id, 'v1_01-005');
    assert.equal(r.usedFallback, true);
  });

  it('uses default when nothing matches', () => {
    const r = resolveSignatoryId('v2:99-99999');
    assert.equal(r.id, 'default');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Sample `data/signatories/v1_01-005.json`:

```json
{
  "location_id": "v1:01-005",
  "authority_l1": "UBND QUẬN CẦU GIẤY",
  "authority_l2": "PHÒNG KINH TẾ, HẠ TẦNG VÀ ĐÔ THỊ",
  "signatory_title": "KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG",
  "signatory_name": "Đặng Thục Phương",
  "stamp_outer_top": "CỘNG HÒA X.H.C.N VIỆT NAM",
  "stamp_outer_bottom": "Q. CẦU GIẤY - TP HÀ NỘI",
  "stamp_center_lines": ["PHÒNG", "KINH TẾ,", "HẠ TẦNG VÀ", "ĐÔ THỊ"]
}
```

`resolveSignatoryId`: try filename for exact id, then each `parentLocationIds`, then `default` if `default.json` exists.

Update `loadSignatory` to accept either `default` or a `location_id` string.

- [ ] **Step 4: Run tests + smoke load**

```bash
node --test test/signatoryResolve.test.js
node -e "require('./src/lib/stamp').loadSignatory('v1:01-005-00166').then(s=>console.log(s.meta.signatory_name))"
```

Expected: test PASS; prints `Đặng Thục Phương`

- [ ] **Step 5: Commit**

```bash
git add src/lib/stamp.js data/signatories/v1_01-005.json test/signatoryResolve.test.js data/signatories/README.md
git commit -m "feat: resolve signatory by location_id with parent fallback"
```

---

### Task 6: Wire PDF generate to `location_id`

**Files:**
- Modify: `src/lib/pdf.js`
- Modify: `src/fields.js` (allowlist `location_id`, `adminCatalog`)
- Create: `test/resolveCatalogPdfHook.test.js` (pure helper if extracted) OR extend customer fixture

**Interfaces:**
- Consumes: `resolveCatalog`, `loadSignatory`
- Produces: `generatePdf` uses `data.location_id` when present

- [ ] **Step 1: Change `generatePdf`**

```js
// in generatePdf after loadInfo:
const locationKey = data.location_id || 'default';
const signatory = await loadSignatory(locationKey);
// optional: console.warn if resolve usedFallback
```

- [ ] **Step 2: Allow save fields**

In `src/fields.js` / server `mergeFields` allowlist, persist `location_id` and `adminCatalog` even if not shown as certificate empty-check fields (either add to FIELDS as optional hidden, or extend merge allowlist in `server.js` — prefer explicit `EXTRA_SAVE_KEYS = ['location_id','adminCatalog']` in `fields.js` exported and used by server).

- [ ] **Step 3: Manual smoke**

Set on a test customer `info.json`:

```json
"location_id": "v1:01-005",
"ngayDK": "16",
"thangDK": "04",
"namDK": "2024"
```

Run: `node src/render.js <safe_name>`  
Expected: PDF header/signatory from Cầu Giấy sample, not Tân Thuận default.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf.js src/fields.js src/server.js
git commit -m "feat: print PDF using headquarters location_id signatory"
```

---

### Task 7: API for catalog + date validation

**Files:**
- Modify: `src/server.js`
- Modify: `src/fields.js` — export `validateDkDate(data)`

**Interfaces:**
- Produces HTTP:
  - `GET /api/admin/catalog?ngayDK&thangDK&namDK&adminCatalog` → `{ catalog, warning?, error? }`
  - `GET /api/admin/provinces?catalog=v1|v2`
  - `GET /api/admin/districts?catalog=v1&provinceCode=`
  - `GET /api/admin/wards?catalog=&provinceCode=&districtCode=`
  - `GET /api/admin/bridge/from-legacy?legacyName=&legacyWardCode=&targetCatalog=`
  - `PUT` / `POST .../print`: if `validateDkDate` returns error → `400`

- [ ] **Step 1: Add `validateDkDate` in `fields.js`**

```js
function validateDkDate(data) {
  const r = require('./lib/adminCatalog').resolveCatalog(data);
  if (r.error) return r.error;
  return null;
}
```

(Avoid circular require: keep `resolveCatalog` import at top of fields only if paths stay acyclic — if not, put `validateDkDate` in `adminCatalog.js` and call from server.)

- [ ] **Step 2: Register routes in `server.js`** using `adminCatalog` / `adminBridge` loaders (production `ADMIN_DIR`, not fixtures).

- [ ] **Step 3: Manual curl checks**

```bash
curl "http://localhost:3000/api/admin/catalog?ngayDK=30&thangDK=06&namDK=2025"
# {"catalog":"v1"}
curl "http://localhost:3000/api/admin/catalog?ngayDK=01&thangDK=07&namDK=2025"
# {"catalog":"v2"}
curl "http://localhost:3000/api/admin/districts?catalog=v1&provinceCode=1"
```

- [ ] **Step 4: Commit**

```bash
git add src/server.js src/fields.js src/lib/adminCatalog.js
git commit -m "feat: expose admin catalog API and reject invalid DK dates"
```

---

### Task 8: GUI pickers (HQ → `location_id` + address compose)

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html` / `public/styles.css` only if needed for picker row

**Interfaces:**
- Consumes: `/api/admin/*`
- Produces: on save/print, `info.json` includes `location_id` and composed `diaChi` (street free text + selected unit names)

- [ ] **Step 1: When ĐK date fields change**, `GET /api/admin/catalog` → store `activeCatalog`; if `warning`, show banner; if `error`, disable print.

- [ ] **Step 2: Under section “2. Trụ sở”**, add cascading `<select>`s:
  - v1: Province → District → Ward
  - v2: Province → Ward  
  Plus text input `streetLine` (số nhà / đường).

- [ ] **Step 3: On selection change**, set:
  - `location_id` via same padding rules as `buildLocationId` (or small shared endpoint `POST /api/admin/location-id` — prefer client calling the same pad rules duplicated minimally OR expose `GET /api/admin/build-id?...`).
  - Prefer **server helper** `GET /api/admin/build-location-id?catalog&provinceCode&districtCode&wardCode` to avoid drift.

- [ ] **Step 4: Compose `diaChi`** as `"{streetLine}, {wardName}, {districtName?}, {provinceName}"` (omit district for v2). Keep `noiThuongTru` / `noiOHienTai` as free text this phase; optional second picker later (YAGNI — only HQ picker required).

- [ ] **Step 5: Bridge assist** — button “Đổi từ địa giới cũ”: input legacy name → `/api/admin/bridge/from-legacy` → fill suggestion into current catalog selects; do not change catalog.

- [ ] **Step 6: Manual GUI check** — date 30/06/2025 shows districts; 01/07/2025 hides districts; print uses mapped signatory when `v1_01-005` exists.

- [ ] **Step 7: Commit**

```bash
git add public/app.js public/index.html public/styles.css src/server.js
git commit -m "feat: GUI admin pickers keyed by registration date"
```

---

### Task 9: Docs (KB + AGENTS) + final verify

**Files:**
- Create: `kb/admin-catalog.md`
- Modify: `kb/INDEX.md`
- Modify: `kb/decisions.md` — move “API địa giới” out of out-of-scope / note phase start
- Modify: `AGENTS.md` — short architecture bullet
- Modify: `data/signatories/README.md` — location_id filename convention

- [ ] **Step 1: Write `kb/admin-catalog.md`** with Fact / How to / Do not (cutover, paths, seed command, location_id).

- [ ] **Step 2: Link from INDEX + AGENTS**

- [ ] **Step 3: Full verify**

```bash
npm test
npm run list
node src/render.js <customer_with_location_id>
```

Expected: all tests green; PDF generated; no network calls during render.

- [ ] **Step 4: Commit**

```bash
git add kb AGENTS.md data/signatories/README.md
git commit -m "docs: record admin catalog dual-snapshot runbook"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| CUTOVER date rule + missing/invalid/override | Task 2, 7 |
| Offline `data/admin` v1/v2 + bridge + README | Task 4 |
| Versioned `location_id` | Task 1 |
| Bridge convert without inventing / without flipping catalog | Task 3, 8 |
| Only trụ sở drives signatory | Task 6, 8 |
| Signatory exact → parent → default | Task 5 |
| GUI pickers by catalog + date reload | Task 8 |
| Seed from open-api.vn, runtime offline | Task 4 |
| PDF smoke + unit cutover tests | Tasks 2, 6, 9 |
| No PostgreSQL / no full national roster | Honored (sample `v1_01-005` only) |

## Self-review notes

- No TBD placeholders in task steps.
- Signatures aligned: `buildLocationId` / `resolveCatalog` / `fromLegacy` / `resolveSignatoryId` / `loadSignatory`.
- Filename sanitization (`v1_01-005.json`) documented so Windows paths never contain `:`.
