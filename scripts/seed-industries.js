#!/usr/bin/env node
// Validate offline industry snapshots (QĐ 36 cấp-4 + TT 40 tax groups).
// Re-build vsic-level4.json from an annex dump only when the legal table changes.

const fs = require('fs');
const path = require('path');
const { INDUSTRIES_DIR } = require('../src/lib/paths');
const { loadIndustries, loadTaxGroups, getIndustry } = require('../src/lib/industries');

function main() {
  const vsicPath = path.join(INDUSTRIES_DIR, 'vsic-level4.json');
  const taxPath = path.join(INDUSTRIES_DIR, 'tax-groups.json');
  if (!fs.existsSync(vsicPath) || !fs.existsSync(taxPath)) {
    console.error('Missing data/industries/*.json — restore from repo or rebuild annex dump.');
    process.exit(1);
  }
  const list = loadIndustries();
  const tax = loadTaxGroups();
  if (!Array.isArray(list) || list.length < 400) {
    console.error(`Expected ~495 cấp-4 rows, got ${list && list.length}`);
    process.exit(1);
  }
  if (!tax.groups || !tax.groups.length) {
    console.error('tax-groups.json has no groups');
    process.exit(1);
  }
  const sample = getIndustry('4641');
  if (!sample || sample.tax.unknown) {
    console.error('4641 missing or tax unresolved');
    process.exit(1);
  }
  console.log(`OK: ${list.length} level-4 industries; ${tax.groups.length} tax groups; 4641 → ${sample.tax.groupId}`);
}

main();
