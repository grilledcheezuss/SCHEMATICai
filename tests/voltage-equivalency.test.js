/**
 * Test for v2.5.21 Voltage Equivalency Matching
 * 
 * Tests that voltage search filters properly handle:
 * - Industry-standard voltage equivalents (240V/230V/220V, 480V/460V/440V)
 * - Dual-voltage configurations (120/240V, 277/480V, 120/208V)
 * - Proper inclusion logic (240V search SHOULD match 120/240V panels)
 * - Proper exclusion logic (277V search should NOT match 277/480V panels)
 */

console.log('🧪 Testing v2.5.21 Voltage Equivalency Matching\n');

// VOLTAGE_EQUIVALENTS structure from v2.5.21
const VOLTAGE_EQUIVALENTS = {
    '120': {
        fieldPatterns: [
            /^120$/i,
            /^115$/i,
            /^110$/i
        ],
        descPatterns: [
            /\b120\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b115\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b110\s*(?:V|VAC|VOLT|PH)\b/i
        ],
        excludePatterns: [
            /\b120\s*[\/\-]\s*\d+/i
        ]
    },
    '240': {
        fieldPatterns: [
            /^240$/i,
            /^230$/i,
            /^220$/i,
            /^120\s*[\/\-]\s*240$/i,
            /^120\s*[\/\-]\s*230$/i
        ],
        descPatterns: [
            /\b240\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b230\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b220\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b120\s*[\/\-]\s*240(?:\s*(?:V|VAC|VOLT|PH))?\b/i,
            /\b120\s*[\/\-]\s*230(?:\s*(?:V|VAC|VOLT|PH))?\b/i
        ],
        excludePatterns: []
    },
    '208': {
        fieldPatterns: [
            /^208$/i,
            /^120\s*[\/\-]\s*208$/i
        ],
        descPatterns: [
            /\b208\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b120\s*[\/\-]\s*208(?:\s*(?:V|VAC|VOLT|PH))?\b/i
        ],
        excludePatterns: []
    },
    '277': {
        fieldPatterns: [
            /^277$/i
        ],
        descPatterns: [
            /\b277\s*(?:V|VAC|VOLT|PH)\b/i
        ],
        excludePatterns: [
            /\b277\s*[\/\-]\s*480/i
        ]
    },
    '480': {
        fieldPatterns: [
            /^480$/i,
            /^460$/i,
            /^440$/i,
            /^277\s*[\/\-]\s*480$/i
        ],
        descPatterns: [
            /\b480\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b460\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b440\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b277\s*[\/\-]\s*480(?:\s*(?:V|VAC|VOLT|PH))?\b/i
        ],
        excludePatterns: [
            /\b120\s*[\/\-]\s*240/i,
            /\b120\s*[\/\-]\s*230/i
        ]
    },
    '575': {
        fieldPatterns: [
            /^575$/i,
            /^600$/i
        ],
        descPatterns: [
            /\b575\s*(?:V|VAC|VOLT|PH)\b/i,
            /\b600\s*(?:V|VAC|VOLT|PH)\b/i
        ],
        excludePatterns: []
    }
};

// Simulate SearchEngine voltage filtering logic from v2.5.21
function simulateVoltageFilterV2521(record, searchVolt) {
    let voltV = record.voltV || false;
    const voltConfig = VOLTAGE_EQUIVALENTS[searchVolt];
    
    if (!voltConfig) {
        // Fallback for unknown voltage values - exact match only
        if(record.volt && record.volt.includes(searchVolt)) {
            return { matched: true, voltV: false, weight: 500, isFieldMatch: true };
        } else {
            return { matched: false, voltV: false, weight: 0, isFieldMatch: false };
        }
    }
    
    let matched = false;
    let isFieldMatch = false;
    
    // === STEP 1: Check volt field for equivalents ===
    if (record.volt) {
        // Check if volt field matches any equivalent pattern (use lenient field patterns)
        for (const pattern of voltConfig.fieldPatterns) {
            if (pattern.test(record.volt)) {
                matched = true;
                isFieldMatch = true;
                break;
            }
        }
        
        // If matched, check exclusion patterns
        if (matched) {
            for (const excludePattern of voltConfig.excludePatterns) {
                if (excludePattern.test(record.volt)) {
                    return { matched: false, voltV: false, weight: 0, isFieldMatch: false }; // Excluded
                }
            }
        }
    }
    
    // === STEP 2: If no field match, check description ===
    if (!matched && record.desc) {
        // Check if description matches any equivalent pattern (use strict desc patterns)
        for (const pattern of voltConfig.descPatterns) {
            if (pattern.test(record.desc)) {
                matched = true;
                break;
            }
        }
        
        // If matched, check exclusion patterns
        if (matched) {
            for (const excludePattern of voltConfig.excludePatterns) {
                if (excludePattern.test(record.desc)) {
                    return { matched: false, voltV: false, weight: 0, isFieldMatch: false }; // Excluded
                }
            }
        }
    }
    
    // === STEP 3: Apply scoring ===
    if (!matched) {
        return { matched: false, voltV: false, weight: 0, isFieldMatch: false };
    }
    
    if (isFieldMatch) {
        // Strict field match - green badge
        return { matched: true, voltV: false, weight: 500, isFieldMatch: true };
    } else {
        // Fuzzy description match - orange badge
        return { matched: true, voltV: true, weight: 100, isFieldMatch: false };
    }
}

// Test cases for voltage equivalency matching
const testCases = [
    // ===== 240V GROUP TESTS =====
    {
        name: "240V search: Exact 240V field match",
        record: { volt: "240", desc: "CONTROL PANEL 240V 1PH" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "240V search: 230V field match (equivalent)",
        record: { volt: "230", desc: "CONTROL PANEL 230V 1PH" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "240V search: 220V field match (equivalent)",
        record: { volt: "220", desc: "CONTROL PANEL 220V 1PH" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "240V search: 120/240V field match (CRITICAL - should INCLUDE)",
        record: { volt: "120/240", desc: "PANEL 120/240V SPLIT PHASE" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "240V search: 120/230V field match (CRITICAL - should INCLUDE)",
        record: { volt: "120/230", desc: "PANEL 120/230V SPLIT PHASE" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "240V search: 230V description match (no field)",
        record: { volt: null, desc: "CONTROL PANEL 230 VAC SINGLE PHASE" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    {
        name: "240V search: 120/240V description match (no field)",
        record: { volt: null, desc: "LIGHTING PANEL 120/240V 1PH" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    {
        name: "240V search: Should NOT match 480V",
        record: { volt: "480", desc: "CONTROL PANEL 480V 3PH" },
        searchVolt: "240",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    
    // ===== 480V GROUP TESTS =====
    {
        name: "480V search: Exact 480V field match",
        record: { volt: "480", desc: "CONTROL PANEL 480V 3PH" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "480V search: 460V field match (equivalent - motor nameplate)",
        record: { volt: "460", desc: "MOTOR STARTER 460V 3PH" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "480V search: 440V field match (equivalent - legacy)",
        record: { volt: "440", desc: "CONTROL PANEL 440V 3PH" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "480V search: 277/480V field match (CRITICAL - should INCLUDE)",
        record: { volt: "277/480", desc: "PANEL 277/480V 3PH WYE" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "480V search: 277/480V description match (no field)",
        record: { volt: null, desc: "CONTROL PANEL 277/480 VAC 3 PHASE" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    {
        name: "480V search: Should EXCLUDE 120/240V field",
        record: { volt: "120/240", desc: "PANEL 120/240V SPLIT PHASE" },
        searchVolt: "480",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "480V search: Should EXCLUDE 120/240V in description",
        record: { volt: null, desc: "LIGHTING PANEL 120/240V 1PH" },
        searchVolt: "480",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "480V search: Should EXCLUDE 120/230V in description",
        record: { volt: null, desc: "PANEL 120/230 VAC SINGLE PHASE" },
        searchVolt: "480",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    
    // ===== 277V GROUP TESTS =====
    {
        name: "277V search: Exact 277V match",
        record: { volt: "277", desc: "LIGHTING PANEL 277V 1PH" },
        searchVolt: "277",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "277V search: Should EXCLUDE 277/480V field (CRITICAL)",
        record: { volt: "277/480", desc: "PANEL 277/480V 3PH WYE" },
        searchVolt: "277",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "277V search: Should EXCLUDE 277/480V in description (CRITICAL)",
        record: { volt: null, desc: "CONTROL PANEL 277/480 VAC 3 PHASE" },
        searchVolt: "277",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    
    // ===== 120V GROUP TESTS =====
    {
        name: "120V search: Exact 120V match",
        record: { volt: "120", desc: "LIGHTING PANEL 120V 1PH" },
        searchVolt: "120",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "120V search: 115V match (equivalent)",
        record: { volt: "115", desc: "CONTROL PANEL 115V 1PH" },
        searchVolt: "120",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "120V search: 110V match (equivalent)",
        record: { volt: "110", desc: "PANEL 110 VAC SINGLE PHASE" },
        searchVolt: "120",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "120V search: Should NOT match 120/240V (not in v2.5.21 spec)",
        record: { volt: "120/240", desc: "PANEL 120/240V SPLIT PHASE" },
        searchVolt: "120",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    
    // ===== 208V GROUP TESTS =====
    {
        name: "208V search: Exact 208V match",
        record: { volt: "208", desc: "CONTROL PANEL 208V 3PH" },
        searchVolt: "208",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "208V search: 120/208V field match (should INCLUDE)",
        record: { volt: "120/208", desc: "PANEL 120/208V 3PH WYE" },
        searchVolt: "208",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "208V search: 120/208V description match (no field)",
        record: { volt: null, desc: "LIGHTING PANEL 120/208 VAC 3 PHASE" },
        searchVolt: "208",
        expectedMatch: true,
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    
    // ===== 575V GROUP TESTS =====
    {
        name: "575V search: Exact 575V match",
        record: { volt: "575", desc: "CONTROL PANEL 575V 3PH" },
        searchVolt: "575",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "575V search: 600V match (equivalent)",
        record: { volt: "600", desc: "INDUSTRIAL PANEL 600V 3PH" },
        searchVolt: "575",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    
    // ===== EDGE CASES =====
    {
        name: "Word boundary: 4800V should NOT match 480V",
        record: { volt: null, desc: "HIGH VOLTAGE 4800V PANEL" },
        searchVolt: "480",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "No voltage suffix: CP-480 should NOT match 480V",
        record: { volt: null, desc: "CONTROL PANEL CP-480 MOTOR" },
        searchVolt: "480",
        expectedMatch: false,
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "Dash notation: 120-240V should match 240V search",
        record: { volt: "120-240", desc: "PANEL 120-240V SPLIT PHASE" },
        searchVolt: "240",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "Dash notation: 277-480V should match 480V search",
        record: { volt: "277-480", desc: "PANEL 277-480V 3PH WYE" },
        searchVolt: "480",
        expectedMatch: true,
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    }
];

console.log('Running voltage equivalency tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    const result = simulateVoltageFilterV2521(test.record, test.searchVolt);
    
    let testPassed = true;
    
    if (result.matched !== test.expectedMatch) {
        console.log(`  ✗ FAIL: Expected matched=${test.expectedMatch}, got ${result.matched}`);
        console.log(`    Record: volt="${test.record.volt}", desc="${test.record.desc}"`);
        testPassed = false;
    }
    
    if (result.matched && result.voltV !== test.expectedVoltV) {
        console.log(`  ✗ FAIL: Expected voltV=${test.expectedVoltV}, got ${result.voltV}`);
        console.log(`    (voltV flag determines badge color: false=GREEN, true=ORANGE)`);
        testPassed = false;
    }
    
    if (result.matched && result.weight !== test.expectedWeight) {
        console.log(`  ✗ FAIL: Expected weight=${test.expectedWeight}, got ${result.weight}`);
        testPassed = false;
    }
    
    if (testPassed) {
        console.log(`  ✓ PASS: matched=${result.matched}${result.matched ? `, voltV=${result.voltV}, weight=${result.weight}` : ''}`);
        if (result.matched) {
            const badgeColor = result.voltV ? 'ORANGE' : 'GREEN';
            console.log(`    Badge color: ${badgeColor}`);
        }
        passed++;
    } else {
        failed++;
    }
    console.log();
});

console.log('='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
    console.log('✨ All voltage equivalency tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
} else {
    console.log('❌ Some tests failed!');
    console.log('='.repeat(60));
    process.exit(1);
}
