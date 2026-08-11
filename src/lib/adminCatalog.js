const fs = require('fs');
const path = require('path');
const { ADMIN_DIR } = require('./paths');

const CUTOVER_ISO = '2025-07-01';

function sameCode(a, b) {
  return String(a) === String(b);
}

function isEmptyPart(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function resolveCatalog({ ngayDK, thangDK, namDK, adminCatalog } = {}) {
  if (adminCatalog === 'v1' || adminCatalog === 'v2') {
    return { catalog: adminCatalog };
  }

  if (isEmptyPart(ngayDK) || isEmptyPart(thangDK) || isEmptyPart(namDK)) {
    return { catalog: 'v2', warning: 'missing_dk_date' };
  }

  const day = parseInt(String(ngayDK).trim(), 10);
  const month = parseInt(String(thangDK).trim(), 10);
  const year = parseInt(String(namDK).trim(), 10);

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { catalog: 'v2', error: 'invalid_dk_date' };
  }

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const catalog = iso < CUTOVER_ISO ? 'v1' : 'v2';
  return { catalog };
}

function loadProvinces(catalog, opts = {}) {
  const baseDir = opts.baseDir || ADMIN_DIR;
  const filePath = path.join(baseDir, catalog, 'provinces.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Admin catalog not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listDistricts(catalog, provinceCode, opts = {}) {
  if (catalog === 'v2') return [];
  const provinces = loadProvinces(catalog, opts);
  const province = provinces.find((p) => sameCode(p.code, provinceCode));
  return province?.districts || [];
}

function listWards(catalog, { provinceCode, districtCode }, opts = {}) {
  const provinces = loadProvinces(catalog, opts);
  const province = provinces.find((p) => sameCode(p.code, provinceCode));
  if (!province) return [];

  if (catalog === 'v2') {
    return province.wards || [];
  }

  const districts = province.districts || [];
  const district = districts.find((d) => sameCode(d.code, districtCode));
  return district?.wards || [];
}

function validateDkDate(data) {
  const r = resolveCatalog(data);
  if (r.error) return r.error;
  return null;
}

module.exports = {
  CUTOVER_ISO,
  resolveCatalog,
  validateDkDate,
  loadProvinces,
  listDistricts,
  listWards
};
