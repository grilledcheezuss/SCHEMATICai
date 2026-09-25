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

    function resolvePdfUiStatePresentation(state, { hasCommittedPdf = false, loadingMessage = '⏳ Loading PDF...' } = {}) {
        const presentation = {
            placeholderDisplay: 'none',
            placeholderText: '📄 Select a schematic',
            toolbarDisplay: 'none',
            viewerDisplay: 'none',
            fallbackDisplay: 'none',
            frameDisplay: 'none',
            printDisabled: true,
            downloadDisabled: true
        };

        switch (state) {
            case PDF_UI_STATE.FIRST_LOAD_LOADING:
                presentation.placeholderDisplay = 'flex';
                presentation.placeholderText = loadingMessage || '⏳ Loading PDF...';
                break;
            case PDF_UI_STATE.REPLACEMENT_LOADING:
                presentation.toolbarDisplay = 'flex';
                presentation.viewerDisplay = 'flex';
                presentation.printDisabled = !hasCommittedPdf;
                presentation.downloadDisabled = !hasCommittedPdf;
                break;
            case PDF_UI_STATE.READY:
                presentation.toolbarDisplay = 'flex';
                presentation.viewerDisplay = 'flex';
                presentation.printDisabled = !hasCommittedPdf;
                presentation.downloadDisabled = !hasCommittedPdf;
                break;
            case PDF_UI_STATE.FALLBACK:
                presentation.fallbackDisplay = 'block';
                break;
            case PDF_UI_STATE.EMPTY:
            case PDF_UI_STATE.HIDDEN:
            default:
                presentation.placeholderDisplay = 'flex';
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
