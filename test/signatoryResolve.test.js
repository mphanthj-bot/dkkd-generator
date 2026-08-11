const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveSignatoryId, locationIdToFilename } = require('../src/lib/stamp');

describe('resolveSignatoryId', () => {
  it('maps location_id to safe filename', () => {
    assert.equal(locationIdToFilename('v1:01-005'), 'v1_01-005');
  });

  it('falls back from ward to district file then default', () => {
    // assumes data/signatories/v1_01-005.json exists and v1_01-005-00166.json does not
    const r = resolveSignatoryId('v1:01-005-00166');
    assert.equal(r.id, 'v1_01-005');
    assert.equal(r.usedFallback, true);
  });

  it('uses default when nothing matches', () => {
    const r = resolveSignatoryId('v2:99-99999');
    assert.equal(r.id, 'default');
  });
});
