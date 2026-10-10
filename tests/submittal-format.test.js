// Blank path, baked-vs-live zones, and cover/info address defaults.
// Run: node tests/submittal-format.test.js
const assert = require('node:assert/strict');
const SubmittalFormat = require('../submittal-format');

assert.equal(SubmittalFormat.relativePath('CP-8204'), 'CP8000-8999/CP8200-8299/CP-8204.pdf');
assert.equal(SubmittalFormat.relativePath('cp8204.pdf'), 'CP8000-8999/CP8200-8299/CP-8204.pdf');
assert.equal(SubmittalFormat.relativePath('CP-3000R1'), 'CP3000-3999/CP3000-3099/CP-3000R1.pdf');
assert.equal(SubmittalFormat.STAGE_DEFAULT, 'SUBMITTAL');
assert.equal(SubmittalFormat.COVER_LINES[0], 'Cox Research and Technology, Inc.');
assert.equal(SubmittalFormat.COVER_LINES[2], 'Baton Rouge, LA. 70816');
assert.equal(SubmittalFormat.INFO_LINES[0], 'P.O. Box 77808');
assert.equal(SubmittalFormat.INFO_LINES[2], '70879');

assert.equal(SubmittalFormat.skipWhenBlank({ map: 'logo', field: 'logo' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'stage', field: 'stage' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'custom', field: 'contact_block' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'date', field: 'date' }), false);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'serial', field: 'serial' }), false);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'job_block', field: 'project_info' }), false);
assert.equal(SubmittalFormat.isLive({ map: 'cust', field: 'customer_job' }), true);

assert.equal(
    SubmittalFormat.overlayText({ map: 'custom', field: 'contact_block' }, {}, 'COVER'),
    SubmittalFormat.COVER_LINES.join('\n')
);
assert.equal(
    SubmittalFormat.overlayText({ map: 'address', field: 'address' }, {}, 'INFO'),
    SubmittalFormat.INFO_LINES.slice(0, 3).join('\n')
);
assert.equal(SubmittalFormat.overlayText({ map: 'serial', field: 'serial' }, { serial: '104690' }, 'COVER'), '');
assert.equal(SubmittalFormat.overlayText({ map: 'logo', field: 'logo' }, {}, 'COVER'), '');
assert.equal(SubmittalFormat.overlayText({ map: 'stage', field: 'stage' }, { stage: '' }, 'COVER'), 'SUBMITTAL');
assert.equal(SubmittalFormat.overlayText({ map: 'cust', field: 'customer_job' }, { job: 'FORT POLK' }, 'INFO'), 'FORT POLK');
assert.equal(SubmittalFormat.overlayText({ map: 'job', field: 'job' }, { job: 'FORT POLK' }, 'COVER'), null);

const styled = SubmittalFormat.coverStyle({
    map: 'job_block', field: 'project_info', fontFamily: "'Courier New', monospace", textAlign: 'left'
}, 'COVER');
assert.match(styled.fontFamily, /Times/);
assert.equal(styled.textAlign, 'center');
assert.equal(styled.decoration, 'underline');
assert.equal(SubmittalFormat.labelFor('cust', 'customer_job'), 'Job');

console.log('PASS submittal format');
