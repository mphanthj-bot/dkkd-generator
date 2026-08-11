/* Bàn đăng ký hộ kinh doanh — GUI điền thông tin còn thiếu */

const state = {
  customers: [],
  fields: {},
  sections: [],
  current: null,   // tên hồ sơ đang xem
  data: null,      // info.json của hồ sơ đang xem
  saveTimer: null,
  printing: false
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

/* ---------------- Sự kiện nhập liệu ---------------- */

function bindInputs() {
  $$('.blank', $('#sheet')).forEach((el) => {
    el.addEventListener('input', () => {
      scheduleSave();
      updateBadges();
    });
    el.addEventListener('change', () => {
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
             $(`#sheet input[data-field="${key}"], #sheet select[data-field="${key}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }
});

init();
