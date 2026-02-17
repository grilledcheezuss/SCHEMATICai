// Voltage Parsing Tests - v2.5.11
// Tests for dual-voltage normalization (120/240, 277/480, etc.)

// Helper: Normalize CAD control codes (copied from worker.js for testing)
function normalizeCADText(text) {
    return text.replace(/%%[uU]([0-9A-Fa-f]{4})/g, (match, code) => {
        const charCode = parseInt(code, 16);
        return String.fromCharCode(charCode);
    });
}

// Manufacturer constants (simplified for testing)
const EXACT_MFGS = {
    'SQUARE D': ['SQUARE D', 'SQ D', 'SCHNEIDER'],
    'EATON': ['EATON', 'CUTLER HAMMER', 'C-H', 'CH']
};

// Voltage priority list (from worker.js)
const VOLT_PRIORITY = [
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|230|220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:120|115|110)\b/i }
];

// Canonical dual-voltage pairs that should NOT be marked as varied
// These represent split-phase configurations, not true dual-voltage systems
const CANONICAL_DUAL_VOLTAGE_PAIRS = [
    { low: '120', high: '240' },   // Common residential/light commercial split-phase
    { low: '277', high: '480' }    // Common commercial/industrial split-phase 
];

// Test version of extractSpecsStrict (voltage parsing only) - BEFORE fix
function extractVoltageOld(t) {
    if (!t || typeof t !== 'string') return { volt: null, voltV: false };
    
    t = normalizeCADText(t);
    
    const foundVolts = new Set();
    for (const v of VOLT_PRIORITY) { 
        if (v.match.test(t)) { 
            foundVolts.add(v.id);
        } 
    }
    
    if (foundVolts.size === 1) {
        return { volt: [...foundVolts][0], voltV: false };
    } else if (foundVolts.size > 1) {
        // Multiple voltages found - mark as varied
        return { volt: [...foundVolts][0], voltV: true };
    }
    
    return { volt: null, voltV: false };
}

// Test version of extractSpecsStrict (voltage parsing only) - AFTER fix
function extractVoltageNew(t) {
    if (!t || typeof t !== 'string') return { volt: null, voltV: false };
    
    t = normalizeCADText(t);
    
    const foundVolts = new Set();
    for (const v of VOLT_PRIORITY) { 
        if (v.match.test(t)) { 
            foundVolts.add(v.id);
        } 
    }
    
    if (foundVolts.size === 1) {
        return { volt: [...foundVolts][0], voltV: false };
    } else if (foundVolts.size > 1) {
        // Check if this is a canonical dual-voltage pair
        const voltArray = [...foundVolts];
        const isCanonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.some(pair => {
            return (voltArray.includes(pair.low) && voltArray.includes(pair.high) && voltArray.length === 2);
        });
        
        if (isCanonicalPair) {
            // Canonical pair - use higher voltage, don't mark as varied
            const pair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(p => 
                voltArray.includes(p.low) && voltArray.includes(p.high)
            );
            return { volt: pair.high, voltV: false };
        } else {
            // Multiple voltages found - mark as varied
            return { volt: [...foundVolts][0], voltV: true };
        }
    }
    
    return { volt: null, voltV: false };
}

// Test cases
const testCases = [
    // Canonical dual-voltage pairs - should NOT be marked as varied
    {
        input: "VOLTAGE: 120/240V",
        expected: { volt: '240', voltV: false },
        description: "120/240V slash notation (canonical split-phase)"
    },
    {
        input: "120/240 VAC 3PH",
        expected: { volt: '240', voltV: false },
        description: "120/240 VAC (canonical split-phase)"
    },
    {
        input: "VOLT 277/480",
        expected: { volt: '480', voltV: false },
        description: "277/480 slash notation (canonical split-phase)"
    },
    {
        input: "277/480V 3 PHASE",
        expected: { volt: '480', voltV: false },
        description: "277/480V (canonical split-phase)"
    },
    {
        input: "Panel: 120/240 VAC",
        expected: { volt: '240', voltV: false },
        description: "Panel with 120/240 VAC (canonical split-phase)"
    },
    
    // Single voltage - should NOT be marked as varied
    {
        input: "240V SINGLE PHASE",
        expected: { volt: '240', voltV: false },
        description: "Single voltage (240V only)"
    },
    {
        input: "480V 3 PHASE",
        expected: { volt: '480', voltV: false },
        description: "Single voltage (480V only)"
    },
    {
        input: "VOLTAGE: 120V",
        expected: { volt: '120', voltV: false },
        description: "Single voltage (120V only)"
    },
    
    // True conflicts - SHOULD be marked as varied
    {
        input: "240V/480V dual voltage panel",
        expected: { volt: '480', voltV: true },
        description: "True dual voltage (240/480 - not canonical)"
    },
    {
        input: "208V or 240V",
        expected: { volt: '240', voltV: true },
        description: "Alternative voltages (208 or 240)"
    },
    {
        input: "Supports 120V, 208V, and 240V",
        expected: { volt: '240', voltV: true },
        description: "Multiple unrelated voltages"
    },
    {
        input: "480V 575V",
        expected: { volt: '575', voltV: true },
        description: "Two high voltages (truly varied)"
    },
    
    // Edge cases
    {
        input: "NO VOLTAGE SPECIFIED",
        expected: { volt: null, voltV: false },
        description: "No voltage value"
    },
    {
        input: "MOTOR PUMP PANEL",
        expected: { volt: null, voltV: false },
        description: "No voltage value (control text)"
    }
];

// Simple test runner
let passed = 0;
let failed = 0;

console.log('\n🧪 Voltage Parsing Tests - v2.5.11\n');
console.log('Testing dual-voltage normalization...\n');

console.log('='.repeat(60));
console.log('Comparing OLD vs NEW implementation:\n');

testCases.forEach((test, index) => {
    const oldResult = extractVoltageOld(test.input);
    const newResult = extractVoltageNew(test.input);
    const success = (newResult.volt === test.expected.volt && 
                    newResult.voltV === test.expected.voltV);
    
    if (success) {
        passed++;
        console.log(`✅ Test ${index + 1}: ${test.description}`);
        if (oldResult.voltV !== newResult.voltV) {
            console.log(`   📝 OLD marked as varied: ${oldResult.voltV}, NEW: ${newResult.voltV} (FIXED)`);
        }
    } else {
        failed++;
        console.log(`❌ Test ${index + 1}: ${test.description}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Expected: volt=${test.expected.volt}, voltV=${test.expected.voltV}`);
        console.log(`   Got:      volt=${newResult.volt}, voltV=${newResult.voltV}`);
    }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
    console.log('✨ All tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed.\n');
    process.exit(1);
}
