const fs = require('fs');
const { TEMPLATE_PATH } = require('./paths');
const { escapeHtml } = require('./html');

function loadTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, 'utf-8');
}

function buildIndustryRows(industries) {
  if (!industries || industries.length === 0) {
    return `<tr><td>1</td><td></td><td></td></tr>`;
  }
  return industries.map((item, index) => {
    return `<tr>
      <td>${index + 1}</td>
      <td>
        ${escapeHtml(item.tenNganh || '')}
        <br><span class="industry-note">(Cơ sở phải đảm bảo các điều kiện theo quy định pháp luật trong hoạt động kinh doanh)</span>
      </td>
      <td>${escapeHtml(item.maNganh || '')}</td>
    </tr>`;
  }).join('\n');
}

function fillTemplate(template, data) {
  let result = template;
  const text = (value, fallback = '') => escapeHtml(value || fallback);
  // Canonical key is chuThe; ownerType kept as read fallback for older info.json.
  const chuThe = data.chuThe || data.ownerType || 'Cá nhân';

  const replacements = {
    '{{coQuanChuQuan}}': text(data.coQuanChuQuan, 'UBND PHƯỜNG TÂN THUẬN'),
    '{{phongKinhTe}}': text(data.phongKinhTe, 'PHÒNG KINH TẾ, HẠ TẦNG VÀ ĐÔ THỊ'),
    '{{maSo}}': text(data.maSo),
    '{{ngayDK}}': text(data.ngayDK),
    '{{thangDK}}': text(data.thangDK),
    '{{namDK}}': text(data.namDK),
    '{{tenHKD}}': text(data.tenHKD),
    '{{diaChi}}': text(data.diaChi),
    '{{dienThoai}}': text(data.dienThoai),
    '{{fax}}': text(data.fax),
    '{{email}}': text(data.email),
    '{{website}}': text(data.website),
    '{{nganhNgheRows}}': buildIndustryRows(data.industry),
    '{{vonSo}}': text(data.vonSo),
    '{{vonChu}}': text(data.vonChu),
    '{{chuThe}}': text(chuThe),
    '{{hoTen}}': text(data.hoTen),
    '{{gioiTinh}}': text(data.gioiTinh),
    '{{ngaySinh}}': text(data.ngaySinh),
    '{{danToc}}': text(data.danToc),
    '{{quocTich}}': text(data.quocTich),
    '{{soCCCD}}': text(data.soCCCD),
    '{{noiThuongTru}}': text(data.noiThuongTru),
    '{{noiOHienTai}}': text(data.noiOHienTai)
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }

  return result;
}

module.exports = { loadTemplate, fillTemplate, buildIndustryRows };
