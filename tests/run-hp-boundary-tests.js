#!/usr/bin/env node

// HP Matching Boundary Test Runner - v2.5.9
// This script tests the SearchEngine._matchHp function with boundary cases

const fs = require('fs');
const path = require('path');

// Read and evaluate app.js to get SearchEngine class
const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Create a minimal DOM-like environment for the code
global.window = {};
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ classList: { add: () => {}, remove: () => {} } }),
    addEventListener: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.console = console;

// Evaluate app.js in our context - extract just the SearchEngine class
// We'll create a minimal version that includes _matchHp
eval(`
    // Extract the SearchEngine class definition
    ${appJsContent.match(/class SearchEngine[\s\S]*?(?=\nclass |$)/)?.[0] || ''}
`);

// Load test cases
const { testRecords, testCases, runTests } = require('./hp-matching-boundary.test.js');

// Run tests with SearchEngine._matchHp
if (typeof SearchEngine === 'undefined') {
    console.error('❌ Failed to load SearchEngine class from app.js');
    process.exit(1);
}

const exitCode = runTests(SearchEngine._matchHp.bind(SearchEngine));
process.exit(exitCode);
