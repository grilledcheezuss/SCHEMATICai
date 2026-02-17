/**
 * Test for v2.5.16 Smarter Page Classification
 * 
 * Tests that page classification uses:
 * - Page number heuristics (page 1=Title, page 2=Info, pages 3-4=Power/Control)
 * - Content-based signals (keywords)
 * - Aspect ratio for landscape/portrait detection
 */

console.log('🧪 Testing v2.5.16 Smarter Page Classification\n');

// Simplified PageClassifier logic for testing
function classifyPage(textItems, aspectRatio, pageNumber) {
    const text = textItems.join(' ').toUpperCase();
    const itemCount = textItems.length;
    
    // Content scoring
    const SCHEMATIC_TERMS = ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'TERMINAL', 'WIRING'];
    const INFO_TERMS = ['TABLE OF CONTENTS', 'INDEX', 'NOTES', 'SCHEDULE', 'BOM'];
    const TITLE_TERMS = ['PROJECT', 'CLIENT', 'DRAWN BY', 'DATE', 'REVISION'];
    const POWER_TERMS = ['POWER', 'ONE LINE', 'ONELINE'];
    const CONTROL_TERMS = ['CONTROL', 'LOGIC', 'SEQUENCE'];
    
    let schematicScore = 0;
    let infoScore = 0;
    let titleScore = 0;
    let powerScore = 0;
    let controlScore = 0;
    
    SCHEMATIC_TERMS.forEach(term => { if(text.includes(term)) schematicScore += 10; });
    INFO_TERMS.forEach(term => { if(text.includes(term)) infoScore += 15; });
    TITLE_TERMS.forEach(term => { if(text.includes(term)) titleScore += 5; });
    POWER_TERMS.forEach(term => { if(text.includes(term)) powerScore += 15; });
    CONTROL_TERMS.forEach(term => { if(text.includes(term)) controlScore += 15; });
    
    if(itemCount < 50 && titleScore > 0) titleScore += 20;
    
    const isBorderless = itemCount > 20 && !text.includes('BORDER');
    
    // === PAGE NUMBER HEURISTICS ===
    
    // Page 1: Almost always title
    if(pageNumber === 1) {
        return 'TITLE';
    }
    
    // Page 2: Usually info/notes
    if(pageNumber === 2) {
        if(infoScore > 10 || itemCount > 100) {
            return isBorderless ? 'INFO_BORDERLESS' : 'INFO';
        }
    }
    
    // Pages 3-4: Usually power/control schematics
    if(pageNumber === 3 || pageNumber === 4) {
        if(schematicScore > 20 || powerScore > 10 || controlScore > 10) {
            const isLandscape = aspectRatio > 1;
            if(isBorderless) {
                return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
            }
            return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
        }
    }
    
    // Content-based fallback
    if(titleScore > 25) return 'TITLE';
    if(infoScore > 20) return isBorderless ? 'INFO_BORDERLESS' : 'INFO';
    if(schematicScore > 30) {
        const isLandscape = aspectRatio > 1;
        return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
    }
    
    return 'GENERAL';
}

// Test cases
const testCases = [
    {
        name: "Page 1 with title keywords",
        textItems: ['PROJECT', 'CLIENT', 'DRAWN BY', 'DATE', 'REVISION'],
        aspectRatio: 1.3,
        pageNumber: 1,
        expected: 'TITLE',
        reason: 'Page 1 should be classified as TITLE'
    },
    {
        name: "Page 2 with many items and border (info page)",
        textItems: Array(150).fill('NOTES SCHEDULE SPECIFICATION BORDER'),
        aspectRatio: 1.0,
        pageNumber: 2,
        expected: 'INFO',
        reason: 'Page 2 with many items and border should be INFO'
    },
    {
        name: "Page 2 borderless with info keywords",
        textItems: Array(50).fill('TABLE OF CONTENTS INDEX NOTES'),
        aspectRatio: 1.0,
        pageNumber: 2,
        expected: 'INFO_BORDERLESS',
        reason: 'Page 2 without border indicators should be INFO_BORDERLESS'
    },
    {
        name: "Page 3 landscape with schematic keywords",
        textItems: ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'CONTACTOR', 'RELAY'],
        aspectRatio: 1.5,
        pageNumber: 3,
        expected: 'SCHEMATIC_LANDSCAPE',
        reason: 'Page 3 landscape with schematic terms should be SCHEMATIC_LANDSCAPE'
    },
    {
        name: "Page 4 portrait with control keywords",
        textItems: ['CONTROL', 'LOGIC', 'SEQUENCE', 'L1', 'L2'],
        aspectRatio: 0.7,
        pageNumber: 4,
        expected: 'SCHEMATIC_PORTRAIT',
        reason: 'Page 4 portrait with control terms should be SCHEMATIC_PORTRAIT'
    },
    {
        name: "Page 3 with power one-line keywords",
        textItems: ['POWER', 'ONE LINE', 'ONELINE'],
        aspectRatio: 1.4,
        pageNumber: 3,
        expected: 'SCHEMATIC_LANDSCAPE',
        reason: 'Page 3 with power keywords should be SCHEMATIC_LANDSCAPE'
    },
    {
        name: "Page 5 with strong schematic score",
        textItems: ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'TERMINAL', 'WIRING', 'CONTACTOR'],
        aspectRatio: 1.3,
        pageNumber: 5,
        expected: 'SCHEMATIC_LANDSCAPE',
        reason: 'High schematic score should trigger schematic classification'
    },
    {
        name: "Page 1 with minimal content",
        textItems: ['PROJECT'],
        aspectRatio: 1.0,
        pageNumber: 1,
        expected: 'TITLE',
        reason: 'Page 1 always classified as TITLE even with minimal content'
    }
];

console.log('Running page classification tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    const result = classifyPage(test.textItems, test.aspectRatio, test.pageNumber);
    
    if (result === test.expected) {
        console.log(`  ✓ PASS: Classified as ${result}`);
        console.log(`    Reason: ${test.reason}`);
        passed++;
    } else {
        console.log(`  ✗ FAIL: Expected ${test.expected}, got ${result}`);
        console.log(`    Reason: ${test.reason}`);
        failed++;
    }
    console.log();
});

console.log('='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
    console.log('✨ All page classification tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
} else {
    console.log('❌ Some tests failed!');
    console.log('='.repeat(60));
    process.exit(1);
}
