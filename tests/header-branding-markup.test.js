const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function extractBlock(source, marker) {
    const start = source.indexOf(marker);
    if (start < 0) return '';
    const openBrace = source.indexOf('{', start);
    if (openBrace < 0) return '';
    let depth = 1;
    for (let i = openBrace + 1; i < source.length; i++) {
        if (source[i] === '{') depth += 1;
        else if (source[i] === '}') depth -= 1;
        if (depth === 0) return source.slice(openBrace + 1, i);
    }
    return '';
}

function extractRule(source, selector) {
    return extractBlock(source, selector);
}

(() => {
    console.log('🧪 Testing desktop header branding markup');

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    const mobileCss = extractBlock(css, '@media (max-width: 767px)');
    const narrowPhoneCss = extractBlock(css, '@media (max-width: 360px)');
    const headerMatch = html.match(/<header>[\s\S]*?<\/header>/);
    assert(headerMatch, 'header markup should exist');

    const headerHtml = headerMatch[0];
    const compactLegacyCount = (headerHtml.match(/SCHEMATICAai/g) || []).length;
    const productNameCount = (headerHtml.match(/SCHEMATICA ai/g) || []).length;

    assert(productNameCount === 1, `header should contain one SCHEMATICA ai label, found ${productNameCount}`);
    assert(compactLegacyCount === 0, 'header should not include duplicated legacy SCHEMATICAai text');
    assert(/id="app-program-name"/.test(headerHtml), 'header should keep a single app-program-name element for branding hook consistency');
    assert(/class="brand-lockup"/.test(headerHtml), 'header should keep the logo + title in a shared lockup wrapper');
    assert(/class="logo-sub-row"[\s\S]*RESEARCH[\s\S]*id="app-program-name"/.test(headerHtml), 'header branding should keep RESEARCH and SCHEMATICA ai on the shared lower lockup row');

    const toolbarStart = html.indexOf('<div id="pdf-toolbar">');
    const toolbarEnd = html.indexOf('<div id="custom-pdf-viewer"', toolbarStart);
    assert(toolbarStart >= 0 && toolbarEnd > toolbarStart, 'pdf toolbar markup should exist');
    const toolbarHtml = html.slice(toolbarStart, toolbarEnd);
    assert(/id="pdf-maintain-position-toggle"/.test(toolbarHtml), 'toolbar should include maintain-position toggle button');
    assert(/id="pdf-maintain-position-toggle"[\s\S]*aria-pressed="false"/.test(toolbarHtml), 'maintain-position toggle should use aria-pressed semantics');
    assert(/id="pdf-maintain-position-toggle"[\s\S]*Lock Position/.test(toolbarHtml), 'maintain-position toggle should use the Lock Position label');
    assert(/id="pdf-download-control"[\s\S]*id="pdf-maintain-position-toggle"[\s\S]*onclick="PdfViewer\.zoom\(-0\.2\)"[\s\S]*id="pdf-zoom-level"[\s\S]*onclick="PdfViewer\.zoom\(0\.2\)"/.test(toolbarHtml), 'toolbar should keep Lock Position immediately before the zoom controls');

    const mobileToolbarRule = extractRule(mobileCss, '#pdf-toolbar');
    const mobileLockRule = extractRule(mobileCss, '#pdf-toolbar .pdf-maintain-position-btn');
    const narrowToolbarRule = extractRule(narrowPhoneCss, '#pdf-toolbar');
    const narrowLockLabelRule = extractRule(narrowPhoneCss, '#pdf-toolbar .pdf-maintain-position-btn .pdf-tool-btn-label');

    assert(mobileToolbarRule.includes('flex-wrap: nowrap;'), 'mobile toolbar CSS should keep the compact one-row layout');
    assert(mobileLockRule.includes('width: auto;'), 'mobile toolbar CSS should keep the Lock Position pill compact');
    assert(narrowToolbarRule.includes('gap: 3px;') && narrowToolbarRule.includes('padding: 4px;'), 'narrow-phone toolbar CSS should add the extra compact sizing tier');
    assert(narrowLockLabelRule.includes('font-size: 9px;'), 'narrow-phone toolbar CSS should tighten the Lock Position label sizing');

    console.log('✅ Header branding markup tests passed');
})();
