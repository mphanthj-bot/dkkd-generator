const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  resolveCatalog,
  loadProvinces,
  listWards
} = require('../src/lib/adminCatalog');

const FIX = path.join(__dirname, 'fixtures', 'admin');

describe('resolveCatalog', () => {
  it('uses v1 before cutover and v2 on/after 2025-07-01', () => {
    assert.equal(resolveCatalog({ ngayDK: '30', thangDK: '06', namDK: '2025' }).catalog, 'v1');
    assert.equal(resolveCatalog({ ngayDK: '01', thangDK: '07', namDK: '2025' }).catalog, 'v2');
  });

  it('defaults missing date to v2 with warning', () => {
    const r = resolveCatalog({ ngayDK: '', thangDK: '', namDK: '' });
    assert.equal(r.catalog, 'v2');
    assert.ok(r.warning);
  });

  it('rejects invalid calendar dates', () => {
    const r = resolveCatalog({ ngayDK: '31', thangDK: '02', namDK: '2025' });
    assert.ok(r.error);
  });

  it('honors adminCatalog override', () => {
    assert.equal(
      resolveCatalog({ ngayDK: '01', thangDK: '07', namDK: '2025', adminCatalog: 'v1' }).catalog,
      'v1'
    );
  });
});

describe('loadProvinces fixtures', () => {
  it('v1 ward 166 is Dịch Vọng; v2 ward 166 is Cầu Giấy', () => {
    const v1w = listWards('v1', { provinceCode: 1, districtCode: 5 }, { baseDir: FIX });
    const v2w = listWards('v2', { provinceCode: 1 }, { baseDir: FIX });
    assert.equal(v1w.find((w) => w.code === 166).name, 'Phường Dịch Vọng');
    assert.equal(v2w.find((w) => w.code === 166).name, 'Phường Cầu Giấy');
  });
});
