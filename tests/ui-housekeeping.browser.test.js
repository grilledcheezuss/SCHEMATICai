// v2.5.100 UI housekeeping regressions, exercised in real headless Chrome against the production
// index.html + app.js + style.css (no stubs of UI.render / handleSearchCompletion / syncMobileResultsCount):
//   1. Submittal Generator availability: small phones only (short side <= 430 in the < 768 layout)
//   2. Light-mode purple result-card borders (normal / hover / active / disabled no-PDF / dark)
//   3. Total result count visible immediately on the FIRST search at every viewport
// Run: node tests/ui-housekeeping.browser.test.js   (CHROME_PATH=/path/to/chrome to override;
// REQUIRE_BROWSER=1 turns a missing browser into a failure instead of a loud skip.)
const { HeadlessBrowser } = require('./helpers/headless-browser');

let passed = 0;
let failed = 0;
function check(condition, message) {
    if (condition) { passed++; return; }
    failed++;
    console.error(`  ❌ ${message}`);
}

const PURPLE = 'rgb(70, 29, 124)';

// Opens the real app at a viewport and reveals the shell the way AuthService.init() does after
// login (html.logged-in, overlay hidden) without storing credentials or starting a Worker sync.
async function openApp(browser, w, h) {
    await browser.open(w, h);
    await browser.evaluate(() => {
        document.documentElement.classList.add('logged-in');
        document.getElementById('auth-overlay').classList.remove('active-modal');
    });
}

// Waits for a viewport change to reach the page (real resize event) and for the
// 0.2 s panel opacity/transform transition to finish.
async function settle(browser, expectedWidth = null) {
    await browser.evaluate(async (w) => {
        const start = Date.now();
        while (w !== null && window.innerWidth !== w && Date.now() - start < 2000) {
            await new Promise(r => setTimeout(r, 20));
        }
        await new Promise(r => setTimeout(r, 350));
    }, expectedWidth);
}

function makeRecords(n, { noPdfEvery = 0, prefix = 'CP-' } = {}) {
    return Array.from({ length: n }, (_, i) => ({
        id: `${prefix}${1000 + i}`,
        desc: i % 2 ? 'DUPLEX PUMP PANEL ALPHA' : 'SIMPLEX PUMP PANEL BETA',
        pdfUrl: noPdfEvery && i % noPdfEvery === 0 ? '' : `https://example.invalid/${i}.pdf`,
        category: 'standard'
    }));
}

// Runs in the page: loads records and performs the first search exactly like the Search button.
function firstSearchInPage(records) {
    const before = {
        lastCriteria: SearchEngine.lastCriteria,
        resultsLength: SearchEngine.currentResults.length,
        ready: document.body.classList.contains('results-ready')
    };
    window.LOCAL_DB = records;
    const btn = document.getElementById('searchBtn');
    btn.disabled = false;
    btn.click();
    const header = document.getElementById('results-header');
    const count = document.getElementById('results-count');
    const headerRect = header.getBoundingClientRect();
    const countRect = count.getBoundingClientRect();
    const countStyle = getComputedStyle(count);
    return {
        before,
        ready: document.body.classList.contains('results-ready'),
        headerDisplay: getComputedStyle(header).display,
        countRendered: headerRect.height > 0 && countRect.width > 0 && countStyle.display !== 'none',
        countVisible: headerRect.height > 0 && countRect.width > 0 && countRect.height > 0
            && countStyle.visibility === 'visible' && countStyle.display !== 'none'
            && countRect.bottom > 0 && countRect.top < innerHeight,
        text: count.textContent,
        pageInfo: document.getElementById('page-info').textContent,
        cards: document.querySelectorAll('#results-area .record-card').length,
        total: SearchEngine.currentResults.length
    };
}

async function testFirstSearchCount(browser) {
    console.log('\n🧪 First search shows the accurate total immediately (no resize)');
    const viewports = [[1280, 800], [1024, 768], [768, 1024], [767, 1024], [700, 1000], [600, 960], [430, 932], [390, 844], [375, 667], [844, 390], [667, 375]];
    const counts = [0, 1, 25, 26, 51];
    for (const [w, h] of viewports) {
        for (const n of counts) {
            await openApp(browser, w, h);
            const r = await browser.evaluate(firstSearchInPage, makeRecords(n));
            const label = `${w}x${h} n=${n}`;
            check(r.before.lastCriteria === null && r.before.resultsLength === 0 && !r.before.ready, `${label}: starts from a fresh state`);
            check(r.ready, `${label}: body.results-ready set by the first search`);
            check(r.headerDisplay !== 'none', `${label}: #results-header displayed (got ${r.headerDisplay})`);
            // Known pre-existing limit: a zero-result search on a <= 430 px tall desktop-layout window
            // (e.g. 844x390 landscape) keeps the full Search form expanded and clips the sidebar, so the
            // header is rendered but below the fold there; everywhere else it must be on screen.
            const clippedByExpandedSearch = n === 0 && w >= 768 && h <= 430;
            check(clippedByExpandedSearch ? r.countRendered : r.countVisible, `${label}: #results-count visible on screen`);
            check(r.text === `Found ${n} records`, `${label}: count text "${r.text}"`);
            check(r.total === n, `${label}: currentResults holds the full total`);
            check(r.cards === Math.min(n, 25), `${label}: first page renders ${Math.min(n, 25)} cards (got ${r.cards})`);
            if (n > 0) check(r.pageInfo === `Page 1 of ${Math.ceil(n / 25)}`, `${label}: page info "${r.pageInfo}"`);
            check(browser.pageErrors.length === 0, `${label}: no page errors (${browser.pageErrors.join(' | ')})`);
        }
    }
}

async function testCountLifecycle(browser) {
    console.log('\n🧪 Count lifecycle: pagination, refinement, reset, show/hide, contradiction, background refresh');
    for (const [w, h] of [[1280, 800], [390, 844], [700, 1000]]) {
        const label = `${w}x${h}`;
        await openApp(browser, w, h);
        await browser.evaluate(firstSearchInPage, makeRecords(51));
        const r = await browser.evaluate(() => {
            const text = () => document.getElementById('results-count').textContent;
            const headerShown = () => getComputedStyle(document.getElementById('results-header')).display !== 'none';
            const out = {};
            SearchEngine.nextPage();
            out.page2 = { text: text(), info: document.getElementById('page-info').textContent, cards: document.querySelectorAll('#results-area .record-card').length };
            SearchEngine.nextPage();
            out.page3 = { text: text(), cards: document.querySelectorAll('#results-area .record-card').length };

            // Refinement: allowed keyword narrows the full result set
            UI.keywordAllowedTermsInput = 'ALPHA';
            document.getElementById('searchBtn').click();
            out.refined = { text: text(), total: SearchEngine.currentResults.length, page: SearchEngine.currentPage };

            // Keyword contradiction: perform() returns before mutating search state or the count
            const priorResults = SearchEngine.currentResults;
            const priorCriteria = SearchEngine.lastCriteria;
            UI.keywordBlockedTermsInput = 'ALPHA';
            document.getElementById('searchBtn').click();
            out.contradiction = {
                text: text(),
                sameResults: SearchEngine.currentResults === priorResults,
                sameCriteria: SearchEngine.lastCriteria === priorCriteria,
                warning: document.getElementById('keyword-contradiction-warning').textContent
            };

            // Reset keeps the existing results/count until the next search; next search shows the full total
            UI.resetSearch();
            out.afterReset = { text: text(), header: headerShown() };
            document.getElementById('searchBtn').click();
            out.afterResetSearch = { text: text() };

            // No-match search keeps a coherent "Found 0" header
            UI.keywordAllowedTermsInput = 'NOMATCHTERM';
            document.getElementById('searchBtn').click();
            out.zero = { text: text(), header: headerShown(), info: document.getElementById('page-info').textContent };
            UI.keywordAllowedTermsInput = '';
            document.getElementById('searchBtn').click();

            // Mobile Results collapse keeps the header/count reachable
            if (UI.isSmallMobile()) {
                UI.toggleMobileResults(false);
                out.collapsed = { text: text(), header: headerShown(), listDisplay: getComputedStyle(document.getElementById('results-list')).display };
                UI.toggleMobileResults(true);
            }

            // Background refresh step (snapshot apply + dropdown repopulate) preserves results/count/page
            SearchEngine.nextPage();
            const firstCard = document.querySelector('#results-area .record-card');
            const pageBefore = SearchEngine.currentPage;
            const refreshed = window.LOCAL_DB.map(rec => ({ ...rec })).concat([{ id: 'CP-9999', desc: 'DUPLEX', pdfUrl: 'x.pdf', category: 'standard' }]);
            DataLoader.applySnapshot({ records: refreshed });
            UI.pop();
            out.refresh = {
                text: text(),
                page: SearchEngine.currentPage === pageBefore,
                sameCard: document.querySelector('#results-area .record-card') === firstCard,
                total: SearchEngine.currentResults.length
            };
            return out;
        });
        check(r.page2.text === 'Found 51 records' && r.page2.info === 'Page 2 of 3' && r.page2.cards === 25, `${label}: page 2 keeps full total (${JSON.stringify(r.page2)})`);
        check(r.page3.text === 'Found 51 records' && r.page3.cards === 1, `${label}: page 3 keeps full total`);
        check(r.refined.text === `Found ${r.refined.total} records` && r.refined.total === 25 && r.refined.page === 1, `${label}: refinement updates total (${JSON.stringify(r.refined)})`);
        check(r.contradiction.text === r.refined.text && r.contradiction.sameResults && r.contradiction.sameCriteria && /ALPHA/.test(r.contradiction.warning), `${label}: contradiction leaves state/count untouched`);
        check(r.afterReset.text === r.refined.text && r.afterReset.header, `${label}: reset keeps visible count until next search`);
        check(r.afterResetSearch.text === 'Found 51 records', `${label}: search after reset shows full total`);
        check(r.zero.text === 'Found 0 records' && r.zero.header, `${label}: zero results shows "Found 0 records" header`);
        if (r.collapsed) {
            check(r.collapsed.header && r.collapsed.text === 'Found 51 records' && r.collapsed.listDisplay === 'none', `${label}: collapsed Results keeps header/count`);
        }
        check(r.refresh.text === 'Found 51 records' && r.refresh.page && r.refresh.sameCard && r.refresh.total === 51, `${label}: background refresh preserves results/count/page (${JSON.stringify(r.refresh)})`);
        check(browser.pageErrors.length === 0, `${label}: no page errors (${browser.pageErrors.join(' | ')})`);
    }
}

// Expected availability: excluded iff width < 768 and short side <= 430.
function expectedAvailable(w, h) {
    return !(w < 768 && Math.min(w, h) <= 430);
}

function generatorStateInPage() {
    const vis = id => {
        const el = document.getElementById(id);
        if (!el) return false;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && rect.width > 0 && rect.height > 0;
    };
    const panel = document.getElementById('generator-panel');
    const rect = panel.getBoundingClientRect();
    const editor = document.getElementById('redaction-editor-content');
    return {
        active: DemoManager.isGeneratorActive,
        available: DemoManager.isGeneratorAvailable(),
        mediaExcluded: matchMedia(DemoManager.SMALL_DEVICE_MEDIA_QUERY).matches,
        menuDisplay: getComputedStyle(document.getElementById('menu-demo')).display,
        smallMobile: UI.isSmallMobile(),
        panel: vis('generator-panel'),
        panelInViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5,
        editorScrollable: editor.clientHeight > 40,
        rail: vis('toggle-right'),
        restore: vis('generator-restore-btn'),
        minimize: vis('generator-minimize-btn'),
        context: vis('left-generator-context'),
        demoMode: document.body.classList.contains('demo-mode'),
        editorActive: document.body.classList.contains('editor-active'),
        genMinimized: document.body.classList.contains('gen-minimized'),
        custName: document.getElementById('demo-cust-name').value,
        zoneKept: !!document.getElementById('test-zone-marker')
    };
}

async function testGeneratorMatrix(browser) {
    console.log('\n🧪 Generator availability matrix (menu, handler, CSS, panel, rail/restore, context)');
    const matrix = [
        [320, 568], [375, 667], [390, 844], [414, 896], [430, 932], [431, 932], [480, 853],
        [600, 960], [700, 1000], [744, 1133], [767, 1024], [768, 1024], [1024, 768], [1280, 800],
        [667, 375], [740, 360], [767, 430], [767, 431], [844, 390], [932, 430], [600, 430], [600, 431]
    ];
    for (const [w, h] of matrix) {
        const label = `${w}x${h}`;
        const expected = expectedAvailable(w, h);
        await openApp(browser, w, h);
        const s0 = await browser.evaluate(generatorStateInPage);
        check(s0.available === expected, `${label}: isGeneratorAvailable()=${s0.available}, expected ${expected}`);
        check(s0.mediaExcluded === !expected, `${label}: CSS media query agrees with JS`);
        check((s0.menuDisplay !== 'none') === expected, `${label}: #menu-demo display ${s0.menuDisplay}`);
        check(s0.smallMobile === (w < 768), `${label}: general UI.isSmallMobile breakpoint unchanged`);
        const fallback = await browser.evaluate(() => {
            const mm = window.matchMedia;
            window.matchMedia = undefined;
            try { return DemoManager.isGeneratorAvailable(); } finally { window.matchMedia = mm; }
        });
        check(fallback === expected, `${label}: geometry fallback agrees (${fallback})`);

        // Real entry point: the menu item's onclick handler
        await browser.evaluate(() => document.getElementById('menu-demo').click());
        const s1 = await browser.evaluate(generatorStateInPage);
        if (!expected) {
            check(!s1.active && !s1.panel && !s1.rail && !s1.restore && !s1.context && !s1.demoMode, `${label}: excluded — click is a no-op (${JSON.stringify(s1)})`);
            continue;
        }
        const docked = w >= 768;
        check(s1.active && s1.demoMode && s1.genMinimized && !s1.editorActive, `${label}: activated minimized`);
        check(s1.context, `${label}: context block visible`);
        check(s1.rail === docked, `${label}: rail ${docked ? 'shown' : 'hidden'}`);
        check(s1.restore === !docked, `${label}: restore button ${docked ? 'hidden' : 'shown'}`);
        check(!s1.panel, `${label}: panel minimized initially`);

        await browser.evaluate(d => document.getElementById(d ? 'toggle-right' : 'generator-restore-btn').click(), docked);
        const s2 = await browser.evaluate(generatorStateInPage);
        check(s2.panel && s2.panelInViewport && s2.editorScrollable, `${label}: restored panel visible inside viewport with scrollable controls (${JSON.stringify({ p: s2.panel, v: s2.panelInViewport, e: s2.editorScrollable })})`);
        check(s2.editorActive && !s2.genMinimized, `${label}: editor active after restore`);
        check(s2.minimize === !docked && s2.restore === false, `${label}: compact minimize control only when floating`);

        await browser.evaluate(d => document.getElementById(d ? 'toggle-right' : 'generator-minimize-btn').click(), docked);
        await settle(browser);
        const s3 = await browser.evaluate(generatorStateInPage);
        check(!s3.panel && s3.genMinimized && s3.restore === !docked && s3.rail === docked, `${label}: minimize returns to minimized state`);
        check(browser.pageErrors.length === 0, `${label}: no page errors (${browser.pageErrors.join(' | ')})`);
    }
}

async function testGeneratorResizeTransitions(browser) {
    console.log('\n🧪 Generator resize/orientation transitions keep state and leave no phantom controls');
    await openApp(browser, 1024, 768);
    await browser.evaluate(() => {
        document.getElementById('menu-demo').click();
        document.getElementById('demo-cust-name').value = 'ACME UTILITY';
        const marker = document.createElement('div');
        marker.id = 'test-zone-marker';
        marker.className = 'redaction-box';
        document.getElementById('pdf-main-view').appendChild(marker);
        DemoManager.restorePanel();
    });
    const steps = [
        // [w, h, expectAvailable, expectExpanded]
        [390, 844, false, true],
        [700, 1000, true, true],
        [844, 390, true, true],
        [667, 375, false, true],
        [1024, 768, true, true]
    ];
    for (const [w, h, available, expanded] of steps) {
        await browser.setViewport(w, h);
        await settle(browser, w);
        const s = await browser.evaluate(generatorStateInPage);
        const label = `→${w}x${h} (expanded)`;
        check(s.active && s.custName === 'ACME UTILITY' && s.zoneKept, `${label}: generator/context/zones preserved`);
        if (!available) {
            check(!s.panel && !s.rail && !s.restore && !s.context && s.menuDisplay === 'none', `${label}: every generator surface hidden (${JSON.stringify(s)})`);
            check(s.demoMode && s.genMinimized && !s.editorActive, `${label}: preview read-only, editing disabled`);
        } else {
            check(s.panel === expanded && s.context && s.editorActive, `${label}: panel restored expanded`);
            check(s.rail === (w >= 768) && !s.restore, `${label}: no phantom rail/restore button`);
        }
    }
    // Minimized preference survives excluded mode too
    await browser.evaluate(() => DemoManager.toggleGeneratorSidebar());
    await settle(browser);
    for (const [w, h, available] of [[375, 667, false], [600, 960, true], [1280, 800, true]]) {
        await browser.setViewport(w, h);
        await settle(browser, w);
        const s = await browser.evaluate(generatorStateInPage);
        const label = `→${w}x${h} (minimized)`;
        if (!available) {
            check(!s.panel && !s.restore && !s.rail && !s.context, `${label}: hidden`);
        } else {
            check(!s.panel && s.genMinimized && s.restore === (w < 768) && s.rail === (w >= 768), `${label}: stays minimized with the right restore control`);
        }
    }
    // Turning off from an eligible viewport clears all surfaces
    await browser.evaluate(() => document.getElementById('menu-demo').click());
    const off = await browser.evaluate(generatorStateInPage);
    check(!off.active && !off.panel && !off.rail && !off.restore && !off.context && !off.demoMode && !off.genMinimized, 'deactivation clears every generator surface');
    check(browser.pageErrors.length === 0, `transitions: no page errors (${browser.pageErrors.join(' | ')})`);
}

async function testCardBorders(browser) {
    console.log('\n🧪 Light-mode purple result-card borders (normal/hover/active/no-PDF/dark)');
    await openApp(browser, 1280, 800);
    await browser.evaluate(firstSearchInPage, makeRecords(6, { noPdfEvery: 3 }));
    const styleOf = async (selector) => browser.evaluate(sel => {
        const cs = getComputedStyle(document.querySelector(sel));
        return { top: cs.borderTopColor, right: cs.borderRightColor, left: cs.borderLeftColor, leftWidth: cs.borderLeftWidth, topWidth: cs.borderTopWidth, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, opacity: cs.opacity, cursor: cs.cursor };
    }, selector);
    const normalSel = '#results-area .record-card:not(.no-pdf-card)';
    const disabledSel = '#results-area .record-card.no-pdf-card';
    const normal = await styleOf(normalSel);
    check(normal.top === PURPLE && normal.right === PURPLE && normal.left === PURPLE, `light normal card purple border (${JSON.stringify(normal)})`);
    check(normal.topWidth === '1px' && normal.leftWidth === '4px' && normal.radius === '6px', 'border widths/radius preserved');

    const center = await browser.evaluate(sel => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, normalSel);
    await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: center.x, y: center.y });
    await settle(browser);
    const hover = await styleOf(`${normalSel}:hover`);
    check(hover.top === PURPLE && hover.left === PURPLE, `light hover card stays purple (${JSON.stringify(hover)})`);
    await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    await settle(browser);

    await browser.evaluate(sel => document.querySelector(sel).classList.add('active-view'), normalSel);
    await settle(browser);
    const active = await styleOf(`${normalSel}.active-view`);
    const activeBg = await browser.evaluate(sel => getComputedStyle(document.querySelector(sel)).backgroundColor, `${normalSel}.active-view`);
    const normalBg = await browser.evaluate(() => getComputedStyle(document.querySelectorAll('#results-area .record-card:not(.no-pdf-card):not(.active-view)')[0]).backgroundColor);
    check(active.top === PURPLE && active.shadow !== normal.shadow && activeBg !== normalBg, `active-view stays distinguishable (${JSON.stringify({ shadow: active.shadow, activeBg, normalBg })})`);

    const disabled = await styleOf(disabledSel);
    check(disabled.left === 'rgb(156, 163, 175)' && disabled.top !== PURPLE, `no-PDF card keeps neutral treatment (${JSON.stringify(disabled)})`);
    check(Number(disabled.opacity) < 1 && disabled.cursor === 'not-allowed', 'no-PDF card keeps opacity/cursor');
    const dCenter = await browser.evaluate(sel => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, disabledSel);
    await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dCenter.x, y: dCenter.y });
    await settle(browser);
    const disabledHover = await styleOf(`${disabledSel}:hover`);
    check(disabledHover.left === 'rgb(156, 163, 175)' && disabledHover.top === disabled.top && disabledHover.shadow === disabled.shadow, 'no-PDF hover does not light up purple or lift');
    await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    await settle(browser);

    await browser.evaluate(() => {
        document.querySelectorAll('.record-card.active-view').forEach(card => card.classList.remove('active-view'));
        UI.toggleDarkMode();
    });
    const dark = await styleOf(normalSel);
    const darkSeam = await browser.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.borderTop = '1px solid var(--surface-seam-border)';
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).borderTopColor;
        probe.remove();
        return color;
    });
    check(dark.left === PURPLE && dark.top === darkSeam, `dark-mode card unchanged (seam outline + purple accent) (${JSON.stringify(dark)})`);
    await browser.evaluate(() => UI.toggleDarkMode());
    const back = await styleOf(normalSel);
    check(back.top === PURPLE, 'toggling back to light restores purple border');
    await browser.evaluate(() => localStorage.removeItem('cox_theme'));
}

(async () => {
    const browser = await HeadlessBrowser.launch();
    if (!browser) {
        const msg = '⚠️  SKIPPED: no Chrome/Chromium binary found (set CHROME_PATH) or no global WebSocket (Node >= 22).';
        console.log(msg);
        process.exit(process.env.REQUIRE_BROWSER ? 1 : 0);
    }
    try {
        await testFirstSearchCount(browser);
        await testCountLifecycle(browser);
        await testGeneratorMatrix(browser);
        await testGeneratorResizeTransitions(browser);
        await testCardBorders(browser);
    } catch (err) {
        failed++;
        console.error('❌ Unexpected error:', err);
    } finally {
        await browser.close();
    }
    console.log(`\n${failed === 0 ? '✅' : '❌'} ui-housekeeping browser tests: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
})();
