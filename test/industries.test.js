const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  searchIndustries,
  getIndustry,
  resolveTax
} = require('../src/lib/industries');

describe('industries catalog', () => {
  it('finds 4641 by code and accent-insensitive name', () => {
    const byCode = searchIndustries('4641', { limit: 5 });
    assert.ok(byCode.some((x) => x.code === '4641'));
    const byName = searchIndustries('vai', { limit: 20 });
    assert.ok(byName.some((x) => x.code === '4641'));
  });

  it('getIndustry returns tax for wholesale fabric', () => {
    const row = getIndustry('4641');
    assert.equal(row.code, '4641');
    assert.equal(row.level, 4);
    assert.equal(row.tax.unknown, false);
    assert.equal(row.tax.gtgtPercent, 1);
    assert.equal(row.tax.tncnPercent, 0.5);
    assert.equal(row.tax.groupId, 'phan_phoi');
  });

  it('resolveTax does not invent rates for empty/unknown codes', () => {
    assert.equal(resolveTax('').unknown, true);
    assert.equal(resolveTax('9999').unknown, true);
  });
});
