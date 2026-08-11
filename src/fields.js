// Field metadata for the certificate (Giấy chứng nhận đăng ký hộ kinh doanh).
// Shared between the API server and the GUI so empty-field detection,
// labels, and the print flow all use the same definitions.

const FIELDS = {
  maSo: { label: 'Mã số hộ kinh doanh', mono: true },
  ngayDK: { label: 'Ngày đăng ký', datePart: 'ngayDK' },
  thangDK: { label: '', datePart: 'ngayDK' },
  namDK: { label: '', datePart: 'ngayDK' },
  tenHKD: { label: 'Tên hộ kinh doanh viết bằng tiếng Việt' },
  diaChi: { label: 'Trụ sở của hộ kinh doanh' },
  dienThoai: { label: 'Điện thoại' },
  fax: { label: 'Fax' },
  email: { label: 'Thư điện tử' },
  website: { label: 'Website' },
  industry: { label: 'Ngành, nghề kinh doanh', array: true },
  vonSo: { label: 'Vốn kinh doanh (bằng số)', mono: true },
  vonChu: { label: 'Vốn kinh doanh (bằng chữ)' },
  chuThe: { label: 'Chủ thể thành lập hộ kinh doanh', options: ['Cá nhân'], default: 'Cá nhân' },
  hoTen: { label: 'Họ và tên' },
  gioiTinh: { label: 'Giới tính', options: ['Nam', 'Nữ'] },
  ngaySinh: { label: 'Ngày sinh' },
  danToc: { label: 'Dân tộc' },
  quocTich: { label: 'Quốc tịch' },
  soCCCD: { label: 'Số định danh cá nhân', mono: true },
  noiThuongTru: { label: 'Nơi thường trú' },
  noiOHienTai: { label: 'Nơi ở hiện tại' }
};

// Section order mirrors the certificate layout.
const SECTIONS = [
  { title: 'Thông tin đăng ký', fields: ['maSo', 'ngayDK', 'thangDK', 'namDK'] },
  { title: '1. Tên hộ kinh doanh', fields: ['tenHKD'] },
  { title: '2. Trụ sở của hộ kinh doanh', fields: ['diaChi', 'dienThoai', 'fax', 'email', 'website'] },
  { title: '3. Ngành, nghề kinh doanh', fields: ['industry'] },
  { title: '4. Vốn kinh doanh', fields: ['vonSo', 'vonChu'] },
  { title: '5. Chủ thể thành lập hộ kinh doanh', fields: ['chuThe'] },
  { title: '6. Thông tin về chủ hộ kinh doanh', fields: ['hoTen', 'gioiTinh', 'ngaySinh', 'danToc', 'quocTich', 'soCCCD', 'noiThuongTru', 'noiOHienTai'] }
];

const DATE_PARTS = ['ngayDK', 'thangDK', 'namDK'];

// Persisted via API save/print but not shown as certificate form fields.
const EXTRA_SAVE_KEYS = ['location_id', 'adminCatalog'];

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === '';
}

// Effective value after render.js defaults are applied (mirrors fillTemplate).
function effectiveValue(data, key, meta) {
  const value = data[key];
  if (!isEmpty(value)) return value;
  return meta.default || '';
}

// Fields whose final value on the certificate would be blank.
// coQuanChuQuan / phongKinhTe are fixed header defaults (not in FIELDS).
function collectEmpty(data) {
  const empty = [];
  for (const key of Object.keys(FIELDS)) {
    const meta = FIELDS[key];
    if (meta.array) {
      if (isEmpty(data[key])) empty.push(key);
      continue;
    }
    if (key === 'thangDK' || key === 'namDK') continue; // part of the date row
    if (key === 'ngayDK') {
      const ok = DATE_PARTS.every((p) => !isEmpty(effectiveValue(data, p, FIELDS[p])));
      if (!ok) empty.push(key);
      continue;
    }
    if (isEmpty(effectiveValue(data, key, meta))) empty.push(key);
  }
  return empty;
}

module.exports = { FIELDS, SECTIONS, DATE_PARTS, EXTRA_SAVE_KEYS, isEmpty, effectiveValue, collectEmpty };
