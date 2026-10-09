// Exercise the production classifier, not a second implementation of its rules.
const fs = require('fs');
const assert = require('assert/strict');
const app = fs.readFileSync(require('path').join(__dirname, '../app.js'), 'utf8');
const source = app.slice(app.indexOf('class PageClassifier {'), app.indexOf('class SmartScanner {'));
const PageClassifier = new Function(`${source}; return PageClassifier;`)();
const content = (...items) => ({ items: items.map(str => ({ str })) });
assert.equal(PageClassifier.classify(content('COVER'), 0.77, 1), 'COVER_TEMPLATE');
assert.equal(PageClassifier.classify(content('GENERAL NOTES', 'INFORMATION'), 0.77, 2), 'INFO');
assert.equal(PageClassifier.classify(content('POWER', 'ONE LINE'), 1.3, 3), 'SCHEMATIC_LANDSCAPE');
assert.equal(PageClassifier.classify(content('CONTROL', 'LOGIC'), 0.77, 4), 'SCHEMATIC_PORTRAIT');
assert.equal(PageClassifier.classify(content('DOOR LAYOUT'), 0.77, 8), 'DOOR_DRAWING');
assert.equal(PageClassifier.classify(content(), 1.3, 5), 'SCHEMATIC_LANDSCAPE');
console.log('Production page classification tests passed');
