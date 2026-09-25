(function (globalScope, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
        return;
    }
    globalScope.PdfUiStateHelper = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const PDF_UI_STATE = {
        EMPTY: 'empty',
        FIRST_LOAD_LOADING: 'first-load-loading',
        REPLACEMENT_LOADING: 'replacement-loading',
        READY: 'ready',
        FALLBACK: 'fallback',
        HIDDEN: 'hidden'
    };

    function setElementDisplay(element, displayValue) {
        if (!element) return;
        if ((element.style.display || '') !== displayValue) {
            element.style.display = displayValue;
        }
    }

    function resolvePdfUiStatePresentation(state, { hasCommittedPdf = false, hasEverCommittedPdf = false, loadingMessage = '⏳ Loading PDF...' } = {}) {
        const presentation = {
            placeholderDisplay: 'none',
            placeholderText: '📄 Select a schematic',
            toolbarDisplay: 'none',
            viewerDisplay: 'none',
            mainViewVisibility: 'visible',
            mainViewPointerEvents: 'auto',
            fallbackDisplay: 'none',
            frameDisplay: 'none',
            printDisabled: true,
            downloadDisabled: true
        };

        const toolbarDisplay = hasEverCommittedPdf ? 'flex' : 'none';
        switch (state) {
            case PDF_UI_STATE.FIRST_LOAD_LOADING:
                presentation.placeholderDisplay = 'flex';
                presentation.placeholderText = loadingMessage || '⏳ Loading PDF...';
                presentation.toolbarDisplay = toolbarDisplay;
                presentation.viewerDisplay = 'flex';
                presentation.mainViewVisibility = 'hidden';
                presentation.mainViewPointerEvents = 'none';
                break;
            case PDF_UI_STATE.REPLACEMENT_LOADING:
                presentation.placeholderDisplay = 'flex';
                presentation.placeholderText = loadingMessage || '⏳ Loading PDF...';
                presentation.toolbarDisplay = toolbarDisplay;
                presentation.viewerDisplay = 'flex';
                presentation.mainViewVisibility = 'hidden';
                presentation.mainViewPointerEvents = 'none';
                break;
            case PDF_UI_STATE.READY:
                presentation.toolbarDisplay = hasEverCommittedPdf || hasCommittedPdf ? 'flex' : 'none';
                presentation.viewerDisplay = 'flex';
                presentation.printDisabled = !hasCommittedPdf;
                presentation.downloadDisabled = !hasCommittedPdf;
                break;
            case PDF_UI_STATE.FALLBACK:
                presentation.toolbarDisplay = toolbarDisplay;
                presentation.fallbackDisplay = 'block';
                break;
            case PDF_UI_STATE.EMPTY:
            case PDF_UI_STATE.HIDDEN:
            default:
                presentation.placeholderDisplay = 'flex';
                presentation.toolbarDisplay = toolbarDisplay;
                break;
        }

        return presentation;
    }

    return {
        PDF_UI_STATE,
        setElementDisplay,
        resolvePdfUiStatePresentation
    };
});
