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
