const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function extractFunction(name, content) {
    const startIdx = content.indexOf(`function ${name}(`);
    if (startIdx === -1) throw new Error(`Could not find function ${name} in app.js`);
    let parenDepth = 0;
    let signatureEndIdx = -1;
    for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '(') parenDepth++;
        if (ch === ')') {
            parenDepth--;
            if (parenDepth === 0) {
                signatureEndIdx = i;
                break;
            }
        }
    }
    if (signatureEndIdx === -1) throw new Error(`Could not find function signature end for ${name} in app.js`);
    const bodyStartIdx = content.indexOf('{', signatureEndIdx);
    if (bodyStartIdx === -1) throw new Error(`Could not find function body for ${name} in app.js`);
    let braceCount = 0;
    let endIdx = bodyStartIdx;
    for (let i = bodyStartIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{') {
            braceCount++;
        } else if (ch === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    return content.substring(startIdx, endIdx);
}

function extractConstObject(name, content) {
    const startIdx = content.indexOf(`const ${name} = {`);
    if (startIdx === -1) throw new Error(`Could not find const ${name} in app.js`);
    let braceCount = 0;
    let endIdx = startIdx;
    let inObject = false;
    for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{') {
            braceCount++;
            inObject = true;
        } else if (ch === '}') {
            braceCount--;
            if (inObject && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    return `${content.substring(startIdx, endIdx)};`;
}

function makeElement(initialDisplay = 'none') {
    const history = [];
    let display = initialDisplay;
    return {
        style: {
            get display() {
                return display;
            },
            set display(value) {
                history.push(value);
                display = value;
            },
            _history: history
        },
        innerText: '',
        disabled: true,
        href: ''
    };
}

(async () => {
    console.log('🧪 Testing PDF UI state policy');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfUiStateCode = extractConstObject('PDF_UI_STATE', appJsContent);
    const setElementDisplayCode = extractFunction('setElementDisplay', appJsContent);
    const resolvePresentationCode = extractFunction('resolvePdfUiStatePresentation', appJsContent);
    const setPdfUiStateCode = extractFunction('setPdfUiState', appJsContent);

    const placeholder = makeElement('none');
    const toolbar = makeElement('none');
    const viewer = makeElement('none');
    const fallback = makeElement('none');
    const frame = makeElement('none');
    const printBtn = { disabled: true };
    const downloadBtn = { disabled: true };
    const fallbackLink = { href: '' };

    const elements = new Map([
        ['pdf-placeholder-text', placeholder],
        ['pdf-toolbar', toolbar],
        ['custom-pdf-viewer', viewer],
        ['pdf-fallback', fallback],
        ['pdf-fallback-link', fallbackLink],
        ['pdf-viewer-frame', frame],
        ['pdf-print-btn', printBtn],
        ['pdf-download-btn', downloadBtn]
    ]);

    const DOM_CACHE = { get: (id) => elements.get(id) || null };
    const PdfViewer = { currentBlobUrl: '', currentPdfBlob: null, _uiState: null };
    const documentState = {};

    const { PDF_UI_STATE, setPdfUiState } = new Function(
        'DOM_CACHE',
        'document',
        'PdfViewer',
        `${pdfUiStateCode}\n${setElementDisplayCode}\n${resolvePresentationCode}\n${setPdfUiStateCode}\nreturn { PDF_UI_STATE, setPdfUiState };`
    )(DOM_CACHE, documentState, PdfViewer);

    setPdfUiState(PDF_UI_STATE.EMPTY);
    assert(placeholder.style.display === 'flex', 'empty state should show placeholder');
    assert(placeholder.innerText === '📄 Select a schematic', 'empty state should show default placeholder text');
    assert(toolbar.style.display === 'none', 'empty state should hide toolbar');
    assert(viewer.style.display === 'none', 'empty state should hide viewer');
    assert(printBtn.disabled === true, 'empty state should disable print');
    assert(downloadBtn.disabled === true, 'empty state should disable download');

    PdfViewer.currentBlobUrl = '';
    PdfViewer.currentPdfBlob = null;
    setPdfUiState(PDF_UI_STATE.FIRST_LOAD_LOADING, '⏳ Loading PDF...');
    assert(placeholder.style.display === 'flex', 'first-load state should keep placeholder visible');
    assert(placeholder.innerText === '⏳ Loading PDF...', 'first-load state should show calm loading text');
    assert(toolbar.style.display === 'none', 'first-load state should hide toolbar until commit');
    assert(viewer.style.display === 'none', 'first-load state should hide viewer until commit');
    assert(printBtn.disabled === true, 'first-load state should keep print disabled');
    assert(downloadBtn.disabled === true, 'first-load state should keep download disabled');

    PdfViewer.currentBlobUrl = 'blob:active-doc';
    toolbar.style._history.length = 0;
    viewer.style._history.length = 0;
    toolbar.style.display = 'flex';
    viewer.style.display = 'flex';
    toolbar.style._history.length = 0;
    viewer.style._history.length = 0;
    setPdfUiState(PDF_UI_STATE.REPLACEMENT_LOADING);
    assert(toolbar.style.display === 'flex', 'replacement loading should keep toolbar visible');
    assert(viewer.style.display === 'flex', 'replacement loading should keep viewer visible');
    assert(toolbar.style._history.length === 0, 'replacement loading should not toggle toolbar display when already visible');
    assert(viewer.style._history.length === 0, 'replacement loading should not toggle viewer display when already visible');
    assert(printBtn.disabled === false, 'replacement loading should keep print enabled for the committed document');
    assert(downloadBtn.disabled === false, 'replacement loading should keep download enabled for the committed document');

    setPdfUiState(PDF_UI_STATE.READY);
    assert(toolbar.style.display === 'flex', 'ready state should show toolbar');
    assert(viewer.style.display === 'flex', 'ready state should show viewer');
    assert(printBtn.disabled === false, 'ready state should enable print');
    assert(downloadBtn.disabled === false, 'ready state should enable download');
    assert(PdfViewer._uiState === PDF_UI_STATE.READY, 'ready state should be recorded on PdfViewer');

    setPdfUiState(PDF_UI_STATE.FALLBACK, '', 'https://example.com/fallback.pdf');
    assert(fallback.style.display === 'block', 'fallback state should show fallback container');
    assert(fallbackLink.href === 'https://example.com/fallback.pdf', 'fallback state should wire the fallback link');
    assert(toolbar.style.display === 'none', 'fallback state should hide toolbar');
    assert(viewer.style.display === 'none', 'fallback state should hide viewer');
    assert(printBtn.disabled === true, 'fallback state should disable print');
    assert(downloadBtn.disabled === true, 'fallback state should disable download');

    console.log('✅ PDF UI state tests passed');
})();
