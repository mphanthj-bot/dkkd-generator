const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'src', 'template.html');
const CUSTOMERS_DIR = path.join(ROOT_DIR, 'customers');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SIGNATORIES_DIR = path.join(ROOT_DIR, 'data', 'signatories');
const ADMIN_DIR = path.join(ROOT_DIR, 'data', 'admin');
module.exports = { ROOT_DIR, TEMPLATE_PATH, CUSTOMERS_DIR, OUTPUT_DIR, SIGNATORIES_DIR, ADMIN_DIR };
