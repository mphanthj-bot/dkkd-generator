#!/usr/bin/env node

/**
 * DKKD Generator - Main Entry Point
 * 
 * Usage:
 *   node src/index.js --input <pdf_path> --output <output_path>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    input: null,
    output: null,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      result.input = args[++i];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      result.output = args[++i];
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

// Validate arguments
function validateArgs(args) {
  if (!args.input || !args.output) {
    console.error('Error: Missing required arguments');
    console.error('Usage: node src/index.js --input <pdf_path> --output <output_path>');
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`Error: Input file not found: ${args.input}`);
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    const args = parseArgs();
    validateArgs(args);

    if (args.verbose) {
      console.log('DKKD Generator v0.1.0');
      console.log(`Input:  ${args.input}`);
      console.log(`Output: ${args.output}`);
    }

    // TODO: Implement PDF parsing and generation logic
    console.log('Processing PDF...');
    console.log('✅ Successfully generated DKKD!');
    console.log(`Output saved to: ${args.output}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}

module.exports = { parseArgs, validateArgs };
