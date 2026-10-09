// Local synthetic PDFs exercise PDF.js + pdf-lib and the actual generator/viewer classes.
const assert = require('assert/strict');
const { HeadlessBrowser } = require('./helpers/headless-browser');

(async () => {
    const browser = await HeadlessBrowser.launch();
    assert.ok(browser, 'Chrome and Node WebSocket are required for generator integration coverage');
    try {
        await browser.open(1280, 900);
        const result = await browser.evaluate(async () => {
            document.documentElement.classList.add('logged-in');
            const login = document.getElementById('login-overlay');
            if (login) login.style.display = 'none';
            const checks = [];
            const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
            const pdf = await PDFLib.PDFDocument.create();
            const first = pdf.addPage([612, 792]);
            first.drawText('Original cover source');
            const rotated = pdf.addPage([700, 900]);
            rotated.setCropBox(40, 60, 600, 800);
            rotated.setRotation(PDFLib.degrees(90));
            for (let n = 0; n < 15; n++) rotated.drawText(`GENERAL NOTES PANEL CP-123 ${n}`, { x: 80, y: 100 + n * 30, size: 10 });
            const thirdPage = pdf.addPage([600, 800]);
            for (let n = 0; n < 15; n++) thirdPage.drawText(`POWER CONTROL TITLE BLOCK ${n}`, { x: 60, y: 100 + n * 30, size: 10 });
            const source = await pdf.save();
            const cached = { arrayBuffer: source.buffer.slice(0), blob: new Blob([source], { type: 'application/pdf' }) };
            window.TEMPLATE_BYTES = null;
            DemoManager.isGeneratorActive = true;
            document.body.classList.add('demo-mode', 'editor-active');
            await PdfViewer.loadFromCache(cached, 'LOCAL-SYNTHETIC', '');
            check(SmartScanner.state.ready && !SmartScanner.state.rendering, 'load/scan commits generator readiness');
            check(SmartScanner.state.pages.size === 3, 'canonical assignments cover every output page');
            check(SmartScanner.state.page(2).rotation === 90 && SmartScanner.state.page(2).width === 800,
                'effective crop and rotation dimensions are recorded');
            check(SmartScanner.state.page(1).source === 'original', 'original cover choice recorded');
            check(SmartScanner.state.page(1).assignment.namespace === 'legacy' &&
                !/_COV\d+/.test(SmartScanner.state.page(1).assignment.key),
                'absent replacement never assigns a source-cover catalog profile to page 1');
            const custom = [{ map: 'custom', x: .2, y: .3, w: .25, h: .08, text: '',
                fontSize: 13, fontWeight: 'bold', decoration: 'underline', fontFamily: "'Courier New', monospace" },
                { map: 'custom', x: .55, y: .5, w: .2, h: .04, text: 'Second-zone', fontSize: 11,
                    fontFamily: "'Courier New', monospace" }];
            localStorage.setItem('cox_custom_profiles', JSON.stringify({ Synthetic: custom }));
            LayoutScanner.refreshProfileOptions();
            PageContext.setActivePage(2);
            await LayoutScanner.updatePageProfile(2, 'CUSTOM:Synthetic');
            check(SmartScanner.state.page(2).intent.key === 'CUSTOM:Synthetic', 'manual intent is explicit');
            let wrapper = document.querySelector('.pdf-page-wrapper[data-page-number="2"]');
            let box = wrapper.querySelector('.redaction-box');
            check(box.dataset.customText === '' && box.querySelector('span').innerText === '', 'explicit empty text survives profile apply');
            RedactionManager.activeBox = box;
            RedactionManager.updateCustomText('Saved edit');
            box.style.left = '160px'; box.dataset.relX = '.2';
            RedactionManager.persistPage(box);
            const editedId = box.dataset.zoneId;
            const points = Number(box.dataset.fontSize);
            PdfViewer.currentScale = .6;
            await PdfViewer.renderStack();
            wrapper = document.querySelector('.pdf-page-wrapper[data-page-number="2"]');
            box = wrapper.querySelector('.redaction-box');
            check(box.dataset.zoneId === editedId && box.querySelector('span').innerText === 'Saved edit', 'manual edit and stable ID survive zoom rerender');
            check(Number(box.dataset.fontSize) === points, 'font points independent of viewer zoom');
            check(PageContext.getActivePage() === 2, 'zoom rerender preserves active canonical page');
            const originalAlert = window.alert;
            window.alert = () => {};
            const nameInput = document.getElementById('new-profile-name');
            nameInput.value = 'Saved zoom profile';
            RedactionManager.activeBox = box;
            RedactionManager.updateCustomText('');
            ProfileManager.saveCurrentPageAsProfile();
            const saved = ProfileManager.getCustomProfiles()['Saved zoom profile'][0];
            check(saved.fontSize === 13 && saved.text === '' && saved.fontWeight === 'bold' && saved.decoration === 'underline',
                'profile roundtrip preserves empty text, point-size, weight and decoration at non-unit zoom');
            window.alert = originalAlert;
            RedactionManager.updateCustomText('Saved edit');
            const firstCount = SmartScanner.state.effectiveZones(1).length;
            const thirdCount = SmartScanner.state.effectiveZones(3).length;
            PageContext.setActivePage(3);
            RedactionManager.addManualZone();
            RedactionManager.addZoneToCurrentView('text');
            check(SmartScanner.state.effectiveZones(3).length === thirdCount + 2 &&
                SmartScanner.state.effectiveZones(1).length === firstCount,
                'both add-zone actions bind edits to the active page, not the first visible page');
            PageContext.setActivePage(2);
            await SmartScanner.rescanPage(2);
            check(SmartScanner.state.page(2).intent.mode === 'manual', 'rescan does not convert manual intent to AUTO');
            await LayoutScanner.updatePageProfile(2, 'AUTO');
            check(SmartScanner.state.page(2).intent.mode === 'auto', 'AUTO uses shared resolver and records automatic intent');
            check(document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box span').innerText === 'Saved edit',
                'AUTO preserves manual zone edits separately');
            DemoManager.isGeneratorActive = false;
            await PdfViewer.renderStack();
            check(!document.querySelector('.redaction-box'), 'generator OFF shows original with no masks');
            DemoManager.isGeneratorActive = true;
            await PdfViewer.renderStack();
            check(document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box span').innerText === 'Saved edit',
                'manual edits survive OFF/ON');

            const snapshot = PdfExporter.captureSnapshot();
            check(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.pages[1].zones[0]), 'export snapshot deeply frozen');
            const committedCount = PdfViewer._committedPageCount;
            PdfViewer._committedPageCount++;
            let badCount = false;
            try { PdfExporter.captureSnapshot(); } catch (_) { badCount = true; }
            PdfViewer._committedPageCount = committedCount;
            check(badCount, 'snapshot requires exact committed-source page count');
            const snapshotBox = document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box');
            const ownedX = snapshotBox.dataset.relX;
            snapshotBox.dataset.relX = '.23';
            let uncommitted = false;
            try { PdfExporter.captureSnapshot(); } catch (_) { uncommitted = true; }
            snapshotBox.dataset.relX = ownedX;
            check(uncommitted, 'same-ID uncommitted manual geometry cannot bypass snapshot bookkeeping');
            const output = await PdfExporter.generateRedactedPdf(snapshot);
            const outputDoc = await PDFLib.PDFDocument.load(output);
            check(outputDoc.getPage(1).getRotation().angle === 90 && outputDoc.getPage(1).getCropBox().x === 40,
                'export preserves rotated cropped source page');
            const rendered = await pdfjsLib.getDocument({ data: output.slice() }).promise;
            const page = await rendered.getPage(2);
            const text = await page.getTextContent();
            const edit = text.items.find(item => item.str.startsWith('Saved'));
            check(!!edit && text.items.map(item => item.str).join('').includes('Saved edit'), 'resolved snapshot text exported');
            const bounds = LayoutMatcher.textBounds(edit, page.getViewport({ scale: 1 }));
            check(bounds.x >= 160 && bounds.x < 360 && bounds.y >= 180 && bounds.y < 228,
                `exported text lies inside displayed normalized zone with crop and Rotate: ${JSON.stringify(bounds)}`);
            const second = text.items.find(item => item.str === 'Second-zone');
            const secondBounds = second && LayoutMatcher.textBounds(second, page.getViewport({ scale: 1 }));
            check(secondBounds && secondBounds.x >= 440 && secondBounds.x < 600 && secondBounds.y >= 300 && secondBounds.y < 324,
                'page coordinate transform applies to every zone, not only the first text overlay');
            check(text.items.some(item => item.str.includes('GENERAL NOTES')), 'masking retains original content, not sanitized redaction');
            const originalRevoke = URL.revokeObjectURL;
            const revoked = [];
            URL.revokeObjectURL = url => { revoked.push(url); originalRevoke.call(URL, url); };
            const originalIsolation = PdfViewer._isIsolatedPdfPrintBrowser;
            const originalOpen = window.open;
            const originalClick = HTMLAnchorElement.prototype.click;
            const downloadDelay = PdfExporter.DOWNLOAD_REVOKE_DELAY_MS;
            let safari = false, popupPrints = 0;
            const clicked = [];
            PdfViewer._isIsolatedPdfPrintBrowser = () => safari;
            window.open = () => ({ focus() {}, print() { popupPrints++; } });
            HTMLAnchorElement.prototype.click = function () { clicked.push(this); };
            PdfExporter.DOWNLOAD_REVOKE_DELAY_MS = 1;
            PdfExporter.previewPdfBytes = output;
            PdfExporter.previewSnapshot = snapshot;
            await PdfExporter.printRedacted();
            const generatedFrame = PdfViewer._activePrintSession.iframe;
            const frameUrl = PdfViewer._activePrintSession.printUrl;
            generatedFrame.onerror();
            check(!generatedFrame.isConnected && !PdfViewer._activePrintSession && revoked.includes(frameUrl),
                'generated iframe print error removes frame, timers and owned URL');
            safari = true;
            await PdfExporter.printRedacted();
            const popupUrl = PdfViewer._activePrintSession.printUrl;
            PdfViewer._releasePrintSession('synthetic-generated-safari-cleanup');
            check(popupPrints === 1 && revoked.includes(popupUrl), 'generated Safari print uses isolated session cleanup');
            safari = false;
            PdfExporter.downloadRedacted();
            safari = true;
            PdfExporter.downloadRedacted();
            await new Promise(resolve => setTimeout(resolve, 10));
            check(clicked.length === 2 && clicked.every(link => !link.isConnected && revoked.includes(link.href)) &&
                clicked[0].download.startsWith('masked_') && clicked[1].target === '_blank',
                'generated Chrome/Safari downloads remove anchors and revoke owned URLs');
            PdfExporter.DOWNLOAD_REVOKE_DELAY_MS = downloadDelay;
            HTMLAnchorElement.prototype.click = originalClick;
            PdfViewer._isIsolatedPdfPrintBrowser = originalIsolation;
            window.open = originalOpen;
            URL.revokeObjectURL = originalRevoke;
            RedactionManager.activeBox = document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box');
            RedactionManager.updateCustomText('Newer edit');
            check(!PdfExporter.hasCurrentPreview() && !PdfExporter.previewPdfBytes, 'editing invalidates saved preview');
            let stale = false;
            try { await PdfExporter.generateRedactedPdf(snapshot); } catch (_) { stale = true; }
            check(stale, 'stale async export rejected');
            const current = PdfExporter.captureSnapshot();
            const load = PDFLib.PDFDocument.load;
            let release, entered;
            const waiting = new Promise(resolve => { entered = resolve; });
            const gate = new Promise(resolve => { release = resolve; });
            PDFLib.PDFDocument.load = async (...args) => { entered(); await gate; return load.apply(PDFLib.PDFDocument, args); };
            const pendingExport = PdfExporter.generateRedactedPdf(current);
            await waiting;
            RedactionManager.updateCustomText('Changed while generating');
            release();
            stale = false;
            try { await pendingExport; } catch (_) { stale = true; }
            PDFLib.PDFDocument.load = load;
            check(stale, 'edit during asynchronous generation cannot publish old bytes');

            let previewEntered, previewRelease;
            const previewWait = new Promise(resolve => { previewEntered = resolve; });
            const previewGate = new Promise(resolve => { previewRelease = resolve; });
            PDFLib.PDFDocument.load = async (...args) => {
                previewEntered(); await previewGate;
                return load.apply(PDFLib.PDFDocument, args);
            };
            const oldPreview = PdfExporter.preview();
            await previewWait;
            SmartScanner.state.snapshot({ context: DemoManager.getContext() });
            previewRelease(); await oldPreview;
            PDFLib.PDFDocument.load = load;
            check(!PdfExporter.previewPdfBytes && document.getElementById('pdf-preview-modal').style.display === 'none' &&
                PdfExporter.pendingExports === 0, 'superseded export revision cannot publish an asynchronous preview');

            // Replacement cover is pinned to its forced legacy rules, not measured/manual alternatives.
            const replacement = await PDFLib.PDFDocument.create();
            replacement.addPage([612, 792]).drawText('Synthetic replacement cover');
            window.TEMPLATE_BYTES = (await replacement.save()).buffer;
            const validTemplateBytes = window.TEMPLATE_BYTES.slice(0);
            check(PdfExporter.captureSnapshot().replacement === null && SmartScanner.state.page(1).source === 'original',
                'late-arriving template bytes do not alter the committed cover choice before rerender');
            await PdfViewer.renderStack();
            SmartScanner.state.setIntent(1, 'INFO');
            await SmartScanner.rescanPage(1);
            check(SmartScanner.state.page(1).source === 'replacement' &&
                SmartScanner.state.page(1).assignment.key === 'COVER_TEMPLATE', 'replacement cover stays forced');
            const replacementSnapshot = PdfExporter.captureSnapshot();
            check(replacementSnapshot.replacement.length > 0 && /^[a-f0-9]{64}$/.test(replacementSnapshot.templateRevision),
                'snapshot owns replacement bytes and identifies committed template by SHA-256 revision');
            SmartScanner.state.setIntent(1, 'AUTO');
            window.TEMPLATE_BYTES = new Uint8Array([1, 2, 3, 4]).buffer;
            await PdfViewer.renderStack();
            const failedTemplateSnapshot = PdfExporter.captureSnapshot();
            check(SmartScanner.state.page(1).source === 'original' && failedTemplateSnapshot.replacement === null &&
                failedTemplateSnapshot.templateRevision === null,
                'failed replacement template commits only original-cover bytes and no template revision');
            const templatePdfjs = window.pdfjsLib;
            let templateEntered, templateRelease, templateHeld = false, templateDestroyed = false;
            const templateWait = new Promise(resolve => { templateEntered = resolve; });
            const templateGate = new Promise(resolve => { templateRelease = resolve; });
            window.pdfjsLib = { ...templatePdfjs, getDocument: data => {
                const task = templatePdfjs.getDocument(data);
                if (data instanceof ArrayBuffer && !templateHeld) {
                    templateHeld = true; templateEntered();
                    return { promise: Promise.all([task.promise, templateGate]).then(([doc]) => doc),
                        destroy: async () => { templateDestroyed = true; await task.destroy(); } };
                }
                return task;
            } };
            window.TEMPLATE_BYTES = validTemplateBytes.slice(0);
            const lateTemplateRender = PdfViewer.renderStack();
            await templateWait;
            window.TEMPLATE_BYTES = null;
            await PdfViewer.renderStack();
            templateRelease();
            check(await lateTemplateRender === false && templateDestroyed && SmartScanner.state.page(1).source === 'original' &&
                PdfExporter.captureSnapshot().replacement === null,
                'superseded late template cannot overwrite current cover assignment or export choice');
            window.pdfjsLib = templatePdfjs;

            // A failed current scan does not erase already successful masks.
            const before = document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-layer').innerHTML;
            const getPage = PdfViewer.doc.getPage.bind(PdfViewer.doc);
            PdfViewer.doc.getPage = async () => { throw new Error('synthetic scan failure'); };
            await SmartScanner.rescanPage(2);
            PdfViewer.doc.getPage = getPage;
            check(document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-layer').innerHTML === before,
                'scan failure retains existing masks');

            // A scan that finishes after an edit may not replace the edited masks.
            const resolvePage = SmartScanner.resolvePage;
            let resolveScan, scanEntered;
            const scanWait = new Promise(resolve => { scanEntered = resolve; });
            SmartScanner.resolvePage = async (...args) => {
                const answer = await resolvePage.apply(SmartScanner, args);
                scanEntered();
                await new Promise(resolve => { resolveScan = resolve; });
                return answer;
            };
            const oldScan = SmartScanner.rescanPage(2);
            await scanWait;
            RedactionManager.activeBox = document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box');
            RedactionManager.updateCustomText('Edit wins pending scan');
            resolveScan(); await oldScan;
            SmartScanner.resolvePage = resolvePage;
            check(document.querySelector('.pdf-page-wrapper[data-page-number="2"] .redaction-box span').innerText === 'Edit wins pending scan',
                'edit generation rejects stale scan result');

            let releaseThird, enteredThird;
            const thirdWait = new Promise(resolve => { enteredThird = resolve; });
            SmartScanner.resolvePage = async (...args) => {
                const answer = await resolvePage.apply(SmartScanner, args);
                if (args[0] === 3) {
                    enteredThird();
                    await new Promise(resolve => { releaseThird = resolve; });
                }
                return answer;
            };
            const thirdScan = SmartScanner.rescanPage(3);
            await thirdWait;
            RedactionManager.activeBox = document.querySelector('.pdf-page-wrapper[data-page-number="1"] .redaction-box');
            const previousThirdRevision = SmartScanner.state.page(3).editRevision;
            RedactionManager.updateCustomText('Page-one edit');
            releaseThird();
            check(await thirdScan === true && SmartScanner.state.page(3).editRevision === previousThirdRevision,
                'page 1 edit does not discard an in-flight page 3 scan');
            SmartScanner.resolvePage = resolvePage;
            const thirdAssignment = SmartScanner.state.page(3).assignment;
            SmartScanner.state.page(3).assignment = null;
            SmartScanner.state.refreshReady();
            let incompleteRejected = false;
            try { PdfExporter.captureSnapshot(); } catch (_) { incompleteRejected = true; }
            check(!SmartScanner.state.ready && incompleteRejected, 'missing page assignment cannot mark generator ready');
            SmartScanner.state.page(3).assignment = thirdAssignment;
            SmartScanner.state.refreshReady();
            PdfExporter.syncPreviewControls();

            const priorIntent = JSON.stringify(SmartScanner.state.page(2).intent);
            check(await LayoutScanner.updatePageProfile(2, 'CUSTOM:missing-contract') === false &&
                JSON.stringify(SmartScanner.state.page(2).intent) === priorIntent,
                'unknown custom profile is rejected before changing intent or masks');

            // Supersede a renderer specifically at its final layout await.
            const stable = PdfViewer.waitForLayoutStable;
            let renderRelease, renderEntered, gateFirst = true;
            const renderWait = new Promise(resolve => { renderEntered = resolve; });
            PdfViewer.waitForLayoutStable = async (element, ...args) => {
                await stable.call(PdfViewer, element, ...args);
                if (gateFirst && element.classList.contains('pdf-gesture-stage')) {
                    gateFirst = false; renderEntered();
                    await new Promise(resolve => { renderRelease = resolve; });
                }
            };
            const oldRender = PdfViewer.renderStack();
            await renderWait;
            check(!SmartScanner.state.ready || SmartScanner.state.rendering, 'export blocked during incomplete rendering');
            await PdfViewer.renderStack();
            const currentStage = PdfViewer._getGestureStage();
            renderRelease();
            check(await oldRender === false && PdfViewer._getGestureStage() === currentStage,
                'final render guard prevents old stage swapping over newer stage');
            PdfViewer.waitForLayoutStable = stable;

            // Production operator extraction from locally generated lines, not catalog hashes.
            const core = await (await fetch('PDFmapping/layouts_overlay_core.json')).json();
            const catalog = await (await fetch('PDFmapping/LAYOUT_FINGERPRINTS.json')).json();
            const metadata = await (await fetch('PDFmapping/layouts_overlay.meta.json')).json();
            const matcher = new LayoutMatcher(core, catalog, metadata);
            const entry = matcher.entries.find(e => e.key === 'SCHEMATIC_PORTRAIT_TB01A');
            const geometryPdf = await PDFLib.PDFDocument.create();
            const geometryPage = geometryPdf.addPage([600, 800]);
            const bbox = entry.bbox;
            for (const [axis, values] of Object.entries(entry.lines)) {
                for (const [p, a, b] of values) {
                    const start = axis === 'H' ? [bbox[0] + a * (bbox[2] - bbox[0]), bbox[1] + p * (bbox[3] - bbox[1])]
                        : [bbox[0] + p * (bbox[2] - bbox[0]), bbox[1] + a * (bbox[3] - bbox[1])];
                    const end = axis === 'H' ? [bbox[0] + b * (bbox[2] - bbox[0]), start[1]]
                        : [start[0], bbox[1] + b * (bbox[3] - bbox[1])];
                    geometryPage.drawLine({ start: { x: start[0] * 600, y: 800 - start[1] * 800 },
                        end: { x: end[0] * 600, y: 800 - end[1] * 800 }, thickness: .5 });
                }
            }
            const measuredDoc = await pdfjsLib.getDocument({ data: await geometryPdf.save() }).promise;
            const measuredPage = await measuredDoc.getPage(1);
            const measurement = LayoutMatcher.measure(await measuredPage.getOperatorList(), pdfjsLib.OPS, measuredPage.getViewport({ scale: 1 }));
            const evidence = matcher.match(measurement, 'SCHEMATIC_PORTRAIT');
            check(evidence.accepted && evidence.score > .99 && evidence.templateHash && evidence.placement,
                'real PDF.js vector operators produce measured template/placement evidence');
            const resolved = await SmartScanner.resolvePage(2, document.querySelector('.pdf-page-wrapper[data-page-number="2"]'), measuredPage);
            check(resolved.namespace === 'measured' && resolved.templateHash === evidence.templateHash &&
                resolved.evidence.method === 'geometry', 'production shared resolver chooses a supported measured core template');
            await measuredDoc.destroy();

            const realDigest = GeneratorState.digest;
            GeneratorState.digest = async () => { throw new Error('synthetic browser digest failure'); };
            await PdfViewer.loadFromCache(cached, 'digest-failure', '');
            check(PdfViewer.currentPdfBlob === cached.blob && !PdfViewer._documentActionsInvalidated &&
                PdfViewer._committedPageCount === 3 && !SmartScanner.state.ready && SmartScanner.state.digestError,
                'digest failure disables generation but preserves original committed PDF actions');
            GeneratorState.digest = realDigest;
            await PdfViewer.loadFromCache(cached, 'digest-recovered', '');
            check(SmartScanner.state.ready && SmartScanner.state.digestError === null,
                'a later digest-successful load recovers generator readiness');

            // Stale fetch errors cannot clear the newly committed document or show fallback.
            const realFetch = window.fetch;
            let rejectFetch, fetched;
            const fetchedWait = new Promise(resolve => { fetched = resolve; });
            window.fetch = async url => {
                if (String(url).includes('stale-error')) { fetched(); return new Promise((_, reject) => { rejectFetch = reject; }); }
                return realFetch(url);
            };
            const staleLoad = PdfViewer.loadById('stale-error', '');
            await fetchedWait;
            await PdfViewer.loadFromCache(cached, 'newer-success', '');
            const committedBlob = PdfViewer.currentPdfBlob;
            rejectFetch(new Error('synthetic stale network error')); await staleLoad;
            window.fetch = realFetch;
            check(PdfViewer.currentPdfBlob === committedBlob && SmartScanner.state.ready &&
                PdfViewer._committedPanelId === 'newer-success', 'stale load error cannot mutate ready document or fallback');

            // A canceled preload's delayed negative fallback may not mark the result missing.
            const fallback = attemptPdfFallbackFetch;
            let fallbackRelease, fallbackEntered;
            const fallbackWait = new Promise(resolve => { fallbackEntered = resolve; });
            attemptPdfFallbackFetch = async () => {
                fallbackEntered();
                return new Promise(resolve => { fallbackRelease = resolve; });
            };
            window.fetch = async () => ({ ok: false, status: 404 });
            PdfController.isPreloading = true;
            const preloadGeneration = ++PdfController.preloadGeneration;
            const preloadResult = { id: 'canceled-negative', pdfUrl: 'local', pdfStatus: 'ready' };
            const negativePreload = PdfController._getOrStartPreload(preloadResult, preloadGeneration);
            await fallbackWait;
            PdfController.stopPreloading();
            fallbackRelease(null); await negativePreload;
            attemptPdfFallbackFetch = fallback;
            window.fetch = realFetch;
            check(preloadResult.pdfStatus === 'ready' && !PdfController.pdfCache.has(preloadResult.id),
                'stale preload fallback cannot mutate missing status or cache');

            // Waiting on a preload must never resurrect the earlier clicked result.
            const cacheLoad = PdfViewer.loadFromCache, networkLoad = PdfViewer.loadById;
            const loads = [];
            PdfViewer.loadFromCache = async (_cached, id) => loads.push(id);
            PdfViewer.loadById = async id => loads.push(id);
            let warm;
            PdfController.preloadInFlight.set('slow-A', new Promise(resolve => { warm = resolve; }));
            const a = PdfController.load('slow-A', '');
            await PdfController.load('fast-B', '');
            PdfController.pdfCache.set('slow-A', cached);
            warm(); await a;
            PdfViewer.loadFromCache = cacheLoad; PdfViewer.loadById = networkLoad;
            check(loads.join(',') === 'fast-B', 'rapid click cancels stale preload waiter');
            check(PdfViewer.currentFetchId > 1, 'load IDs monotonic');
            const originalPdfjs = window.pdfjsLib;
            const currentDoc = PdfViewer.doc;
            let parsed, destroyedTask = false;
            window.pdfjsLib = { ...originalPdfjs, getDocument: () => ({
                promise: new Promise(resolve => { parsed = resolve; }),
                destroy: async () => { destroyedTask = true; }
            }) };
            const parseId = PdfViewer.currentFetchId;
            const oldParse = PdfViewer._parseCurrentDocument(cached.arrayBuffer, parseId);
            PdfViewer.currentFetchId++;
            parsed({ numPages: 999 });
            check(await oldParse === false && PdfViewer.doc === currentDoc && destroyedTask,
                'stale PDF.js initialization is destroyed without overwriting newer document');
            window.pdfjsLib = originalPdfjs;
            await rendered.destroy();
            return checks;
        });
        console.log(`Generator browser integration: ${result.length} checks passed`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
