/* Bàn đăng ký hộ kinh doanh — GUI điền thông tin còn thiếu */

const state = {
  customers: [],
  fields: {},
  sections: [],
  current: null,   // tên hồ sơ đang xem
  data: null,      // info.json của hồ sơ đang xem
  saveTimer: null,
  printing: false,
  admin: {
    catalog: null,
    warning: null,
    error: null,
    provinces: [],
    districts: [],
    wards: [],
    provinceCode: '',
    districtCode: '',
    wardCode: '',
    streetLine: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    locationId: ''
  }
};

const DATE_PARTS = ['ngayDK', 'thangDK', 'namDK'];
const DATE_WORDS = { ngayDK: 'ngày', thangDK: 'tháng', namDK: 'năm' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function isEmptyVal(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/* ---------------- Khởi động ---------------- */

async function init() {
  const [fieldRes, listRes] = await Promise.all([
    fetch('/api/fields'),
    fetch('/api/customers')
  ]);
  const fieldData = await fieldRes.json();
  state.fields = fieldData.fields;
  state.sections = fieldData.sections;
  state.customers = await listRes.json();

  renderRail();
  if (state.customers.length > 0) {
    selectCustomer(state.customers[0].name);
  } else {
    $('#railCount').textContent = '0';
    $('#fileList').innerHTML = '<li class="rail-empty">Chưa có hồ sơ nào.<br>Tạo thư mục trong <span class="mono">customers/</span> trước.</li>';
    $('#sheet').innerHTML = '<p class="sheet-error">Chưa có hồ sơ nào để hiển thị.</p>';
  }
}

/* ---------------- Danh sách hồ sơ ---------------- */

function renderRail() {
  $('#railCount').textContent = String(state.customers.length);
  const list = $('#fileList');
  list.innerHTML = state.customers.map((c) => `
    <li class="file-card ${c.name === state.current ? 'active' : ''}" data-name="${esc(c.name)}" tabindex="0" role="button">
      <span class="file-card-main">
        <span class="file-card-name">${esc(c.hoTen || c.name)}</span>
        <span class="file-card-code">${esc(c.soCCCD || '—')}</span>
      </span>
      ${renderBadge(c.emptyCount)}
    </li>
  `).join('');

  $$('.file-card', list).forEach((card) => {
    card.addEventListener('click', () => selectCustomer(card.dataset.name));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCustomer(card.dataset.name); }
    });
  });
}

function renderBadge(count) {
  if (count === 0) return '<span class="seal-badge done">✓</span>';
  return `<span class="seal-badge">${count}</span>`;
}

function updateRailBadge(name, count) {
  const card = $(`.file-card[data-name="${esc(name)}"]`);
  if (!card) return;
  const badge = $('.seal-badge', card);
  if (badge) badge.outerHTML = renderBadge(count);
}

/* ---------------- Chọn hồ sơ ---------------- */

async function selectCustomer(name) {
  state.current = name;
  renderRail();
  $('#sheet').innerHTML = '<p class="loading">Đang mở hồ sơ…</p>';

  const res = await fetch(`/api/customers/${encodeURIComponent(name)}`);
  if (!res.ok) {
    $('#sheet').innerHTML = `<p class="sheet-error">Không mở được hồ sơ: ${esc(name)}</p>`;
    return;
  }
  state.data = await res.json();
  renderSheet();
  updateBadges();
}

/* ---------------- Vẽ tờ hồ sơ ---------------- */

function renderSheet() {
  const data = state.data;
  const name = esc(data.hoTen || state.current);
  const maSo = esc(data.maSo || '—');
  const cccd = esc(data.soCCCD || '—');

  $('#sheet').innerHTML = `
    <div class="sheet-head">
      <div>
        <h2 class="sheet-name">${name}</h2>
        <p class="sheet-codes">Mã số HKD <span class="mono">${maSo}</span> &nbsp;·&nbsp; CCCD <span class="mono">${cccd}</span></p>
      </div>
      <div class="seal-status">
        <span class="seal-badge" id="sheetSeal">0</span>
        <p class="seal-status-label" id="sheetSealLabel">trường trống</p>
      </div>
    </div>
    <div id="missingStrip"></div>
    ${state.sections.map(renderSection).join('')}
    <div class="print-area">
      <button class="stamp" id="printBtn" type="button" aria-label="In giấy chứng nhận">
        <span class="stamp-label">IN GIẤY</span>
        <span class="stamp-sub">TẠO PDF</span>
      </button>
      <p class="print-hint">Bấm con dấu để lưu thông tin và tạo giấy chứng nhận.</p>
    </div>
  `;

  bindInputs();
  $('#printBtn').addEventListener('click', doPrint);
  setupHqPicker();
  refreshAdminCatalog();
}

function renderSection(sec) {
  return `
    <section class="cert-section">
      <h3 class="cert-section-title">${esc(sec.title)}</h3>
      <div class="field-grid">
        ${sec.fields.map(renderField).join('')}
      </div>
    </section>
  `;
}

function renderField(key) {
  const meta = state.fields[key];
  if (!meta) return '';
  if (key === 'thangDK' || key === 'namDK') return ''; // nằm trong hàng ngày đăng ký
  if (key === 'ngayDK') return renderDateField();
  if (key === 'diaChi') return renderHqPicker();
  if (meta.array) return `<div class="field wide">${renderIndustry()}</div>`;
  return renderScalarField(key, meta);
}

function renderScalarField(key, meta) {
  const raw = state.data ? state.data[key] : '';
  const value = isEmptyVal(raw) ? (meta.default || '') : raw;
  const filled = !isEmptyVal(value);
  const monoCls = meta.mono ? ' mono' : '';
  const wideCls = meta.options ? '' : (key === 'tenHKD' || key === 'diaChi' || key === 'noiThuongTru' || key === 'noiOHienTai' || key === 'vonChu' || key === 'email' ? ' wide' : '');

  if (filled) {
    return `
      <div class="field${wideCls}">
        <span class="field-label">${esc(meta.label)}</span>
        <div class="filled-value${monoCls}">
          <span class="check">✓</span>
          <span class="val">${esc(value)}</span>
        </div>
      </div>
    `;
  }

  const control = meta.options
    ? `<select class="blank" data-field="${key}">
         <option value="">— chọn —</option>
         ${meta.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
       </select>`
    : `<input class="blank${monoCls}" data-field="${key}" type="text" placeholder="Còn trống — điền vào đây" autocomplete="off">`;

  return `
    <div class="field${wideCls}">
      <label class="field-label" for="${key}">${esc(meta.label)}</label>
      ${control}
    </div>
  `;
}

function renderDateField() {
  const data = state.data || {};
  const values = DATE_PARTS.map((p) => data[p] || '');
  const filled = values.every((v) => !isEmptyVal(v));

  if (filled) {
    const [d, m, y] = values;
    return `
      <div class="field wide">
        <span class="field-label">Ngày đăng ký</span>
        <div class="filled-value">
          <span class="check">✓</span>
          <span class="val">Ngày <span class="mono">${esc(d)}</span> tháng <span class="mono">${esc(m)}</span> năm <span class="mono">${esc(y)}</span></span>
        </div>
      </div>
    `;
  }

  return `
    <div class="field wide">
      <span class="field-label">Ngày đăng ký</span>
      <div class="date-row">
        ${DATE_PARTS.map((p) => `
          <span class="date-word">${DATE_WORDS[p]}</span>
          <input class="blank ${p === 'namDK' ? 'd-year' : 'd-day'}" data-part="${p}" type="text" inputmode="numeric" value="${esc(data[p] || '')}" autocomplete="off">
        `).join('')}
      </div>
    </div>
  `;
}

function renderIndustry() {
  const rows = state.data && Array.isArray(state.data.industry) ? state.data.industry : [];
  const label = '<span class="field-label">Ngành, nghề kinh doanh</span>';

  if (rows.length === 0) {
    return `
      ${label}
      <p class="industry-empty">Chưa có ngành nghề nào trong hồ sơ — cần bổ sung trước khi in.</p>
    `;
  }

  return `
    ${label}
    <div class="industry-list">
      ${rows.map((r, i) => `
        <div class="industry-row">
          <span class="idx">${i + 1}</span>
          <span>${esc(r.tenNganh || '')}</span>
          <span class="code">${esc(r.maNganh || '')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ---------------- HQ picker (admin catalog) ---------------- */

function parseLocationIdClient(id) {
  if (!id || typeof id !== 'string') return null;
  let m = id.match(/^v1:(\d{2})(?:-(\d{3}))?(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v1', provinceCode: m[1] };
    if (m[2]) out.districtCode = m[2];
    if (m[3]) out.wardCode = m[3];
    return out;
  }
  m = id.match(/^v2:(\d{2})(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v2', provinceCode: m[1] };
    if (m[2]) out.wardCode = m[2];
    return out;
  }
  return null;
}

function getDkDateQuery() {
  const data = state.data || {};
  const parts = {};
  DATE_PARTS.forEach((p) => {
    const el = $(`#sheet input[data-part="${p}"]`);
    parts[p] = el ? el.value : (data[p] || '');
  });
  return parts;
}

function composeHqAddress() {
  const a = state.admin;
  const parts = [];
  if (!isEmptyVal(a.streetLine)) parts.push(a.streetLine.trim());
  if (a.wardName) parts.push(a.wardName);
  if (a.catalog === 'v1' && a.districtName) parts.push(a.districtName);
  if (a.provinceName) parts.push(a.provinceName);
  return parts.join(', ');
}

function renderHqPicker() {
  const label = esc(state.fields.diaChi?.label || 'Trụ sở của hộ kinh doanh');
  return `
    <div class="field wide hq-picker" id="hqPicker">
      <span class="field-label">${label}<span class="catalog-tag" id="hqCatalogTag"></span></span>
      <div id="catalogBanner"></div>
      <div class="hq-row" id="hqRow">
        <div>
          <span class="field-label">Tỉnh / Thành phố</span>
          <select class="blank" id="hqProvince" data-hq="province">
            <option value="">— chọn —</option>
          </select>
        </div>
        <div id="hqDistrictWrap">
          <span class="field-label">Quận / Huyện</span>
          <select class="blank" id="hqDistrict" data-hq="district">
            <option value="">— chọn —</option>
          </select>
        </div>
        <div>
          <span class="field-label">Phường / Xã</span>
          <select class="blank" id="hqWard" data-hq="ward">
            <option value="">— chọn —</option>
          </select>
        </div>
      </div>
      <label class="field-label" for="hqStreet">Số nhà, đường</label>
      <input class="blank wide" id="hqStreet" type="text" placeholder="Ví dụ: Số 32 ngõ 120 Trần Duy Hưng" autocomplete="off">
      <div class="hq-preview" id="hqPreview"></div>
      <div class="hq-bridge">
        <input class="blank" id="hqLegacyName" type="text" placeholder="Tên phường/xã địa giới cũ" autocomplete="off">
        <button class="hq-bridge-btn" id="hqBridgeBtn" type="button">Đổi từ địa giới cũ</button>
      </div>
    </div>
  `;
}

function renderCatalogBanner() {
  const banner = $('#catalogBanner');
  if (!banner) return;
  const { warning, error } = state.admin;
  if (error === 'invalid_dk_date') {
    banner.className = 'catalog-banner error';
    banner.textContent = 'Ngày đăng ký không hợp lệ — sửa trước khi in giấy.';
    return;
  }
  if (warning === 'missing_dk_date') {
    banner.className = 'catalog-banner warn';
    banner.textContent = 'Chưa có ngày đăng ký — dùng danh mục địa giới mới (v2) tạm thời.';
    return;
  }
  banner.className = 'catalog-banner';
  banner.textContent = '';
}

function updateHqPreview() {
  const preview = $('#hqPreview');
  if (!preview) return;
  const composed = composeHqAddress();
  if (composed) {
    preview.innerHTML = `<strong>Địa chỉ:</strong> ${esc(composed)}`;
  } else if (state.data?.diaChi) {
    preview.innerHTML = `<strong>Địa chỉ (hiện tại):</strong> ${esc(state.data.diaChi)}`;
  } else {
    preview.innerHTML = '<span>Chọn địa giới và nhập số nhà/đường để ghép địa chỉ trụ sở.</span>';
  }
}

function updateCatalogTag() {
  const tag = $('#hqCatalogTag');
  if (!tag) return;
  tag.textContent = state.admin.catalog ? state.admin.catalog : '';
  tag.style.display = state.admin.catalog ? '' : 'none';
}

function updateDistrictVisibility() {
  const wrap = $('#hqDistrictWrap');
  const row = $('#hqRow');
  if (!wrap || !row) return;
  const isV2 = state.admin.catalog === 'v2';
  wrap.hidden = isV2;
  row.classList.toggle('v2', isV2);
}

function updatePrintButton() {
  const btn = $('#printBtn');
  if (!btn) return;
  btn.disabled = state.admin.error === 'invalid_dk_date';
}

function normCode(code) {
  if (code == null || code === '') return '';
  return String(Number(code));
}

function fillSelect(el, items, selectedCode, labelKey = 'name', codeKey = 'code') {
  if (!el) return;
  const sel = normCode(selectedCode);
  el.innerHTML = `<option value="">— chọn —</option>${items.map((item) => {
    const code = normCode(item[codeKey]);
    return `<option value="${esc(code)}"${code === sel ? ' selected' : ''}>${esc(item[labelKey])}</option>`;
  }).join('')}`;
}

async function refreshAdminCatalog() {
  const q = new URLSearchParams(getDkDateQuery());
  if (state.data?.adminCatalog) q.set('adminCatalog', state.data.adminCatalog);
  try {
    const res = await fetch(`/api/admin/catalog?${q}`);
    const json = await res.json();
    const prev = state.admin.catalog;
    state.admin.catalog = json.catalog || 'v2';
    state.admin.warning = json.warning || null;
    state.admin.error = json.error || null;
    renderCatalogBanner();
    updateCatalogTag();
    updateDistrictVisibility();
    updatePrintButton();
    if (prev !== state.admin.catalog) {
      state.admin.provinceCode = '';
      state.admin.districtCode = '';
      state.admin.wardCode = '';
      state.admin.districts = [];
      state.admin.wards = [];
    }
    await loadAdminProvinces();
    await restoreHqFromSaved();
    syncHqToDom();
    await syncLocationId();
    updateHqPreview();
    updateBadges();
  } catch {
    toast('Không tải được danh mục địa giới.', 'error');
  }
}

async function loadAdminProvinces() {
  const catalog = state.admin.catalog || 'v2';
  const res = await fetch(`/api/admin/provinces?catalog=${encodeURIComponent(catalog)}`);
  state.admin.provinces = res.ok ? await res.json() : [];
  fillSelect($('#hqProvince'), state.admin.provinces, state.admin.provinceCode);
}

async function loadAdminDistricts() {
  const catalog = state.admin.catalog || 'v2';
  if (catalog === 'v2') {
    state.admin.districts = [];
    fillSelect($('#hqDistrict'), [], '');
    return;
  }
  if (!state.admin.provinceCode) {
    state.admin.districts = [];
    fillSelect($('#hqDistrict'), [], '');
    return;
  }
  const q = new URLSearchParams({
    catalog,
    provinceCode: state.admin.provinceCode
  });
  const res = await fetch(`/api/admin/districts?${q}`);
  state.admin.districts = res.ok ? await res.json() : [];
  fillSelect($('#hqDistrict'), state.admin.districts, state.admin.districtCode);
}

async function loadAdminWards() {
  const catalog = state.admin.catalog || 'v2';
  if (!state.admin.provinceCode) {
    state.admin.wards = [];
    fillSelect($('#hqWard'), [], '');
    return;
  }
  const q = new URLSearchParams({
    catalog,
    provinceCode: state.admin.provinceCode
  });
  if (catalog === 'v1' && state.admin.districtCode) {
    q.set('districtCode', state.admin.districtCode);
  }
  const res = await fetch(`/api/admin/wards?${q}`);
  state.admin.wards = res.ok ? await res.json() : [];
  fillSelect($('#hqWard'), state.admin.wards, state.admin.wardCode);
}

function syncHqNames() {
  const a = state.admin;
  const province = a.provinces.find((p) => normCode(p.code) === normCode(a.provinceCode));
  a.provinceName = province?.name || '';
  const district = a.districts.find((d) => normCode(d.code) === normCode(a.districtCode));
  a.districtName = district?.name || '';
  const ward = a.wards.find((w) => normCode(w.code) === normCode(a.wardCode));
  a.wardName = ward?.name || '';
}

async function syncLocationId() {
  const a = state.admin;
  if (!a.catalog || !a.provinceCode) {
    a.locationId = '';
    return;
  }
  const q = new URLSearchParams({
    catalog: a.catalog,
    provinceCode: a.provinceCode
  });
  if (a.catalog === 'v1' && a.districtCode) q.set('districtCode', a.districtCode);
  if (a.wardCode) q.set('wardCode', a.wardCode);
  try {
    const res = await fetch(`/api/admin/build-location-id?${q}`);
    if (!res.ok) {
      a.locationId = '';
      return;
    }
    const json = await res.json();
    a.locationId = json.location_id || '';
  } catch {
    a.locationId = '';
  }
}

function syncHqToDom() {
  const street = $('#hqStreet');
  if (street && street !== document.activeElement) {
    street.value = state.admin.streetLine || '';
  }
  fillSelect($('#hqProvince'), state.admin.provinces, state.admin.provinceCode);
  fillSelect($('#hqDistrict'), state.admin.districts, state.admin.districtCode);
  fillSelect($('#hqWard'), state.admin.wards, state.admin.wardCode);
}

async function restoreHqFromSaved() {
  const data = state.data || {};
  const parsed = parseLocationIdClient(data.location_id);
  if (parsed) {
    state.admin.provinceCode = normCode(parsed.provinceCode);
    state.admin.districtCode = parsed.districtCode ? normCode(parsed.districtCode) : '';
    state.admin.wardCode = parsed.wardCode ? normCode(parsed.wardCode) : '';
    await loadAdminDistricts();
    await loadAdminWards();
    syncHqNames();
  }
}

async function onHqProvinceChange() {
  const el = $('#hqProvince');
  state.admin.provinceCode = el ? el.value : '';
  state.admin.districtCode = '';
  state.admin.wardCode = '';
  await loadAdminDistricts();
  await loadAdminWards();
  syncHqNames();
  await syncLocationId();
  updateHqPreview();
  scheduleSave();
  updateBadges();
}

async function onHqDistrictChange() {
  const el = $('#hqDistrict');
  state.admin.districtCode = el ? el.value : '';
  state.admin.wardCode = '';
  await loadAdminWards();
  syncHqNames();
  await syncLocationId();
  updateHqPreview();
  scheduleSave();
  updateBadges();
}

async function onHqWardChange() {
  const el = $('#hqWard');
  state.admin.wardCode = el ? el.value : '';
  syncHqNames();
  await syncLocationId();
  updateHqPreview();
  scheduleSave();
  updateBadges();
}

function onHqStreetInput() {
  const el = $('#hqStreet');
  state.admin.streetLine = el ? el.value : '';
  updateHqPreview();
  scheduleSave();
  updateBadges();
}

async function findDistrictForWard(provinceCode, wardCode) {
  for (const d of state.admin.districts) {
    const q = new URLSearchParams({
      catalog: 'v1',
      provinceCode,
      districtCode: d.code
    });
    const res = await fetch(`/api/admin/wards?${q}`);
    const wards = res.ok ? await res.json() : [];
    if (wards.some((w) => normCode(w.code) === normCode(wardCode))) {
      return normCode(d.code);
    }
  }
  return '';
}

async function onHqBridgeClick() {
  const legacyInput = $('#hqLegacyName');
  const legacyName = legacyInput ? legacyInput.value.trim() : '';
  if (!legacyName) {
    toast('Nhập tên phường/xã địa giới cũ.', 'error');
    return;
  }
  const q = new URLSearchParams({
    legacyName,
    targetCatalog: state.admin.catalog || 'v2'
  });
  const res = await fetch(`/api/admin/bridge/from-legacy?${q}`);
  const hits = res.ok ? await res.json() : [];
  if (!hits.length) {
    toast('Không tìm thấy địa giới tương ứng trong danh mục hiện tại.', 'error');
    return;
  }
  const hit = hits[0];
  state.admin.provinceCode = normCode(hit.province_code);
  state.admin.wardCode = normCode(hit.code);
  state.admin.districtCode = '';
  await loadAdminDistricts();
  if (state.admin.catalog === 'v1') {
    state.admin.districtCode = await findDistrictForWard(state.admin.provinceCode, state.admin.wardCode);
  }
  await loadAdminWards();
  syncHqNames();
  await syncLocationId();
  syncHqToDom();
  updateHqPreview();
  scheduleSave();
  updateBadges();
  toast(`Đã gợi ý: ${hit.name}`, 'ok');
}

function setupHqPicker() {
  const data = state.data || {};
  state.admin = {
    catalog: data.adminCatalog || null,
    warning: null,
    error: null,
    provinces: [],
    districts: [],
    wards: [],
    provinceCode: '',
    districtCode: '',
    wardCode: '',
    streetLine: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    locationId: data.location_id || ''
  };

  const province = $('#hqProvince');
  const district = $('#hqDistrict');
  const ward = $('#hqWard');
  const street = $('#hqStreet');
  const bridgeBtn = $('#hqBridgeBtn');

  if (province) province.addEventListener('change', onHqProvinceChange);
  if (district) district.addEventListener('change', onHqDistrictChange);
  if (ward) ward.addEventListener('change', onHqWardChange);
  if (street) street.addEventListener('input', onHqStreetInput);
  if (bridgeBtn) bridgeBtn.addEventListener('click', onHqBridgeClick);
}

/* ---------------- Sự kiện nhập liệu ---------------- */

function bindInputs() {
  $$('.blank', $('#sheet')).forEach((el) => {
    el.addEventListener('input', () => {
      scheduleSave();
      updateBadges();
    });
    el.addEventListener('change', () => {
      if (el.dataset.part) refreshAdminCatalog();
      scheduleSave();
      updateBadges();
    });
  });
}

function currentValues() {
  const values = {};
  $$('#sheet input[data-field], #sheet select[data-field]').forEach((el) => {
    values[el.dataset.field] = el.value;
  });
  DATE_PARTS.forEach((p) => {
    const el = $(`#sheet input[data-part="${p}"]`);
    if (el) values[p] = el.value;
  });
  const composed = composeHqAddress();
  if (composed) values.diaChi = composed;
  else if (state.data?.diaChi) values.diaChi = state.data.diaChi;
  if (state.admin.locationId) values.location_id = state.admin.locationId;
  if (state.admin.catalog) values.adminCatalog = state.admin.catalog;
  return values;
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(save, 500);
}

async function save() {
  if (!state.current) return;
  const res = await fetch(`/api/customers/${encodeURIComponent(state.current)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentValues())
  });
  if (!res.ok) {
    toast('Không lưu được thông tin. Kiểm tra lại.', 'error');
    return;
  }
  const updated = await res.json();
  state.data = updated;
  updateBadges();
}

/* ---------------- Trạng thái trường trống ---------------- */

function computeEmpty() {
  const empty = [];
  for (const sec of state.sections) {
    for (const key of sec.fields) {
      const meta = state.fields[key];
      if (!meta) continue;
      if (meta.array) {
        const arr = state.data ? state.data[key] : null;
        if (!Array.isArray(arr) || arr.length === 0) empty.push(key);
        continue;
      }
      if (key === 'thangDK' || key === 'namDK') continue;
      if (key === 'ngayDK') {
        const ok = DATE_PARTS.every((p) => {
          const el = $(`#sheet input[data-part="${p}"]`);
          const v = el ? el.value : (state.data ? (state.data[p] || '') : '');
          return !isEmptyVal(v);
        });
        if (!ok) empty.push(key);
        continue;
      }
      if (key === 'diaChi') {
        const composed = composeHqAddress();
        const v = composed || (state.data ? state.data.diaChi : '');
        if (isEmptyVal(v)) empty.push(key);
        continue;
      }
      const el = $(`#sheet input[data-field="${key}"], #sheet select[data-field="${key}"]`);
      const v = el ? el.value : (state.data ? ((state.data[key] ?? meta.default) || '') : '');
      if (isEmptyVal(v)) empty.push(key);
    }
  }
  return empty;
}

function updateBadges() {
  if (!state.current) return;
  const empty = computeEmpty();
  const count = empty.length;

  // con dấu trên đầu tờ hồ sơ
  const seal = $('#sheetSeal');
  const sealLabel = $('#sheetSealLabel');
  if (seal) {
    seal.textContent = count === 0 ? '✓' : String(count);
    seal.className = 'seal-badge' + (count === 0 ? ' done' : '');
    if (sealLabel) sealLabel.textContent = count === 0 ? 'đã đủ thông tin' : 'trường trống';
  }

  // dải liệt kê trường trống
  const strip = $('#missingStrip');
  if (strip) strip.outerHTML = renderMissingStrip(empty);

  // badge bên danh sách hồ sơ
  updateRailBadge(state.current, count);
}

function renderMissingStrip(empty) {
  if (empty.length === 0) {
    return `
      <div class="missing-strip ok" id="missingStrip">
        <div class="missing-title">✓ Đã đủ thông tin</div>
        <span class="missing-chips" style="font-size:13px;color:var(--ok)">Hồ sơ không còn trường nào thiếu — sẵn sàng in giấy.</span>
      </div>
    `;
  }

  const chips = empty.map((key) => {
    const label = state.fields[key] ? state.fields[key].label : key;
    return `<button type="button" class="chip" data-field-key="${esc(key)}">${esc(label)}</button>`;
  }).join('');

  return `
    <div class="missing-strip" id="missingStrip">
      <div class="missing-title">Còn ${empty.length} trường trống</div>
      <div class="missing-chips">${chips}</div>
    </div>
  `;
}

/* ---------------- In giấy ---------------- */

async function doPrint() {
  if (state.printing) return;
  if (state.admin.error === 'invalid_dk_date') {
    toast('Ngày đăng ký không hợp lệ — sửa trước khi in.', 'error');
    return;
  }
  state.printing = true;

  const btn = $('#printBtn');
  btn.disabled = true;
  btn.classList.remove('stamping');
  void btn.offsetWidth; // reset animation
  btn.classList.add('stamping');
  const spin = document.createElement('span');
  btn.classList.add('spinning');

  const body = { ...currentValues() };
  try {
    const res = await fetch(`/api/customers/${encodeURIComponent(state.current)}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast(json.error || 'In giấy thất bại.', 'error');
      return;
    }
    state.data = { ...state.data, ...currentValues() };
    updateBadges();
    toast(`Đã tạo giấy chứng nhận — <a href="${json.url}" target="_blank" rel="noopener">mở PDF</a>`, 'ok');
    window.open(json.url, '_blank');
  } catch (err) {
    toast('Không kết nối được máy in. Thử lại.', 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('stamping', 'spinning');
    state.printing = false;
  }
}

/* ---------------- Toast ---------------- */

let toastTimer = null;
function toast(message, kind = 'ok') {
  const el = $('#toast');
  el.innerHTML = message;
  el.className = 'toast show' + (kind === 'error' ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5000);
}

/* ---------------- Chip: cuộn tới trường ---------------- */

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.fieldKey;

  if (key === 'industry') {
    const section = $$('.cert-section').find((s) => s.textContent.includes('Ngành, nghề'));
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const el = $(`#sheet input[data-part="${key}"]`) ||
             $(`#sheet #hqStreet`) ||
             $(`#sheet input[data-field="${key}"], #sheet select[data-field="${key}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }
});

init();
