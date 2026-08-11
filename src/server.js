// Local web server + API for the DKHD filling GUI.
//   npm start            → http://localhost:3000
//   GET  /api/customers          list customers with empty-field counts
//   GET  /api/fields             field metadata for the form
//   GET  /api/customers/:name    full info + which fields are empty
//   PUT  /api/customers/:name    save filled fields into info.json
//   POST /api/customers/:name/print  save + render PDF, return its URL

const express = require('express');
const fs = require('fs');
const path = require('path');

const { listCustomers, generatePdf } = require('./render');
const { FIELDS, SECTIONS, collectEmpty } = require('./fields');

const ROOT_DIR = path.resolve(__dirname, '..');
const CUSTOMERS_DIR = path.join(ROOT_DIR, 'customers');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/output', express.static(path.join(ROOT_DIR, 'output')));

const SAFE_NAME = /^[a-z0-9_]+$/;

function normalizeInfo(data) {
  // Prefer chuThe; migrate legacy ownerType on read.
  if (data && (data.chuThe == null || data.chuThe === '') && data.ownerType) {
    data.chuThe = data.ownerType;
  }
  return data;
}

function loadInfo(name) {
  const file = path.join(CUSTOMERS_DIR, name, 'info.json');
  if (!fs.existsSync(file)) return null;
  return normalizeInfo(JSON.parse(fs.readFileSync(file, 'utf-8')));
}

function saveInfo(name, data) {
  const file = path.join(CUSTOMERS_DIR, name, 'info.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

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
  const allowed = new Set(Object.keys(FIELDS));
  let changed = false;
  for (const [key, value] of Object.entries(body || {})) {
    if (!allowed.has(key)) continue;
    data[key] = typeof value === 'string' ? value.trim() : value;
    changed = true;
  }
  return changed;
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
  saveInfo(req.params.name, data);
  res.json({ ok: true, ...data, _empty: collectEmpty(data) });
});

app.post('/api/customers/:name/print', async (req, res) => {
  const data = requireCustomer(req, res);
  if (!data) return;
  if (mergeFields(data, req.body)) saveInfo(req.params.name, data);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GUI đang chạy tại: http://localhost:${PORT}`);
});
