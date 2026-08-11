// Local web server + API for the DKHD filling GUI.
//   npm start            → http://localhost:3000
//   GET  /api/customers          list customers with empty-field counts
//   GET  /api/fields             field metadata for the form
//   GET  /api/customers/:name    full info + which fields are empty
//   PUT  /api/customers/:name    save filled fields into info.json
//   POST /api/customers/:name/print  save + render PDF, return its URL

const express = require('express');
const path = require('path');

const { ROOT_DIR } = require('./lib/paths');
const { listCustomers, loadInfo, saveInfo } = require('./lib/customers');
const { generatePdf } = require('./lib/pdf');
const { FIELDS, SECTIONS, EXTRA_SAVE_KEYS, collectEmpty } = require('./fields');
const {
  resolveCatalog,
  validateDkDate,
  loadProvinces,
  listDistricts,
  listWards
} = require('./lib/adminCatalog');
const { fromLegacy } = require('./lib/adminBridge');
const { buildLocationId } = require('./lib/locationId');
const { resolveSignatoryId } = require('./lib/stamp');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/output', express.static(path.join(ROOT_DIR, 'output')));

const SAFE_NAME = /^[a-z0-9_]+$/;

function requireCustomer(req, res) {
  const { name } = req.params;
  if (!SAFE_NAME.test(name)) {
    res.status(400).json({ error: 'Tên hồ sơ không hợp lệ' });
    return null;
  }
  const data = loadInfo(name);
  if (!data) {
    res.status(404).json({ error: `Không tìm thấy hồ sơ: ${name}` });
    return null;
  }
  return data;
}

function mergeFields(data, body) {
  const allowed = new Set([...Object.keys(FIELDS), ...EXTRA_SAVE_KEYS]);
  let changed = false;
  for (const [key, value] of Object.entries(body || {})) {
    if (!allowed.has(key)) continue;
    data[key] = typeof value === 'string' ? value.trim() : value;
    changed = true;
  }
  return changed;
}

function requireCatalog(catalog, res) {
  if (catalog !== 'v1' && catalog !== 'v2') {
    res.status(400).json({ error: 'catalog phải là v1 hoặc v2' });
    return false;
  }
  return true;
}

function rejectInvalidDkDate(data, res) {
  const err = validateDkDate(data);
  if (err) {
    res.status(400).json({ error: err });
    return true;
  }
  return false;
}

app.get('/api/fields', (req, res) => {
  res.json({ fields: FIELDS, sections: SECTIONS });
});

app.get('/api/customers', async (req, res) => {
  const customers = await listCustomers();
  const rows = customers.map((c) => {
    const data = loadInfo(c.name) || {};
    const empty = collectEmpty(data);
    return { ...c, emptyFields: empty, emptyCount: empty.length };
  });
  res.json(rows);
});

app.get('/api/customers/:name', (req, res) => {
  const data = requireCustomer(req, res);
  if (!data) return;
  res.json({ ...data, _empty: collectEmpty(data) });
});

app.put('/api/customers/:name', (req, res) => {
  const data = requireCustomer(req, res);
  if (!data) return;
  mergeFields(data, req.body);
  if (rejectInvalidDkDate(data, res)) return;
  saveInfo(req.params.name, data);
  res.json({ ok: true, ...data, _empty: collectEmpty(data) });
});

app.post('/api/customers/:name/print', async (req, res) => {
  const data = requireCustomer(req, res);
  if (!data) return;
  const changed = mergeFields(data, req.body);
  if (rejectInvalidDkDate(data, res)) return;
  if (changed) saveInfo(req.params.name, data);
  try {
    const result = await generatePdf(req.params.name);
    const fileName = path.basename(result.output);
    res.json({
      ok: true,
      url: `/output/${req.params.name}/${encodeURIComponent(fileName)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/catalog', (req, res) => {
  res.json(resolveCatalog(req.query));
});

app.get('/api/admin/provinces', (req, res) => {
  const { catalog } = req.query;
  if (!requireCatalog(catalog, res)) return;
  try {
    res.json(loadProvinces(catalog));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/districts', (req, res) => {
  const { catalog, provinceCode } = req.query;
  if (!requireCatalog(catalog, res)) return;
  if (provinceCode == null || String(provinceCode).trim() === '') {
    res.status(400).json({ error: 'provinceCode là bắt buộc' });
    return;
  }
  try {
    res.json(listDistricts(catalog, provinceCode));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/wards', (req, res) => {
  const { catalog, provinceCode, districtCode } = req.query;
  if (!requireCatalog(catalog, res)) return;
  if (provinceCode == null || String(provinceCode).trim() === '') {
    res.status(400).json({ error: 'provinceCode là bắt buộc' });
    return;
  }
  try {
    res.json(listWards(catalog, { provinceCode, districtCode }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/bridge/from-legacy', (req, res) => {
  const { legacyName, legacyWardCode, targetCatalog } = req.query;
  res.json(fromLegacy({ legacyName, legacyWardCode, targetCatalog }));
});

app.get('/api/admin/build-location-id', (req, res) => {
  const { catalog, provinceCode, districtCode, wardCode } = req.query;
  if (!requireCatalog(catalog, res)) return;
  try {
    const location_id = buildLocationId({
      catalog,
      provinceCode,
      districtCode: catalog === 'v2' ? undefined : districtCode,
      wardCode
    });
    res.json({ location_id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/signatory-resolve', (req, res) => {
  const { location_id: locationId } = req.query;
  if (!locationId || typeof locationId !== 'string') {
    res.json({ usedFallback: false });
    return;
  }
  try {
    const r = resolveSignatoryId(locationId);
    res.json({ usedFallback: r.usedFallback, id: r.id });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GUI đang chạy tại: http://localhost:${PORT}`);
});
