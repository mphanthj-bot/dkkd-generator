const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { loadTemplate, fillTemplate } = require('./template');
const { getCustomerDir, getOutputDir, loadInfo, listCustomers } = require('./customers');
const { loadSignatory } = require('./stamp');

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

async function generatePdf(customerName) {
  const customerDir = getCustomerDir(customerName);
  const infoPath = path.join(customerDir, 'info.json');

  if (!fs.existsSync(infoPath)) {
    throw new Error(`Customer not found: ${customerName}\nExpected: ${infoPath}`);
  }

  const data = loadInfo(path.basename(customerDir));
  const signatory = loadSignatory('default');
  const template = loadTemplate();
  const html = fillTemplate(template, data, signatory);

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

module.exports = { renderToPdf, generatePdf, generateAll };
