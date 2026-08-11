const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildLocationId,
  parseLocationId,
  parentLocationIds
} = require('../src/lib/locationId');

describe('locationId', () => {
  it('builds v1 and v2 with zero-padding', () => {
    assert.equal(
      buildLocationId({ catalog: 'v1', provinceCode: 1, districtCode: 5, wardCode: 166 }),
      'v1:01-005-00166'
    );
    assert.equal(
      buildLocationId({ catalog: 'v2', provinceCode: 1, wardCode: 166 }),
      'v2:01-00166'
    );
  });

  it('same numeric ward differs by catalog prefix', () => {
    const a = buildLocationId({ catalog: 'v1', provinceCode: 1, districtCode: 5, wardCode: 166 });
    const b = buildLocationId({ catalog: 'v2', provinceCode: 1, wardCode: 166 });
    assert.notEqual(a, b);
    assert.equal(parseLocationId(a).wardCode, '00166');
    assert.equal(parseLocationId(b).wardCode, '00166');
    assert.equal(parseLocationId(a).catalog, 'v1');
    assert.equal(parseLocationId(b).catalog, 'v2');
  });

  it('parentLocationIds walks ward→district→province (v1) and ward→province (v2)', () => {
    assert.deepEqual(parentLocationIds('v1:01-005-00166'), ['v1:01-005', 'v1:01']);
    assert.deepEqual(parentLocationIds('v2:01-00166'), ['v2:01']);
  });
});
