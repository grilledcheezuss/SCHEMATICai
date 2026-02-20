// worker/tests/fixtures.js
// Test fixtures for CP-8078-like panels and edge cases

/**
 * CP-8078 representative Items text.
 * Key characteristics:
 *   - Service voltages: 120/240V and 230V (both 240-family)
 *   - Control transformer: 480V-120VAC (NOT a service voltage)
 *   - Stray/template line: 277/480,3,60HZ (no V suffix → not matched by VOLT_PRIORITY)
 *   - CAD HP code: %%U7.5HP → normalizes to 7.5HP
 *   - Dual enclosure conflict: NEMA 4X STAINLESS STEEL + NEMA 4X FIBERGLASS → encV=true
 */
const CP8078_TEXT = [
    '120/240V,3,60HZ PUMP CONTROLLER',
    '230V,3,60HZ ALTERNATE SUPPLY',
    'CONTROL TRANSFORMER 480V-120VAC',
    '277/480,3,60HZ',
    '%%U7.5HP MOTOR',
    'NEMA 4X STAINLESS STEEL ENCLOSURE',
    'NEMA 4X FIBERGLASS ENCLOSURE'
].join('\n');

/**
 * Simple single-voltage 480V panel (should return volt=480, not varied).
 */
const PANEL_480V_TEXT = '480V,3PH,60HZ PUMP PANEL\n25HP MOTOR\nNEMA 4XSS ENCLOSURE';

/**
 * 480V panel with control transformer (480V is service, 120VAC is control).
 * Should return volt=480 (service wins).
 */
const PANEL_480V_WITH_XFMR_TEXT = '480V,3PH,60HZ SERVICE ENTRANCE\n10HP MOTOR\nCONTROL TRANSFORMER 480V-120VAC\nNEMA 4X STAINLESS STEEL';

/**
 * 240V panel (no transformer complications).
 */
const PANEL_240V_TEXT = '120/240V,1PH,60HZ DUPLEX PUMP PANEL\n2HP MOTOR\nNEMA 4X FIBERGLASS ENCLOSURE';

/**
 * Panel with fractional HP via CAD code.
 */
const PANEL_FRACTIONAL_HP_TEXT = '480V,3PH,60HZ\n%%U7-1/2HP SUBMERSIBLE PUMP MOTOR\nNEMA 4XSS';

/**
 * NEMA4X (no space) enclosure variant.
 */
const PANEL_NEMA4X_NOSPACE_TEXT = '480V,3PH\n5HP MOTOR\nNEMA4X STAINLESS STEEL ENCLOSURE';

module.exports = {
    CP8078_TEXT,
    PANEL_480V_TEXT,
    PANEL_480V_WITH_XFMR_TEXT,
    PANEL_240V_TEXT,
    PANEL_FRACTIONAL_HP_TEXT,
    PANEL_NEMA4X_NOSPACE_TEXT
};
