// Real production classes, PDF.js worker, pdf-lib, DOM and canvas; no npm dependencies.
// Run: REQUIRE_BROWSER=1 node tests/generator.browser.test.js (Node 22+, installed Chrome).
const assert = require('node:assert/strict');
const { HeadlessBrowser } = require('./helpers/headless-browser');

let assertions = 0;
function check(value, message) {
    assert.ok(value, message);
    assertions++;
}

async function openFixture(browser) {
    await browser.open(1280, 900);
    await browser.evaluate(async () => {
        document.documentElement.classList.add('logged-in');
        document.getElementById('auth-overlay').classList.remove('active-modal');
        window.alert = message => (window.__alerts ||= []).push(String(message));
        window.confirm = () => true;
        window.__alerts = [];
        const bootstrapStart = Date.now();
        while (!window.TEMPLATE_BYTES && Date.now() - bootstrapStart < 10000) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        if (!window.TEMPLATE_BYTES) throw new Error('Locally vendored cover template bootstrap did not complete');
        const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
        window.__makePdf = async (template = false, label = '') => {
            const doc = await PDFDocument.create();
            const font = await doc.embedFont(StandardFonts.Courier);
            const sizes = template ? [[500, 700]] : [[612, 792], [792, 612], [600, 800], [450, 650]];
            sizes.forEach(([w, h], i) => {
                const page = doc.addPage([w, h]);
                if (!template && i === 1) page.setRotation(degrees(180));
                if (!template && i === 2) {
                    page.setCropBox(30, 50, 540, 700);
                    page.setRotation(degrees(90));
                }
                if (!template && i === 3) page.setRotation(degrees(270));
                page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(0.2, 0.4, 0.8) });
                const text = template ? 'SYNTHETIC TEMPLATE' : [
                    'SYNTHETIC ORIGINAL COVER', 'NOTES SPECIFICATION INDEX',
                    'L1 L2 MOTOR PUMP WIRING SCHEMATIC', 'DOOR FRONT VIEW PANEL FRONT'
                ][i];
                page.drawText(text + label, { x: 60, y: h - 90, size: 12, font, color: rgb(0, 0, 0) });
            });
            return (await doc.save()).buffer;
        };
        window.__sourceBytes = await __makePdf();
        window.__templateBytes = await __makePdf(true);
        await Generator.setTemplate(__templateBytes.slice(0));
        window.__loadFixture = async (bytes = __sourceBytes, id = 'SYNTHETIC-A') => {
            PdfViewer._activePanelId = id;
            await PdfViewer.loadFromCache({
                arrayBuffer: bytes.slice(0), blob: new Blob([bytes], { type: 'application/pdf' })
            }, id, location.origin + '/' + id + '.pdf');
            if (!PdfViewer.isDocumentValid() || document.querySelectorAll('.pdf-page-wrapper').length !== 4) {
                throw new Error('Real cached PDF load did not commit all four pages');
            }
        };
        window.__wrapper = n => document.querySelector(`.pdf-page-wrapper[data-page-number="${n}"]`);
        window.__boxes = n => Array.from(__wrapper(n).querySelectorAll('.redaction-box'));
        window.__choose = async (n, profile) => {
            const select = __wrapper(n).querySelector('.page-profile-select');
            const stable = /^(BUILTIN|CUSTOM|MEASURED):/.test(profile) ? profile : 'BUILTIN:' + profile;
            const options = Array.from(select.options);
            const selected = options.some(option => option.value === stable) ? stable : profile;
            if (!options.some(option => option.value === selected)) {
                throw new Error('Profile missing from actual dropdown: ' + stable);
            }
            select.value = selected;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        };
        window.__activate = async () => {
            DemoManager.toggleGenerator();
            const start = Date.now();
            while (document.body.classList.contains('generator-transition') && Date.now() - start < 10000) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            if (!DemoManager.isGeneratorActive || document.body.classList.contains('generator-transition')) {
                throw new Error('Generator activation did not finish');
            }
        };
        window.__raster = async bytes => {
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
            const pages = [];
            for (let n = 1; n <= doc.numPages; n++) {
                const page = await doc.getPage(n);
                const viewport = page.getViewport({ scale: 1 });
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                const content = await page.getTextContent();
                pages.push({
                    width: viewport.width, height: viewport.height,
                    rotation: viewport.rotation,
                    text: content.items.map(item => item.str).join(' ').replace(/\s+/g, ' '),
                    fonts: Object.values(content.styles).map(style => style.fontFamily),
                    pixel: (x, y) => Array.from(canvas.getContext('2d').getImageData(
                        Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data)
                });
            }
            await doc.destroy();
            return pages;
        };
        await __loadFixture();
    });
}

async function main() {
    const browser = await HeadlessBrowser.launch();
    if (!browser) {
        if (process.env.REQUIRE_BROWSER === '1') throw new Error('Chrome and Node 22+ required');
        console.log('SKIP generator browser tests: Chrome or Node 22+ unavailable');
        return;
    }
    try {
        await openFixture(browser);
        check(await browser.evaluate(() => PDFLib && pdfjsLib && PdfViewer.doc.numPages === 4),
            'Synthetic fixture loads with real locally vendored PDF libraries');
        const failures = [];
        for (const test of [testProfilesAndEditing, testGeometryAndOutput, testOriginalActions,
            testMappingAndDigest, testMeasuredEvidence, testProfileNameEscaping, testAsyncInvalidation, testTemplateFailure, testTemplateRaces,
            testTemplateSourceSwap, testDigestFailure]) {
            try {
                await test(browser);
                check(browser.pageErrors.length === 0, `${test.name}: no unhandled browser exceptions (${browser.pageErrors.join(' | ')})`);
            } catch (error) {
                failures.push(`${test.name}: ${error.message}`);
                console.error(`FAIL ${test.name}: ${error.message}`);
            }
        }
        if (failures.length) console.error(`Generator browser: ${assertions} assertions passed, ${failures.length} groups failed`);
        assert.equal(failures.length, 0, failures.join('\n'));
        console.log(`PASS generator browser: ${assertions} assertions`);
    } finally {
        await browser.close();
    }
}

async function testProfilesAndEditing(browser) {
    console.log('Generator: mixed profiles, current-page edits, save, rerender and zoom');
    await browser.evaluate(() => __activate());
    const mixed = await browser.evaluate(async () => {
        await __choose(2, 'INFO_BORDERLESS');
        await __choose(3, 'SCHEMATIC_LANDSCAPE');
        await __choose(4, 'DOOR_DRAWING');
        return [1, 2, 3, 4].map(n => ({
            profile: GeneratorState.id(__wrapper(n).querySelector('.page-profile-select').value),
            count: __boxes(n).length
        }));
    });
    check(mixed.map(p => p.profile).join('|') === 'BUILTIN:COVER_TEMPLATE|BUILTIN:INFO_BORDERLESS|BUILTIN:SCHEMATIC_LANDSCAPE|BUILTIN:DOOR_DRAWING',
        `Cover stays deterministic while other pages accept independent explicit profiles (${mixed.map(p => p.profile)})`);
    check(mixed.every(p => p.count > 0), 'Each mixed profile has rendered canonical zones');
    const edit = await browser.evaluate(() => {
        PageContext.setActivePage(3);
        document.getElementById('pdf-main-view').scrollTop = 0;
        const before = [1, 2, 3, 4].map(n => __boxes(n).length);
        RedactionManager.addZoneToCurrentView('blocker');
        const box = __boxes(3).at(-1);
        RedactionManager.selectZone(box);
        RedactionManager.updateCustomText('EDITED PAGE THREE');
        RedactionManager.updateActiveAlignment('right');
        document.getElementById('zone-bg-toggle').checked = false;
        RedactionManager.toggleBoxBackground();
        document.getElementById('redact-size').value = 18;
        RedactionManager.updateActiveStyle();
        document.getElementById('new-profile-name').value = 'Synthetic saved page';
        ProfileManager.saveCurrentPageAsProfile();
        return {
            before, after: [1, 2, 3, 4].map(n => __boxes(n).length),
            type: box.dataset.type, font: box.style.fontFamily,
            saved: ProfileManager.getCustomProfiles()['Synthetic saved page']
        };
    });
    check(edit.after.every((count, i) => count === edit.before[i] + (i === 2 ? 1 : 0)),
        'Add targets currentPage=3 even while page one is visible');
    check(edit.type === 'blocker', 'Manual whiteout records blocker type');
    check(edit.saved?.some(z => z.text === 'EDITED PAGE THREE' || z.customText === 'EDITED PAGE THREE'),
        'Save targets currentPage, not first visible page');
    await browser.evaluate(async () => {
        const priorToken = PdfViewer.currentRenderToken;
        PdfViewer.zoom(0.4);
        const start = Date.now();
        while ((PdfViewer.currentRenderToken === priorToken || PdfViewer._zoomTimer
            || !Generator.getState().renderCommitted) && Date.now() - start < 10000) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        if (PdfViewer.currentRenderToken === priorToken || !Generator.getState().renderCommitted) {
            throw new Error('Real zoom action did not commit a rerender');
        }
    });
    const persisted = await browser.evaluate(() => {
        const box = __boxes(3).find(b => b.dataset.customText === 'EDITED PAGE THREE');
        return {
            profiles: [1, 2, 3, 4].map(n => GeneratorState.id(__wrapper(n).querySelector('.page-profile-select').value)),
            box: box && { text: box.querySelector('span').textContent, align: box.style.textAlign,
                transparent: box.dataset.transparent, type: box.dataset.type,
                width: parseFloat(box.style.width) / box.closest('.pdf-content-container').offsetWidth }
        };
    });
    check(persisted.profiles.join('|') === mixed.map(p => p.profile).join('|'),
        'Profile selections survive real full-stack rerender');
    check(persisted.box?.text === 'EDITED PAGE THREE' && persisted.box.align === 'right'
        && persisted.box.transparent === 'true' && persisted.box.type === 'blocker',
        'Text, alignment, transparency and blocker type survive zoom/rerender');
    check(Math.abs(persisted.box?.width - 0.3) < 0.003,
        'Manual normalized geometry survives zoom');
    const deletion = await browser.evaluate(() => {
        RedactionManager.selectZone(__boxes(3).find(b => b.dataset.customText === 'EDITED PAGE THREE'));
        RedactionManager.deleteSelected();
        return __boxes(3).some(b => b.dataset.customText === 'EDITED PAGE THREE');
    });
    check(!deletion, 'Delete removes selected canonical zone');
    await browser.evaluate(() => PdfViewer.renderStack());
    check(await browser.evaluate(() => !__boxes(3).some(b => b.dataset.customText === 'EDITED PAGE THREE')),
        'Deleted zone does not resurrect after rerender');
    const mapped = await browser.evaluate(async () => {
        document.getElementById('demo-cust-name').value = 'SYNTHETIC CUSTOMER';
        document.getElementById('demo-job-name').value = 'SYNTHETIC JOB';
        document.getElementById('demo-system-type').value = 'Duplex';
        document.getElementById('demo-date').value = '2026-07-08';
        Generator.setPageZones(1, [
            { map: 'cust', x: 0.1, y: 0.5, w: 0.8, h: 0.1, fontSize: 12 },
            { map: 'job_block', x: 0.1, y: 0.65, w: 0.8, h: 0.15, fontSize: 12 },
            { map: 'date', x: 0.1, y: 0.85, w: 0.8, h: 0.1, fontSize: 12 }
        ]);
        RedactionManager.refreshContent();
        const dom = __boxes(1).map(box => ({ text: box.querySelector('span').textContent, font: box.style.fontFamily }));
        const pages = await __raster((await PdfExporter.generateRedactedPdf()).buffer);
        return { dom, text: pages[0].text };
    });
    check(mapped.dom[0].font.includes('Times') && mapped.dom[1].font.includes('Courier'),
        'Cover customer defaults to Times, other cover fields default to Courier');
    check(mapped.dom[0].text === 'SYNTHETIC CUSTOMER' && mapped.dom[1].text.includes('SYNTHETIC JOB')
        && mapped.dom[2].text === '07/08/26' && mapped.text.includes('SYNTHETIC CUSTOMER')
        && mapped.text.includes('SYNTHETIC JOB') && mapped.text.includes('07/08/26'),
        `Mapped customer/job-block/date text agrees between DOM and actual exported PDF (${JSON.stringify(mapped)})`);
}

async function testGeometryAndOutput(browser) {
    console.log('Generator: actual exported PDF crop/rotation, fonts, opaque/transparent agreement');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    const output = await browser.evaluate(async () => {
        const rules = [
            { map: 'custom', x: 0.15, y: 0.3, w: 0.25, h: 0.12, text: 'COURIER TEXT',
                type: 'blocker', fontSize: 12, transparent: false },
            { map: 'custom', x: 0.55, y: 0.3, w: 0.25, h: 0.12, text: 'TIMES TEXT',
                fontSize: 12, fontFamily: "'Times New Roman', serif", transparent: true }
        ];
        ProfileManager.saveProfile('Synthetic geometry', rules);
        for (const n of [2, 3, 4]) await __choose(n, 'CUSTOM:Synthetic geometry');
        Generator.setPageZones(2, [...rules, {
            map: 'custom', x: 0.02, y: 0.78, w: 0.96, h: 0.18,
            text: '', type: 'blocker', fontSize: 12, transparent: false
        }]);
        Generator.setPageZones(1, rules);
        RedactionManager.refreshContent();
        const before = [1, 2, 3, 4].map(n => {
            const c = __wrapper(n).querySelector('.pdf-content-container');
            return { width: c.offsetWidth / PdfViewer.currentScale, height: c.offsetHeight / PdfViewer.currentScale,
                fonts: __boxes(n).slice(0, 2).map(b => b.style.fontFamily), types: __boxes(n).slice(0, 2).map(b => b.dataset.type),
                left: __boxes(n).slice(0, 2).map(b => parseFloat(b.style.left) / c.offsetWidth) };
        });
        const bytes = await PdfExporter.generateRedactedPdf();
        const pages = await __raster(bytes.buffer || bytes);
        return { before, pages: pages.map(p => ({
            width: p.width, height: p.height, rotation: p.rotation, text: p.text, fonts: p.fonts,
            opaque: p.pixel(0.17, 0.31), transparent: p.pixel(0.57, 0.31), maskedRow: p.pixel(0.7, 0.85)
        })) };
    });
    check(output.pages.length === 4, 'Generated composite retains all pages');
    for (let i = 0; i < 4; i++) {
        const page = output.pages[i];
        const dom = output.before[i];
        check(Math.abs(page.width - dom.width) < 2 && Math.abs(page.height - dom.height) < 2,
            `Page ${i + 1}: exported display geometry agrees with rendered crop/rotation`);
        check(page.opaque.slice(0, 3).every(v => v > 245),
            `Page ${i + 1}: whiteout paints same normalized rectangle in exported raster (${page.opaque})`);
        check(page.transparent[0] < 80 && page.transparent[1] > 80 && page.transparent[2] > 180,
            `Page ${i + 1}: transparent overlay preserves source background (${page.transparent}; ${page.width}x${page.height}; ${page.text})`);
        check(page.text.includes('COURIER TEXT') && page.text.includes('TIMES TEXT'),
            `Page ${i + 1}: actual PDF text contains both replacement fonts`);
        if (i > 0) check(page.fonts.includes('monospace') && page.fonts.includes('serif'),
            `Page ${i + 1}: actual PDF embeds both Courier and Times font families`);
        check(dom.fonts[0].includes('Courier') && dom.types[0] === 'blocker',
            `Page ${i + 1}: legacy default font and blocker type preserved`);
        check(dom.left.every((x, j) => Math.abs(x - [0.15, 0.55][j]) < 0.002),
            `Page ${i + 1}: DOM uses exact normalized imported geometry`);
    }
    check(output.pages[2].width === 700 && output.pages[2].height === 540,
        '90-degree page keeps nonzero-origin crop geometry');
    check(output.pages[3].width === 650 && output.pages[3].height === 450,
        '270-degree page keeps mixed-size orientation');
    check(output.pages.map(p => p.rotation).join(',') === '0,180,90,270',
        'Actual PDF output retains all four page rotations: 0/90/180/270');
    check(output.pages[1].maskedRow.slice(0, 3).every(v => v > 245)
        && output.pages[1].text.includes('NOTES SPECIFICATION INDEX'),
        'Opaque visual mask covers original notes row but PDF.js still extracts underlying original text');
}

async function testOriginalActions(browser) {
    console.log('Generator: OFF original view, download and print');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    await resolveFixture(browser);
    const original = await browser.evaluate(async () => {
        DemoManager.toggleGenerator();
        const start = Date.now();
        while (document.body.classList.contains('generator-transition') && Date.now() - start < 10000) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        const firstCanvas = __wrapper(1).querySelector('canvas');
        const links = [];
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { links.push({ href: this.href, download: this.download }); };
        try { await PdfViewer.download(); } finally { HTMLAnchorElement.prototype.click = click; }
        const downloaded = links[0] && await fetch(links[0].href).then(r => r.arrayBuffer());
        const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).join(',');
        const match = downloaded && await digest(downloaded) === await digest(__sourceBytes);
        const beforeFrames = new Set(document.querySelectorAll('iframe'));
        await PdfViewer.print();
        const printFrame = Array.from(document.querySelectorAll('iframe')).find(frame => !beforeFrames.has(frame));
        const printSrc = printFrame?.src;
        const printBytes = printSrc && await fetch(printSrc).then(r => r.arrayBuffer());
        const printMatches = printBytes && await digest(printBytes) === await digest(__sourceBytes);
        if (printFrame) {
            await new Promise(resolve => {
                if (printFrame.contentDocument?.readyState === 'complete') resolve();
                else { printFrame.addEventListener('load', resolve, { once: true }); setTimeout(resolve, 2000); }
            });
            printFrame.contentWindow?.dispatchEvent(new Event('afterprint'));
        }
        return {
            active: DemoManager.isGeneratorActive,
            canvasSize: [firstCanvas.width, firstCanvas.height],
            zones: document.querySelectorAll('.redaction-box').length,
            match, printMatches,
            toolbarEnabled: !document.getElementById('pdf-download-btn').disabled
                && !document.getElementById('pdf-print-btn').disabled
        };
    });
    check(!original.active && original.zones === 0, 'OFF displays no generator overlays');
    check(original.canvasSize[0] === 612 && original.canvasSize[1] === 792,
        'OFF page one renders source, not differently sized template');
    check(original.toolbarEnabled && original.match, 'Toolbar Download remains exact original PDF bytes');
    check(original.printMatches, 'Toolbar Print uses exact original PDF bytes, not generated bytes');
}

async function testMappingAndDigest(browser) {
    console.log('Generator: digest-bound atomic mapping validation and profile migration');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    const unresolved = await browser.evaluate(async () => {
        await Generator.ready();
        const state = Generator.getState();
        let error;
        try { await PdfExporter.generateRedactedPdf(); } catch (e) { error = e.message; }
        return { state, error, digest: Array.from(new Uint8Array(
            await crypto.subtle.digest('SHA-256', __sourceBytes))).map(b => b.toString(16).padStart(2, '0')).join('') };
    });
    check(unresolved.state.sourceDigest === unresolved.digest && /^[a-f0-9]{64}$/.test(unresolved.digest),
        'Canonical source digest is actual SHA-256 of exact cached PDF bytes');
    check([2, 3, 4].every(n => unresolved.state.pages[n]?.status === 'unresolved'),
        'Unknown synthetic title-block geometry stays unresolved despite schematic keywords');
    check(/resolve/i.test(unresolved.error), 'Unresolved pages block actual PDF export');
    const migration = await browser.evaluate(async () => {
        const legacy = { 'Synthetic legacy': [
            { map: 'custom', x: 0.1, y: 0.2, w: 0.3, h: 0.1, text: 'LEGACY TEXT', type: 'blocker' }
        ] };
        Generator.importProfiles(JSON.stringify(legacy));
        const exported = Generator.exportProfiles();
        Generator.importProfiles(JSON.stringify(exported));
        for (const n of [2, 3, 4]) await __choose(n, 'CUSTOM:Synthetic legacy');
        await PdfViewer.renderStack();
        const mapping = Generator.exportMapping();
        window.__mapping = mapping;
        const registry = Object.fromEntries(Object.keys(Generator.state.profiles).sort().map(key => [
            key, GeneratorState.zones(Generator.state.profiles[key], key === 'BUILTIN:COVER_TEMPLATE' ? 1 : 0)
        ]));
        const nativeRevision = 'profiles-sha256:' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
            new TextEncoder().encode(JSON.stringify({ assetRevision: Generator.assetRevision || 'builtin', profiles: registry })))))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const downloads = [];
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { downloads.push({ url: this.href, name: this.download }); };
        try { ConfigExporter.export(); } finally { HTMLAnchorElement.prototype.click = click; }
        const download = downloads[0];
        const serialized = download && await fetch(download.url).then(response => response.json());
        await new Promise(resolve => setTimeout(resolve, 1100));
        let revoked;
        try { await fetch(download.url); revoked = false; } catch (_) { revoked = true; }
        const saved = JSON.parse(localStorage.getItem('cox_custom_profiles'));
        return { exported, saved, mapping, text: __boxes(3)[0].querySelector('span').textContent,
            nativeRevision,
            download: { name: download?.name, equivalent: JSON.stringify(serialized) === JSON.stringify(mapping), revoked } };
    });
    check(migration.exported.schema === 'schematicai-profiles/1', 'Legacy profiles export with versioned schema');
    check(migration.saved['Synthetic legacy'][0].type === 'blocker'
        && migration.saved['Synthetic legacy'][0].fontFamily.includes('Courier')
        && migration.saved['Synthetic legacy'][0].transparent === false,
        'Legacy profiles persist defaults and blocker type through import/export');
    check(migration.text === 'LEGACY TEXT', 'Imported profile paints real zones after rerender');
    check(migration.mapping.schema === 'schematicai-generator-mapping/1'
        && migration.mapping.pages.length === 4
        && migration.mapping.pages.every(p => p.coordinateSpace === 'displayed-cropbox-normalized'),
        'Mapping exports all pages in explicitly versioned coordinate space');
    check(/^profiles-sha256:[a-f0-9]{64}$/.test(migration.mapping.profileRevision)
        && migration.mapping.profileRevision === migration.nativeRevision,
        'Profile revision is compact native-SHA-256-equivalent semantic registry hash, not embedded profile text');
    check(migration.download.name === 'generator-mapping.json' && migration.download.equivalent,
        'Actual ConfigExporter download serializes the complete canonical mapping envelope');
    check(migration.download.revoked, 'ConfigExporter revokes its downloaded JSON blob URL');
    const rejected = await browser.evaluate(() => {
        const mutations = [
            m => { m.sourceDigest = '0'.repeat(64); },
            m => { m.sourcePageCount = 5; },
            m => { m.profileRevision += '-stale'; },
            m => { m.pages.pop(); },
            m => { m.pages[2].page = 2; },
            m => { m.pages[2].profileId = 'CUSTOM:does-not-exist'; },
            m => { m.pages[2].coordinateSpace = 'pdf-points'; },
            m => { m.pages[2].zones[0].x = -0.1; },
            m => { m.pages[2].zones[0].fontSize = Infinity; },
            m => { m.pages[2].zones[0].transparent = 'false'; }
        ];
        const before = JSON.stringify(Generator.getState().pages);
        return mutations.map(mutate => {
            const mapping = structuredClone(__mapping);
            mutate(mapping);
            let error;
            try { Generator.importMapping(mapping); } catch (e) { error = e.message; }
            return { error, unchanged: before === JSON.stringify(Generator.getState().pages) };
        });
    });
    for (const [i, result] of rejected.entries()) {
        check(!!result.error && result.unchanged, `Invalid mapping case ${i + 1} rejects atomically without mutation`);
    }
    const imported = await browser.evaluate(async () => {
        const digest = Generator.getState().digest;
        const generation = Generator.getState().generation;
        await __loadFixture(__sourceBytes, 'SYNTHETIC-SAME-BYTES');
        await Generator.ready();
        Generator.importMapping(JSON.stringify(__mapping));
        const next = Generator.getState();
        return {
            digestEqual: next.digest === digest, generationChanged: next.generation !== generation,
            exact: Object.values(next.pages).every(p => p.status === 'resolved' && p.provenance === 'exact'),
            text: __boxes(3)[0].querySelector('span').textContent,
            generated: (await PdfExporter.generateRedactedPdf()).length > 0
        };
    });
    check(imported.digestEqual && imported.generationChanged,
        'Identical source bytes share digest but each PDF load gets a new generation');
    check(imported.exact && imported.text === 'LEGACY TEXT' && imported.generated,
        'Exact mapping imports for identical source bytes and drives real export');
    const wrongSource = await browser.evaluate(async () => {
        await __loadFixture(await __makePdf(false, ' DIFFERENT BYTES'), 'SYNTHETIC-B');
        let error;
        try { Generator.importMapping(__mapping); } catch (e) { error = e.message; }
        return { error, digest: Generator.getState().digest, old: __mapping.sourceDigest };
    });
    check(wrongSource.digest !== wrongSource.old && /digest/i.test(wrongSource.error),
        'Different PDF bytes cannot reuse another source mapping');
}

async function resolveFixture(browser) {
    await browser.evaluate(async () => {
        for (const n of [2, 3, 4]) await __choose(n, 'GENERAL');
    });
}

async function testMeasuredEvidence(browser) {
    console.log('Generator: actual PDF.js vector evidence resolves a known measured layout');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    const measured = await browser.evaluate(async () => {
        await Generator.ready();
        let candidate;
        for (const [key, entry] of Object.entries(Generator.fingerprints)) {
            const meta = Generator.metadata[key];
            const fp = entry.fingerprint;
            if (!fp?.template_lines_rel || !fp.title_block_bbox || !meta || meta.cox_check_fields?.length) continue;
            const [x0, y0, x1, y1] = fp.title_block_bbox;
            const H = fp.template_lines_rel.H.map(([y, a, b]) => [
                y0 + y * (y1 - y0), x0 + a * (x1 - x0), x0 + b * (x1 - x0)]);
            const V = fp.template_lines_rel.V.map(([x, a, b]) => [
                x0 + x * (x1 - x0), y0 + a * (y1 - y0), y0 + b * (y1 - y0)]);
            const result = GeneratorState.matchMeasured({ H, V, edge: meta.title_block_edge, class: entry.class },
                Generator.measured, Generator.fingerprints, Generator.metadata);
            if (result.status === 'resolved' && result.profileId === 'MEASURED:' + key) {
                candidate = { key, H, V, class: entry.class };
                break;
            }
        }
        if (!candidate) throw new Error('No unambiguous measured fingerprint fixture is available');
        const pdf = await PDFLib.PDFDocument.create();
        const font = await pdf.embedFont(PDFLib.StandardFonts.Courier);
        for (let i = 0; i < 4; i++) {
            const page = pdf.addPage([792, 612]);
            page.drawText(i === 1 && candidate.class === 'INFO' ? 'SYNTHETIC NOTES' : 'SYNTHETIC SCHEMATIC',
                { x: 50, y: 560, size: 12, font });
            if (i !== 1) continue;
            for (const [y, a, b] of candidate.H) page.drawLine({
                start: { x: a * 792, y: (1 - y) * 612 }, end: { x: b * 792, y: (1 - y) * 612 }, thickness: 1 });
            for (const [x, a, b] of candidate.V) page.drawLine({
                start: { x: x * 792, y: (1 - a) * 612 }, end: { x: x * 792, y: (1 - b) * 612 }, thickness: 1 });
        }
        await __loadFixture((await pdf.save()).buffer, 'SYNTHETIC-MEASURED');
        const auto = Generator.getState().pages[2];
        await __choose(2, 'GENERAL');
        PageContext.setActivePage(2);
        RedactionManager.addZoneToCurrentView('text');
        const box = __boxes(2).at(-1);
        RedactionManager.selectZone(box);
        RedactionManager.updateCustomText('MANUAL MEASURED OVERRIDE');
        await SmartScanner.scanAllPages();
        const manual = Generator.getState().pages[2];
        return { key: candidate.key, auto, manual,
            visible: __boxes(2).some(b => b.dataset.customText === 'MANUAL MEASURED OVERRIDE') };
    });
    check(measured.auto.status === 'resolved' && measured.auto.provenance === 'auto'
        && measured.auto.profileId === 'MEASURED:' + measured.key && measured.auto.zones.length > 0,
        'Real synthetic PDF vector operators automatically resolve the matching measured profile');
    check(measured.manual.provenance === 'manual' && measured.manual.profileId === 'BUILTIN:GENERAL' && measured.visible,
        'Explicit mixed-page profile and edits outrank measured auto detection on rescan');
}

async function gateExport(browser) {
    await browser.evaluate(async () => {
        const original = PDFLib.PDFDocument.load;
        let entered;
        const started = new Promise(resolve => { entered = resolve; });
        const gate = new Promise(resolve => { window.__releaseExport = resolve; });
        PDFLib.PDFDocument.load = async function (...args) {
            PDFLib.PDFDocument.load = original;
            entered();
            await gate;
            return original.apply(this, args);
        };
        window.__exportPending = PdfExporter.generateRedactedPdf().then(
            bytes => ({ published: true, length: bytes.length }),
            error => ({ published: false, error: error.message }));
        await started;
    });
}

async function testProfileNameEscaping(browser) {
    console.log('Generator: custom profile names are text, not injected option markup');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    const result = await browser.evaluate(async () => {
        const name = 'Synthetic "><img data-profile-injection-probe="true" src=x onerror="window.__profileInjection=1">';
        window.__profileInjection = 0;
        Generator.importProfiles({ [name]: [{
            map: 'custom', x: 0.1, y: 0.2, w: 0.3, h: 0.1, text: 'SAFE PROFILE TEXT', fontSize: 14
        }] });
        await __choose(2, 'CUSTOM:' + name);
        document.getElementById('new-profile-name').value = name;
        ProfileManager.saveCurrentPageAsProfile();
        const selected = __wrapper(2).querySelector('.page-profile-select').selectedOptions[0];
        return {
            id: Generator.getState().pages[2].profileId, expected: 'CUSTOM:' + name,
            label: selected.textContent, name,
            probes: document.querySelectorAll('[data-profile-injection-probe], [onerror*="__profileInjection"]').length,
            executed: window.__profileInjection !== 0,
            text: __boxes(2)[0].querySelector('span').textContent,
            persisted: Generator.exportProfiles().profiles[name]?.[0]?.text === 'SAFE PROFILE TEXT',
            builtins: Object.keys(LAYOUT_RULES).every(key => Array.from(
                __wrapper(2).querySelector('.page-profile-select').options).some(option => option.value === 'BUILTIN:' + key))
        };
    });
    check(result.id === result.expected && result.label.includes(result.name) && result.probes === 0 && !result.executed,
        'Imported HTML/event-handler profile names retain exact IDs and labels without injection or execution');
    check(result.text === 'SAFE PROFILE TEXT' && result.persisted,
        'Imported malicious-name profile remains selectable, rendered, savable and persisted');
    check(result.builtins, 'Real profile dropdown exposes every builtin with stable canonical IDs');
    const limits = await browser.evaluate(() => {
        const before = localStorage.getItem('cox_custom_profiles');
        const revision = Generator.getState().profileRevision;
        return [
            ' '.repeat(GeneratorState.LIMITS.MAX_JSON_BYTES + 1),
            { ['n'.repeat(GeneratorState.LIMITS.MAX_PROFILE_NAME_CHARS + 1)]: [] }
        ].map(input => {
            let error;
            try { Generator.importProfiles(input); } catch (e) { error = e.message; }
            return { error, unchanged: localStorage.getItem('cox_custom_profiles') === before
                && Generator.getState().profileRevision === revision };
        });
    });
    check(/4 MiB/.test(limits[0].error) && limits[0].unchanged,
        'Oversized JSON profile import rejects before changing persistence or registry revision');
    check(/profile name/i.test(limits[1].error) && limits[1].unchanged,
        'Overlong profile names reject atomically at the actual browser import boundary');
}

async function testAsyncInvalidation(browser) {
    console.log('Generator: edit/source supersession and stale preview revocation');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    await resolveFixture(browser);
    const preview = await browser.evaluate(async () => {
        await PdfExporter.preview();
        const url = Generator.previewUrl;
        const shown = document.getElementById('pdf-preview-modal').style.display === 'flex'
            && !!PdfExporter.previewPdfBytes && !!url;
        PageContext.setActivePage(3);
        RedactionManager.addZoneToCurrentView('text');
        const box = __boxes(3).at(-1);
        RedactionManager.selectZone(box);
        RedactionManager.updateCustomText('BEFORE EXPORT');
        let revoked;
        try { await fetch(url); revoked = false; } catch (_) { revoked = true; }
        let downloads = 0;
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = () => { downloads++; };
        const frameCount = document.querySelectorAll('iframe').length;
        try {
            PdfExporter.downloadRedacted();
            await PdfExporter.printRedacted();
            await PdfExporter.confirmExport();
        } finally { HTMLAnchorElement.prototype.click = click; }
        return { shown, revoked, bytes: PdfExporter.previewPdfBytes,
            frames: document.getElementById('pdf-preview-container').children.length,
            staleActionsBlocked: downloads === 0 && document.querySelectorAll('iframe').length === frameCount,
            hidden: document.getElementById('pdf-preview-modal').style.display === 'none' };
    });
    check(preview.shown, 'Real generated preview publishes bytes and blob iframe');
    check(preview.revoked && preview.bytes === null && preview.frames === 0 && preview.hidden,
        'Editing invalidates preview bytes, revokes URL and removes stale iframe');
    check(preview.staleActionsBlocked, 'Invalidated preview cannot be printed, downloaded or confirmed');
    const printed = await browser.evaluate(async () => {
        await PdfExporter.preview();
        const expected = PdfExporter.previewPdfBytes.slice();
        await PdfExporter.printRedacted();
        const session = PdfViewer._activePrintSession;
        if (!session?.iframe) throw new Error('Redacted print did not create its real print iframe');
        const url = session.printUrl;
        const bytes = new Uint8Array(await fetch(url).then(response => response.arrayBuffer()));
        const exact = bytes.length === expected.length && bytes.every((byte, i) => byte === expected[i]);
        const start = Date.now();
        while (!session.cleaned && !session.afterPrintHandler && Date.now() - start < 6000) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        if (session.afterPrintHandler) session.iframe.contentWindow.dispatchEvent(new Event('afterprint'));
        let revoked;
        try { await fetch(url); revoked = false; } catch (_) { revoked = true; }
        return { exact, revoked, cleaned: session.cleaned, attached: session.iframe?.isConnected,
            printing: PdfViewer.isPrinting, active: !!PdfViewer._activePrintSession };
    });
    check(printed.exact, 'Redacted Print iframe receives exact generated preview PDF bytes');
    check(printed.cleaned && !printed.attached && !printed.printing && !printed.active && printed.revoked,
        'Redacted afterprint removes iframe, print session and blob URL');
    await gateExport(browser);
    const edited = await browser.evaluate(async () => {
        RedactionManager.updateCustomText('DURING ASYNC EXPORT');
        __releaseExport();
        return __exportPending;
    });
    check(!edited.published && /superseded|changed|stale/i.test(edited.error),
        'Export pending in real pdf-lib rejects when canonical zones change');
    await gateExport(browser);
    const context = await browser.evaluate(async () => {
        const input = document.getElementById('demo-cust-name');
        input.value = 'SYNTHETIC CONTEXT CHANGED';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        __releaseExport();
        return __exportPending;
    });
    check(!context.published && /superseded|changed|stale/i.test(context.error),
        'Export pending in real pdf-lib rejects when project context changes');
    await gateExport(browser);
    const swapped = await browser.evaluate(async () => {
        await __loadFixture(await __makePdf(false, ' SOURCE SWAP'), 'SYNTHETIC-SWAP');
        __releaseExport();
        return __exportPending;
    });
    check(!swapped.published && /superseded|changed|stale/i.test(swapped.error),
        'Export pending in real pdf-lib rejects after source PDF swap');
    await resolveFixture(browser);
    const cleanup = await browser.evaluate(async () => {
        await PdfExporter.preview();
        const url = Generator.previewUrl;
        PdfExporter.closePreview();
        let revoked;
        try { await fetch(url); revoked = false; } catch (_) { revoked = true; }
        return { revoked, url: Generator.previewUrl, frames: document.getElementById('pdf-preview-container').children.length,
            bytes: PdfExporter.previewPdfBytes };
    });
    check(cleanup.revoked && !cleanup.url && cleanup.frames === 0,
        'Close preview removes iframe and revokes its blob URL');
}

async function testTemplateFailure(browser) {
    console.log('Generator: failed template uses original committed page provenance');
    await openFixture(browser);
    await browser.evaluate(() => Generator.setTemplate(new TextEncoder().encode('not a PDF').buffer));
    await browser.evaluate(() => __activate());
    await resolveFixture(browser);
    const failed = await browser.evaluate(async () => {
        const output = await __raster((await PdfExporter.generateRedactedPdf()).buffer);
        return { contentSource: Generator.getState().pages[1].contentSource,
            size: [output[0].width, output[0].height], text: output[0].text,
            staging: document.querySelectorAll('.pdf-gesture-stage--staging').length,
            tasks: Generator.templateTasks.size };
    });
    check(failed.contentSource === 'source' && failed.size.join(',') === '612,792'
        && failed.text.includes('SYNTHETIC ORIGINAL COVER'),
        'Invalid template falls back to same original cover in viewer state and actual export');
    check(failed.staging === 0 && failed.tasks === 0, 'Template failure leaves no staging DOM or loading tasks');
}

async function gateTemplate(browser) {
    await browser.evaluate(async () => {
        const library = pdfjsLib;
        const original = library.getDocument;
        let entered;
        const started = new Promise(resolve => { entered = resolve; });
        const gate = new Promise(resolve => { window.__releaseTemplate = resolve; });
        window.pdfjsLib = { ...library, getDocument: function (...args) {
            window.pdfjsLib = library;
            const task = original.apply(this, args);
            return {
                destroy: () => task.destroy(),
                promise: task.promise.then(async doc => { entered(); await gate; return doc; })
            };
        } };
        window.__lateRender = Generator.setTemplate(__templateBytes.slice(0)).then(
            committed => ({ committed }), error => ({ error: error.message }));
        await started;
    });
}

async function testTemplateRaces(browser) {
    console.log('Generator: late template render races preserve edits and latest provenance');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    await resolveFixture(browser);
    await gateTemplate(browser);
    const race = await browser.evaluate(async () => {
        PageContext.setActivePage(3);
        RedactionManager.addZoneToCurrentView('text');
        const box = __boxes(3).at(-1);
        RedactionManager.selectZone(box);
        RedactionManager.updateCustomText('EDIT WHILE TEMPLATE LOADS');
        await Generator.setTemplate(await __makePdf(true, ' LATEST TEMPLATE'));
        __releaseTemplate();
        const old = await __lateRender;
        const output = await __raster((await PdfExporter.generateRedactedPdf()).buffer);
        return {
            old, contentSource: Generator.getState().pages[1].contentSource,
            latest: output[0].text.includes('LATEST TEMPLATE'),
            edit: __boxes(3).some(b => b.dataset.customText === 'EDIT WHILE TEMPLATE LOADS')
                && output[2].text.includes('EDIT WHILE TEMPLATE LOADS'),
            staging: document.querySelectorAll('.pdf-gesture-stage--staging').length,
            tasks: Generator.templateTasks.size
        };
    });
    check(race.old.committed === false, 'Delayed older template render cannot commit after superseding render');
    check(race.contentSource === 'replacement' && race.latest, 'Export uses latest committed template bytes, not late older template');
    check(race.edit, 'Editing during template await survives in viewer and exported PDF');
    check(race.staging === 0 && race.tasks === 0, 'Superseded template render releases tasks and staging DOM');
}

async function testTemplateSourceSwap(browser) {
    console.log('Generator: delayed template cannot contaminate a newer source PDF');
    await openFixture(browser);
    await browser.evaluate(() => __activate());
    await resolveFixture(browser);
    await gateTemplate(browser);
    const swap = await browser.evaluate(async () => {
        const bytes = await __makePdf(false, ' LATEST SOURCE');
        await __loadFixture(bytes, 'SYNTHETIC-TEMPLATE-SWAP');
        for (const n of [2, 3, 4]) await __choose(n, 'GENERAL');
        __releaseTemplate();
        const old = await __lateRender;
        const expected = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const pages = await __raster((await PdfExporter.generateRedactedPdf()).buffer);
        return { old, expected, actual: Generator.getState().digest, text: pages[1].text,
            staging: document.querySelectorAll('.pdf-gesture-stage--staging').length,
            tasks: Generator.templateTasks.size };
    });
    check(swap.old.committed === false && swap.actual === swap.expected && swap.text.includes('LATEST SOURCE'),
        'Delayed old template render cannot replace newer source state or exported content');
    check(swap.staging === 0 && swap.tasks === 0, 'Template/source swap cleans old tasks and staging DOM');
}

async function testDigestFailure(browser) {
    console.log('Generator: SHA-256 failure disables generation without disabling original PDF');
    await openFixture(browser);
    const late = await browser.evaluate(async () => {
        const original = crypto.subtle.digest;
        let started;
        const entered = new Promise(resolve => { started = resolve; });
        const gate = new Promise(resolve => { window.__releaseDigest = resolve; });
        crypto.subtle.digest = async function (...args) {
            crypto.subtle.digest = original;
            started();
            await gate;
            return original.apply(this, args);
        };
        await __loadFixture(__sourceBytes, 'SYNTHETIC-LATE-DIGEST');
        await entered;
        const oldReady = Generator.sourceReady;
        const newer = await __makePdf(false, ' NEWER DIGEST');
        await __loadFixture(newer, 'SYNTHETIC-NEWER-DIGEST');
        await Generator.ready();
        const expected = Array.from(new Uint8Array(await original.call(crypto.subtle, 'SHA-256', newer)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        __releaseDigest();
        await oldReady;
        return { actual: Generator.getState().digest, expected };
    });
    check(late.actual === late.expected, 'Delayed older source digest cannot overwrite newer PDF digest');
    const result = await browser.evaluate(async () => {
        const digest = crypto.subtle.digest;
        crypto.subtle.digest = () => Promise.reject(new Error('Synthetic digest unavailable'));
        try {
            await __loadFixture(__sourceBytes, 'SYNTHETIC-NO-DIGEST');
            await __activate();
            let error;
            try { await PdfExporter.generateRedactedPdf(); } catch (e) { error = e.message; }
            return { state: Generator.getState(), error, valid: PdfViewer.isDocumentValid(),
                downloadEnabled: !document.getElementById('pdf-download-btn').disabled };
        } finally { crypto.subtle.digest = digest; }
    });
    check(!result.state.digest && /digest unavailable/i.test(result.state.error),
        'Digest computation failure is explicit and never invents a fallback identifier');
    check(!!result.error && result.valid && result.downloadEnabled,
        'Digest failure blocks generator export but preserves original loaded document actions');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
