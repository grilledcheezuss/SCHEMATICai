const { PDF_UI_STATE, setElementDisplay, resolvePdfUiStatePresentation } = require('../pdf-ui-state.js');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
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

function applyPresentation(elements, presentation, { fallbackUrl = '', state = PDF_UI_STATE.EMPTY } = {}) {
    setElementDisplay(elements.placeholder, presentation.placeholderDisplay);
    elements.placeholder.innerText = presentation.placeholderText;
    setElementDisplay(elements.toolbar, presentation.toolbarDisplay);
    setElementDisplay(elements.viewer, presentation.viewerDisplay);
    setElementDisplay(elements.fallback, presentation.fallbackDisplay);
    setElementDisplay(elements.frame, presentation.frameDisplay);
    if (state === PDF_UI_STATE.FALLBACK && fallbackUrl) {
        elements.fallbackLink.href = fallbackUrl;
    }
    elements.printBtn.disabled = presentation.printDisabled;
    elements.downloadBtn.disabled = presentation.downloadDisabled;
}

(async () => {
    console.log('🧪 Testing PDF UI state policy');

    const elements = {
        placeholder: makeElement('none'),
        toolbar: makeElement('none'),
        viewer: makeElement('none'),
        fallback: makeElement('none'),
        frame: makeElement('none'),
        printBtn: { disabled: true },
        downloadBtn: { disabled: true },
        fallbackLink: { href: '' }
    };

    applyPresentation(elements, resolvePdfUiStatePresentation(PDF_UI_STATE.EMPTY));
    assert(elements.placeholder.style.display === 'flex', 'empty state should show placeholder');
    assert(elements.placeholder.innerText === '📄 Select a schematic', 'empty state should show default placeholder text');
    assert(elements.toolbar.style.display === 'none', 'empty state should hide toolbar');
    assert(elements.viewer.style.display === 'none', 'empty state should hide viewer');
    assert(elements.printBtn.disabled === true, 'empty state should disable print');
    assert(elements.downloadBtn.disabled === true, 'empty state should disable download');

    applyPresentation(
        elements,
        resolvePdfUiStatePresentation(PDF_UI_STATE.FIRST_LOAD_LOADING, {
            hasCommittedPdf: false,
            loadingMessage: '⏳ Loading PDF...'
        })
    );
    assert(elements.placeholder.style.display === 'flex', 'first-load state should keep placeholder visible');
    assert(elements.placeholder.innerText === '⏳ Loading PDF...', 'first-load state should show calm loading text');
    assert(elements.toolbar.style.display === 'none', 'first-load state should hide toolbar until commit');
    assert(elements.viewer.style.display === 'none', 'first-load state should hide viewer until commit');
    assert(elements.printBtn.disabled === true, 'first-load state should keep print disabled');
    assert(elements.downloadBtn.disabled === true, 'first-load state should keep download disabled');

    elements.toolbar.style._history.length = 0;
    elements.viewer.style._history.length = 0;
    elements.toolbar.style.display = 'flex';
    elements.viewer.style.display = 'flex';
    elements.toolbar.style._history.length = 0;
    elements.viewer.style._history.length = 0;
    applyPresentation(
        elements,
        resolvePdfUiStatePresentation(PDF_UI_STATE.REPLACEMENT_LOADING, { hasCommittedPdf: true })
    );
    assert(elements.toolbar.style.display === 'flex', 'replacement loading should keep toolbar visible');
    assert(elements.viewer.style.display === 'flex', 'replacement loading should keep viewer visible');
    assert(elements.toolbar.style._history.length === 0, 'replacement loading should not toggle toolbar display when already visible');
    assert(elements.viewer.style._history.length === 0, 'replacement loading should not toggle viewer display when already visible');
    assert(elements.printBtn.disabled === false, 'replacement loading should keep print enabled for the committed document');
    assert(elements.downloadBtn.disabled === false, 'replacement loading should keep download enabled for the committed document');

    applyPresentation(
        elements,
        resolvePdfUiStatePresentation(PDF_UI_STATE.READY, { hasCommittedPdf: true })
    );
    assert(elements.toolbar.style.display === 'flex', 'ready state should show toolbar');
    assert(elements.viewer.style.display === 'flex', 'ready state should show viewer');
    assert(elements.printBtn.disabled === false, 'ready state should enable print');
    assert(elements.downloadBtn.disabled === false, 'ready state should enable download');

    applyPresentation(
        elements,
        resolvePdfUiStatePresentation(PDF_UI_STATE.FALLBACK),
        { fallbackUrl: 'https://example.com/fallback.pdf', state: PDF_UI_STATE.FALLBACK }
    );
    assert(elements.fallback.style.display === 'block', 'fallback state should show fallback container');
    assert(elements.fallbackLink.href === 'https://example.com/fallback.pdf', 'fallback state should wire the fallback link');
    assert(elements.toolbar.style.display === 'none', 'fallback state should hide toolbar');
    assert(elements.viewer.style.display === 'none', 'fallback state should hide viewer');
    assert(elements.printBtn.disabled === true, 'fallback state should disable print');
    assert(elements.downloadBtn.disabled === true, 'fallback state should disable download');

    console.log('✅ PDF UI state tests passed');
})();
