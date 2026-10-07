// Actual encrypted IndexedDB generations: commit, quota rollback and previous-generation recovery.
const assert = require('assert/strict');
const { HeadlessBrowser } = require('./helpers/headless-browser');

(async () => {
    const browser = await HeadlessBrowser.launch();
    if (!browser) {
        console.warn('SKIP snapshot browser tests: Chrome/Node WebSocket unavailable');
        if (process.env.REQUIRE_BROWSER === '1') process.exitCode = 1;
        return;
    }
    try {
        await browser.open(1280, 800);
        const results = await browser.evaluate(async () => {
            const checks = [];
            const check = (ok, label) => checks.push({ ok: !!ok, label });
            await CacheService.prepareKey('snapshot-test-password');
            const first = [{ id: 'old', desc: 'OLD SIMPLEX PANEL' }];
            await CacheService.saveSnapshot(first, { releaseVersion: 'v2.5.100' });
            const oldGeneration = await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY);
            await CacheService.loadAllWithProgress();
            check(window.LOCAL_DB[0].id === 'old' && CacheService.loadedReleaseVersion === 'v2.5.100', 'old complete encrypted snapshot loads with own release');
            const originalPut = DB.putChunks;
            DB.putChunks = async () => { const error = new Error('test quota'); error.name = 'QuotaExceededError'; throw error; };
            let failed = false;
            try { await CacheService.saveSnapshot([{ id: 'new' }], { releaseVersion: APP_VERSION }); } catch (_) { failed = true; }
            DB.putChunks = originalPut;
            check(failed && await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY) === oldGeneration, 'failed persist never switches active generation');
            check(window.LOCAL_DB[0].id === 'old', 'failed persist leaves live old records intact');
            const originalEnc = CacheService.enc;
            CacheService.enc = async () => { throw new Error('test encryption interruption'); };
            try { await CacheService.saveSnapshot([{ id: 'new' }], { releaseVersion: APP_VERSION }); } catch (_) {}
            CacheService.enc = originalEnc;
            check(await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY) === oldGeneration, 'interrupted encryption leaves old generation active');
            await CacheService.saveSnapshot([{ id: 'new', desc: 'NEW SIMPLEX PANEL' }], { releaseVersion: APP_VERSION });
            const newGeneration = await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY);
            const manifest = await DB.getChunk(`${newGeneration}:manifest`);
            check(manifest.releaseVersion === APP_VERSION && newGeneration !== oldGeneration, 'release metadata commits with new generation');
            check(await DB.getChunk(CacheService.PREVIOUS_GENERATION_KEY) === oldGeneration, 'previous generation retained');
            await CacheService.loadAllWithProgress();
            check(window.LOCAL_DB[0].id === 'new' && CacheService.loadedReleaseVersion === APP_VERSION, 'successful complete generation replaces records');
            await DB.deleteChunk(`${newGeneration}:shard:0`);
            await CacheService.loadAllWithProgress();
            check(window.LOCAL_DB[0].id === 'old' && CacheService.loadedReleaseVersion === 'v2.5.100',
                'corrupt new generation recovers old data and old release freshness');
            check(await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY) === oldGeneration, 'fallback restored atomically as active');
            await DB.putChunk(`${oldGeneration}:manifest`, { shardCount: 1, createdAt: Date.now() });
            await CacheService.loadAllWithProgress();
            check(window.LOCAL_DB[0].id === 'old' && CacheService.loadedReleaseVersion === null,
                'legacy manifest loads without schema change and remains release-pending');
            await DB.deleteDatabase();
            return checks;
        });
        results.forEach(({ ok, label }) => assert(ok, label));
        console.log(`✅ ${results.length} encrypted generation/recovery browser checks passed`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
