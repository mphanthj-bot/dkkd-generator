const { loadTemplate, fillTemplate } = require('./lib/template');
const { escapeHtml } = require('./lib/html');
const { slugify } = require('./lib/slug');
const { renderToPdf, generatePdf, generateAll } = require('./lib/pdf');
const { listCustomers, getCustomerDir, getOutputDir } = require('./lib/customers');

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
