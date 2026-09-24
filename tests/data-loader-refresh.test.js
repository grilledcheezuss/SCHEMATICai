const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const appVersionMatch = appJsContent.match(/const APP_VERSION = "(v[^"]+)"/);
if (!appVersionMatch) throw new Error('Could not determine APP_VERSION from app.js');
const APP_VERSION = appVersionMatch[1];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
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

function createLocalStorage() {
    const map = new Map();
    return {
        getItem: key => map.has(key) ? map.get(key) : null,
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key)
    };
}

function createClassList() {
    const classes = new Set();
    return {
        add: (...tokens) => tokens.forEach(token => classes.add(token)),
        remove: (...tokens) => tokens.forEach(token => classes.delete(token)),
        contains: token => classes.has(token),
        toArray: () => [...classes]
    };
}

function createSearchButton() {
    return {
        disabled: false,
        innerText: 'SEARCH',
        onclick: null,
        classList: createClassList()
    };
}

const localStorage = createLocalStorage();
const uiState = { pop: () => {} };
const networkState = { fetch: async () => ({ status: 200, json: async () => ({ records: [] }) }) };
const dbState = {
    claimLock: async () => false,
    releaseLock: async () => {},
    deleteChunk: async () => {},
    deleteLegacy: async () => {},
    deleteDatabase: async () => {}
};
const cacheState = {};
const configState = { estTotal: 1, mainTable: 'test-table' };
const searchBtn = createSearchButton();
const authOverlay = { classList: createClassList() };
const documentState = {
    visibilityState: 'visible',
    addEventListener: () => {},
    getElementById: id => {
        if (id === 'searchBtn') return searchBtn;
        if (id === 'auth-overlay') return authOverlay;
        return null;
    }
};
const windowState = { LOCAL_DB: [] };
const locationState = {
    reloadCalls: 0,
    reload() {
        this.reloadCalls++;
    }
};
const DataLoaderClassCode = extractClass('DataLoader', appJsContent);
const DataLoader = new Function(
    'APP_VERSION',
    'DATA_SYNC_MAX_AGE_MS',
    'DB',
    'localStorage',
    'window',
    'document',
    'UI',
    'NetworkService',
    'CacheService',
    'CONFIG',
    'AuthService',
    'location',
    `${DataLoaderClassCode}; return DataLoader;`
)(
    APP_VERSION,
    60 * 60 * 1000,
    dbState,
    localStorage,
    windowState,
    documentState,
    uiState,
    networkState,
    cacheState,
    configState,
    {},
    locationState
);
const originalMethods = {
    acquireSyncLock: DataLoader.acquireSyncLock,
    releaseSyncLock: DataLoader.releaseSyncLock,
    fetchPartition: DataLoader.fetchPartition,
    installLifecycleRefreshHooks: DataLoader.installLifecycleRefreshHooks,
    maybeRefreshStaleCache: DataLoader.maybeRefreshStaleCache
};

function resetHarness() {
    ['cox_db_complete', 'cox_db_synced_at', 'cox_db_sync_lock_at', 'cox_sync_attempts', 'cox_user', 'cox_pass', 'cox_version'].forEach(key => localStorage.removeItem(key));
    windowState.LOCAL_DB.length = 0;
    windowState.ID_MAP = new Map();
    windowState.FOUND_MFGS = new Set();
    windowState.FOUND_ENCS = new Set();
    searchBtn.disabled = false;
    searchBtn.innerText = 'SEARCH';
    searchBtn.onclick = null;
    searchBtn.classList = createClassList();
    authOverlay.classList = createClassList();
    locationState.reloadCalls = 0;
    uiState.pop = () => {};
    documentState.addEventListener = () => {};
    documentState.visibilityState = 'visible';
    Object.assign(dbState, {
        claimLock: async () => false,
        releaseLock: async () => {},
        deleteChunk: async () => {},
        deleteLegacy: async () => {},
        deleteDatabase: async () => {}
    });
    Object.assign(cacheState, {
        prepareKey: async () => {},
        loadAllWithProgress: async () => null,
        saveSnapshot: async () => {}
    });
    Object.assign(networkState, {
        fetch: async () => ({ status: 200, json: async () => ({ records: [] }) })
    });
    Object.assign(configState, {
        estTotal: 1,
        mainTable: 'test-table'
    });
    DataLoader.acquireSyncLock = originalMethods.acquireSyncLock;
    DataLoader.releaseSyncLock = originalMethods.releaseSyncLock;
    DataLoader.fetchPartition = originalMethods.fetchPartition;
    DataLoader.installLifecycleRefreshHooks = originalMethods.installLifecycleRefreshHooks;
    DataLoader.maybeRefreshStaleCache = originalMethods.maybeRefreshStaleCache;
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

async function flushAsync() {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
}

(async () => {
    console.log('🧪 Testing DataLoader stale-refresh orchestration');
    resetHarness();

    // shouldAbortEmptySync: preserves snapshot when cache already complete
    localStorage.setItem('cox_db_complete', 'true');
    assert(DataLoader.shouldAbortEmptySync({ fetchedCount: 0, hadExistingData: false }) === true, 'empty first page should abort when cache marked complete');

    // shouldAbortEmptySync: first-ever empty sync may proceed
    localStorage.removeItem('cox_db_complete');
    assert(DataLoader.shouldAbortEmptySync({ fetchedCount: 0, hadExistingData: false }) === false, 'empty first page can proceed for first-ever sync with no complete cache');

    // maybeRefreshStaleCache: stale/fresh checks and lock behavior
    let fetchCalls = 0;
    let popCalls = 0;
    let releaseCalls = 0;

    localStorage.setItem('cox_db_complete', 'true');
    localStorage.setItem('cox_db_synced_at', String(Date.now()));
    DataLoader.acquireSyncLock = async () => { throw new Error('should not lock on fresh cache'); };
    await DataLoader.maybeRefreshStaleCache({ reason: 'test-fresh-skip' });

    // stale + lock denied => skip
    localStorage.setItem('cox_db_synced_at', String(Date.now() - (2 * 60 * 60 * 1000)));
    DataLoader.acquireSyncLock = async () => false;
    DataLoader.fetchPartition = async () => { fetchCalls++; return { success: true }; };
    await DataLoader.maybeRefreshStaleCache({ reason: 'test-lock-denied' });
    assert(fetchCalls === 0, 'should skip background refresh when lock is denied');

    // stale + success => pop + release
    DataLoader.acquireSyncLock = async () => true;
    DataLoader.releaseSyncLock = async () => { releaseCalls++; };
    DataLoader.fetchPartition = async () => ({ success: true });
    uiState.pop = () => { popCalls++; };
    await DataLoader.maybeRefreshStaleCache({ reason: 'test-success' });
    assert(popCalls === 1, 'successful stale refresh should repopulate UI filters');
    assert(releaseCalls === 1, 'successful stale refresh should release lock');

    // stale + failure => no pop, still release
    DataLoader.fetchPartition = async () => ({ success: false });
    await DataLoader.maybeRefreshStaleCache({ reason: 'test-failure' });
    assert(popCalls === 1, 'failed stale refresh should not call UI.pop');
    assert(releaseCalls === 2, 'failed stale refresh should still release lock');

    resetHarness();
    console.log('🧪 Testing preload cached-startup recovery');
    localStorage.setItem('cox_user', 'user');
    localStorage.setItem('cox_pass', 'pass');
    localStorage.setItem('cox_version', APP_VERSION);
    localStorage.setItem('cox_db_complete', 'true');
    localStorage.setItem('cox_sync_attempts', '7');
    cacheState.loadAllWithProgress = async () => true;
    let preloadPopCalls = 0;
    let backgroundRefreshCalls = 0;
    uiState.pop = () => { preloadPopCalls++; };
    DataLoader.installLifecycleRefreshHooks = () => {};
    DataLoader.maybeRefreshStaleCache = async () => {
        backgroundRefreshCalls++;
        throw new Error('background refresh failure');
    };
    await DataLoader.preload();
    await flushAsync();
    assertEqual(preloadPopCalls, 1, 'cached startup should populate UI once');
    assertEqual(backgroundRefreshCalls, 1, 'cached startup should queue one non-blocking refresh attempt');
    assertEqual(searchBtn.innerText, 'SEARCH', 'cached startup should restore search button label');
    assert(searchBtn.disabled === false, 'cached startup should re-enable search button');
    assertEqual(localStorage.getItem('cox_sync_attempts'), '0', 'cached startup should clear stale blocking sync attempts');
    assert(!searchBtn.classList.contains('warning'), 'cached startup should not leave warning styling behind');

    resetHarness();
    console.log('🧪 Testing preload interrupt recovery path');
    localStorage.setItem('cox_user', 'user');
    localStorage.setItem('cox_pass', 'pass');
    localStorage.setItem('cox_version', APP_VERSION);
    localStorage.setItem('cox_sync_attempts', '6');
    cacheState.loadAllWithProgress = async () => null;
    let deleteLockCalls = 0;
    dbState.deleteChunk = async () => { deleteLockCalls++; };
    await DataLoader.preload();
    assertEqual(searchBtn.innerText, '⚠️ SYNC INTERRUPTED', 'stale blocking attempts with no cache should show recovery state');
    assert(searchBtn.disabled === false, 'recovery state should leave the search button clickable');
    assert(typeof searchBtn.onclick === 'function', 'recovery state should provide a click handler');
    await searchBtn.onclick();
    await flushAsync();
    assertEqual(localStorage.getItem('cox_sync_attempts'), '0', 'recovery click should clear stale blocking sync attempts');
    assertEqual(deleteLockCalls, 1, 'recovery click should clear the sync lock metadata');
    assertEqual(locationState.reloadCalls, 1, 'recovery click should reload the app');

    resetHarness();
    console.log('🧪 Testing preload handled blocking-sync failure');
    localStorage.setItem('cox_user', 'user');
    localStorage.setItem('cox_pass', 'pass');
    localStorage.setItem('cox_version', APP_VERSION);
    cacheState.loadAllWithProgress = async () => null;
    DataLoader.fetchPartition = async () => ({ success: false });
    await DataLoader.preload();
    assertEqual(searchBtn.innerText, '⚠️ SYNC INTERRUPTED', 'handled blocking sync failure should show interrupted state');
    assert(searchBtn.disabled === false, 'handled blocking sync failure should re-enable the button');
    assertEqual(localStorage.getItem('cox_sync_attempts'), '0', 'handled blocking sync failure should clear the blocking sync attempts');

    resetHarness();
    console.log('🧪 Testing preload handled auth/service/API-style failure recovery');
    localStorage.setItem('cox_user', 'user');
    localStorage.setItem('cox_pass', 'pass');
    localStorage.setItem('cox_version', APP_VERSION);
    cacheState.loadAllWithProgress = async () => null;
    DataLoader.fetchPartition = async (_dir, btn) => {
        btn.classList.add('error');
        btn.disabled = false;
        btn.innerText = 'INVALID CREDENTIALS';
        return { success: false, status: 401 };
    };
    await DataLoader.preload();
    assertEqual(searchBtn.innerText, 'INVALID CREDENTIALS', 'handled auth/service/API failure should preserve the blocking error UI');
    assert(searchBtn.classList.contains('error'), 'handled auth/service/API failure should preserve error styling');
    assertEqual(localStorage.getItem('cox_sync_attempts'), '0', 'handled auth/service/API failure should still clear blocking sync attempts');

    resetHarness();
    console.log('🧪 Testing background refresh guard failure');
    localStorage.setItem('cox_db_complete', 'true');
    localStorage.setItem('cox_db_synced_at', String(Date.now() - (2 * 60 * 60 * 1000)));
    DataLoader.acquireSyncLock = async () => { throw new Error('lock failure'); };
    const guardedRefreshResult = await DataLoader.maybeRefreshStaleCache({ reason: 'test-lock-failure' });
    assert(guardedRefreshResult && guardedRefreshResult.success === false, 'background refresh lock failure should be returned as a handled failure');

    resetHarness();
    console.log('🧪 Testing fetchPartition progress phases');
    configState.estTotal = 2;
    const syncProgressUpdates = [];
    const progressBtn = {
        disabled: false,
        onclick: null,
        classList: createClassList()
    };
    let progressLabel = 'SEARCH';
    Object.defineProperty(progressBtn, 'innerText', {
        get: () => progressLabel,
        set: value => {
            progressLabel = value;
            syncProgressUpdates.push(value);
        }
    });
    const pages = [
        { records: [{ id: '1', mfg: 'M1', enc: 'E1' }], offset: 'page-2' },
        { records: [{ id: '2', mfg: 'M2', enc: 'E2' }] }
    ];
    networkState.fetch = async () => ({
        status: 200,
        json: async () => pages.shift() || { records: [] }
    });
    cacheState.saveSnapshot = async (_records, { progressCallback } = {}) => {
        progressCallback?.({ phase: 'encrypting', pct: 50 });
        progressCallback?.({ phase: 'saving', pct: 0 });
        progressCallback?.({ phase: 'saving', pct: 100 });
        return { encryptMs: 5, writeMs: 3, totalMs: 8 };
    };
    DataLoader.acquireSyncLock = async () => true;
    DataLoader.releaseSyncLock = async () => {};
    const syncResult = await DataLoader.fetchPartition('desc', progressBtn, { background: false, reason: 'test-progress' });
    assert(syncResult && syncResult.success === true, 'fetchPartition should succeed for the mocked sync flow');
    assert(syncProgressUpdates.includes('⬇️ UPDATING 39%'), 'fetch progress should reserve headroom before finalization');
    assert(syncProgressUpdates.includes('⚙️ FINALIZING 82%'), 'finalizing phase should be reported after fetch completes');
    assert(syncProgressUpdates.includes('🔒 ENCRYPTING 88%'), 'encrypting phase should report reserved progress');
    assert(syncProgressUpdates.includes('💾 SAVING 93%'), 'saving phase should report start of persistence');
    assert(syncProgressUpdates.includes('💾 SAVING 98%'), 'saving phase should report completion without claiming 100%');
    assert(syncProgressUpdates.includes('✅ APPLYING 99%'), 'apply phase should remain below 100% until sync fully completes');
    assertEqual(localStorage.getItem('cox_db_complete'), 'true', 'successful sync should still mark cache complete');

    console.log('✅ DataLoader stale-refresh tests passed');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
