// v2.5.100 browser-free guards for the UI housekeeping changes (always runnable with plain Node).
// The real DOM/CSS behavior is covered by tests/ui-housekeeping.browser.test.js.
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
function check(condition, message) {
    if (condition) { passed++; console.log(`✅ ${message}`); return; }
    failed++;
    console.error(`❌ ${message}`);
}

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractClass(className) {
    const start = appJs.indexOf(`class ${className} {`);
    if (start === -1) throw new Error(`class ${className} not found`);
    let depth = 0;
    for (let i = start; i < appJs.length; i++) {
        if (appJs[i] === '{') depth++;
        else if (appJs[i] === '}' && --depth === 0) return appJs.slice(start, i + 1);
    }
    throw new Error(`class ${className} not terminated`);
}

console.log('🧪 Generator small-device policy (JS constant, CSS media query, geometry fallback)');
const jsQuery = appJs.match(/static SMALL_DEVICE_MEDIA_QUERY = '([^']+)'/)[1];
check(css.includes(`@media ${jsQuery} {`), `style.css hides generator surfaces with the identical query: ${jsQuery}`);
const excludedBlock = css.slice(css.indexOf(`@media ${jsQuery} {`)).split('}')[0];
['#menu-demo', '#generator-panel', '#generator-restore-btn', '#toggle-right', '#left-generator-context']
    .forEach(sel => check(excludedBlock.includes(sel), `small-device CSS hides ${sel}`));
check(!/#menu-demo\s*\{\s*display:\s*none\s*!important;\s*\}/.test(css.slice(css.indexOf('@media (max-width: 767px) {'), css.indexOf(`@media ${jsQuery} {`))),
    'generator is no longer hidden for every < 768 px viewport');
check(/static isSmallMobile\(\) \{ return window\.innerWidth < 768; \}/.test(appJs), 'general UI.isSmallMobile breakpoint unchanged (< 768)');

const fakeWindow = { innerWidth: 0, innerHeight: 0 };
const DemoManager = new Function('window', 'UI', 'document', 'PdfViewer', `${extractClass('DemoManager')}; return DemoManager;`)(fakeWindow, {}, {}, {});
const matrix = [
    // [width, height, available]
    [320, 568, false], [375, 667, false], [390, 844, false], [430, 932, false], [431, 932, true],
    [600, 960, true], [700, 1000, true], [767, 1024, true], [768, 1024, true], [1024, 768, true],
    [667, 375, false], [740, 360, false], [767, 430, false], [767, 431, true], [768, 430, true],
    [844, 390, true], [600, 430, false], [600, 431, true]
];
matrix.forEach(([w, h, expected]) => {
    fakeWindow.innerWidth = w;
    fakeWindow.innerHeight = h;
    check(DemoManager.isGeneratorAvailable() === expected, `${w}x${h} → ${expected ? 'available' : 'excluded'} (no matchMedia fallback)`);
});

console.log('\n🧪 Result-count lifecycle wiring');
const uiSrc = extractClass('UI');
const completion = uiSrc.slice(uiSrc.indexOf('static handleSearchCompletion('), uiSrc.indexOf('static focusMobilePreview('));
const desktopBranch = completion.slice(0, completion.indexOf('return;'));
check(desktopBranch.includes('this.syncMobileLayout()'), 'desktop/tablet search completion syncs body.results-ready');
check(uiSrc.includes('UI.syncMobileResultsCount(Number.isFinite(totalCount) ? totalCount : res.length)'), 'render keeps an explicit 0 total instead of a falsy fallback');

console.log('\n🧪 Light-mode card border specificity');
check(/body:not\(\.dark-mode\) \.record-card \{\s*border-color: var\(--app-primary\);/.test(css), 'light card outline uses the brand token');
check(/body:not\(\.dark-mode\) \.record-card:hover \{\s*border-color: var\(--app-primary\);/.test(css), 'light hover outline stays purple');
check(/body:not\(\.dark-mode\) \.record-card\.no-pdf-card,\s*body:not\(\.dark-mode\) \.record-card\.no-pdf-card:hover \{[^}]*border-left-color: #9ca3af;/.test(css), 'no-PDF card keeps neutral left accent over light rules');

console.log('\n🧪 Version surfaces');
const version = appJs.match(/const APP_VERSION = "v([^"]+)"/)[1];
check(html.includes(`SCHEMATICA ai (v${version})`), 'index.html title matches APP_VERSION');
['style.css', 'info-table-parser.js', 'app.js'].forEach(asset => check(html.includes(`${asset}?v=${version}"`), `${asset} cache-busted to ${version}`));

console.log(`\n${failed === 0 ? '✅' : '❌'} ui-housekeeping static tests: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
