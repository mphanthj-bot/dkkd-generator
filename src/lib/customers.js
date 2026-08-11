const fs = require('fs');
const path = require('path');
const { CUSTOMERS_DIR, OUTPUT_DIR } = require('./paths');
const { slugify } = require('./slug');

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
  listCustomers
};
