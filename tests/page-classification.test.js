const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const start = source.indexOf('class PageClassifier {');
const end = source.indexOf('class SmartScanner {', start);
const PageClassifier = vm.runInNewContext(source.slice(start, end) + '; PageClassifier');
const classify = (words, ratio, page) => PageClassifier.classify({ items: words.map(str => ({ str })) }, ratio, page);
const cases = [
    ['title first page', ['PROJECT', 'CLIENT', 'DRAWN BY', 'DATE', 'REVISION'], 1.3, 1, 'COVER_TEMPLATE'],
    ['minimal first page', ['PROJECT'], 1, 1, 'COVER_TEMPLATE'],
    ['door keywords cannot override forced cover', ['DOOR', 'FRONT VIEW', 'FACE PLATE'], 1.3, 1, 'COVER_TEMPLATE'],
    ['empty first page', [], .7, 1, 'COVER_TEMPLATE'],
    ['info with border', Array(150).fill('NOTES SCHEDULE SPECIFICATION BORDER'), 1, 2, 'INFO'],
    ['borderless info', Array(50).fill('TABLE OF CONTENTS INDEX NOTES'), 1, 2, 'INFO_BORDERLESS'],
    ['landscape schematic', ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'CONTACTOR', 'RELAY'], 1.5, 3, 'SCHEMATIC_LANDSCAPE'],
    ['portrait control', ['CONTROL', 'LOGIC', 'SEQUENCE', 'L1', 'L2'], .7, 4, 'SCHEMATIC_PORTRAIT'],
    ['power schematic', ['POWER', 'ONE LINE', 'ONELINE'], 1.4, 3, 'SCHEMATIC_LANDSCAPE'],
    ['schematic content fallback', ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'TERMINAL', 'WIRING'], 1.3, 5, 'SCHEMATIC_LANDSCAPE'],
    ['door detection on subsequent page', ['DOOR', 'FRONT VIEW'], 1, 6, 'DOOR_DRAWING'],
    ['unknown without geometry', [], null, 8, 'GENERAL']
];
for (const [name, words, ratio, page, expected] of cases) {
    assert.equal(classify(words, ratio, page), expected, name);
    console.log('✓ ' + name);
}
console.log(`Actual PageClassifier: ${cases.length} tests passed`);
