const fs = require('fs');
const path = require('path');
const { CUSTOMERS_DIR, OUTPUT_DIR } = require('./paths');
const { slugify } = require('./slug');
const { FIELDS } = require('../fields');

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

function getCustomerDir(customerName) {
  return path.join(CUSTOMERS_DIR, slugify(customerName));
}

function getOutputDir(customerName) {
  return path.join(OUTPUT_DIR, slugify(customerName));
}

function blankInfo() {
  const data = {};
  for (const key of Object.keys(FIELDS)) {
    data[key] = FIELDS[key].array ? [] : '';
  }
  return data;
}

function createCustomer({ hoTen, tenHKD } = {}) {
  const ho = String(hoTen || '').trim();
  const ten = String(tenHKD || '').trim();
  const label = ho || ten;
  if (!label) {
    const err = new Error('Cần họ tên hoặc tên hộ kinh doanh để tạo hồ sơ');
    err.code = 'BAD_INPUT';
    throw err;
  }
  const name = slugify(label).replace(/^_+|_+$/g, '');
  if (!name || !SAFE_NAME.test(name)) {
    const err = new Error('Tên hồ sơ không hợp lệ sau khi slugify');
    err.code = 'BAD_SLUG';
    throw err;
  }
  const dir = path.join(CUSTOMERS_DIR, name);
  if (fs.existsSync(dir)) {
    const err = new Error(`Hồ sơ đã tồn tại: ${name}`);
    err.code = 'DUPLICATE';
    throw err;
  }
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  const data = blankInfo();
  if (ho) data.hoTen = ho;
  if (ten) data.tenHKD = ten;
  saveInfo(name, data);
  return { name, ...data };
}

async function listCustomers() {
  const dirs = fs.readdirSync(CUSTOMERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_template')
    .map(d => {
      const infoPath = path.join(CUSTOMERS_DIR, d.name, 'info.json');
      if (fs.existsSync(infoPath)) {
        const data = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        return { name: d.name, hoTen: data.hoTen, soCCCD: data.soCCCD };
      }
      return null;
    })
    .filter(Boolean);
  return dirs;
}

module.exports = {
  normalizeInfo,
  loadInfo,
  saveInfo,
  getCustomerDir,
  getOutputDir,
  blankInfo,
  createCustomer,
  listCustomers
};
