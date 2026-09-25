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

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    console.log('🧪 Testing PdfViewer print cleanup + download action');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfViewerClassCode = extractClass('PdfViewer', appJsContent);

    let panelIdValue = 'CP/12:34 ?';
    let simulateIframeError = false;
    let anchorsClicked = [];
    const activeNodes = [];
    const alerts = [];
    const revokedUrls = [];
    const windowListeners = new Map();
    const documentListeners = new Map();
    const popupPrintCalls = [];
    const toolbarHint = {
        style: { display: 'none' },
        innerText: '',
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
    };
    const toolbarHintText = {
        _text: '',
        get textContent() {
            return this._text;
        },
        set textContent(value) {
            this._text = value;
            toolbarHint.innerText = value;
        }
    };
    const toolbarHintContinueButton = {
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
    };
    const toolbarDownloadControl = {
        classes: new Set(),
        classList: {
            toggle(name, force) {
                if (force) {
                    toolbarDownloadControl.classes.add(name);
                } else {
                    toolbarDownloadControl.classes.delete(name);
                }
            }
        },
        contains(target) {
            return target === toolbarDownloadControl || target === toolbarDownloadButton || target === toolbarHint || target === toolbarHintContinueButton;
        }
    };
    const toolbarDownloadLabel = { textContent: 'Download' };
    const toolbarDownloadButton = {
        title: 'Download original (unredacted) PDF currently shown in the viewer',
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        removeAttribute(name) {
            delete this.attributes[name];
        },
        contains(target) {
            return target === toolbarDownloadButton;
        }
    };
    let maintainPositionToggle = {
        tagName: 'BUTTON',
        type: 'button',
        attributes: {},
        classes: new Set(),
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        classList: {
            toggle(name, force) {
                if (force) {
                    maintainPositionToggle.classes.add(name);
                } else {
                    maintainPositionToggle.classes.delete(name);
                }
            }
        }
    };
    let objectUrlCounter = 0;
    let popupBlocked = false;
    let popupPrintMissing = false;
    let navigatorState = {
        userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'Linux x86_64',
        maxTouchPoints: 0
    };

    const body = {
        appendChild(node) {
            node.parentNode = body;
            activeNodes.push(node);
            if (node.tagName === 'IFRAME') {
                setTimeout(() => {
                    if (simulateIframeError && node.onerror) {
                        node.onerror(new Error('load failure'));
                    } else if (node.onload) {
                        node.onload();
                    }
                }, 0);
            }
        },
        removeChild(node) {
            const idx = activeNodes.indexOf(node);
            if (idx >= 0) activeNodes.splice(idx, 1);
            node.parentNode = null;
        }
    };

    const documentState = {
        body,
        visibilityState: 'visible',
        createElement(tag) {
            if (tag === 'iframe') {
                const listeners = new Map();
                return {
                    tagName: 'IFRAME',
                    style: {},
                    src: '',
                    parentNode: null,
                    setAttribute() {},
                    onload: null,
                    onerror: null,
                    contentWindow: {
                        focus() {},
                        print() {},
                        addEventListener(name, fn) {
                            listeners.set(name, fn);
                        },
                        removeEventListener(name) {
                            listeners.delete(name);
                        }
                    }
                };
            }
            if (tag === 'a') {
                return {
                    href: '',
                    download: '',
                    rel: '',
                    target: '',
                    click() {
                        anchorsClicked.push({ href: this.href, download: this.download, rel: this.rel, target: this.target });
                    }
                };
            }
            return { style: {} };
        },
        addEventListener(name, fn) {
            documentListeners.set(name, fn);
        },
        removeEventListener(name) {
            documentListeners.delete(name);
        },
        getElementById(id) {
            if (id === 'pdf-download-hint') return toolbarHint;
            if (id === 'pdf-download-hint-text') return toolbarHintText;
            if (id === 'pdf-download-hint-continue') return toolbarHintContinueButton;
            if (id === 'pdf-download-btn-label') return toolbarDownloadLabel;
            if (id === 'pdf-download-btn') return toolbarDownloadButton;
            if (id === 'pdf-download-control') return toolbarDownloadControl;
            if (id === 'pdf-maintain-position-toggle') return maintainPositionToggle;
            return null;
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };

    const DOM_CACHE = {
        get(id) {
            if (id === 'demo-panel-id') return { value: panelIdValue };
            if (id === 'pdf-download-hint') return toolbarHint;
            if (id === 'pdf-download-hint-text') return toolbarHintText;
            if (id === 'pdf-download-hint-continue') return toolbarHintContinueButton;
            if (id === 'pdf-download-btn-label') return toolbarDownloadLabel;
            if (id === 'pdf-download-btn') return toolbarDownloadButton;
            if (id === 'pdf-download-control') return toolbarDownloadControl;
            if (id === 'pdf-maintain-position-toggle') return maintainPositionToggle;
            return null;
        }
    };

    const localStorageState = new Map();
    const localStorage = {
        getItem(key) {
            return localStorageState.has(key) ? localStorageState.get(key) : null;
        },
        setItem(key, value) {
            localStorageState.set(key, String(value));
        }
    };

    const windowState = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener(name, fn) {
            windowListeners.set(name, fn);
        },
        removeEventListener(name) {
            windowListeners.delete(name);
        },
        open(url) {
            if (popupBlocked) return null;
            return {
                url,
                focus() {},
                print: popupPrintMissing ? undefined : () => {
                    popupPrintCalls.push(url);
                }
            };
        }
    };
    const URLState = {
        createObjectURL() {
            objectUrlCounter += 1;
            return `blob:print-${objectUrlCounter}`;
        },
        revokeObjectURL(url) {
            revokedUrls.push(url);
        }
    };

    const PdfViewer = new Function(
        'window',
        'document',
        'DOM_CACHE',
        'localStorage',
        'navigator',
        'URL',
        'alert',
        'buildWorkerUrl',
        'PDF_UI_STATE',
        'setPdfUiState',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState, DOM_CACHE, localStorage, navigatorState, URLState, (message) => alerts.push(message), (target, params = {}) => {
        const query = new URLSearchParams({ target, ...params }).toString();
        return `https://worker.example/?${query}`;
    }, PDF_UI_STATE, () => {});

    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'pdf-blob' };
    PdfViewer.PRINT_CLEANUP_TIMEOUT_MS = 5;
    PdfViewer.PRINT_MAX_TIMEOUT_MS = 30;
    PdfViewer.PRINT_IFRAME_LOAD_TIMEOUT_MS = 5;
    PdfViewer.PRINT_DIALOG_RELEASE_DELAY_MS = 1;

    PdfViewer.print();
    assert(PdfViewer.isPrinting === true, 'print should set guard immediately');
    await wait(15);
    assert(PdfViewer.isPrinting === false, 'print fallback cleanup should always release guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'print cleanup should remove iframe');
    assert(revokedUrls.includes('blob:print-1'), 'iframe print path should revoke temporary object URL');

    simulateIframeError = true;
    PdfViewer.print();
    await wait(10);
    assert(PdfViewer.isPrinting === false, 'iframe load failure should release print guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'iframe error path should cleanup iframe');
    assert(revokedUrls.includes('blob:print-2'), 'iframe error path should revoke temporary object URL');
    simulateIframeError = false;

    navigatorState.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    navigatorState.vendor = 'Apple Computer, Inc.';
    navigatorState.platform = 'iPhone';
    navigatorState.maxTouchPoints = 5;
    PdfViewer.print();
    await wait(10);
    assert(popupPrintCalls.length === 1, 'Safari/iOS print path should target an isolated popup window');
    assert(!alerts.some((message) => /Opened the PDF in a new tab/i.test(message)), 'successful isolated print should not show fallback guidance');
    assert(PdfViewer.isPrinting === false, 'isolated print path should also release the print guard');

    popupPrintMissing = true;
    PdfViewer.print();
    await wait(10);
    assert(alerts.some((message) => /Opened the PDF in a new tab/i.test(message)), 'missing isolated print support should explain the PDF-tab fallback');
    assert(PdfViewer.isPrinting === false, 'missing isolated print support should also release the print guard');
    popupPrintMissing = false;

    popupBlocked = true;
    PdfViewer.print();
    await wait(5);
    assert(alerts.some((message) => /Unable to open the PDF print tab/i.test(message)), 'popup-open failure should alert the user');
    assert(PdfViewer.isPrinting === false, 'popup-open failure should release the print guard');
    popupBlocked = false;

    navigatorState.userAgent = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36';
    navigatorState.vendor = 'Google Inc.';
    navigatorState.platform = 'Linux x86_64';
    navigatorState.maxTouchPoints = 0;
    PdfViewer.download();
    assert(anchorsClicked.length === 1, 'download should trigger one anchor click when PDF is loaded');
    assert(anchorsClicked[0].href === 'blob:viewer-pdf', 'download should use current viewer blob URL');
    assert(anchorsClicked[0].download.endsWith('.pdf'), 'download filename should end with .pdf');
    assert(!/[\\/:*?"<>|]/.test(anchorsClicked[0].download), 'download filename should be sanitized');
    PdfViewer.initToolbarState();
    assert(toolbarDownloadLabel.textContent === 'Download', 'non-iOS browsers should keep the Download label');
    PdfViewer.setMaintainPositionBetweenResults(true);
    assert(maintainPositionToggle.attributes['aria-pressed'] === 'true', 'maintain-position toggle should expose aria-pressed true when enabled');
    assert(maintainPositionToggle.classes.has('is-active') === true, 'maintain-position toggle should expose active class when enabled');
    assert(localStorageState.get(PdfViewer.MAINTAIN_POSITION_STORAGE_KEY) === 'true', 'maintain-position preference should persist to localStorage');
    PdfViewer.setMaintainPositionBetweenResults(false);
    assert(maintainPositionToggle.attributes['aria-pressed'] === 'false', 'maintain-position toggle should expose aria-pressed false when disabled');
    assert(maintainPositionToggle.classes.has('is-active') === false, 'maintain-position toggle active class should clear when disabled');

    maintainPositionToggle = {
        tagName: 'INPUT',
        type: 'checkbox',
        checked: false,
        classes: new Set(),
        classList: {
            toggle(name, force) {
                if (force) {
                    maintainPositionToggle.classes.add(name);
                } else {
                    maintainPositionToggle.classes.delete(name);
                }
            }
        }
    };
    PdfViewer.setMaintainPositionBetweenResults(true);
    assert(maintainPositionToggle.checked === true, 'checkbox fallback toggle should sync checked state');
    assert(maintainPositionToggle['aria-pressed'] === 'true', 'fallback toggle should sync aria-pressed without setAttribute');
    assert(maintainPositionToggle.classes.has('is-active') === true, 'checkbox fallback toggle should still apply active class');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    navigatorState.vendor = 'Apple Computer, Inc.';
    navigatorState.platform = 'iPhone';
    navigatorState.maxTouchPoints = 5;
    PdfViewer._activePanelId = 'CP-1234';
    PdfViewer._committedPanelId = 'CP-1234';
    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.initToolbarState();
    assert(PdfViewer._isIosSafariBrowser() === true, 'iPhone Safari should be detected as iOS Safari');
    assert(toolbarDownloadLabel.textContent === 'Save PDF', 'iOS Safari should relabel the action to Save PDF');
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'first iOS Save PDF tap should show guidance without opening the PDF');
    assert(toolbarHint.style.display === 'block', 'first iOS Save PDF tap should show the nested tooltip');
    assert(toolbarDownloadControl.classes.has('tooltip-visible') === true, 'first iOS Save PDF tap should mark the control as tooltip-visible');
    assert(toolbarDownloadButton.attributes['aria-expanded'] === 'true', 'first iOS Save PDF tap should expand the button tooltip state');
    assert(toolbarDownloadButton.attributes['aria-describedby'] === 'pdf-download-hint-text', 'visible tooltip should be associated with the button for assistive tech');
    assert(/Tap Share, then Save to Files\./i.test(toolbarHint.innerText), 'first iOS Save PDF tap should explain the native save path');
    PdfViewer.download();
    assert(anchorsClicked.length === 1, 'second iOS Save PDF tap should proceed immediately to the existing share/download flow');
    assert(/target=PDF_BY_ID/.test(anchorsClicked[0].href), 'Safari attachment URL should target PDF_BY_ID');
    assert(/mode=attachment/.test(anchorsClicked[0].href), 'Safari attachment URL should request attachment mode');
    assert(anchorsClicked[0].target === '_blank', 'Safari attachment download should open isolated target');
    assert(toolbarHint.style.display === 'none', 'second iOS Save PDF tap should dismiss the tooltip');
    assert(toolbarDownloadButton.attributes['aria-expanded'] === 'false', 'second iOS Save PDF tap should collapse the button tooltip state');
    assert(!('aria-describedby' in toolbarDownloadButton.attributes), 'hidden tooltip should not stay associated with the button');
    PdfViewer.download();
    assert(anchorsClicked.length === 2, 'acknowledged iOS Save PDF interactions should proceed directly for the same committed PDF');

    anchorsClicked = [];
    PdfViewer._iosSaveTooltipAcknowledgedDocumentIdentity = '';
    PdfViewer.download();
    assert(toolbarHint.style.display === 'block', 'a fresh iOS Save PDF interaction should show the tooltip again');
    const outsideDismiss = documentListeners.get('pointerdown');
    assert(typeof outsideDismiss === 'function', 'tooltip should register an outside-dismiss listener while visible');
    outsideDismiss({ target: { id: 'outside-target' } });
    assert(toolbarHint.style.display === 'none', 'outside taps should dismiss the tooltip without opening the PDF');
    assert(anchorsClicked.length === 0, 'outside dismissal should not open the PDF');
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'after outside dismissal, the next iOS Save PDF tap should restart with tooltip-only guidance');
    assert(toolbarHint.style.display === 'block', 'after outside dismissal, the tooltip should reappear on the next tap');
    PdfViewer._hideIosSavePdfHint();

    PdfViewer.IOS_SAVE_TOOLTIP_AUTO_DISMISS_MS = 5;
    PdfViewer._iosSaveTooltipAcknowledgedDocumentIdentity = '';
    PdfViewer.download();
    assert(toolbarHint.style.display === 'block', 'auto-dismiss test should start with the tooltip visible');
    await wait(15);
    assert(toolbarHint.style.display === 'none', 'tooltip should auto-dismiss after a short idle period');
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'after auto-dismiss, the next iOS Save PDF tap should again be guidance-only');
    assert(toolbarHint.style.display === 'block', 'after auto-dismiss, the tooltip should restart on the next tap');
    PdfViewer._hideIosSavePdfHint();
    PdfViewer.IOS_SAVE_TOOLTIP_AUTO_DISMISS_MS = 3200;

    anchorsClicked = [];
    PdfViewer._iosSaveTooltipAcknowledgedDocumentIdentity = '';
    PdfViewer.download();
    PdfViewer.confirmIosSavePdfHint();
    assert(anchorsClicked.length === 1, 'tooltip continue action should open the PDF without requiring a second button tap');
    assert(toolbarHint.style.display === 'none', 'tooltip continue action should dismiss the tooltip after opening the PDF');

    anchorsClicked = [];
    PdfViewer._iosSaveTooltipAcknowledgedDocumentIdentity = 'panel:CP-1234';
    PdfViewer._pendingBlobUrl = 'blob:new-doc';
    PdfViewer._pendingPdfBlob = { tag: 'new-doc' };
    PdfViewer._pendingPanelId = 'CP-5678';
    PdfViewer._pendingUrl = 'https://example.com/new.pdf';
    PdfViewer._pendingDocumentIdentity = 'panel:CP-5678';
    PdfViewer._commitPendingDocumentResources({ documentIdentity: 'panel:CP-5678' });
    assert(PdfViewer._iosSaveTooltipAcknowledgedDocumentIdentity === '', 'committed-document changes should reset the acknowledged iOS Save PDF cycle');
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'after a committed-document change, the next iOS Save PDF tap should return to tooltip-only guidance');
    assert(toolbarHint.style.display === 'block', 'after a committed-document change, the tooltip should show for the new document');
    PdfViewer._hideIosSavePdfHint();

    navigatorState.vendor = '';
    PdfViewer.initToolbarState();
    assert(PdfViewer._isIosSafariBrowser() === true, 'iOS Safari detection should not require navigator.vendor');
    assert(toolbarDownloadLabel.textContent === 'Save PDF', 'vendor-less iOS Safari should keep the Save PDF label');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    navigatorState.vendor = 'Apple Computer, Inc.';
    navigatorState.platform = 'MacIntel';
    navigatorState.maxTouchPoints = 0;
    PdfViewer.initToolbarState();
    assert(PdfViewer._isIosSafariBrowser() === false, 'desktop Safari should not be classified as iOS Safari');
    assert(toolbarDownloadLabel.textContent === 'Download', 'desktop Safari should keep the Download label');
    assert(toolbarHint.style.display === 'none', 'desktop Safari should not keep the iOS-specific save hint visible');
    navigatorState.userAgent = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36';
    navigatorState.vendor = 'Google Inc.';
    navigatorState.platform = 'Linux x86_64';
    navigatorState.maxTouchPoints = 0;
    PdfViewer._committedPanelId = 'CP-OLD';
    PdfViewer._activePanelId = 'CP-NEW';
    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'replacement-source' };
    PdfViewer._beginDocumentLoad();
    assert(PdfViewer._pendingLoadUiState === PDF_UI_STATE.REPLACEMENT_LOADING, 'beginDocumentLoad should keep replacement-loading UI when a committed document existed even without an attached stage');
    assert(PdfViewer._documentActionsInvalidated === true, 'beginDocumentLoad should invalidate stale print/download actions during replacement');
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'download should stay inactive while a replacement document is still pending');

    anchorsClicked = [];
    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'replacement-source' };
    PdfViewer._committedPanelId = 'CP-OLD';
    PdfViewer._activePanelId = 'CP-NEW';
    PdfViewer._beginDocumentLoad();
    navigatorState.userAgent = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36';
    navigatorState.vendor = 'Google Inc.';
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'download should not fall back to stale committed targets during a replacement transition');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    navigatorState.vendor = 'Apple Computer, Inc.';
    PdfViewer._committedPanelId = 'CP-OLD';
    PdfViewer._activePanelId = 'CP-NEW';
    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'replacement-source' };
    PdfViewer._beginDocumentLoad();
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'Safari download should also stay inactive until the replacement commits');

    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'fallback-source' };
    PdfViewer._committedPanelId = 'CP-NEW';
    PdfViewer._committedUrl = 'https://example.com/panel.pdf';
    PdfViewer._hasEverCommittedDocument = true;
    PdfViewer._transitionToFallback('https://example.com/panel.pdf');
    assert(PdfViewer.hasEverCommittedDocumentTarget() === true, 'fallback after a successful load should preserve the session-level successful-load flag');
    assert(PdfViewer.hasCommittedDocumentTarget() === false, 'fallback after a successful load should clear the stale committed document target');
    assert(PdfViewer.currentBlobUrl === '', 'fallback after a successful load should clear the stale committed blob URL');
    assert(PdfViewer.currentPdfBlob === null, 'fallback after a successful load should clear the stale committed blob object');
    assert(PdfViewer._documentActionsInvalidated === true, 'fallback after a successful load should keep document actions invalidated');
    anchorsClicked = [];
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'fallback after a successful load should keep stale download actions blocked');
    const priorPrintCalls = popupPrintCalls.length;
    PdfViewer.print();
    assert(popupPrintCalls.length === priorPrintCalls, 'fallback after a successful load should keep stale print actions blocked');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36';
    navigatorState.vendor = 'Google Inc.';
    PdfViewer._committedPanelId = '';
    PdfViewer.currentBlobUrl = '';
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'download should no-op when no PDF is loaded');

    console.log('✅ PdfViewer print/download tests passed');
})();
