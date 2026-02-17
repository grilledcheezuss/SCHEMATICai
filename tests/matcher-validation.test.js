// Matcher Validation Test - v2.5.22
// Validates that the new matcher classes produce identical results to the old implementation

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing v2.5.22 Matcher Classes Validation\n');

// Read and evaluate app.js to get matcher classes
const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Helper function to extract a class by name
function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) {
        throw new Error(`Could not find ${className} class in app.js`);
    }
    
    let braceCount = 0;
    let inClass = false;
    let endIdx = startIdx;
    
    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
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
    
    const classCode = content.substring(startIdx, endIdx);
    return new Function('return ' + classCode)();
}

// Extract all matcher classes
const VoltageMatcher = extractClass('VoltageMatcher', appJsContent);
const HorsepowerMatcher = extractClass('HorsepowerMatcher', appJsContent);
const KeywordMatcher = extractClass('KeywordMatcher', appJsContent);

console.log('✅ Successfully loaded all matcher classes\n');

// Test data
const voltageTests = [
    { record: { volt: '480' }, search: '480', expected: { matches: true, isFuzzy: false, weight: 500 } },
    { record: { volt: '277/480' }, search: '480', expected: { matches: true, isFuzzy: false, weight: 500 } },
    { record: { volt: '120/240' }, search: '240', expected: { matches: true, isFuzzy: false, weight: 500 } },
    { record: { volt: '120/240' }, search: '480', expected: { matches: false } },
    { record: { desc: '480V motor' }, search: '480', expected: { matches: true, isFuzzy: true, weight: 100 } },
    { record: { volt: '277' }, search: '277', expected: { matches: true, isFuzzy: false, weight: 500 } },
    { record: { volt: '277/480' }, search: '277', expected: { matches: false } },
];

const hpTests = [
    { record: { hp: '5' }, search: '5', expected: { matches: true, isVariant: false, weight: 5000 } },
    { record: { desc: '5 HP motor' }, search: '5', expected: { matches: true, isVariant: true, weight: 2000 } },
    { record: { desc: '7 1/2 HP' }, search: '7.5', expected: { matches: true, isVariant: true, weight: 2000 } },
    { record: { desc: '1.5 HP' }, search: '0.5', expected: { matches: false } },
    { record: { desc: '0.5 HP' }, search: '0.5', expected: { matches: true, isVariant: true, weight: 2000 } },
];

const keywordTests = [
    { record: { id: 'CP-1234', desc: 'SURGE ARRESTOR' }, raw: ['SA'], expanded: [['SA', 'SURGE ARRESTOR']], expected: true },
    { record: { id: 'CP-1234', desc: 'MOTOR CONTROL' }, raw: ['SA'], expanded: [['SA', 'SURGE ARRESTOR']], expected: false },
    { record: { id: 'CP-1234', desc: 'SA INCLUDED' }, raw: ['SA'], expanded: [['SA', 'SURGE ARRESTOR']], expected: true },
    { record: { id: 'CP-1234', desc: 'MOTOR' }, raw: [], expanded: [], expected: true }, // No filter
];

// Run tests
let passedTests = 0;
let failedTests = 0;

console.log('📋 VoltageMatcher Tests');
console.log('─────────────────────────────────────────\n');

voltageTests.forEach((test, i) => {
    const result = VoltageMatcher.matches(test.record, test.search);
    const passed = result.matches === test.expected.matches &&
                   (!test.expected.matches || (
                       result.isFuzzy === test.expected.isFuzzy &&
                       result.weight === test.expected.weight
                   ));
    
    if (passed) {
        console.log(`  ✅ Test ${i + 1}: PASS`);
        passedTests++;
    } else {
        console.log(`  ❌ Test ${i + 1}: FAIL`);
        console.log(`     Expected: ${JSON.stringify(test.expected)}`);
        console.log(`     Got:      ${JSON.stringify(result)}`);
        failedTests++;
    }
});

console.log('\n📋 HorsepowerMatcher Tests');
console.log('─────────────────────────────────────────\n');

hpTests.forEach((test, i) => {
    const result = HorsepowerMatcher.matches(test.record, test.search);
    const passed = result.matches === test.expected.matches &&
                   (!test.expected.matches || (
                       result.isVariant === test.expected.isVariant &&
                       result.weight === test.expected.weight
                   ));
    
    if (passed) {
        console.log(`  ✅ Test ${i + 1}: PASS`);
        passedTests++;
    } else {
        console.log(`  ❌ Test ${i + 1}: FAIL`);
        console.log(`     Expected: ${JSON.stringify(test.expected)}`);
        console.log(`     Got:      ${JSON.stringify(result)}`);
        failedTests++;
    }
});

console.log('\n📋 KeywordMatcher Tests');
console.log('─────────────────────────────────────────\n');

keywordTests.forEach((test, i) => {
    const result = KeywordMatcher.matches(test.record, test.raw, test.expanded);
    const passed = result === test.expected;
    
    if (passed) {
        console.log(`  ✅ Test ${i + 1}: PASS`);
        passedTests++;
    } else {
        console.log(`  ❌ Test ${i + 1}: FAIL`);
        console.log(`     Expected: ${test.expected}`);
        console.log(`     Got:      ${result}`);
        failedTests++;
    }
});

console.log('\n═══════════════════════════════════════');
console.log(`📊 Results: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`);
console.log('═══════════════════════════════════════\n');

if (failedTests === 0) {
    console.log('✨ All matcher validation tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed!');
    process.exit(1);
}
