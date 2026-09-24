const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class in app.js`);
    let braceCount = 0;
    let inClass = false;
    let endIdx = startIdx;
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

console.log('🧪 Testing MobileScrollCoordinator touch ownership');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const coordinatorCode = extractClass('MobileScrollCoordinator', appJsContent);

const docListeners = new Map();
const winListeners = new Map();

const viewer = {
    id: 'pdf-main-view',
    scrollTop: 0,
    contains(target) {
        return target === viewerTarget;
    }
};
const results = {
    id: 'results-scroll-area',
    scrollTop: 0,
    contains(target) {
        return target === resultsTarget || target === resultsChildTarget;
    }
};
const viewerTarget = { role: 'viewer-touch-target' };
const resultsTarget = { role: 'results-touch-target' };
const resultsChildTarget = { role: 'results-child-touch-target' };
const outsideTarget = { role: 'outside-touch-target' };

const documentState = {
    getElementById(id) {
        if (id === 'pdf-main-view') return viewer;
        if (id === 'results-scroll-area') return results;
        if (id === 'results-list') return null;
        return null;
    },
    addEventListener(name, fn) {
        docListeners.set(name, fn);
    },
    removeEventListener(name) {
        docListeners.delete(name);
    }
};

const windowState = {
    innerWidth: 390,
    addEventListener(name, fn) {
        winListeners.set(name, fn);
    },
    removeEventListener(name) {
        winListeners.delete(name);
    }
};

const PdfViewer = { _activeGesture: null };

const MobileScrollCoordinator = new Function(
    'window',
    'document',
    'PdfViewer',
    `${coordinatorCode}; return MobileScrollCoordinator;`
)(windowState, documentState, PdfViewer);

MobileScrollCoordinator.init();
assert(docListeners.has('touchstart'), 'coordinator should register touchstart listener');
assert(docListeners.has('touchmove'), 'coordinator should register touchmove listener');

const touchStart = docListeners.get('touchstart');
const touchMove = docListeners.get('touchmove');
const touchEnd = docListeners.get('touchend');

touchStart({
    target: resultsTarget,
    touches: [{ clientY: 500 }]
});
assert(MobileScrollCoordinator.shouldAllowPdfTouchStart() === false, 'results-origin gesture should lock out PDF touch start');

let prevented = false;
touchMove({
    target: viewerTarget,
    touches: [{ clientY: 450 }],
    cancelable: true,
    preventDefault() { prevented = true; },
    stopPropagation() {}
});
assert(prevented, 'crossing into viewer while results-owned should prevent default on non-owner region');
assert(results.scrollTop > 0, 'results-owned crossing should continue scrolling results');
assert(viewer.scrollTop === 0, 'results-owned crossing should not scroll viewer');

touchEnd({ touches: [] });
assert(MobileScrollCoordinator.shouldAllowPdfTouchStart() === true, 'ownership should clear when touches end');

touchStart({
    target: viewerTarget,
    touches: [{ clientY: 300 }]
});
assert(MobileScrollCoordinator.shouldAllowPdfTouchStart() === true, 'viewer-origin gesture should keep PDF ownership');

prevented = false;
touchMove({
    target: resultsChildTarget,
    touches: [{ clientY: 260 }],
    cancelable: true,
    preventDefault() { prevented = true; },
    stopPropagation() {}
});
assert(prevented, 'crossing into results while viewer-owned should prevent default on non-owner region');
assert(viewer.scrollTop > 0, 'viewer-owned crossing should continue scrolling viewer');

touchEnd({ touches: [] });
touchStart({
    target: resultsTarget,
    touches: [{ clientY: 200 }, { clientY: 198 }]
});
touchMove({
    target: outsideTarget,
    touches: [{ clientY: 170 }, { clientY: 168 }],
    cancelable: true,
    preventDefault() {},
    stopPropagation() {}
});
assert(MobileScrollCoordinator.shouldAllowPdfTouchStart() === false, 'results-origin multi-touch should not allow PDF pinch start');

MobileScrollCoordinator.resetGestureOwnership('test-reset');
assert(MobileScrollCoordinator.shouldAllowPdfTouchStart() === true, 'manual ownership reset should clear lock');

MobileScrollCoordinator.teardown();
assert(docListeners.size === 0, 'teardown should remove touch listeners');
assert(winListeners.size === 0, 'teardown should remove viewport listeners');

console.log('✅ MobileScrollCoordinator tests passed');
