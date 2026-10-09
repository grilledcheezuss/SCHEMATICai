const assert = require('assert/strict');
const { GeneratorState, LayoutMatcher } = require('../generator-state.js');
const core = require('../PDFmapping/layouts_overlay_core.json');
const fingerprints = require('../PDFmapping/LAYOUT_FINGERPRINTS.json');
const metadata = require('../PDFmapping/layouts_overlay.meta.json');

(async () => {
    const state = new GeneratorState();
    const bytes = Uint8Array.from(Buffer.from('%PDF-1.7\nsynthetic source\n%%EOF'));
    await state.begin(bytes, 1);
    assert.equal(state.document.schema, 'schematicai-generator-document/1.0');
    assert.equal(state.document.catalog.schema, 'schematicai-layout-rules/1.0');
    assert.ok(state.document.catalog.revision);
    assert.ok(state.document.matcherRevision);
    assert.match(state.document.digest, /^[a-f0-9]{64}$/);
    bytes[0] = 0;
    assert.equal(state.sourceBytes[0], 37, 'committed bytes are owned copies');
    state.setPage(2, { width: 600, height: 800, box: [10, 20, 610, 820], rotation: 90, source: 'original' });
    assert.throws(() => state.setPage(4, { width: Infinity, height: 800, box: [0, 0, 600, 800], rotation: 0, source: 'original' }),
        /geometry/i);
    state.setIntent(2, 'CUSTOM:mine');
    assert.deepEqual(state.page(2).intent, { mode: 'manual', key: 'CUSTOM:mine' });
    const token = state.scanToken(2, 4);
    state.touch(2);
    assert.equal(state.isCurrent(token, 4), false, 'edit invalidates in-flight scan');
    const otherPageScan = state.scanToken(3, 4);
    state.touch(1);
    assert.equal(state.isCurrent(otherPageScan, 4), true, 'editing page 1 does not discard page 3 scan');
    assert.equal(state.page(1).editRevision, 1);
    state.setIntent(2, 'AUTO');
    assert.equal(state.page(2).intent.mode, 'auto');
    state.assign(2, { namespace: 'legacy', key: 'INFO', evidence: { method: 'fallback' } }, [{ map: 'cpid', x: .1, y: .2, w: .3, h: .04, text: '', fontSize: 12 }]);
    const id = state.page(2).zones[0].id;
    state.assign(2, { namespace: 'legacy', key: 'INFO' }, [{ map: 'cpid', x: .1, y: .2, w: .3, h: .04, text: '', fontSize: 12 }]);
    assert.equal(state.page(2).zones[0].id, id);
    state.editPage(2, [{ ...state.page(2).zones[0], x: .25, text: '', fontWeight: 'bold', decoration: 'underline' }]);
    state.assign(2, { namespace: 'legacy', key: 'GENERAL' }, []);
    assert.equal(state.effectiveZones(2)[0].x, .25, 'manual edits remain separate from automatic assignments');
    const serialized = JSON.parse(JSON.stringify(state.effectiveZones(2)));
    state.editPage(2, serialized);
    assert.equal(state.effectiveZones(2)[0].id, id, 'manual IDs survive serialization and edit application');
    const snapshot = state.snapshot({ replacement: null, context: { cpid: 'CP-1' } });
    const snapshotPage = snapshot.pages.find(page => page.outputPage === 2);
    assert.equal(Object.isFrozen(snapshotPage), true);
    assert.equal(snapshotPage.zones[0].text, '');
    assert.equal(state.snapshotCurrent({ ...snapshot, schema: 'unknown/2' }), false, 'unknown frozen export contract is rejected');
    state.snapshot();
    assert.equal(state.snapshotCurrent(snapshot), false, 'a newer export revision supersedes older concurrent completion');
    state.touch();
    assert.equal(state.snapshotCurrent(snapshot), false, 'stale preview rejected');
    const pending = state.begin(new Uint8Array([1]), 2);
    await state.begin(new Uint8Array([2]), 3);
    await pending;
    assert.equal(state.document.generation, 3);

    const matcher = new LayoutMatcher(core, fingerprints, metadata);
    assert.ok(matcher.entries.length > 40);
    assert.ok(matcher.entries.every(e => !e.key.includes('NOTB')));
    const entry = matcher.entries.find(e => e.key === 'SCHEMATIC_PORTRAIT_TB01A');
    const bbox = entry.bbox;
    const lines = { H: [], V: [] };
    for (const [axis, values] of Object.entries(entry.lines)) {
        for (const [p, a, b] of values) {
            lines[axis].push(axis === 'H'
                ? [bbox[1] + p * (bbox[3] - bbox[1]), bbox[0] + a * (bbox[2] - bbox[0]), bbox[0] + b * (bbox[2] - bbox[0])]
                : [bbox[0] + p * (bbox[2] - bbox[0]), bbox[1] + a * (bbox[3] - bbox[1]), bbox[1] + b * (bbox[3] - bbox[1])]);
        }
    }
    const match = matcher.match(lines, 'SCHEMATIC_PORTRAIT');
    assert.ok(match.score >= .7);
    assert.ok(match.templateHash);
    assert.ok(match.placement);
    assert.ok(match.runnerUp);
    assert.equal(match.titleBlockEdge, 'bottom', 'edge comes from catalog metadata when absent in fingerprints');
    assert.equal(match.affineApplied, false);
    assert.deepEqual(match.rules, core[match.key], 'exported zone order and maps stay authored; no rel_tb index join');
    assert.throws(() => new LayoutMatcher(core, { ...fingerprints, schema: 'unknown/2' }, metadata), /schema/i);
    assert.throws(() => new LayoutMatcher(core, fingerprints, { ...metadata, schema: 'unknown/2' }), /schema/i);
    const badKey = entry.key;
    assert.throws(() => new LayoutMatcher({ ...core, [badKey]: [{ ...core[badKey][0], map: 'unknown-field' }] },
        fingerprints, metadata), /zone|map/i);
    assert.throws(() => new LayoutMatcher({ ...core, [badKey]: [{ ...core[badKey][0], x: Infinity }] },
        fingerprints, metadata), /zone|geometry/i);
    assert.throws(() => new LayoutMatcher({ ...core, UNKNOWN_PROFILE: core[badKey] }, fingerprints, metadata), /profile/i);
    const crowded = { H: lines.H.slice(), V: lines.V.slice() };
    for (let i = 0; i < 150; i++) crowded.H.push([bbox[1] + (bbox[3] - bbox[1]) * (i + .2) / 151, bbox[0], bbox[2]]);
    assert.equal(matcher.match(crowded, 'SCHEMATIC_PORTRAIT').accepted, false,
        'F1 must reject a page with matching expected lines but huge relevant extraneous geometry');
    const moved = { H: lines.H.map(([p, a, b]) => [p + .02, a, b]), V: lines.V.map(([p, a, b]) => [p, a + .02, b + .02]) };
    const movedMatch = matcher.match(moved, 'SCHEMATIC_PORTRAIT');
    assert.equal(movedMatch.accepted, false, 'placement outside catalog tolerance cannot silently use catalog masks');
    const renamedCatalog = changes => {
        const exported = {}, by_profile_key = {}, profiles = {};
        for (const [key, fields] of Object.entries(changes)) {
            exported[key] = core[entry.key];
            by_profile_key[key] = { ...fingerprints.by_profile_key[entry.key], ...fields, profile_key: key };
            profiles[key] = { ...metadata.profiles[entry.key], ...fields };
        }
        return new LayoutMatcher(exported, { ...fingerprints, by_profile_key }, { ...metadata, profiles });
    };
    const duplicate = renamedCatalog({ A: {}, B: {} });
    const tie = duplicate.match(lines, 'SCHEMATIC_PORTRAIT');
    assert.equal(tie.key, 'A', 'deterministic tie order');
    assert.equal(tie.ambiguous, true);
    assert.equal(tie.accepted, false, 'ambiguous result requires fallback');
    duplicate.entries[1].bbox[0] += .002;
    duplicate.entries[1].bbox[2] += .002;
    const placementTie = duplicate.match(lines, 'SCHEMATIC_PORTRAIT');
    assert.equal(placementTie.runnerUp.score, placementTie.score);
    assert.equal(placementTie.ambiguous, true, 'effectively tied template cannot win via placement-error exemption');
    const mixed = renamedCatalog({
        Drawing: { class: 'SHEET', base_profile: 'SCHEMATIC_PORTRAIT' },
        Info: { class: 'INFO', base_profile: 'INFO' }
    });
    assert.equal(mixed.match(lines, 'INFO').key, 'Info', 'page class discriminates before geometry ambiguity');
    assert.equal(mixed.match(lines, 'INFO').ambiguous, false);
    assert.equal(mixed.match(lines, 'SCHEMATIC_PORTRAIT').key, 'Drawing');
    assert.equal(matcher.match({ H: [], V: [] }, 'INFO').accepted, false);
    const originalFetch = global.fetch;
    const catalogUrls = [];
    global.fetch = async url => {
        catalogUrls.push(String(url));
        const body = String(url).includes('core.json') ? core
            : String(url).includes('FINGERPRINTS.json') ? fingerprints : metadata;
        return { ok: true, json: async () => body };
    };
    await new GeneratorState().loadCatalog();
    global.fetch = originalFetch;
    assert.equal(catalogUrls.length, 3);
    assert.ok(catalogUrls.every(url => url.endsWith('?v=v2.5.114-core1')), 'catalog fetches pin deliberate revision');

    // Synthetic PDF.js operator list: transforms, crop origin, rotation, rectangles and unsupported curves.
    const OPS = { save: 1, restore: 2, transform: 3, constructPath: 4, moveTo: 5, lineTo: 6, rectangle: 7,
        curveTo: 8, closePath: 9, stroke: 10, fill: 11 };
    const viewport = { width: 200, height: 100, transform: [0, 1, 1, 0, -20, -10] };
    const measured = LayoutMatcher.measure({ fnArray: [1, 3, 4, 10, 2],
        argsArray: [[], [1, 0, 0, 1, 10, 20], [[7], [0, 0, 100, 200]], [], []] }, OPS, viewport);
    assert.equal(measured.H.length, 2);
    assert.equal(measured.V.length, 2);
    assert.ok(measured.H.every(l => l.every(Number.isFinite)));
    const curves = LayoutMatcher.measure({ fnArray: [4, 10], argsArray: [[[5, 8], [0, 0, 1, 2, 3, 4, 5, 6]], []] }, OPS, viewport);
    assert.equal(curves.H.length + curves.V.length, 0, 'curves are never inferred as fingerprint lines');
    for (const rotation of [0, 90, 180, 270]) {
        const geometry = LayoutMatcher.exportGeometry([40, 60, 640, 860], rotation);
        assert.equal(geometry.width, rotation % 180 ? 800 : 600);
        assert.equal(geometry.height, rotation % 180 ? 600 : 800);
        const m = geometry.matrix;
        const corners = [[0, 0], [geometry.width, 0], [0, geometry.height], [geometry.width, geometry.height]]
            .map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
        assert.equal(Math.min(...corners.map(p => p[0])), 40);
        assert.equal(Math.max(...corners.map(p => p[0])), 640);
        assert.equal(Math.min(...corners.map(p => p[1])), 60);
        assert.equal(Math.max(...corners.map(p => p[1])), 860);
    }
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(global, 'crypto');
    const digestFailure = new GeneratorState();
    try {
        Object.defineProperty(global, 'crypto', { configurable: true, value: undefined });
        await assert.rejects(digestFailure.begin(new Uint8Array([1]), 10), /SHA-256|crypto|digest/i);
        assert.equal(digestFailure.ready, false);
        assert.equal(digestFailure.document.digest, null);
        assert.ok(digestFailure.digestError);
        Object.defineProperty(global, 'crypto', { configurable: true,
            value: { subtle: { digest: async () => { throw new Error('synthetic digest rejection'); } } } });
        await assert.rejects(digestFailure.begin(new Uint8Array([2]), 11), /synthetic digest rejection/);
        assert.equal(digestFailure.ready, false);
        assert.match(digestFailure.digestError, /synthetic/);
    } finally {
        Object.defineProperty(global, 'crypto', cryptoDescriptor);
    }
    await digestFailure.begin(new Uint8Array([3]), 12);
    assert.match(digestFailure.document.digest, /^[a-f0-9]{64}$/);
    assert.equal(digestFailure.digestError, null, 'a successful later load clears digest failure');
    let rejectOldDigest;
    try {
        Object.defineProperty(global, 'crypto', { configurable: true,
            value: { subtle: { digest: () => new Promise((_, reject) => { rejectOldDigest = reject; }) } } });
        const oldBegin = digestFailure.begin(new Uint8Array([4]), 13);
        Object.defineProperty(global, 'crypto', cryptoDescriptor);
        await digestFailure.begin(new Uint8Array([5]), 14);
        rejectOldDigest(new Error('stale digest rejection'));
        await assert.rejects(oldBegin, /stale digest rejection/);
        assert.equal(digestFailure.document.generation, 14);
        assert.equal(digestFailure.digestError, null, 'old digest error cannot poison a newer document');
    } finally {
        Object.defineProperty(global, 'crypto', cryptoDescriptor);
    }
    console.log('Canonical generator state and measured matcher tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
