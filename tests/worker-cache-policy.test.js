const path = require('path');
const { pathToFileURL } = require('url');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

(async () => {
    console.log('🧪 Testing Worker cache policy helpers');

    const workerModule = await import(pathToFileURL(path.join(__dirname, '..', 'worker', 'worker.js')).href);
    const {
        buildAttachmentContentDisposition,
        buildMainCacheKey,
        classifyMainCacheEntry,
        getMainCacheMetadata,
        normalizePanelLookupId,
        sanitizeDownloadFilename
    } = workerModule;

    const cacheKey = buildMainCacheKey('https://worker.example/?target=MAIN&pageSize=50&sort[0][direction]=asc&offset=abc&ignored=1', {
        pageSize: 50,
        direction: 'asc',
        offset: 'abc'
    });
    assert(cacheKey === 'https://worker.example/?target=MAIN&pageSize=50&sortDirection=asc&offset=abc', `stable cache key mismatch: ${cacheKey}`);

    const now = Date.now();
    const freshHeaders = new Headers({
        'X-SCHEMATICA-CACHED-AT': String(now - 1000),
        'X-SCHEMATICA-FEEDBACK-VERSION': '7'
    });
    const freshMeta = getMainCacheMetadata(freshHeaders, now);
    const freshState = classifyMainCacheEntry(freshMeta, {
        now,
        currentFeedbackVersion: 7,
        freshTtlMs: 5_000,
        maxStaleTtlMs: 15_000
    });
    assert(freshState.status === 'HIT', `fresh cache should HIT, got ${freshState.status}`);

    const staleHeaders = new Headers({
        'X-SCHEMATICA-CACHED-AT': String(now - 8_000),
        'X-SCHEMATICA-FEEDBACK-VERSION': '7'
    });
    const staleMeta = getMainCacheMetadata(staleHeaders, now);
    const staleState = classifyMainCacheEntry(staleMeta, {
        now,
        currentFeedbackVersion: 7,
        freshTtlMs: 5_000,
        maxStaleTtlMs: 15_000
    });
    assert(staleState.status === 'STALE', `stale cache should STALE, got ${staleState.status}`);
    assert(staleState.canServeStaleOnError === true, 'stale cache should be eligible for serve-stale-on-error');

    const versionMismatchState = classifyMainCacheEntry(staleMeta, {
        now,
        currentFeedbackVersion: 8,
        freshTtlMs: 5_000,
        maxStaleTtlMs: 15_000
    });
    assert(versionMismatchState.status === 'STALE', `cross-isolate feedback version mismatch should STALE, got ${versionMismatchState.status}`);
    assert(versionMismatchState.canServeStaleOnError === true, 'cross-isolate feedback version mismatch should still allow bounded stale serving');

    const localInvalidationState = classifyMainCacheEntry(staleMeta, {
        now,
        currentFeedbackVersion: 8,
        feedbackInvalidationTime: now - 1_000,
        freshTtlMs: 5_000,
        maxStaleTtlMs: 15_000
    });
    assert(localInvalidationState.status === 'REFRESH', `same-isolate feedback invalidation should REFRESH, got ${localInvalidationState.status}`);
    assert(localInvalidationState.canServeStaleOnError === false, 'same-isolate feedback invalidation should not serve stale');

    assert(normalizePanelLookupId(' CP-1234.pdf ') === '1234', 'panel lookup normalization should strip prefix, extension, and spaces');
    const sanitizedFilename = sanitizeDownloadFilename('CP/12:34 ?');
    assert(sanitizedFilename.endsWith('.pdf'), 'download filename sanitization should preserve a .pdf suffix');
    assert(!/[\\/:*?"<>|]/.test(sanitizedFilename), 'download filename sanitization should remove reserved filename characters');

    const disposition = buildAttachmentContentDisposition('CP/12:34 ?');
    assert(disposition.startsWith('attachment;'), 'content disposition should force attachment');
    assert(disposition.includes(`filename="${sanitizedFilename}"`), 'content disposition should include sanitized ASCII filename');
    assert(disposition.includes(`filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`), 'content disposition should include UTF-8 filename* parameter');

    console.log('✅ Worker cache policy helper tests passed');
})();
