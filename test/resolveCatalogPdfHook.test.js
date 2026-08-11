const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSignatory } = require('../src/lib/stamp');

describe('PDF generate signatory hook', () => {
  it('await loadSignatory with location_id returns headquarters signatory', async () => {
    const signatory = await loadSignatory('v1:01-005');
    assert.equal(signatory.meta.authority_l1, 'UBND QUẬN CẦU GIẤY');
    assert.equal(signatory.meta.signatory_name, 'Đặng Thục Phương');
  });

  it('generatePdf uses data.location_id when present', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/lib/pdf.js'), 'utf-8');
    assert.match(src, /data\.location_id \|\| 'default'/);
    assert.match(src, /await loadSignatory\(locationKey\)/);
  });

  it('mergeFields allowlists location_id and adminCatalog', () => {
    const { EXTRA_SAVE_KEYS } = require('../src/fields');
    assert.deepEqual(EXTRA_SAVE_KEYS, ['location_id', 'adminCatalog']);
    const serverSrc = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf-8');
    assert.match(serverSrc, /EXTRA_SAVE_KEYS/);
  });
});
