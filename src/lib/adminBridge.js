const fs = require('fs');
const path = require('path');
const { ADMIN_DIR } = require('./paths');

function normalizeName(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function loadBridge({ baseDir } = {}) {
  const root = baseDir || ADMIN_DIR;
  const filePath = path.join(root, 'bridge', 'legacy-to-new.json');
  if (!fs.existsSync(filePath)) {
    return { fromLegacyByCode: {}, toLegaciesByCode: {}, fromLegacyByName: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fromLegacy({ legacyName, legacyWardCode, targetCatalog }, opts = {}) {
  const bridge = loadBridge(opts);

  if (legacyWardCode != null) {
    const hits = bridge.fromLegacyByCode?.[String(legacyWardCode)];
    if (hits?.length) return hits.slice();
  }

  if (legacyName != null && String(legacyName).trim() !== '') {
    const key = normalizeName(legacyName);
    const hits = bridge.fromLegacyByName?.[key];
    if (hits?.length) return hits.slice();
  }

  return [];
}

function toLegacies({ newWardCode }, opts = {}) {
  const bridge = loadBridge(opts);
  const legs = bridge.toLegaciesByCode?.[String(newWardCode)];
  return legs?.length ? legs.slice() : [];
}

module.exports = { normalizeName, loadBridge, fromLegacy, toLegacies };
