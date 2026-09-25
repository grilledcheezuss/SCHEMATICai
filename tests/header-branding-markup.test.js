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
    assert(/class="brand-lockup"/.test(headerHtml), 'header should keep the logo + title in a shared lockup wrapper');
    assert(/class="logo-group"[\s\S]*id="app-program-name"/.test(headerHtml), 'header branding should keep SCHEMATICA ai adjacent to the Cox logo treatment');

    const toolbarStart = html.indexOf('<div id="pdf-toolbar">');
    const toolbarEnd = html.indexOf('<div id="custom-pdf-viewer"', toolbarStart);
    assert(toolbarStart >= 0 && toolbarEnd > toolbarStart, 'pdf toolbar markup should exist');
    const toolbarHtml = html.slice(toolbarStart, toolbarEnd);
    assert(/id="pdf-maintain-position-toggle"/.test(toolbarHtml), 'toolbar should include maintain-position toggle button');
    assert(/id="pdf-maintain-position-toggle"[\s\S]*aria-pressed="false"/.test(toolbarHtml), 'maintain-position toggle should use aria-pressed semantics');
    assert(/Zoom In[\s\S]*id="pdf-maintain-position-toggle"/.test(toolbarHtml), 'maintain-position toggle should appear after the Zoom In button');

    console.log('✅ Header branding markup tests passed');
})();
