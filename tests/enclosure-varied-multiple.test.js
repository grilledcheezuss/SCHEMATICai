/**
 * Tests for v2.5.44: Enclosure "Varied / Multiple" classification and
 * HP-varied vs ENC-varied sorting tie-breaker.
 */

// === Helpers (mirroring SearchEngine logic from app.js) ===

const ENC_FG_RE = /\b(?:FIBERGLASS|FIBREGLASS|FRP)\b/i;
const ENC_SS_RE = /\b(?:4XSS|4X\s+SS|STAINLESS|S\/S|SS)\b/i;
const ENC_POLY_RE = /\bPOLY(?:CARBONATE)?\b/i;

/**
 * Client-side enclosure reclassification (mirrors app.js SearchEngine.perform logic).
 * Mutates rec.enc and rec.encV when conflicting signals are found.
 */
function reclassifyEnclosure(rec) {
    if (rec.enc === '4XSS' || rec.enc === '4XFG' || !rec.enc) {
        const desc = rec.desc || '';
        const hasFGSignal = ENC_FG_RE.test(desc);
        const hasSSSignal = ENC_SS_RE.test(desc);
        const isEncFG = rec.enc === '4XFG';
        const isEncSS = rec.enc === '4XSS';
        // Reclassify when enc field contradicts description or desc has both signals
        if ((isEncFG && hasSSSignal) || (isEncSS && hasFGSignal) || (hasFGSignal && hasSSSignal)) {
            // Apply explicit compound token preference before falling back to Varied / Multiple
            const hasExplicit4XSS = /\b4XSS\b/i.test(desc);
            const hasExplicit4XFG = /\b4XFG\b/i.test(desc);
            if (hasExplicit4XSS && !hasExplicit4XFG) {
                rec.enc = '4XSS';
                rec.encV = false;
            } else if (hasExplicit4XFG && !hasExplicit4XSS) {
                rec.enc = '4XFG';
                rec.encV = false;
            } else {
                rec.enc = 'Varied / Multiple';
                rec.encV = true;
            }
        } else if (!rec.enc) {
            if (hasFGSignal) rec.enc = '4XFG';
            else if (hasSSSignal) rec.enc = '4XSS';
        }
    }
}

/**
 * Enclosure filter (mirrors app.js SearchEngine.perform enc filter logic).
 * Returns { include, encV, weight } for the record given the search criterion.
 */
function applyEnclosureFilter(r, critEnc) {
    if (critEnc === 'Any') return { include: true, encV: r.encV || false, weight: 0 };
    if (r.enc === critEnc) {
        return { include: true, encV: false, weight: 500 };
    } else if (r.enc === 'Varied / Multiple') {
        const desc = r.desc || '';
        const isMatch =
            (critEnc === '4XSS' && ENC_SS_RE.test(desc)) ||
            (critEnc === '4XFG' && ENC_FG_RE.test(desc)) ||
            (critEnc === 'POLY' && ENC_POLY_RE.test(desc));
        if (isMatch) {
            return { include: true, encV: true, weight: 100 };
        }
        return { include: false, encV: true, weight: 0 };
    }
    return { include: false, encV: r.encV || false, weight: 0 };
}

/**
 * Sorting logic (mirrors app.js SearchEngine.perform sort comparator).
 */
function sortResults(results, crit) {
    return results.slice().sort((a, b) => {
        if (a.w !== b.w) return b.w - a.w;
        const aVariedCount =
            (crit.mfg !== 'Any' && a.mfgV ? 1 : 0) +
            (crit.hp !== 'Any' && a.hpV ? 1 : 0) +
            (crit.volt !== 'Any' && a.voltV ? 1 : 0) +
            (crit.phase !== 'Any' && a.phaseV ? 1 : 0) +
            (crit.enc !== 'Any' && a.encV ? 1 : 0);
        const bVariedCount =
            (crit.mfg !== 'Any' && b.mfgV ? 1 : 0) +
            (crit.hp !== 'Any' && b.hpV ? 1 : 0) +
            (crit.volt !== 'Any' && b.voltV ? 1 : 0) +
            (crit.phase !== 'Any' && b.phaseV ? 1 : 0) +
            (crit.enc !== 'Any' && b.encV ? 1 : 0);
        if (aVariedCount !== bVariedCount) return aVariedCount - bVariedCount;
        // Tie-breaker when both have exactly one varied flag
        if (aVariedCount === 1 && bVariedCount === 1) {
            const variedPriority = r => {
                if (crit.hp !== 'Any' && r.hpV) return 4;
                if (crit.volt !== 'Any' && r.voltV) return 3;
                if (crit.phase !== 'Any' && r.phaseV) return 3;
                if (crit.enc !== 'Any' && r.encV) return 2;
                if (crit.mfg !== 'Any' && r.mfgV) return 1;
                return 0;
            };
            const aPri = variedPriority(a);
            const bPri = variedPriority(b);
            if (aPri !== bPri) return bPri - aPri;
        }
        return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// === Simple test framework ===
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.log(`❌ FAIL: ${message}`);
        failed++;
    }
}

function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.log(`❌ FAIL: ${message}`);
        console.log(`   Expected: ${JSON.stringify(expected)}`);
        console.log(`   Actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// =============================================================================
// A: Enclosure reclassification — "Varied / Multiple"
// =============================================================================
console.log('\n🧪 A: Enclosure Reclassification — Varied / Multiple\n');

{
    // Both FG and SS signals: reclassify as Varied / Multiple
    const rec = { enc: '4XSS', encV: false, desc: 'NEMA 4X STAINLESS STEEL WITH FIBERGLASS PANELS' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'Varied / Multiple', encV: true },
        'Both STAINLESS + FIBERGLASS → Varied / Multiple');
}

{
    // Both FG and SS signals starting as 4XFG
    const rec = { enc: '4XFG', encV: false, desc: '4XFG CONTROL PANEL WITH 4XSS DOOR' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'Varied / Multiple', encV: true },
        '4XFG record with SS signal → Varied / Multiple');
}

{
    // Only SS signal: keep as 4XSS
    const rec = { enc: '4XSS', encV: false, desc: 'NEMA 4X STAINLESS STEEL ENCLOSURE' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: '4XSS', encV: false },
        'Only STAINLESS signal → remains 4XSS');
}

{
    // Only FG signal: keep as 4XFG
    const rec = { enc: '4XFG', encV: false, desc: 'FIBERGLASS NEMA 4X ENCLOSURE' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: '4XFG', encV: false },
        'Only FIBERGLASS signal → remains 4XFG');
}

{
    // POLY is not reclassified even when desc has both FG and SS signals
    const rec = { enc: 'POLY', encV: false, desc: 'POLYCARBONATE ENCLOSURE WITH SS BOLT' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'POLY', encV: false },
        'POLY enclosure not reclassified even if SS bolt mentioned');
}

{
    // POLY with both FG and SS signals in desc — still not reclassified (only 4XSS/4XFG handled)
    const rec = { enc: 'POLY', encV: false, desc: 'POLYCARBONATE STAINLESS FIBERGLASS ENCLOSURE' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'POLY', encV: false },
        'POLY enclosure not reclassified even with both FG and SS signals (POLY is canonical)');
}

{
    // Already Varied / Multiple: not touched
    const rec = { enc: 'Varied / Multiple', encV: true, desc: 'FIBERGLASS AND STAINLESS OPTIONS' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'Varied / Multiple', encV: true },
        'Already Varied / Multiple stays unchanged');
}

{
    // No enc, FG only → classify as 4XFG
    const rec = { enc: null, encV: false, desc: 'FIBERGLASS NEMA 4X PANEL' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: '4XFG', encV: false },
        'No enc + FG signal → 4XFG');
}

{
    // No enc, SS only → classify as 4XSS
    const rec = { enc: null, encV: false, desc: 'STAINLESS STEEL 4X PANEL' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: '4XSS', encV: false },
        'No enc + SS signal → 4XSS');
}

{
    // FRP token + explicit 4XSS compound code → explicit 4XSS wins (v2.5.47 preference order)
    const rec = { enc: '4XSS', encV: false, desc: 'FRP PANEL 4XSS ENCLOSURE' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: '4XSS', encV: false },
        'FRP + explicit 4XSS → 4XSS (explicit compound token wins)');
}

{
    // FIBREGLASS variant
    const rec = { enc: '4XSS', encV: false, desc: 'FIBREGLASS AND STAINLESS DUAL PANEL' };
    reclassifyEnclosure(rec);
    assertEquals({ enc: rec.enc, encV: rec.encV }, { enc: 'Varied / Multiple', encV: true },
        'FIBREGLASS (UK) + STAINLESS → Varied / Multiple');
}

// =============================================================================
// B: Enclosure filter — Varied / Multiple passes through with encV=true
// =============================================================================
console.log('\n🧪 B: Enclosure Filter — Varied / Multiple matches\n');

{
    // 4XSS search: strict match
    const r = { enc: '4XSS', encV: false, desc: 'STAINLESS STEEL 4X ENCLOSURE' };
    const result = applyEnclosureFilter(r, '4XSS');
    assertEquals(result, { include: true, encV: false, weight: 500 }, '4XSS strict match → included, encV false, weight 500');
}

{
    // 4XSS search: Varied / Multiple with SS signal → included with encV=true and weight 100
    const r = { enc: 'Varied / Multiple', encV: true, desc: 'STAINLESS STEEL AND FIBERGLASS 4X PANEL' };
    const result = applyEnclosureFilter(r, '4XSS');
    assertEquals(result, { include: true, encV: true, weight: 100 }, '4XSS search + Varied/Multiple with SS signal → included, encV true, weight 100');
}

{
    // 4XSS search: Varied / Multiple without SS signal → excluded
    const r = { enc: 'Varied / Multiple', encV: true, desc: 'FG AND POLY OPTIONS' };
    const result = applyEnclosureFilter(r, '4XSS');
    assertEquals(result, { include: false, encV: true, weight: 0 }, '4XSS search + Varied/Multiple without SS signal → excluded');
}

{
    // 4XFG search: Varied / Multiple with FG signal → included
    const r = { enc: 'Varied / Multiple', encV: true, desc: 'FIBERGLASS OR STAINLESS 4X ENCLOSURE' };
    const result = applyEnclosureFilter(r, '4XFG');
    assertEquals(result, { include: true, encV: true, weight: 100 }, '4XFG search + Varied/Multiple with FG signal → included, encV true, weight 100');
}

{
    // 4XFG search: strict match
    const r = { enc: '4XFG', encV: false, desc: 'FIBERGLASS NEMA 4X ENCLOSURE' };
    const result = applyEnclosureFilter(r, '4XFG');
    assertEquals(result, { include: true, encV: false, weight: 500 }, '4XFG strict match → included, encV false, weight 500');
}

{
    // 4XSS search: 4XFG record (not varied) → excluded
    const r = { enc: '4XFG', encV: false, desc: 'FIBERGLASS NEMA 4X ENCLOSURE' };
    const result = applyEnclosureFilter(r, '4XSS');
    assertEquals(result, { include: false, encV: false, weight: 0 }, '4XSS search on 4XFG record → excluded (no false positives)');
}

{
    // POLY search: Varied / Multiple with poly signal → included
    const r = { enc: 'Varied / Multiple', encV: true, desc: 'POLYCARBONATE OR STAINLESS 4X PANEL' };
    const result = applyEnclosureFilter(r, 'POLY');
    assertEquals(result, { include: true, encV: true, weight: 100 }, 'POLY search + Varied/Multiple with POLY signal → included');
}

// =============================================================================
// D: Sorting tie-breaker — HP-varied ranks above ENC-varied
// =============================================================================
console.log('\n🧪 D: Sorting Tie-Breaker — HP-varied above ENC-varied\n');

const crit = { mfg: 'Any', hp: '5', volt: '480', phase: '3', enc: '4XSS' };

{
    // Same weight, one varied flag each: HP-varied should rank above ENC-varied
    const results = [
        { id: 'CP-ENC', w: 5500, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: true },
        { id: 'CP-HP',  w: 5500, mfgV: false, hpV: true,  voltV: false, phaseV: false, encV: false },
    ];
    const sorted = sortResults(results, crit);
    assertEquals(sorted[0].id, 'CP-HP', 'HP-varied ranks above ENC-varied when weights equal and both have 1 varied flag');
    assertEquals(sorted[1].id, 'CP-ENC', 'ENC-varied follows HP-varied');
}

{
    // Perfect match still beats all single-varied results
    const results = [
        { id: 'CP-PERF', w: 5500, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false },
        { id: 'CP-HP',   w: 5500, mfgV: false, hpV: true,  voltV: false, phaseV: false, encV: false },
        { id: 'CP-ENC',  w: 5500, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: true  },
    ];
    const sorted = sortResults(results, crit);
    assertEquals(sorted[0].id, 'CP-PERF', 'Perfect match still first');
    assertEquals(sorted[1].id, 'CP-HP', 'HP-varied second');
    assertEquals(sorted[2].id, 'CP-ENC', 'ENC-varied third');
}

{
    // Priority order: hpV(4) > voltV(3) == phaseV(3) > encV(2) > mfgV(1)
    const results = [
        { id: 'CP-MFG',   w: 5000, mfgV: true,  hpV: false, voltV: false, phaseV: false, encV: false },
        { id: 'CP-ENC',   w: 5000, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: true  },
        { id: 'CP-VOLT',  w: 5000, mfgV: false, hpV: false, voltV: true,  phaseV: false, encV: false },
        { id: 'CP-HP',    w: 5000, mfgV: false, hpV: true,  voltV: false, phaseV: false, encV: false },
        { id: 'CP-PHASE', w: 5000, mfgV: false, hpV: false, voltV: false, phaseV: true,  encV: false },
    ];
    const sorted = sortResults(results, { mfg: 'EATON', hp: '5', volt: '480', phase: '3', enc: '4XSS' });
    assertEquals(sorted[0].id, 'CP-HP', 'HP-varied is highest priority single-varied');
    assert(['CP-VOLT', 'CP-PHASE'].includes(sorted[1].id), 'Volt or Phase-varied is 2nd');
    assert(['CP-VOLT', 'CP-PHASE'].includes(sorted[2].id), 'Volt or Phase-varied is 3rd');
    assertEquals(sorted[3].id, 'CP-ENC', 'ENC-varied is 4th');
    assertEquals(sorted[4].id, 'CP-MFG', 'MFG-varied is 5th (worst)');
}

{
    // Different weights: higher weight still wins regardless of varied flag
    const results = [
        { id: 'CP-ENC-HI', w: 6000, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: true  },
        { id: 'CP-HP-LO',  w: 5000, mfgV: false, hpV: true,  voltV: false, phaseV: false, encV: false },
    ];
    const sorted = sortResults(results, crit);
    assertEquals(sorted[0].id, 'CP-ENC-HI', 'Higher weight wins over varied priority when weights differ');
}

{
    // Two-varied results are never subject to single-varied tie-breaker
    const results = [
        { id: 'CP-HP-ENC', w: 5000, mfgV: false, hpV: true, voltV: false, phaseV: false, encV: true  },
        { id: 'CP-1V',     w: 5000, mfgV: false, hpV: true, voltV: false, phaseV: false, encV: false },
    ];
    const sorted = sortResults(results, crit);
    assertEquals(sorted[0].id, 'CP-1V', '1-varied result ranks above 2-varied regardless of flag type');
}

// =============================================================================
// Summary
// =============================================================================
console.log('\n============================================================');
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('============================================================\n');

if (failed === 0) {
    console.log('✨ All v2.5.44 tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed.\n');
    process.exit(1);
}
