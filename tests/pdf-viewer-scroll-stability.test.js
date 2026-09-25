const fs = require('fs');
const path = require('path');
const { PDF_UI_STATE } = require('../pdf-ui-state.js');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class in app.js`);
    let braceCount = 0;
    let endIdx = startIdx;
    let inClass = false;
    for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{') {
            braceCount++;
            inClass = true;
        } else if (ch === '}') {
            braceCount--;
            if (inClass && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    return content.substring(startIdx, endIdx);
}

function makeNode({ id = '', className = '', offsetTop = 0, offsetLeft = 0, offsetWidth = 0, offsetHeight = 0 } = {}) {
    const node = {
        id,
        className,
        style: {},
        dataset: {},
        children: [],
        parentNode: null,
        isConnected: true,
        offsetTop,
        offsetLeft,
        offsetWidth,
        offsetHeight,
        setAttribute(name, value) {
            if (name === 'id') this.id = value;
            if (name === 'inert') {
                this.inert = true;
                return;
            }
            if (name.startsWith('data-')) {
                const key = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
                this.dataset[key] = String(value);
            } else {
                this[name] = value;
            }
        },
        getAttribute(name) {
            if (name.startsWith('data-')) {
                const key = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
                return this.dataset[key];
            }
            return this[name];
        },
        appendChild(child) {
            if (child.parentNode) child.parentNode.removeChild(child);
            this.children.push(child);
            child.parentNode = this;
            child.isConnected = true;
            return child;
        },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) this.children.splice(idx, 1);
            child.parentNode = null;
            child.isConnected = false;
            return child;
        },
        remove() {
            if (this.parentNode) this.parentNode.removeChild(this);
        },
        querySelectorAll(selector) {
            const results = [];
            const visit = (candidate) => {
                if (matchesSelector(candidate, selector)) results.push(candidate);
                candidate.children.forEach(visit);
            };
            this.children.forEach(visit);
            return results;
        },
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        }
    };
    return node;
}

function matchesSelector(node, selector) {
    if (selector === '.pdf-gesture-stage') {
        return node.className.split(/\s+/).includes('pdf-gesture-stage');
    }
    if (selector === '.pdf-page-wrapper') {
        return node.className.split(/\s+/).includes('pdf-page-wrapper');
    }
    const pageMatch = selector.match(/^\.pdf-page-wrapper\[data-page-number="(\d+)"\]$/);
    if (pageMatch) {
        return node.className.split(/\s+/).includes('pdf-page-wrapper')
            && String(node.dataset.pageNumber) === pageMatch[1];
    }
    return false;
}

(async () => {
    console.log('🧪 Testing PdfViewer scroll stability helpers');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfViewerClassCode = extractClass('PdfViewer', appJsContent);

    const customPdfViewer = makeNode({ id: 'custom-pdf-viewer' });
    const viewer = makeNode({ id: 'pdf-main-view' });
    viewer.clientWidth = 900;
    viewer.clientHeight = 700;
    viewer.scrollLeft = 200;
    viewer.scrollTop = 1100;
    viewer.scrollWidth = 2400;
    viewer.scrollHeight = 3600;
    customPdfViewer.appendChild(viewer);

    const documentRoots = [customPdfViewer];
    const documentState = {
        body: { classList: { contains: () => false } },
        createElement() {
            return makeNode();
        },
        getElementById(id) {
            const search = (node) => {
                if (node.id === id) return node;
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
                return null;
            };
            for (const root of documentRoots) {
                const found = search(root);
                if (found) return found;
            }
            return null;
        },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    const windowState = {
        innerWidth: 1200,
        innerHeight: 900,
        addEventListener() {},
        removeEventListener() {}
    };

    const PdfViewer = new Function(
        'window',
        'document',
        'PDF_UI_STATE',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState, PDF_UI_STATE);

    PdfViewer.doc = { numPages: 3, destroyed: false };
    PdfViewer._documentLoadToken = 9;
    PdfViewer._pendingGestureCommitGeneration = 12;
    PdfViewer._setCurrentDocumentIdentity('panel:CP-123');
    PdfViewer.currentScale = 1.6;
    PdfViewer._userHasAdjustedZoom = true;

    const stage = makeNode({
        className: 'pdf-gesture-stage',
        offsetTop: 20,
        offsetLeft: 40,
        offsetWidth: 1200,
        offsetHeight: 2760
    });
    stage.dataset.documentLoadToken = '9';
    stage.dataset.documentIdentity = 'panel:CP-123';
    stage.dataset.pageCount = '3';

    const page1 = makeNode({ className: 'pdf-page-wrapper', offsetTop: 0, offsetWidth: 1200, offsetHeight: 880 });
    page1.dataset.pageNumber = '1';
    const page2 = makeNode({ className: 'pdf-page-wrapper', offsetTop: 900, offsetWidth: 1200, offsetHeight: 880 });
    page2.dataset.pageNumber = '2';
    const page3 = makeNode({ className: 'pdf-page-wrapper', offsetTop: 1800, offsetWidth: 1200, offsetHeight: 880 });
    page3.dataset.pageNumber = '3';
    stage.appendChild(page1);
    stage.appendChild(page2);
    stage.appendChild(page3);
    viewer.appendChild(stage);

    const priorState = PdfViewer._captureStageScrollState(viewer, stage);
    assert(priorState.anchorPageNumber === 2, `expected anchor page 2, got ${priorState.anchorPageNumber}`);
    assert(priorState.documentLoadToken === 9, `expected stage token 9, got ${priorState.documentLoadToken}`);
    assert(priorState.documentIdentity === 'panel:CP-123', `expected stage identity panel:CP-123, got ${priorState.documentIdentity}`);

    const sameDocAnchorPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'gesture-anchor',
        priorState,
        anchorContext: { contentX: 500, contentY: 1400 },
        expectedDocumentLoadToken: 9,
        expectedGestureCommitGeneration: 12
    });
    assert(sameDocAnchorPlan.mode === 'anchor', `expected same-document gesture plan to restore anchor, got ${sameDocAnchorPlan.mode}`);

    const staleGenerationPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'gesture-anchor',
        priorState,
        anchorContext: { contentX: 500, contentY: 1400 },
        expectedDocumentLoadToken: 9,
        expectedGestureCommitGeneration: 11
    });
    assert(staleGenerationPlan.mode === 'ratios', `expected stale generation to reject anchor restore and fall back to ratios, got ${staleGenerationPlan.mode}`);

    const invalidAnchorPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'gesture-anchor',
        priorState,
        anchorContext: { contentX: Number.NaN, contentY: 1400 },
        expectedDocumentLoadToken: 9,
        expectedGestureCommitGeneration: 12
    });
    assert(invalidAnchorPlan.mode === 'ratios', `expected invalid anchor context to fall back to ratios, got ${invalidAnchorPlan.mode}`);

    const newDocumentPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'document-load',
        priorState: {
            ...priorState,
            documentLoadToken: 8,
            documentIdentity: 'panel:CP-OLD'
        }
    });
    assert(newDocumentPlan.mode === 'document-start', `expected new document load to start at page-top, got ${newDocumentPlan.mode}`);

    const replacementAnchor = PdfViewer._captureReplacementViewportAnchor(viewer, stage, 10);
    assert(replacementAnchor && replacementAnchor.pageIndex === 1, `expected replacement anchor to capture the second page, got ${replacementAnchor?.pageIndex}`);
    assert(replacementAnchor && replacementAnchor.zoomScale === 1.6, `expected replacement anchor to capture current zoom, got ${replacementAnchor?.zoomScale}`);
    PdfViewer._pendingReplacementViewportAnchor = { ...replacementAnchor, targetDocumentIdentity: 'panel:CP-NEW' };
    PdfViewer._documentLoadToken = 10;
    PdfViewer._setCurrentDocumentIdentity('panel:CP-NEW');

    const replacementPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'document-load',
        priorState,
        replacementAnchor: PdfViewer._getPendingReplacementViewportAnchor()
    });
    assert(replacementPlan.mode === 'replacement-anchor', `expected matching replacement anchor plan, got ${replacementPlan.mode}`);
    PdfViewer._maintainPositionBetweenResults = true;
    assert(PdfViewer._applyPendingReplacementScale() === true, 'matching replacement anchor should restore its captured zoom level');
    assert(PdfViewer.currentScale === 1.6, `expected replacement scale restore to preserve 1.6 zoom, got ${PdfViewer.currentScale}`);
    PdfViewer._maintainPositionBetweenResults = false;
    PdfViewer.currentScale = 1.0;
    assert(PdfViewer._applyPendingReplacementScale() === false, 'replacement scale restore should stay off when maintain-position is disabled');
    assert(PdfViewer.currentScale === 1.0, `expected disabled maintain-position to leave zoom unchanged, got ${PdfViewer.currentScale}`);
    PdfViewer._maintainPositionBetweenResults = true;

    const staleReplacementPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'document-load',
        priorState,
        expectedDocumentLoadToken: 11,
        replacementAnchor
    });
    assert(staleReplacementPlan.mode === 'document-start', `expected stale replacement anchor token to fall back to document-start, got ${staleReplacementPlan.mode}`);

    const invalidReplacementPlan = PdfViewer._resolveRenderScrollPlan({
        renderMode: 'document-load',
        priorState,
        replacementAnchor: {
            ...replacementAnchor,
            targetDocumentLoadToken: 10,
            targetDocumentIdentity: 'panel:CP-NEW',
            normalizedY: Number.NaN
        }
    });
    assert(invalidReplacementPlan.mode === 'document-start', `expected invalid replacement anchor geometry to fall back to document-start, got ${invalidReplacementPlan.mode}`);

    const replacementStage = makeNode({
        className: 'pdf-gesture-stage',
        offsetTop: 20,
        offsetLeft: 40,
        offsetWidth: 1000,
        offsetHeight: 1200
    });
    replacementStage.dataset.documentLoadToken = '10';
    replacementStage.dataset.documentIdentity = 'panel:CP-NEW';
    replacementStage.dataset.pageCount = '1';
    const replacementPage = makeNode({ className: 'pdf-page-wrapper', offsetTop: 0, offsetWidth: 1000, offsetHeight: 1200 });
    replacementPage.dataset.pageNumber = '1';
    replacementStage.appendChild(replacementPage);
    viewer.scrollLeft = 0;
    viewer.scrollTop = 0;
    viewer.scrollWidth = 2400;
    viewer.scrollHeight = 2600;
    const replacementRestored = PdfViewer._restoreScrollFromReplacementAnchor(viewer, replacementStage, replacementAnchor);
    assert(replacementRestored === true, 'replacement anchor should restore on a differently sized document');
    assert(viewer.scrollLeft >= 0 && viewer.scrollLeft <= (viewer.scrollWidth - viewer.clientWidth), 'replacement anchor restore should clamp horizontal scroll within bounds');
    assert(viewer.scrollTop >= 0 && viewer.scrollTop <= (viewer.scrollHeight - viewer.clientHeight), 'replacement anchor restore should clamp vertical scroll within bounds');

    const resetApplied = PdfViewer._resetScrollToDocumentStart(viewer, stage);
    assert(resetApplied === true, 'new document scroll helper should reset to the first page');
    assert(viewer.scrollLeft === 40, `expected new document reset to align the stage left edge, got ${viewer.scrollLeft}`);
    assert(viewer.scrollTop === 20, `expected new document reset to align to the first page top, got ${viewer.scrollTop}`);

    const stagingHost = PdfViewer._getStagingHost(viewer);
    assert(stagingHost !== viewer, 'staging host should not reuse the scroll container');
    assert(stagingHost.parentNode === customPdfViewer, 'staging host should mount beside the scroll container');
    assert(!viewer.children.includes(stagingHost), 'staging host must remain outside the scroll container to avoid scroll extent perturbation');
    assert(stagingHost.inert === true, 'staging host should be inert so hidden staged content cannot take focus');

    console.log('✅ PdfViewer scroll stability tests passed');
})();
