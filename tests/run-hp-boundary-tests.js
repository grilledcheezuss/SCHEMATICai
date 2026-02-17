#!/usr/bin/env node

// HP Matching Boundary Test Runner - v2.5.22
// This script tests the HorsepowerMatcher.matches function with boundary cases

const fs = require('fs');
const path = require('path');

// Read and evaluate app.js to get HorsepowerMatcher class
const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Extract the HorsepowerMatcher class
// Find the matching closing brace by counting braces
const startIdx = appJsContent.indexOf('class HorsepowerMatcher {');
if (startIdx === -1) {
    console.error('❌ Could not find HorsepowerMatcher class in app.js');
    process.exit(1);
}

let braceCount = 0;
let inClass = false;
let endIdx = startIdx;

for (let i = startIdx; i < appJsContent.length; i++) {
    const char = appJsContent[i];
    if (char === '{') {
        braceCount++;
        inClass = true;
    } else if (char === '}') {
        braceCount--;
        if (inClass && braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
}

const horsepowerMatcherCode = appJsContent.substring(startIdx, endIdx);

// Use Function constructor to evaluate the class and make it available
const HorsepowerMatcher = new Function('return ' + horsepowerMatcherCode)();

// Load test cases
const { testRecords, testCases, runTests } = require('./hp-matching-boundary.test.js');

// Run tests with HorsepowerMatcher.matches
if (typeof HorsepowerMatcher === 'undefined' || typeof HorsepowerMatcher.matches !== 'function') {
    console.error('❌ Failed to load HorsepowerMatcher class from app.js');
    process.exit(1);
}

const exitCode = runTests(HorsepowerMatcher.matches.bind(HorsepowerMatcher));
process.exit(exitCode);
