const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../generator-state');
const zone = { x: .1, y: .2, w: .3, h: .1, map: 'cpid' };
const viewport = { width: 200, height: 300, transform: [1, 0, 0, -1, -10, 320] };
const geometry = G.geometry(viewport, [10, 20, 210, 320], 0);
let assertions = 0;
const test = (name, fn) => { fn(); assertions++; console.log('✓ ' + name); };
const rejects = (fn, message) => assert.throws(fn, message);
async function loaded(count = 2) {
    const state = new G.State();
    state.register({ 'BUILTIN:COVER_TEMPLATE': [zone], 'BUILTIN:GENERAL': [zone], 'CUSTOM:legacy': [zone], 'MEASURED:test': [zone] }, 'revision-1');
    await state.load(Uint8Array.from([1, 2, 3]), count, crypto.webcrypto.subtle);
    for (let page = 1; page <= count; page++) state.setPage(page, 'BUILTIN:GENERAL', 'auto', undefined, geometry, page === 1 ? 'replacement' : 'source');
    state.renderCommitted = true;
    return state;
}
(async () => {
    test('normalize default fontSize, type, and semantic defaults', () => {
        assert.equal(G.zones([zone])[0].fontSize, 14);
        assert.equal(G.zones([{ ...zone, type: 'blocker' }])[0].type, 'blocker');
        assert(G.equalZones([zone], [{ ...zone, fontSize: 14, fontWeight: 'bold', transparent: false, rotation: 0, type: null }]));
        assert(!G.equalZones([zone], [{ ...zone, type: 'blocker' }]));
        assert.equal(G.zones([{ ...zone, text: '' }])[0].text, '');
        assert.match(G.zones([{ ...zone, map: 'cust' }], 1)[0].fontFamily, /Times/);
    });
    test('reject nonfinite and out of bounds geometry/style', () => {
        for (const key of ['x', 'y', 'w', 'h']) for (const value of [NaN, Infinity, -Infinity, '0.1', undefined]) rejects(() => G.zones([{ ...zone, [key]: value }]), /geometry/);
        for (const invalid of [{ x: -.1 }, { y: -1 }, { w: 0 }, { h: -1 }, { x: .8, w: .3 }, { y: .95, h: .1 }]) rejects(() => G.zones([{ ...zone, ...invalid }]), /CropBox/);
        for (const invalid of [{ fontSize: NaN }, { rotation: Infinity }, { fontSize: 0 }, { transparent: 'false' }, { text: 42 }, { map: 'arbitrary' }, { type: 42 }, { decoration: {} }, { fontWeight: true }]) rejects(() => G.zones([{ ...zone, ...invalid }]));
    });
    test('preserve legacy profile arrays without touching source', () => {
        const raw = { MyProfile: [{ ...zone, type: 'blocker' }], Empty: [] };
        const before = JSON.stringify(raw), migrated = G.migrateProfiles(raw);
        assert.equal(JSON.stringify(raw), before);
        assert.equal(migrated.MyProfile[0].fontSize, 14);
        assert.equal(migrated.MyProfile[0].type, 'blocker');
        assert.deepEqual(migrated.Empty, []);
        assert.deepEqual(G.migrateProfiles({ schema: 'schematicai-profiles/1', profiles: raw }), migrated);
        rejects(() => G.migrateProfiles(JSON.parse('{"__proto__":[]}')), /name/);
        rejects(() => G.migrateProfiles({ Bad: [{ ...zone, w: Infinity }] }));
        assert.equal(G.id('GENERAL'), 'BUILTIN:GENERAL');
        assert.equal(G.id('CUSTOM:GENERAL'), 'CUSTOM:GENERAL');
        assert.equal(G.id('MEASURED:GENERAL'), 'MEASURED:GENERAL');
        assert.equal(G.id('CUSTOM:\nLegacy'), 'CUSTOM:\nLegacy');
    });
    test('bounded profile/JSON imports reject oversize data before persistence', () => {
        assert.equal(G.LIMITS.MAX_JSON_BYTES, 4 * 1024 * 1024);
        rejects(() => G.parseJson(' '.repeat(G.LIMITS.MAX_JSON_BYTES + 1)), /4 MiB/);
        rejects(() => G.parseJson(JSON.stringify('é'.repeat(G.LIMITS.MAX_JSON_BYTES / 2))), /4 MiB/);
        rejects(() => G.zones(Array(G.LIMITS.MAX_ZONES_PER_PAGE + 1).fill(zone)), /Zone count/);
        rejects(() => G.zones([{ ...zone, text: 'x'.repeat(G.LIMITS.MAX_TEXT_CHARS + 1) }]), /text exceeds/);
        rejects(() => G.migrateProfiles({ ['x'.repeat(G.LIMITS.MAX_PROFILE_NAME_CHARS + 1)]: [] }), /profile name/);
        rejects(() => G.migrateProfiles(Object.fromEntries(Array.from({ length: G.LIMITS.MAX_PROFILES + 1 }, (_, i) => ['p' + i, []]))), /Profile count/);
        const expanded = Object.fromEntries(Array.from({length:20},(_,i) => ['p'+i,Array(1000).fill(zone)]));
        assert(Buffer.byteLength(JSON.stringify(expanded)) < G.LIMITS.MAX_JSON_BYTES);
        rejects(() => G.migrateProfiles(expanded), /4 MiB/);
        try { G.parseJson('{"SENSITIVE_CLIENT":'); assert.fail('Expected malformed JSON rejection'); }
        catch (error) { assert.equal(error.message, 'Invalid JSON document'); assert(!error.message.includes('SENSITIVE_CLIENT')); }
    });
    test('compact semantic profile revision is SHA-256 and independent of ID insertion order', () => {
        for (const text of ['', 'abc', 'a'.repeat(1000), 'é😀']) assert.equal(G.sha256(text), crypto.createHash('sha256').update(text).digest('hex'));
        const registry = { 'CUSTOM:b': [zone], 'BUILTIN:a': [{ ...zone, type: 'blocker' }] };
        const reordered = { 'BUILTIN:a': registry['BUILTIN:a'], 'CUSTOM:b': registry['CUSTOM:b'] };
        assert.equal(G.profileRevision(registry, 'asset'), G.profileRevision(reordered, 'asset'));
        assert.match(G.profileRevision(registry, 'asset'), /^profiles-sha256:[a-f0-9]{64}$/);
        assert.notEqual(G.profileRevision(registry, 'asset'), G.profileRevision(registry, 'new-asset'));
        assert.notEqual(G.profileRevision(registry, 'asset'), G.profileRevision({ ...registry, 'CUSTOM:b': [{ ...zone, type: 'blocker' }] }, 'asset'));
        assert.equal(G.profileRevision({ 'CUSTOM:a': [zone] }, 'asset'), G.profileRevision({ 'CUSTOM:a': [{ ...zone, fontSize: 14 }] }, 'asset'));
    });
    for (const [rotation, transform, width, height] of [
        [0, [1, 0, 0, -1, -10, 320], 200, 300],
        [90, [0, 1, 1, 0, -20, -10], 300, 200],
        [180, [-1, 0, 0, 1, 210, -20], 200, 300],
        [270, [0, -1, -1, 0, 320, 210], 300, 200]
    ]) test('inverse displayed CropBox geometry rotation ' + rotation, () => {
        const g = G.geometry({ width, height, transform }, [10, 20, 210, 320], rotation);
        const rect = G.toPdfRect(g, { x: 0, y: 0, w: 1, h: 1 });
        assert.deepEqual(rect, { x: 10, y: 20, width: 200, height: 300 });
        const point = G.toPdfPoint(g, .25, .4);
        assert(Math.abs((transform[0]*point.x+transform[2]*point.y+transform[4])/width-.25) < 1e-12);
        assert(Math.abs((transform[1]*point.x+transform[3]*point.y+transform[5])/height-.4) < 1e-12);
        const partial = G.toPdfRect(g, zone);
        assert.equal(Math.round(partial.width), rotation % 180 ? 20 : 60);
        assert.equal(Math.round(partial.height), rotation % 180 ? 90 : 30);
    });
    test('geometry rejects malformed CropBoxes, rotations, and singular/nonfinite transforms', () => {
        for (const crop of [[10,20,10,320], [210,20,10,320], [10,320,210,20], [0,0,Infinity,20], [0,0,10]]) rejects(() => G.geometry(viewport, crop, 0), /CropBox/);
        for (const rotation of [NaN, Infinity, 45, 89, '90', undefined]) rejects(() => G.geometry(viewport, [10,20,210,320], rotation), /rotation/);
        for (const transform of [[0,0,0,0,0,0], [1,2,2,4,0,0], [1,0,0,-1,NaN,0]]) rejects(() => G.geometry({ ...viewport, transform }, [10,20,210,320], 0), /viewport|transform/);
        assert.equal(G.geometry(viewport, [10,20,210,320], -90).rotation, 270);
    });
    const state = await loaded();
    test('SHA-256 hashes owned content bytes and exact count', () => {
        assert.equal(state.digest, crypto.createHash('sha256').update(Buffer.from([1,2,3])).digest('hex'));
        assert.equal(state.sourcePageCount, 2);
        const snapshot = state.snapshot({ cpid: 'CP123' }, new Uint8Array([8,9]));
        assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.pages) && Object.isFrozen(snapshot.pages[0].zones[0]));
        assert(Object.isFrozen(snapshot.pages[0].geometry.transform) && Object.isFrozen(snapshot.context));
        snapshot.sourceBytes[0] = 99; snapshot.pages[1].zones[0].x = .5;
        assert.equal(state.sourceBytes[0], 1); assert.equal(state.pages[2].zones[0].x, .1);
    });
    test('forced page1 cover and manual > exact > conservative auto', () => {
        assert.equal(state.pages[1].profileId, 'BUILTIN:COVER_TEMPLATE');
        state.setPage(2, 'MEASURED:test', 'exact');
        assert.equal(state.setPage(2, 'BUILTIN:GENERAL', 'auto'), false);
        state.setPage(2, 'CUSTOM:legacy', 'manual');
        assert.equal(state.setPage(2, 'MEASURED:test', 'exact'), false);
        assert.equal(state.pages[2].profileId, 'CUSTOM:legacy');
    });
    const importedState = await loaded();
    const mapping = importedState.exportMapping();
    test('atomic import rejects every boundary mismatch without partial mutation', () => {
        const original = JSON.stringify(importedState.pages);
        const mutations = [
            d => { d.schema = 'legacy'; }, d => { delete d.sourceDigest; }, d => { d.sourceDigest = 'bad'; },
            d => { d.sourcePageCount++; }, d => { d.profileRevision = 'old'; },
            d => { d.coordinateSpace = 'raw-pdf'; }, d => { d.pages.pop(); },
            d => { d.pages[1].page = 1; }, d => { d.pages[1].page = 3; },
            d => { delete d.pages[1].provenance; }, d => { d.pages[1].provenance = 'guessed'; },
            d => { d.pages[1].profileRevision = 'old'; }, d => { d.pages[1].coordinateSpace = 'raw-pdf'; },
            d => { d.pages[1].profileId = 'GENERAL'; }, d => { d.pages[1].profileId = 'MEASURED:missing'; },
            d => { d.pages[1].contentSource = 'replacement'; }, d => { d.pages[1].zones[0].x = Infinity; },
            d => { d.pages[1].zones[0].y = -.2; }, d => { d.pages[0].profileId = 'BUILTIN:GENERAL'; }
        ];
        for (const mutate of mutations) {
            const data = JSON.parse(JSON.stringify(mapping)); mutate(data);
            rejects(() => importedState.importMapping(data));
            assert.equal(JSON.stringify(importedState.pages), original);
        }
        const tooMany = { ...mapping, pages: Array(G.LIMITS.MAX_MAPPING_PAGES + 1).fill({}) };
        rejects(() => importedState.importMapping(tooMany), /page count/);
        assert.equal(JSON.stringify(importedState.pages), original);
    });
    test('valid exact mapping import, manual overrides survive imports', () => {
        const data = JSON.parse(JSON.stringify(mapping)); data.pages[1].profileId = 'MEASURED:test'; data.pages[1].zones[0].text = 'Mapped';
        importedState.importMapping(JSON.stringify(data));
        assert.equal(importedState.pages[2].provenance, 'exact');
        assert.equal(importedState.pages[2].zones[0].text, 'Mapped');
        importedState.setPage(2, 'CUSTOM:legacy', 'manual', [{ ...zone, text: 'Manual', type: 'blocker' }]);
        importedState.importMapping(data);
        assert.equal(importedState.pages[2].zones[0].text, 'Manual');
        assert.equal(importedState.pages[2].zones[0].type, 'blocker');
    });
    test('snapshots require complete resolved pages and committed geometry', () => {
        const saved = importedState.pages[2]; delete importedState.pages[2];
        rejects(() => importedState.snapshot({}, null), /Resolve every/);
        rejects(() => importedState.exportMapping(), /Resolve every/);
        importedState.unresolved(2, 'Ambiguous', geometry);
        rejects(() => importedState.snapshot({}, null), /Resolve every/);
        rejects(() => importedState.exportMapping(), /Resolve every/);
        importedState.pages[2] = saved; importedState.renderCommitted = false;
        rejects(() => importedState.snapshot({}, null), /committed/); importedState.renderCommitted = true;
        const token = importedState.token(); importedState.touch(); assert(!importedState.current(token));
    });
    test('snapshot/export reject stale page profile revision and missing profile reference', () => {
        const page = importedState.pages[2], priorRevision = page.profileRevision, priorProfile = page.profileId;
        page.profileRevision = 'old';
        rejects(() => importedState.snapshot({}, null), /Resolve every/);
        rejects(() => importedState.exportMapping(), /Resolve every/);
        page.profileRevision = priorRevision; page.profileId = 'CUSTOM:missing';
        rejects(() => importedState.snapshot({}, null), /Resolve every/);
        rejects(() => importedState.exportMapping(), /Resolve every/);
        page.profileId = priorProfile;
        const priorGeometry = page.geometry;
        page.geometry = { ...geometry, cropBox: [10,20,10,20] };
        rejects(() => importedState.snapshot({}, null), /CropBox/);
        page.geometry = priorGeometry;
    });
    test('mixed page geometries remain independent in snapshots', () => {
        const g = G.geometry({ width: 500, height: 700, transform: [1,0,0,-1,0,700] }, [0,0,500,700], 0);
        importedState.setPage(2, 'CUSTOM:legacy', 'manual', undefined, g);
        assert.equal(importedState.snapshot({}, null).pages[0].geometry.width, 200);
        assert.equal(importedState.snapshot({}, null).pages[1].geometry.width, 500);
    });
    test('changed/deleted registry profiles invalidate exact selections, manual edits survive unrelated additions', () => {
        importedState.register({ ...importedState.profiles, 'CUSTOM:new': [zone] }, 'revision-2');
        assert.equal(importedState.pages[2].status, 'resolved');
        assert.equal(importedState.pages[2].profileRevision, 'revision-2');
        importedState.setPage(1, 'BUILTIN:COVER_TEMPLATE', 'auto');
        importedState.register({ ...importedState.profiles, 'BUILTIN:COVER_TEMPLATE': [{ ...zone, x: .2 }] }, 'revision-3');
        assert.equal(importedState.pages[1].status, 'unresolved');
        rejects(() => importedState.snapshot({}, null), /Resolve every/);
        const next = { ...importedState.profiles }; delete next['CUSTOM:legacy'];
        importedState.register(next, 'revision-4'); assert.equal(importedState.pages[2].status, 'unresolved');
    });
    let finishOld, failOld;
    const racing = new G.State();
    const callerBytes = new Uint8Array([4,5,6]);
    const old = racing.load(callerBytes, 2, { digest: (_, bytes) => {
        assert.deepEqual(Array.from(bytes), [4,5,6]); return new Promise((resolve, reject) => { finishOld = resolve; failOld = reject; });
    } });
    callerBytes.fill(99);
    await racing.load(new Uint8Array([7]), 1, crypto.webcrypto.subtle);
    failOld(new Error('stale digest error')); await old;
    test('stale digest failure cannot disable newer document', () => {
        assert.equal(racing.error, null); assert.equal(racing.sourcePageCount, 1);
        assert.equal(racing.digest, crypto.createHash('sha256').update(Buffer.from([7])).digest('hex'));
    });
    const late = racing.load(new Uint8Array([8]), 2, { digest: () => new Promise(resolve => { finishOld = resolve; }) });
    await racing.load(new Uint8Array([9]), 1, crypto.webcrypto.subtle); finishOld(new Uint8Array(32).buffer); await late;
    test('stale digest success cannot replace newer source identity', () => assert.equal(racing.digest, crypto.createHash('sha256').update(Buffer.from([9])).digest('hex')));
    await racing.load(new Uint8Array([10]), 1, null);
    test('digest failure disables only state generation', () => {
        assert.match(racing.error, /SHA-256/); assert.equal(racing.sourceBytes[0], 10);
        rejects(() => racing.snapshot({}, null), /SHA-256/);
        rejects(() => racing.importMapping(mapping), /digest unavailable/);
    });
    const profiles = require('../PDFmapping/layouts_overlay.json');
    const fingerprints = require('../PDFmapping/LAYOUT_FINGERPRINTS.json').by_profile_key;
    const metadata = require('../PDFmapping/layouts_overlay.meta.json').profiles;
    test('all 186 real measured assets validate', () => {
        assert.equal(Object.keys(profiles).length, 186);
        for (const [key, input] of Object.entries(profiles)) {
            assert(metadata[key]); assert(fingerprints[key]); G.zones(input);
        }
    });
    const key = Object.keys(fingerprints).find(k => metadata[k].title_block_edge === 'bottom' && metadata[k].class === 'SHEET' && !metadata[k].low_confidence);
    const entry = fingerprints[key], bbox = entry.fingerprint.title_block_bbox, rel = entry.fingerprint.template_lines_rel;
    const evidence = { edge: 'bottom', class: 'SHEET',
        H: rel.H.map(l => [bbox[1]+l[0]*(bbox[3]-bbox[1]), bbox[0]+l[1]*(bbox[2]-bbox[0]), bbox[0]+l[2]*(bbox[2]-bbox[0])]),
        V: rel.V.map(l => [bbox[0]+l[0]*(bbox[2]-bbox[0]), bbox[1]+l[1]*(bbox[3]-bbox[1]), bbox[1]+l[2]*(bbox[3]-bbox[1])]) };
    const onlyProfiles = { [key]: profiles[key] }, onlyFp = { [key]: entry }, onlyMeta = { [key]: metadata[key] };
    test('ported measured score is symmetric with distinct line matching', () => {
        assert.equal(G.rscore(rel, rel), 1); assert.equal(G.rscore({H:[],V:[]}, rel), 0);
        assert(G.rscore({ H: [rel.H[0],rel.H[0]], V: [] }, { H:[rel.H[0]], V:[] }) < 1);
    });
    test('real measured exact geometric evidence resolves only eligible unique layout', () => {
        const result = G.matchMeasured(evidence, onlyProfiles, onlyFp, onlyMeta);
        assert.equal(result.status, 'resolved'); assert.equal(result.profileId, 'MEASURED:' + key);
        assert.equal(result.placement, 'exact'); assert(result.confidence >= .7);
        assert.equal(G.matchMeasured({ ...evidence, edge: 'left' }, onlyProfiles, onlyFp, onlyMeta).status, 'unresolved');
        assert.equal(G.matchMeasured(evidence, onlyProfiles, onlyFp, { [key]: { ...metadata[key], low_confidence: true } }).status, 'unresolved');
        assert.equal(G.matchMeasured({H:[],V:[],edge:'bottom',class:'SHEET'}, onlyProfiles, onlyFp, onlyMeta).status, 'unresolved');
        const shifted = { ...evidence, H:evidence.H.map(l=>[l[0]+.02,l[1],l[2]]), V:evidence.V.map(l=>[l[0],l[1]+.02,l[2]+.02]) };
        assert.equal(G.matchMeasured(shifted, onlyProfiles, onlyFp, onlyMeta).status, 'unresolved');
    });
    test('competing geometries visibly unresolved, never affine placement', () => {
        const result = G.matchMeasured(evidence, { ...onlyProfiles, twin: profiles[key] }, { ...onlyFp, twin: entry }, { ...onlyMeta, twin: metadata[key] });
        assert.equal(result.status, 'unresolved'); assert.match(result.reason, /Ambiguous/);
    });
    test('actual built-in semantics all validate, including missing fontSize and type', () => {
        const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
        const start = source.indexOf('const LAYOUT_RULES'), end = source.indexOf('\n};', start) + 3;
        const rules = vm.runInNewContext(source.slice(start, end) + '; LAYOUT_RULES');
        for (const [key, input] of Object.entries(rules)) G.zones(input, key === 'COVER_TEMPLATE' ? 1 : 0);
        assert(source.includes("zone.type || null"));
    });
    const appSource = fs.readFileSync(require.resolve('../app.js'), 'utf8');
    const generatorStart = appSource.indexOf('class Generator {');
    const generatorEnd = appSource.indexOf('window.Generator = Generator;', generatorStart);
    test('actual dropdown exposes all 14 builtins and imports arbitrary names as literal DOM text/value', () => {
        const name = '"><img src=x onerror="window.__profileInjection=1">';
        const collection = G.migrateProfiles({ [name]: [zone] });
        const element = tag => ({
            tag, children: [], value: '', disabled: false,
            appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
            get options() { return this.children.flatMap(child => child.tag === 'option' ? [child] : child.children); },
            set innerHTML(_) { throw new Error('Untrusted markup interpolation'); }
        });
        const select = element('select'); select.value = 'BUILTIN:TITLE_ASBUILT';
        const start = appSource.indexOf('const LAYOUT_RULES'), end = appSource.indexOf('\n};', start)+3;
        const rules = vm.runInNewContext(appSource.slice(start,end)+'; LAYOUT_RULES');
        const layoutStart = appSource.indexOf('class LayoutScanner {'), layoutEnd = appSource.indexOf('class FeedbackService {',layoutStart);
        const scanner = vm.runInNewContext(appSource.slice(layoutStart,layoutEnd)+'; LayoutScanner', {
            document: { querySelectorAll: () => [select], createElement: element },
            ProfileManager: { getCustomProfiles: () => collection }, LAYOUT_RULES: rules,
            PageContext: { getProfileDisplayName: key => key }, console: { log() {}, warn() {} }
        });
        scanner.refreshProfileOptions();
        assert.equal(select.options.filter(option => option.value.startsWith('BUILTIN:')).length, 14);
        const imported = select.options.find(option => option.value === 'CUSTOM:'+name);
        assert.equal(imported.textContent, '⭐ '+name); assert.equal(imported.tag, 'option');
        assert.equal(select.value, 'BUILTIN:TITLE_ASBUILT');
    });
    async function runtime(saveHook = async () => new Uint8Array([37,80,68,70])) {
        const drawCalls = [], copied = [], loads = [], context = { cpid: 'CP-TEST', job: 'Project', type: 'System' };
        const output = {
            pages: [], copyPages: async (_, indexes) => { copied.push(indexes.slice()); return indexes.map(() => ({ drawRectangle: opts => drawCalls.push(['rect', opts]), drawText: (text, opts) => drawCalls.push(['text', text, opts]), drawLine: opts => drawCalls.push(['line', opts]) })); },
            addPage(page) { this.pages.push(page); }, getPage(i) { return this.pages[i]; },
            embedFont: async () => ({ widthOfTextAtSize: (text, size) => text.length * size / 2 }),
            save: () => saveHook()
        };
        const sandbox = {
            GeneratorState: G, PdfExporter: { previewPdfBytes: null, releasePreviewButtons() {} }, PdfViewer: { doc: {}, _documentLoadToken: 1 },
            window: { TEMPLATE_BYTES: null },
            DemoManager: { isGeneratorActive: true, getContext: () => context },
            document: { getElementById: () => null }, URL: { revokeObjectURL: () => {} },
            JOB_BLOCK_MAX_CHARS_PER_LINE: 30,
            PDFLib: { PDFDocument: { load: async bytes => { loads.push(Array.from(bytes)); return { getPageCount: () => 2 }; }, create: async () => output }, StandardFonts: { Courier: 'Courier', TimesRoman: 'Times' }, rgb: (r,g,b) => ({r,g,b}), degrees: n => n }
        };
        const RuntimeGenerator = vm.runInNewContext(appSource.slice(generatorStart, generatorEnd) + '; Generator', sandbox);
        RuntimeGenerator.state = await loaded();
        RuntimeGenerator.ready = async () => {};
        const actualCapture = RuntimeGenerator.capture;
        RuntimeGenerator.capture = () => {};
        RuntimeGenerator.templateBytes = new Uint8Array([37,80,68,70]);
        return { generator: RuntimeGenerator, context, drawCalls, copied, loads, viewer: sandbox.PdfViewer, globals: sandbox, actualCapture };
    }
    const generated = await runtime();
    const fractional = await runtime(), boxes = [], layer = { children:[], appendChild(box) { this.children.push(box); boxes.push(box); } };
    const content = { style:{ width:'367.2px',height:'475.2px' }, offsetWidth:367,offsetHeight:475,
        querySelector: () => layer,querySelectorAll: () => boxes };
    layer.parentElement = content;
    const baseGeometry = G.geometry({width:612,height:792,transform:[1,0,0,-1,0,792]},[0,0,612,792],0);
    const precisionZone = {...zone,x:.5,y:.3,w:.2,h:.1,type:'blocker'};
    const wrapper = { dataset:{pageNumber:'2',generatorGeneration:String(fractional.generator.state.generation)},_generatorGeometry:baseGeometry,
        querySelector: () => content,querySelectorAll: () => boxes };
    const redactionStart = appSource.indexOf('class RedactionManager {'),redactionEnd = appSource.indexOf('class PageClassifier {',redactionStart);
    const redactions = vm.runInNewContext(appSource.slice(redactionStart,redactionEnd)+'; RedactionManager',{
        document:{body:{classList:{contains: () => false}},createElement: () => ({style:{},dataset:{},children:[],appendChild(child){this.children.push(child);},closest: () => layer})},
        requestAnimationFrame: callback => callback(),console:{log(){},warn(){},error(){}},PdfViewer:{currentScale:.6}
    });
    fractional.globals.RedactionManager = redactions;
    fractional.generator.state.setPage(2,'BUILTIN:GENERAL','auto',[precisionZone],baseGeometry);
    const layoutStart = appSource.indexOf('class LayoutScanner {'),layoutEnd = appSource.indexOf('class FeedbackService {',layoutStart);
    const layout = vm.runInNewContext(appSource.slice(layoutStart,layoutEnd)+'; LayoutScanner',{RedactionManager:redactions,PdfViewer:{currentScale:.6}});
    layout.applyRuleToWrapper(wrapper,[precisionZone]);
    fractional.generator.wrapper = page => page === 2 ? wrapper : null;
    fractional.generator.sourceDoc = fractional.viewer.doc;
    fractional.generator.capture = fractional.actualCapture;
    test('fractional CSS paint/create/rescale/capture preserves exact normalized geometry and automatic provenance', () => {
        for (const scale of [.6,.7,1.25,1.1,.6]) {
            content.style.width = 612*scale+'px'; content.style.height = 792*scale+'px';
            redactions.rescaleZones(wrapper); fractional.generator.capture();
            const page = fractional.generator.state.pages[2];
            for (const key of ['x','y','w','h']) assert(Math.abs(page.zones[0][key]-precisionZone[key]) < 1e-6,key);
            assert.equal(page.provenance,'auto'); assert(Math.abs(page.zones[0].fontSize-14) < 1e-6);
        }
        redactions.activeBox = boxes[0]; redactions.endDrag();
        assert(Math.abs(Number(boxes[0].dataset.relX)-.5) < 1e-12);
    });
    const labeled = { H: [], V: [], textContent: { items: [
        { str:'PANEL ID',width:20,transform:[10,0,0,10,20,60] },
        { str:'CP-123',width:40,transform:[10,0,0,10,60,60] },
        { str:'DATE',width:20,transform:[10,0,0,10,20,35] },
        { str:'2026-07-08',width:50,transform:[10,0,0,10,60,35] }
    ] } };
    test('conservative text fallback requires two unambiguous adjacent labelled values and inverse viewport placement', () => {
        const detected = generated.generator.confirmedTextZones(labeled,geometry);
        assert.equal(detected.length, 2); assert.equal(detected[0].map, 'cpid'); assert.equal(detected[1].map, 'date');
        assert.equal(detected[0].x, .25); assert.equal(detected[0].y, 250/300);
        assert.equal(generated.generator.confirmedTextZones({ ...labeled, textContent:{ items:labeled.textContent.items.slice(0,2) } },geometry), null);
        assert.equal(generated.generator.confirmedTextZones({ ...labeled, textContent:{ items:[...labeled.textContent.items, {str:'CP-456',width:40,transform:[10,0,0,10,65,60]}] } },geometry), null);
        const rotated = G.geometry({width:300,height:200,transform:[0,1,1,0,-20,-10]},[10,20,210,320],90);
        assert.equal(generated.generator.confirmedTextZones(labeled,rotated), null);
    });
    const generatedBytes = await generated.generator.generatePdf();
    test('actual runtime exporter copies exact count and draws canonical masking/text via inverse geometry', () => {
        assert.equal(generatedBytes[0], 37);
        assert.equal(generated.copied.length, 2);
        assert.equal(generated.copied[1][0], 1);
        const rect = generated.drawCalls.find(c => c[0] === 'rect')[1];
        assert.equal(rect.x, 30); assert.equal(rect.y, 230); assert.equal(Math.round(rect.width), 60);
        assert(generated.drawCalls.some(c => c[0] === 'text' && c[1] === 'CP-TEST'));
        assert(generated.generator.state.current(generated.generator.generatedToken));
        generated.globals.PdfExporter.previewPdfBytes = generatedBytes;
        assert(generated.generator.hasCurrentPreview());
        generated.generator.state.touch();
        assert(!generated.generator.hasCurrentPreview());
        rejects(() => generated.generator.assertGeneratedCurrent(), /superseded/);
    });
    const sourceFallback = await runtime();
    sourceFallback.generator.state.setPage(1, 'BUILTIN:COVER_TEMPLATE', 'manual', undefined, geometry, 'source');
    sourceFallback.generator.templateBytes = new Uint8Array([0,0,0]);
    await sourceFallback.generator.generatePdf();
    test('committed source-page fallback never loads invalid replacement bytes during export', () => {
        assert.equal(sourceFallback.loads.length, 1);
        assert.deepEqual(sourceFallback.loads[0], [1,2,3]);
        assert.equal(sourceFallback.generator.state.pages[1].contentSource, 'source');
    });
    const rotatedText = await runtime();
    rotatedText.generator.state.setPage(2, 'BUILTIN:GENERAL', 'manual', [{ ...zone,map:'custom',text:'AB',fontSize:10,rotation:90,textAlign:'center',fontWeight:'normal' }],geometry);
    await rotatedText.generator.generatePdf();
    test('rotated generated text baseline rotates around displayed zone center like CSS', () => {
        const call = rotatedText.drawCalls.find(c => c[0] === 'text' && c[1] === 'AB');
        assert.equal(Math.round(call[2].x), 57); assert.equal(Math.round(call[2].y), 250);
        assert.equal(call[2].rotate, -90);
        assert(appSource.includes("textSpan.style.transformOrigin = '50% 50%'"));
        assert(appSource.includes("generator-profiles-import"));
        assert(appSource.includes("console.warn('Invalid custom profiles ignored.');"));
    });
    for (const [name, mutate] of [
        ['edits', r => r.generator.state.touch()],
        ['document generation', r => r.generator.state.generation++],
        ['pending document-load token', r => r.viewer._documentLoadToken++],
        ['context', r => { r.context.cpid = 'Changed'; }],
        ['template revision', r => r.generator.templateRevision++],
        ['profile revision', r => { r.generator.state.profileRevision = 'changed'; }],
        ['uncommitted render', r => { r.generator.state.renderCommitted = false; }],
        ['explicit preview invalidation', r => r.generator.invalidate()]
    ]) {
        let completeSave, reachedSave;
        const atSave = new Promise(resolve => { reachedSave = resolve; });
        const raced = await runtime(() => { reachedSave(); return new Promise(resolve => { completeSave = resolve; }); });
        const exporting = raced.generator.generatePdf();
        await atSave; mutate(raced); completeSave(new Uint8Array([1,2]));
        await assert.rejects(exporting, /superseded/);
        test('actual runtime async export rejects superseding ' + name, () => assert.equal(raced.generator.generatedToken, null));
    }
    let firstSave, signalFirst, saves = 0;
    const waitingFirst = new Promise(resolve => { signalFirst = resolve; });
    const concurrent = await runtime(() => {
        if (++saves === 1) { signalFirst(); return new Promise(resolve => { firstSave = resolve; }); }
        return Promise.resolve(new Uint8Array([2]));
    });
    const firstExport = concurrent.generator.generatePdf();
    await waitingFirst;
    const secondExport = await concurrent.generator.generatePdf();
    firstSave(new Uint8Array([1])); await assert.rejects(firstExport, /superseded/);
    test('newer async export wins without older publication', () => assert.equal(secondExport[0], 2));
    test('preview invalidation cancels native iframe loading and clears published bytes', () => {
        let removed = 0;
        const frame = { src: 'blob:old-preview', remove: () => { removed++; } };
        generated.generator.previewFrame = frame;
        generated.generator.previewUrl = 'blob:old-preview';
        generated.generator.invalidate();
        assert.equal(frame.src, 'about:blank'); assert.equal(removed, 1);
        assert.equal(generated.generator.previewFrame, null); assert.equal(generated.generator.previewUrl, '');
    });
    for (const [name, mutate] of [
        ['manual edits', r => r.generator.state.setPage(2, 'CUSTOM:legacy', 'manual', [{ ...zone, text: 'Keep manual' }])],
        ['document replacement', r => { r.generator.sourceDoc = {}; r.generator.state.generation++; }],
        ['new scan', r => r.generator.scanSequence++],
        ['new render', r => { r.viewer.currentRenderToken = 9; }]
    ]) {
        const raced = await runtime(); delete raced.generator.state.pages[2];
        raced.generator.sourceDoc = { getPage: async () => ({}) };
        raced.generator.wrapper = () => ({ _generatorGeometry: geometry, dataset: { contentSource: 'source' } });
        raced.generator.paint = () => {};
        let finishEvidence, evidenceStarted;
        const atEvidence = new Promise(resolve => { evidenceStarted = resolve; });
        raced.generator.evidence = () => { evidenceStarted(); return new Promise(resolve => { finishEvidence = resolve; }); };
        const scanning = raced.generator.scan(2);
        await atEvidence; mutate(raced); finishEvidence({ H: [], V: [] }); await scanning;
        test('actual runtime async scan rejects superseding ' + name, () => {
            if (name === 'manual edits') assert.equal(raced.generator.state.pages[2].zones[0].text, 'Keep manual');
            else assert.equal(raced.generator.state.pages[2], undefined);
        });
    }
    function previewFixture() {
        const buttons = [{innerText:'Preview one',disabled:false},{innerText:'Preview two',disabled:false}];
        const modal = {style:{display:'none'}}, container = {children:[],appendChild(node){this.children.push(node);},innerHTML:''};
        const gate = [], fakeGenerator = {capture(){},assertGeneratedCurrent(){},releasePreview(){container.children=[];}};
        const exporterStart = appSource.indexOf('class PdfExporter {'),exporterEnd = appSource.indexOf('// PDF Validation Utility',exporterStart);
        const exporter = vm.runInNewContext(appSource.slice(exporterStart,exporterEnd)+'; PdfExporter',{
            Generator:fakeGenerator,PdfViewer:{doc:{}},DemoManager:{minimizePanel(){},restorePanel(){}},
            window:{},document:{getElementById:id=>id==='pdf-preview-modal'?modal:container,querySelector:()=>buttons[0],querySelectorAll:()=>buttons,
                createElement:()=>({style:{},src:''})},Blob,URL:{createObjectURL:()=> 'blob:test-preview'},console:{error(){}},alert(){}
        });
        exporter.generateRedactedPdf = () => new Promise(resolve => gate.push(resolve));
        return {exporter,buttons,modal,gate};
    }
    for (const order of [[0,1],[1,0]]) {
        const fixture = previewFixture();
        const pending = [fixture.exporter.preview(),fixture.exporter.preview()];
        assert(fixture.buttons.every(button=>button.disabled));
        for (const index of order) { fixture.gate[index](new Uint8Array([index+1])); await pending[index]; }
        test('overlapping preview UI restores original shared buttons, finish order '+order.join('/'),()=>{
            assert(fixture.buttons.every(button=>!button.disabled));
            assert.equal(fixture.buttons[0].innerText,'Preview one'); assert.equal(fixture.buttons[1].innerText,'Preview two');
            assert.equal(fixture.exporter.previewPdfBytes[0],2);
        });
    }
    const canceled = previewFixture(), pendingPreview = canceled.exporter.preview();
    canceled.exporter.closePreview();
    assert(canceled.buttons.every(button=>!button.disabled));
    canceled.gate[0](new Uint8Array([9])); await pendingPreview;
    test('closing a pending preview cancels publication and restores buttons immediately',()=>{
        assert.equal(canceled.modal.style.display,'none'); assert.equal(canceled.exporter.previewPdfBytes,null);
        assert(canceled.buttons.every(button=>!button.disabled));
    });
    test('actual print iframe callback refuses stale generated target before focus/print',()=>{
        const start = appSource.indexOf('    static _printViaIframe(printTarget) {'),end = appSource.indexOf('\n    static print()',start);
        let prints=0,reason='',current=true;
        const frame={style:{},setAttribute(){},contentWindow:{focus(){},print(){prints++;},addEventListener(){}}};
        const body={appendChild(node){node.parentNode=body;}};
        const print = vm.runInNewContext(appSource.slice(start,end).replace('static _printViaIframe','function _printViaIframe')+'; _printViaIframe',{
            document:{createElement:()=>frame,body},setTimeout:()=>1,clearTimeout(){},console:{error(){}}
        });
        const owner={_createPrintSession(){const session={cleaned:false};this._activePrintSession=session;return session;},
            _releasePrintSession(value){reason=value;this._activePrintSession.cleaned=true;},PRINT_IFRAME_LOAD_TIMEOUT_MS:1,PRINT_CLEANUP_TIMEOUT_MS:1};
        print.call(owner,{url:'blob:generated',isCurrent:()=>current});current=false;frame.onload();
        assert.equal(prints,0);assert.equal(reason,'stale-print-target');
    });
    console.log(`Generator state: ${assertions} focused tests passed`);
})().catch(e => { console.error(e); process.exitCode = 1; });
