const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'src', 'template.html');
const CUSTOMERS_DIR = path.join(ROOT_DIR, 'customers');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

function loadTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, 'utf-8');
}

function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
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

async function renderToPdf(htmlContent, outputPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    return outputPath;
  } finally {
    await browser.close();
  }
}

function getCustomerDir(customerName) {
  return path.join(CUSTOMERS_DIR, slugify(customerName));
}

function getOutputDir(customerName) {
  return path.join(OUTPUT_DIR, slugify(customerName));
}

async function generatePdf(customerName) {
  const customerDir = getCustomerDir(customerName);
  const infoPath = path.join(customerDir, 'info.json');

  if (!fs.existsSync(infoPath)) {
    throw new Error(`Customer not found: ${customerName}\nExpected: ${infoPath}`);
  }

  const data = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
  const template = loadTemplate();
  const html = fillTemplate(template, data);

  const outputDir = getOutputDir(customerName);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `DKKD_${data.soCCCD}.pdf`);
  await renderToPdf(html, outputFile);

  return {
    customer: customerName,
    output: outputFile,
    data: {
      hoTen: data.hoTen,
      soCCCD: data.soCCCD,
      tenHKD: data.tenHKD
    }
  };
}

async function listCustomers() {
  const dirs = fs.readdirSync(CUSTOMERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_template')
    .map(d => {
      const infoPath = path.join(CUSTOMERS_DIR, d.name, 'info.json');
      if (fs.existsSync(infoPath)) {
        const data = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        return { name: d.name, hoTen: data.hoTen, soCCCD: data.soCCCD };
      }
      return null;
    })
    .filter(Boolean);
  return dirs;
}

async function generateAll() {
  const customers = await listCustomers();
  const results = [];

  for (const customer of customers) {
    console.log(`Generating PDF for ${customer.hoTen}...`);
    try {
      const result = await generatePdf(customer.name);
      results.push(result);
      console.log(`  ✅ ${result.output}`);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  return results;
}

module.exports = {
  loadTemplate,
  fillTemplate,
  escapeHtml,
  slugify,
  renderToPdf,
  generatePdf,
  listCustomers,
  generateAll,
  getCustomerDir,
  getOutputDir
};

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'list') {
    listCustomers().then(customers => {
      console.log('Customers:');
      customers.forEach(c => console.log(`  - ${c.hoTen} (${c.soCCCD})`));
    });
  } else if (args[0] === 'all') {
    generateAll().then(results => {
      console.log(`\nDone: ${results.length} PDFs generated`);
    });
  } else if (args[0]) {
    generatePdf(args[0]).then(result => {
      console.log(`✅ ${result.output}`);
    }).catch(err => console.error(err.message));
  } else {
    console.log('Usage:');
    console.log('  node render.js list          List all customers');
    console.log('  node render.js <name>        Generate PDF for customer');
    console.log('  node render.js all           Generate all PDFs');
  }
}
