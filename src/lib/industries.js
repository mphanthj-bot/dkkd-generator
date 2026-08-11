const fs = require('fs');
const path = require('path');
const { INDUSTRIES_DIR } = require('./paths');

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function loadJson(file, baseDir) {
  const dir = baseDir || INDUSTRIES_DIR;
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Industry data missing: ${full}`);
  }
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

function loadIndustries(opts = {}) {
  return loadJson('vsic-level4.json', opts.baseDir);
}

function loadTaxGroups(opts = {}) {
  return loadJson('tax-groups.json', opts.baseDir);
}

function resolveTax(code, opts = {}) {
  const raw = String(code || '').replace(/\D/g, '');
  if (!raw) return { unknown: true };
  const { groups } = loadTaxGroups(opts);
  let best = null;
  let bestLen = -1;
  for (const g of groups) {
    for (const p of g.codePrefixes || []) {
      if (raw.startsWith(p) && p.length > bestLen) {
        best = g;
        bestLen = p.length;
      }
    }
  }
  if (!best) return { unknown: true };
  return {
    unknown: false,
    groupId: best.id,
    label: best.label,
    gtgtPercent: best.gtgtPercent,
    tncnPercent: best.tncnPercent
  };
}

function getIndustry(code, opts = {}) {
  const needle = String(code || '').replace(/\D/g, '');
  const row = loadIndustries(opts).find((x) => x.code === needle);
  if (!row) return null;
  return { ...row, tax: resolveTax(row.code, opts) };
}

function searchIndustries(q, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const list = loadIndustries(opts);
  const nq = normalize(q);
  let hits = list;
  if (nq) {
    hits = list.filter(
      (x) => normalize(x.code).includes(nq) || normalize(x.name).includes(nq)
    );
  }
  return hits.slice(0, limit).map((x) => ({
    ...x,
    tax: resolveTax(x.code, opts)
  }));
}

module.exports = {
  normalize,
  loadIndustries,
  loadTaxGroups,
  resolveTax,
  getIndustry,
  searchIndustries
};
