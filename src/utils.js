/**
 * Utility Functions
 */

/**
 * Validate file path
 * @param {string} filePath - File path to validate
 * @returns {boolean} Is valid path
 */
function isValidPath(filePath) {
  return typeof filePath === 'string' && filePath.length > 0;
}

/**
 * Get file extension
 * @param {string} filePath - File path
 * @returns {string} File extension
 */
function getFileExtension(filePath) {
  return filePath.split('.').pop().toLowerCase();
}

/**
 * Check if file is PDF
 * @param {string} filePath - File path
 * @returns {boolean} Is PDF file
 */
function isPDFFile(filePath) {
  return getFileExtension(filePath) === 'pdf';
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function mergeObjects(target, source) {
  return { ...target, ...source };
}

module.exports = {
  isValidPath,
  getFileExtension,
  isPDFFile,
  deepClone,
  mergeObjects,
};
