const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

(() => {
    console.log('🧪 Testing desktop header branding markup');

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const headerMatch = html.match(/<header>[\s\S]*?<\/header>/);
    assert(headerMatch, 'header markup should exist');

    const headerHtml = headerMatch[0];
    const compactLegacyCount = (headerHtml.match(/SCHEMATICAai/g) || []).length;
    const productNameCount = (headerHtml.match(/SCHEMATICA ai/g) || []).length;

    assert(productNameCount === 1, `header should contain one SCHEMATICA ai label, found ${productNameCount}`);
    assert(compactLegacyCount === 0, 'header should not include duplicated legacy SCHEMATICAai text');
    assert(/id="app-program-name"/.test(headerHtml), 'header should keep a single app-program-name element for branding hook consistency');

    console.log('✅ Header branding markup tests passed');
})();
