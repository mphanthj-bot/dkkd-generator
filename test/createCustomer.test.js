const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { CUSTOMERS_DIR } = require('../src/lib/paths');
const { createCustomer, loadInfo } = require('../src/lib/customers');
const { FIELDS } = require('../src/fields');

const TEST_NAME = 'zz_test_blank_profile_tmp';

describe('createCustomer', () => {
  after(() => {
    const dir = path.join(CUSTOMERS_DIR, TEST_NAME);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates blank info.json for all FIELDS', () => {
    const dir = path.join(CUSTOMERS_DIR, TEST_NAME);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

    const created = createCustomer({ hoTen: 'ZZ Test Blank Profile Tmp' });
    assert.equal(created.name, TEST_NAME);
    const data = loadInfo(TEST_NAME);
    for (const key of Object.keys(FIELDS)) {
      assert.ok(Object.prototype.hasOwnProperty.call(data, key), `missing ${key}`);
      if (FIELDS[key].array) assert.deepEqual(data[key], []);
      else if (key === 'hoTen') assert.equal(data[key], 'ZZ Test Blank Profile Tmp');
      else assert.equal(data[key], '');
    }
  });

  it('rejects duplicate', () => {
    assert.throws(() => createCustomer({ hoTen: 'ZZ Test Blank Profile Tmp' }), /đã tồn tại/i);
  });
});
