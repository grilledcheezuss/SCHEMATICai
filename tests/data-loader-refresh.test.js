const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

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

const localStorage = createLocalStorage();
const uiState = { pop: () => {} };
const DataLoaderClassCode = extractClass('DataLoader', appJsContent);
const DataLoader = new Function(
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
    60 * 60 * 1000,
    { claimLock: async () => false, releaseLock: async () => {}, deleteChunk: async () => {} },
    localStorage,
    { LOCAL_DB: [] },
    { addEventListener: () => {}, visibilityState: 'visible' },
    uiState,
    {},
    {},
    {},
    {},
    {}
);

(async () => {
    console.log('🧪 Testing DataLoader stale-refresh orchestration');

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

    console.log('✅ DataLoader stale-refresh tests passed');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
