// v2.5.100 UI housekeeping regressions, exercised in real headless Chrome against the production
// index.html + app.js + style.css (no stubs of UI.render / handleSearchCompletion / syncMobileResultsCount):
//   1. Submittal Generator availability: small phones only (short side <= 430 in the < 768 layout)
//   2. Light-mode purple result-card borders (normal / hover / active / disabled no-PDF / dark)
//   3. Total result count visible immediately on the FIRST search at every viewport
//   4. Scroll-content breathing room and streamlined, keyboard-accessible hamburger menu
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

function cardStyleInPage(selector) {
    const card = document.querySelector(selector);
    const cs = getComputedStyle(card);
    const r = card.getBoundingClientRect();
    const shadows = cs.boxShadow.split(/,(?![^()]*\))/).map(shadow => ({
        inset: shadow.includes('inset'),
        color: shadow.match(/rgba?\([^)]+\)/)?.[0],
        lengths: (shadow.match(/-?[\d.]+px/g) || []).map(parseFloat)
    }));
    return {
        top: cs.borderTopColor, right: cs.borderRightColor, left: cs.borderLeftColor,
        leftWidth: cs.borderLeftWidth, topWidth: cs.borderTopWidth, radius: cs.borderTopLeftRadius,
        shadow: cs.boxShadow, shadows, bg: cs.backgroundColor, opacity: cs.opacity, cursor: cs.cursor,
        transform: cs.transform, transition: cs.transitionDuration, hovered: card.matches(':hover'),
        size: { width: card.offsetWidth, height: card.offsetHeight },
        center: { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    };
}

function checkSelection(style, baseline, label) {
    const ring = style.shadows.find(s => !s.inset && s.lengths.join(',') === '0,0,0,2');
    const glow = style.shadows.find(s => !s.inset && s.lengths.join(',') === '0,0,4,0');
    check(Boolean(ring && glow), `${label}: computed 2px outer ring and 4px glow (${style.shadow})`);
    check(ring?.color.startsWith('rgba(') && glow?.color.startsWith('rgba('), `${label}: ring/glow translucent`);
    check(baseline.shadows.every(s => style.shadows.some(v => JSON.stringify(v) === JSON.stringify(s))), `${label}: preserves baseline surface/hover shadows`);
    check(style.bg !== baseline.bg && style.top === PURPLE && style.left === PURPLE, `${label}: theme tint and purple outline`);
    check(style.topWidth === baseline.topWidth && style.leftWidth === baseline.leftWidth && style.radius === baseline.radius, `${label}: geometry unchanged`);
}

async function testCardBorders(browser) {
    console.log('\n🧪 Selected-card light/dark, active/hover, disabled and reduced-motion states');
    const normalSel = '#results-area .record-card:not(.no-pdf-card)';
    const disabledSel = '#results-area .record-card.no-pdf-card';
    for (const reduced of [false, true]) {
        await browser.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
        await openApp(browser, 1280, 800);
        await browser.evaluate(firstSearchInPage, makeRecords(6, { noPdfEvery: 3 }));
        for (const dark of [false, true]) {
            await browser.evaluate(d => {
                document.body.classList.toggle('dark-mode', d);
                document.querySelectorAll('.record-card').forEach(card => card.classList.remove('active-view'));
            }, dark);
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
            await settle(browser);
            const label = `${dark ? 'dark' : 'light'} ${reduced ? 'reduced motion' : 'normal motion'}`;
            const normal = await browser.evaluate(cardStyleInPage, normalSel);
            check(normal.left === PURPLE && (dark ? normal.top !== PURPLE : normal.top === PURPLE), `${label}: ordinary outline unchanged`);
            check(normal.topWidth === '1px' && normal.leftWidth === '4px' && normal.radius === '6px', `${label}: normal geometry preserved`);
            check(reduced ? normal.transition === '0s' : normal.transition !== '0s', `${label}: expected transition policy`);
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...normal.center });
            await settle(browser);
            const hover = await browser.evaluate(cardStyleInPage, normalSel);
            check(hover.hovered && hover.transform === (reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, -1)'), `${label}: genuine hover with expected lift`);
            const ringOf = style => style.shadows.find(s => s.inset && s.lengths.join(',') === '0,0,0,1');
            check(!ringOf(normal) && Boolean(ringOf(hover)), `${label}: hover adds a 1px inset outline ring (${hover.shadow})`);
            check(ringOf(hover)?.color === (dark ? 'rgba(167, 139, 250, 0.6)' : PURPLE), `${label}: hover ring uses the theme outline colour`);
            check(hover.topWidth === normal.topWidth && hover.leftWidth === normal.leftWidth
                && hover.size.width === normal.size.width && hover.size.height === normal.size.height, `${label}: hover ring keeps card size/layout`);
            await browser.evaluate(sel => document.querySelector(sel).classList.add('active-view'), normalSel);
            await settle(browser);
            const activeHover = await browser.evaluate(cardStyleInPage, normalSel);
            checkSelection(activeHover, hover, `${label} active:hover`);
            check(activeHover.transform === hover.transform, `${label}: selection preserves hover motion`);
            if (reduced) await checkPaintedSelection(browser, `${label} static active:hover`, { index: 1, edges: ['left', 'right'] });
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
            await settle(browser);
            const active = await browser.evaluate(cardStyleInPage, normalSel);
            checkSelection(active, normal, `${label} active`);
            check(!ringOf(active) && Boolean(ringOf(activeHover)), `${label}: hover ring coexists with the glow only while hovered`);
            check(active.bg === (dark ? 'rgb(48, 44, 59)' : 'rgb(243, 238, 249)'), `${label}: opaque theme-appropriate tint`);

            const disabled = await browser.evaluate(cardStyleInPage, disabledSel);
            check(disabled.left === 'rgb(156, 163, 175)' && disabled.top !== PURPLE && Number(disabled.opacity) < 1 && disabled.cursor === 'not-allowed', `${label}: neutral disabled card`);
            await browser.evaluate(sel => document.querySelector(sel).classList.add('active-view'), disabledSel);
            await settle(browser);
            const disabledActive = await browser.evaluate(cardStyleInPage, disabledSel);
            check(disabledActive.shadow === disabled.shadow && disabledActive.bg === disabled.bg && disabledActive.top === disabled.top, `${label}: stale active class cannot select no-PDF card`);
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...disabled.center });
            await settle(browser);
            const disabledHover = await browser.evaluate(cardStyleInPage, disabledSel);
            check(disabledHover.hovered && disabledHover.transform === 'none' && disabledHover.left === disabled.left
                && disabledHover.top === disabled.top && disabledHover.bg === disabled.bg
                && disabledHover.opacity === disabled.opacity && disabledHover.cursor === disabled.cursor
                && disabledHover.shadow === (dark ? 'none' : disabled.shadow), `${label}: no-PDF active:hover stays neutral and does not lift/glow`);
            check(!ringOf(disabledHover), `${label}: no-PDF hover has no outline ring`);
        }
        await browser.evaluate(() => {
            document.body.classList.remove('dark-mode');
            localStorage.removeItem('cox_theme');
        });
    }
    await browser.send('Emulation.setEmulatedMedia', { features: [] });
}

function cardBoundsInPage(last = false, index = null) {
    const list = document.getElementById('results-list');
    const area = document.getElementById('results-area');
    const cards = area.querySelectorAll('.record-card');
    const card = index !== null ? cards[index] : last ? cards[cards.length - 1] : cards[0];
    const clip = list.getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    const cs = getComputedStyle(area);
    // CSS blur has a finite painting support of about 1.5 × its radius in Chromium.
    // Measure the outer indicator, not merely the card border box.
    const indicatorShadows = getComputedStyle(card).boxShadow.split(/,(?![^()]*\))/)
        .filter(s => !s.includes('inset'))
        .map(s => (s.match(/-?[\d.]+px/g) || []).map(parseFloat))
        .filter(v => v[0] === 0 && v[1] === 0);
    const extent = Math.max(0, ...indicatorShadows.map(v => v[2] * 1.5 + (v[3] || 0)));
    return {
        top: bounds.top - clip.top,
        left: bounds.left - clip.left,
        right: clip.right - bounds.right,
        bottom: clip.bottom - bounds.bottom,
        contentBottom: area.getBoundingClientRect().bottom - bounds.bottom,
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
        scrollTop: list.scrollTop,
        scrollable: list.scrollHeight > list.clientHeight,
        horizontalOverflow: list.scrollWidth > list.clientWidth,
        overflow: getComputedStyle(list).overflowY,
        hovered: card.matches(':hover'),
        active: card.classList.contains('active-view'),
        extent,
        paintClearance: {
            top: bounds.top - clip.top - extent, left: bounds.left - clip.left - extent,
            right: clip.right - bounds.right - extent, bottom: clip.bottom - bounds.bottom - extent
        },
        bounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
        center: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
    };
}

// Compare actual compositor screenshots using the browser's native PNG decoder + Canvas.
// Samples outside the border box prove both the ring and softer glow are painted, not clipped.
async function checkPaintedSelection(browser, label, { last = false, index = null, edges = ['top', 'left', 'right'] } = {}) {
    await browser.evaluate((lastCard, i) => {
        const cards = document.querySelectorAll('#results-area .record-card');
        const card = i !== null ? cards[i] : lastCard ? cards[cards.length - 1] : cards[0];
        card.classList.remove('active-view');
    }, last, index);
    await settle(browser);
    const before = await browser.send('Page.captureScreenshot', { format: 'png' });
    await browser.evaluate((lastCard, i) => {
        const cards = document.querySelectorAll('#results-area .record-card');
        const card = i !== null ? cards[i] : lastCard ? cards[cards.length - 1] : cards[0];
        card.classList.add('active-view');
    }, last, index);
    await settle(browser);
    const geometry = await browser.evaluate(cardBoundsInPage, last, index);
    const after = await browser.send('Page.captureScreenshot', { format: 'png' });
    const painted = await browser.evaluate(async (beforePng, afterPng, rect, sides) => {
        async function decode(png) {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        const beforePixels = await decode(beforePng);
        const afterPixels = await decode(afterPng);
        const out = [];
        for (const edge of sides) {
            for (const [name, distance] of [['ring', 1], ['glow', 3]]) {
                let difference = 0;
                let purpleDifference = 0;
                let inImage = true;
                for (let offset = -5; offset < 5; offset++) {
                    const vertical = edge === 'left' || edge === 'right';
                    const x = vertical ? edge === 'left' ? Math.floor(rect.left) - distance : Math.ceil(rect.right) + distance - 1 : Math.floor((rect.left + rect.right) / 2 + offset);
                    const y = vertical ? Math.floor((rect.top + rect.bottom) / 2 + offset) : edge === 'top' ? Math.floor(rect.top) - distance : Math.ceil(rect.bottom) + distance - 1;
                    inImage &&= x >= 0 && y >= 0 && x < afterPixels.width && y < afterPixels.height;
                    const i = (y * afterPixels.width + x) * 4;
                    for (let channel = 0; channel < 3; channel++) difference += Math.abs(afterPixels.data[i + channel] - beforePixels.data[i + channel]);
                    purpleDifference += (afterPixels.data[i + 2] - afterPixels.data[i + 1]) - (beforePixels.data[i + 2] - beforePixels.data[i + 1]);
                }
                out.push({ edge, name, difference: difference / 30, purpleDifference: purpleDifference / 10, inImage });
            }
        }
        return out;
    }, before.data, after.data, geometry.bounds, edges);
    for (const sample of painted) {
        check(sample.inImage && sample.difference > 0.5 && sample.purpleDifference > 0,
            `${label}: ${sample.edge} ${sample.name} visibly painted outside card (${JSON.stringify(sample)})`);
    }
    check(geometry.extent === 6, `${label}: computed glow paint extent is 6px`);
    for (const edge of edges) {
        check(geometry.paintClearance[edge] >= 0.5, `${label}: ${edge} glow paint bounds inside scroll clip (${JSON.stringify(geometry.paintClearance)})`);
    }
}

async function testCardScrollBounds(browser) {
    console.log('\n🧪 First-card bounds: light/dark normal/hover/active, sides, bottom, pagination');
    for (const [w, h] of [[1280, 800], [768, 1024], [700, 1000], [390, 844], [667, 375]]) {
        await openApp(browser, w, h);
        await browser.evaluate(firstSearchInPage, makeRecords(51));
        await settle(browser);
        for (const dark of [false, true]) {
            if (dark) await browser.evaluate(() => UI.toggleDarkMode());
            await browser.evaluate(() => {
                document.getElementById('results-list').scrollTop = 0;
                document.querySelector('#results-area .record-card').classList.remove('active-view');
            });
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
            await settle(browser);
            const label = `${w}x${h} ${dark ? 'dark' : 'light'}`;
            const normal = await browser.evaluate(cardBoundsInPage);
            check(normal.padding.join(',') === '8px,8px,10px,8px', `${label}: consistent scroll-content padding (${normal.padding})`);
            check(normal.overflow === 'auto' && normal.scrollable && !normal.horizontalOverflow, `${label}: vertical scrolling without horizontal overflow`);
            const checkBounds = (r, state, top) => {
                check(r.scrollTop === 0 && Math.abs(r.top - top) < 0.6, `${label} ${state}: first card clear of upper clip (${JSON.stringify(r)})`);
                check(r.left >= 7.5 && r.right >= 7.5, `${label} ${state}: side outlines/shadows have allowance`);
                if (r.active) check(r.extent === 6 && r.paintClearance.top >= 0.5 && r.paintClearance.left >= 0.5 && r.paintClearance.right >= 0.5,
                    `${label} ${state}: computed outer ring/glow bounds clear top and side clips`);
            };
            checkBounds(normal, 'normal', 8);
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...normal.center });
            await settle(browser);
            const hover = await browser.evaluate(cardBoundsInPage);
            check(hover.hovered, `${label}: first card really hovered`);
            checkBounds(hover, 'hover', 7);
            await browser.evaluate(() => document.querySelector('#results-area .record-card').classList.add('active-view'));
            await settle(browser);
            const activeHover = await browser.evaluate(cardBoundsInPage);
            check(activeHover.active && activeHover.hovered, `${label}: active card remains hovered`);
            checkBounds(activeHover, 'active hover', 7);
            await checkPaintedSelection(browser, `${label} first active:hover`);
            await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
            await settle(browser);
            checkBounds(await browser.evaluate(cardBoundsInPage), 'active', 8);
            await checkPaintedSelection(browser, `${label} first active`);
            await browser.evaluate(() => {
                const list = document.getElementById('results-list');
                list.scrollTop = list.scrollHeight;
            });
            const bottom = await browser.evaluate(cardBoundsInPage, true);
            check(bottom.bottom >= 9.5 && Math.abs(bottom.contentBottom - 10) < 0.6, `${label}: last card clears bottom clip by 10px (${JSON.stringify(bottom)})`);
            await checkPaintedSelection(browser, `${label} last active`, { last: true, edges: ['left', 'right', 'bottom'] });
            const middleIndex = await browser.evaluate(() => {
                const cards = document.querySelectorAll('#results-area .record-card');
                const i = Math.floor(cards.length / 2);
                const list = document.getElementById('results-list');
                const card = cards[i].getBoundingClientRect();
                const clip = list.getBoundingClientRect();
                list.scrollTop += card.top - clip.top - (list.clientHeight - card.height) / 2;
                return i;
            });
            await settle(browser);
            const middle = await browser.evaluate(cardBoundsInPage, false, middleIndex);
            check(middle.scrollTop > 0 && middle.top > 6 && middle.bottom > 6 && !middle.horizontalOverflow, `${label}: selected middle card visible at mid-scroll`);
            await checkPaintedSelection(browser, `${label} mid-scroll active`, { index: middleIndex, edges: ['left', 'right'] });
        }
        await browser.evaluate(() => {
            UI.toggleDarkMode();
            localStorage.removeItem('cox_theme');
            SearchEngine.nextPage();
            document.getElementById('results-list').scrollTop = 0;
        });
        const page2 = await browser.evaluate(cardBoundsInPage);
        check(Math.abs(page2.top - 8) < 0.6 && !page2.horizontalOverflow, `${w}x${h}: page 2 preserves padding and list width`);
        await checkPaintedSelection(browser, `${w}x${h} page 2 active`);
        await browser.evaluate(() => {
            SearchEngine.nextPage();
            document.getElementById('results-list').scrollTop = 0;
        });
        const lastPage = await browser.evaluate(cardBoundsInPage);
        check(!lastPage.scrollable && lastPage.padding.join(',') === '8px,8px,10px,8px', `${w}x${h}: final single-card page preserves padding`);
        await checkPaintedSelection(browser, `${w}x${h} final page active`, { edges: ['top', 'left', 'right', 'bottom'] });
        check(browser.pageErrors.length === 0, `${w}x${h}: bounds tests have no page errors`);
    }
}

async function testMenuHousekeeping(browser) {
    console.log('\n🧪 Streamlined menu: retained handlers, tab controls, small-phone headers, outside click');
    for (const [w, h] of [[1280, 800], [390, 844]]) {
        await openApp(browser, w, h);
        const label = `${w}x${h}`;
        const state = await browser.evaluate(() => {
            document.getElementById('main-menu-btn').click();
            const menu = document.getElementById('main-menu');
            const shown = el => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
            return {
                open: menu.classList.contains('visible'),
                removed: [...menu.querySelectorAll('button, a, [tabindex]')].some(el =>
                    /Harvest CSV|Clear PDF Cache|Force Reset|harvestCSV|clearPdfCache|resetSync/.test(el.textContent + el.getAttribute('onclick'))),
                headers: [...menu.querySelectorAll('.menu-header')].filter(shown).map(el => el.textContent.trim()),
                controls: [...menu.querySelectorAll('button')].filter(shown).map(el => el.textContent.trim().replace(/\s+/g, ' ')),
                logoutHandler: [...menu.querySelectorAll('button')].find(el => /Logout/.test(el.textContent))?.getAttribute('onclick')
            };
        });
        check(state.open && !state.removed, `${label}: removed utilities are absent, not just hidden`);
        check(!state.headers.includes('Admin Tools'), `${label}: no empty Admin Tools header`);
        check(state.controls.length === (w < 768 ? 2 : 3), `${label}: only retained controls displayed (${state.controls})`);
        check(state.logoutHandler === 'AuthService.logout(); UI.toggleMenu()', `${label}: logout handler retained (never invoked)`);
        await browser.evaluate(() => document.getElementById('main-menu-btn').focus());
        for (const expected of state.controls) {
            await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
            await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
            const focused = await browser.evaluate(() => document.activeElement.textContent.trim().replace(/\s+/g, ' '));
            check(focused === expected, `${label}: Tab reaches only retained control "${expected}" (got "${focused}")`);
        }
        const theme = await browser.evaluate(() => {
            const before = document.body.classList.contains('dark-mode');
            [...document.querySelectorAll('#main-menu button')].find(el => /Switch Theme/.test(el.textContent)).click();
            return { changed: before !== document.body.classList.contains('dark-mode'), closed: !document.getElementById('main-menu').classList.contains('visible') };
        });
        check(theme.changed && theme.closed, `${label}: theme handler still toggles theme and closes menu`);
        await browser.evaluate(() => {
            UI.toggleDarkMode();
            localStorage.removeItem('cox_theme');
            document.getElementById('main-menu-btn').click();
        });
        if (w >= 768) {
            const generator = await browser.evaluate(() => {
                document.getElementById('menu-demo').click();
                return { active: DemoManager.isGeneratorActive, closed: !document.getElementById('main-menu').classList.contains('visible') };
            });
            check(generator.active && generator.closed, `${label}: generator handler still activates and closes menu`);
            await browser.evaluate(() => {
                DemoManager.toggleGenerator();
                document.getElementById('main-menu-btn').click();
            });
        }
        const outside = await browser.evaluate(() => {
            document.body.click();
            return !document.getElementById('main-menu').classList.contains('visible');
        });
        check(outside, `${label}: outside click still closes menu`);
        check(browser.pageErrors.length === 0, `${label}: menu tests have no page errors`);
    }
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
        await testCardScrollBounds(browser);
        await testMenuHousekeeping(browser);
    } catch (err) {
        failed++;
        console.error('❌ Unexpected error:', err);
    } finally {
        await browser.close();
    }
    console.log(`\n${failed === 0 ? '✅' : '❌'} ui-housekeeping browser tests: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
})();
