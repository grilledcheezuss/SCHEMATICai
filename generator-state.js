// In-memory assignments only. Legacy layout arrays and saved profile wire formats stay unchanged.
(function (root) {
    'use strict';
    const CATALOG_SCHEMA = 'schematicai-layout-rules/1.0';
    const FINGERPRINT_SCHEMA = 'schematicai-layout-fingerprints/1.0';
    const CATALOG_REVISION = 'v2.5.114-core1';
    const MATCHER_REVISION = 'pdfjs-supported-lines-f1/1.0';
    const MAPS = new Set(['custom', 'cust', 'job', 'job_block', 'type', 'cpid', 'date', 'stage',
        'po', 'serial', 'company', 'address', 'phone', 'fax', 'logo']);
    const ZONE_FIELDS = new Set(['map', 'x', 'y', 'w', 'h', 'text', 'fontSize', 'fontFamily',
        'fontWeight', 'decoration', 'type', 'rotation', 'textAlign', 'transparent', 'id', 'resolvedText']);
    const validZones = zones => Array.isArray(zones) && zones.length <= 1000 && zones.every(zone =>
        zone && typeof zone === 'object' && Object.keys(zone).every(key => ZONE_FIELDS.has(key)) &&
        MAPS.has(zone.map) && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(zone[key])) &&
        zone.x >= 0 && zone.y >= 0 && zone.w > 0 && zone.h > 0 &&
        zone.x + zone.w <= 1.0001 && zone.y + zone.h <= 1.0001 &&
        (zone.fontSize === undefined || (Number.isFinite(zone.fontSize) && zone.fontSize > 0 && zone.fontSize <= 500)) &&
        (zone.text == null || (typeof zone.text === 'string' && zone.text.length <= 20000)) &&
        (zone.resolvedText === undefined || (typeof zone.resolvedText === 'string' && zone.resolvedText.length <= 20000)) &&
        (zone.id === undefined || (typeof zone.id === 'string' && zone.id.length > 0 && zone.id.length <= 512)) &&
        (zone.rotation === undefined || (Number.isFinite(zone.rotation) && Math.abs(zone.rotation) <= 360)) &&
        (zone.transparent === undefined || typeof zone.transparent === 'boolean') &&
        (zone.textAlign === undefined || ['left', 'center', 'right'].includes(zone.textAlign)) &&
        (zone.decoration == null || zone.decoration === 'underline') &&
        (zone.type == null || zone.type === 'blocker') &&
        (zone.fontFamily === undefined || (typeof zone.fontFamily === 'string' && zone.fontFamily.length <= 256)) &&
        (zone.fontWeight === undefined || /^(normal|bold|[1-9]00)$/.test(String(zone.fontWeight))));
    const copy = value => JSON.parse(JSON.stringify(value));
    const freeze = value => {
        if (value && typeof value === 'object') {
            Object.values(value).forEach(freeze);
            Object.freeze(value);
        }
        return value;
    };
    const point = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const multiply = (a, b) => [
        a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
    ];

    class LayoutMatcher {
        static textBounds(item, viewport) {
            const m = multiply(viewport.transform, item.transform);
            const baseline = point(m, 0, 0);
            const length = Math.hypot(m[0], m[1]) || 1;
            const width = item.width * (viewport.scale || 1);
            const height = Math.hypot(m[2], m[3]) || item.height;
            const end = [baseline[0] + m[0] / length * width, baseline[1] + m[1] / length * width];
            const up = [m[2], m[3]];
            const corners = [baseline, end, [baseline[0] + up[0], baseline[1] + up[1]], [end[0] + up[0], end[1] + up[1]]];
            return { x: Math.min(...corners.map(p => p[0])), y: Math.min(...corners.map(p => p[1])),
                width: Math.max(...corners.map(p => p[0])) - Math.min(...corners.map(p => p[0])),
                height: Math.max(...corners.map(p => p[1])) - Math.min(...corners.map(p => p[1])),
                fontSize: height };
        }

        static exportGeometry(box, rotation) {
            const [x, y, right, top] = box, w = right - x, h = top - y;
            const r = ((rotation % 360) + 360) % 360;
            const matrices = { 0: [1, 0, 0, 1, x, y], 90: [0, 1, -1, 0, right, y],
                180: [-1, 0, 0, -1, right, top], 270: [0, -1, 1, 0, x, top] };
            if (!matrices[r]) throw new Error('Unsupported page rotation');
            return { width: r % 180 ? h : w, height: r % 180 ? w : h, matrix: matrices[r] };
        }

        constructor(core, catalog, metadata = {}) {
            if (catalog?.schema !== FINGERPRINT_SCHEMA || metadata?.schema !== CATALOG_SCHEMA)
                throw new Error('Unsupported layout catalog schema');
            if (!core || Array.isArray(core) || !catalog.by_profile_key || !metadata.profiles)
                throw new Error('Invalid layout profile catalog');
            const tolerances = catalog.match_tolerances;
            if (!tolerances || !['line_h', 'line_v'].every(axis =>
                Array.isArray(tolerances[axis]) && tolerances[axis].length === 2 &&
                tolerances[axis].every(n => Number.isFinite(n) && n > 0 && n < .25)) ||
                !Number.isFinite(tolerances.accept_score) || tolerances.accept_score <= 0 || tolerances.accept_score > 1 ||
                !Number.isFinite(tolerances.tb_bbox) || tolerances.tb_bbox <= 0 || tolerances.tb_bbox > .1)
                throw new Error('Invalid layout geometry tolerances');
            this.entries = Object.keys(core).sort().flatMap(key => {
                const entry = catalog.by_profile_key?.[key], fp = entry?.fingerprint;
                const meta = metadata.profiles[key];
                if (!/^[A-Za-z0-9_:-]+$/.test(key) || !entry || !meta || entry.profile_key !== key ||
                    !['SHEET', 'INFO', 'COVER'].includes(entry.class) || entry.class !== meta.class ||
                    !['portrait', 'landscape'].includes(entry.orientation) || entry.orientation !== meta.orientation ||
                    entry.base_profile !== meta.base_profile ||
                    !['SCHEMATIC_PORTRAIT', 'SCHEMATIC_LANDSCAPE', 'SCHEMATIC_PORTRAIT_BORDERLESS',
                        'SCHEMATIC_LANDSCAPE_BORDERLESS', 'INFO', 'INFO_BORDERLESS', 'COVER_TEMPLATE',
                        'THIRD_PARTY_COVER', 'COX_COVER'].includes(entry.base_profile))
                    throw new Error(`Unknown or inconsistent layout profile: ${key}`);
                if (!validZones(core[key])) throw new Error(`Invalid normalized layout zones/map: ${key}`);
                // Covers and NOTB have no supported line fingerprint. Never pretend to measure them.
                if (key.includes('NOTB') || !fp?.template_lines_rel || !fp.title_block_bbox) return [];
                const bbox = fp.title_block_bbox, lines = fp.template_lines_rel;
                if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(n => Number.isFinite(n) && n >= 0 && n <= 1) ||
                    bbox[2] <= bbox[0] || bbox[3] <= bbox[1] ||
                    !['H', 'V'].every(axis => Array.isArray(lines[axis]) && lines[axis].length <= 1000 &&
                        lines[axis].every(line => Array.isArray(line) && line.length === 3 &&
                            line.every(n => Number.isFinite(n) && n >= -.25 && n <= 1.25) && line[2] > line[1])) ||
                    !/^[a-f0-9]{8}$/i.test(entry.template_hash || fp.template_hash || '') ||
                    !['bottom', 'top', 'left', 'right'].includes(entry.title_block_edge || meta.title_block_edge))
                    throw new Error(`Invalid measured layout geometry: ${key}`);
                return [{ key, rules: copy(core[key]), lines: copy(fp.template_lines_rel),
                    bbox: copy(fp.title_block_bbox), templateHash: entry.template_hash || fp.template_hash,
                    base: entry.base_profile, class: entry.class || meta.class,
                    orientation: entry.orientation || meta.orientation,
                    titleBlockEdge: entry.title_block_edge || meta.title_block_edge || null,
                    review: !!entry.low_confidence }];
            });
            this.tolerances = copy(catalog.match_tolerances);
        }

        static measure(operators, OPS, viewport) {
            const result = { H: [], V: [], rectangles: [] };
            let matrix = [1, 0, 0, 1, 0, 0], stack = [], segments = [], rectangles = [], unsupported = false;
            let cursor = null, start = null;
            const transformed = (x, y) => point(multiply(viewport.transform, matrix), x, y);
            const segment = (a, b) => {
                if (!a || !b) return;
                const p = [a[0] / viewport.width, a[1] / viewport.height];
                const q = [b[0] / viewport.width, b[1] / viewport.height];
                if (Math.abs(p[1] - q[1]) < .0005 && Math.abs(p[0] - q[0]) > .002)
                    result.H.push([(p[1] + q[1]) / 2, Math.min(p[0], q[0]), Math.max(p[0], q[0])]);
                else if (Math.abs(p[0] - q[0]) < .0005 && Math.abs(p[1] - q[1]) > .002)
                    result.V.push([(p[0] + q[0]) / 2, Math.min(p[1], q[1]), Math.max(p[1], q[1])]);
            };
            const flush = paint => {
                if (paint && !unsupported) {
                    segments.forEach(([a, b]) => segment(a, b));
                    result.rectangles.push(...rectangles);
                }
                segments = []; rectangles = []; unsupported = false; cursor = start = null;
            };
            for (let i = 0; i < operators.fnArray.length; i++) {
                const op = operators.fnArray[i], args = operators.argsArray[i] || [];
                if (op === OPS.save) stack.push(matrix.slice());
                else if (op === OPS.restore) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
                else if (op === OPS.transform) matrix = multiply(matrix, args);
                else if (op === OPS.paintFormXObjectBegin) {
                    stack.push(matrix.slice());
                    if (args[0]) matrix = multiply(matrix, args[0]);
                } else if (op === OPS.paintFormXObjectEnd) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
                else if (op === OPS.constructPath) {
                    let j = 0;
                    for (const pathOp of args[0]) {
                        if (pathOp === OPS.moveTo) { cursor = transformed(args[1][j++], args[1][j++]); start = cursor; }
                        else if (pathOp === OPS.lineTo) {
                            const next = transformed(args[1][j++], args[1][j++]);
                            segments.push([cursor, next]); cursor = next;
                        } else if (pathOp === OPS.rectangle) {
                            const [x, y, w, h] = args[1].slice(j, j + 4); j += 4;
                            const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => transformed(a, b));
                            corners.forEach((a, n) => segments.push([a, corners[(n + 1) % 4]]));
                            rectangles.push([Math.min(...corners.map(p => p[0])) / viewport.width,
                                Math.min(...corners.map(p => p[1])) / viewport.height,
                                Math.max(...corners.map(p => p[0])) / viewport.width,
                                Math.max(...corners.map(p => p[1])) / viewport.height]);
                            cursor = start = corners[0];
                        } else if (pathOp === OPS.closePath) { segments.push([cursor, start]); cursor = start; }
                        else {
                            unsupported = true;
                            j += pathOp === OPS.curveTo ? 6 : 4;
                        }
                    }
                } else if ([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke,
                    OPS.closeFillStroke, OPS.closeEOFillStroke].filter(Number.isFinite).includes(op)) flush(true);
                else if ([OPS.endPath, OPS.fill, OPS.eoFill].filter(Number.isFinite).includes(op)) flush(false);
            }
            return result;
        }

        match(measured, base, orientation = base?.includes('LANDSCAPE') ? 'landscape' : base?.includes('PORTRAIT') ? 'portrait' : null) {
            const fit = samples => {
                const meanX = samples.reduce((sum, p) => sum + p[0], 0) / samples.length;
                const meanY = samples.reduce((sum, p) => sum + p[1], 0) / samples.length;
                const variance = samples.reduce((sum, p) => sum + (p[0] - meanX) ** 2, 0);
                if (!variance) return null;
                const size = samples.reduce((sum, p) => sum + (p[0] - meanX) * (p[1] - meanY), 0) / variance;
                return size > 0 ? [meanY - size * meanX, size] : null;
            };
            const expectedClass = base?.startsWith('INFO') ? 'INFO' : base?.startsWith('SCHEMATIC') ? 'SHEET' : null;
            const candidates = this.entries.filter(e => (!expectedClass || e.class === expectedClass) &&
                (!orientation || e.orientation === orientation) &&
                (!base || e.base === base || e.base?.replace('_BORDERLESS', '') === base.replace('_BORDERLESS', '')));
            const ranked = candidates.map(entry => {
                const reference = entry.bbox;
                const placements = [reference, ...(measured.rectangles || []).filter(b =>
                    b[2] - b[0] > .2 && b[3] - b[1] > .03 &&
                    Math.abs((b[2] - b[0]) - (reference[2] - reference[0])) < .02 &&
                    Math.abs((b[3] - b[1]) - (reference[3] - reference[1])) < .02)];
                let best = { score: 0, placement: null, placementError: Infinity };
                for (const bbox of placements) {
                    let hits = 0, total = 0;
                    const samples = { x: [], y: [] };
                    const relevant = {
                        H: (measured.H || []).filter(l => l.every(Number.isFinite) && l[0] >= bbox[1] - .01 &&
                            l[0] <= bbox[3] + .01 && l[2] >= bbox[0] && l[1] <= bbox[2]),
                        V: (measured.V || []).filter(l => l.every(Number.isFinite) && l[0] >= bbox[0] - .01 &&
                            l[0] <= bbox[2] + .01 && l[2] >= bbox[1] && l[1] <= bbox[3])
                    };
                    for (const axis of ['H', 'V']) {
                        const seen = new Set();
                        relevant[axis] = relevant[axis].filter(line => {
                            const key = line.map(n => Math.round(n * 100000)).join(',');
                            if (seen.has(key)) return false;
                            seen.add(key); return true;
                        });
                    }
                    for (const axis of ['H', 'V']) {
                        const used = new Set();
                        const tolerance = this.tolerances[axis === 'H' ? 'line_h' : 'line_v'] || [.02, .04];
                        for (const expected of entry.lines[axis] || []) {
                            total++;
                            const available = relevant[axis].map((line, index) => {
                                const rel = axis === 'H'
                                    ? [(line[0] - bbox[1]) / (bbox[3] - bbox[1]), (line[1] - bbox[0]) / (bbox[2] - bbox[0]), (line[2] - bbox[0]) / (bbox[2] - bbox[0])]
                                    : [(line[0] - bbox[0]) / (bbox[2] - bbox[0]), (line[1] - bbox[1]) / (bbox[3] - bbox[1]), (line[2] - bbox[1]) / (bbox[3] - bbox[1])];
                                return { index, error: Math.abs(rel[0] - expected[0]) + Math.abs(rel[1] - expected[1]) + Math.abs(rel[2] - expected[2]),
                                    valid: Math.abs(rel[0] - expected[0]) <= tolerance[0] &&
                                        Math.abs(rel[1] - expected[1]) <= tolerance[1] && Math.abs(rel[2] - expected[2]) <= tolerance[1] };
                            }).filter(m => m.valid && !used.has(m.index)).sort((a, b) => a.error - b.error || a.index - b.index);
                            if (available.length) {
                                hits++; used.add(available[0].index);
                                const actual = relevant[axis][available[0].index];
                                if (axis === 'H') {
                                    samples.x.push([expected[1], actual[1]], [expected[2], actual[2]]);
                                    samples.y.push([expected[0], actual[0]]);
                                } else {
                                    samples.x.push([expected[0], actual[0]]);
                                    samples.y.push([expected[1], actual[1]], [expected[2], actual[2]]);
                                }
                            }
                        }
                    }
                    const x = fit(samples.x), y = fit(samples.y);
                    const placement = x && y ? [x[0], y[0], x[0] + x[1], y[0] + y[1]] : null;
                    const observed = relevant.H.length + relevant.V.length;
                    const score = total >= 4 && hits >= 4 && placement ? 2 * hits / (total + observed) : 0;
                    const placementError = placement ? Math.max(...placement.map((v, i) => Math.abs(v - reference[i]))) : Infinity;
                    if (score > best.score || (score === best.score && placementError < best.placementError))
                        best = { score, placement, placementError, matchedLines: hits, expectedLines: total,
                            observedLines: observed, precision: observed ? hits / observed : 0, recall: total ? hits / total : 0 };
                }
                // rel_tb_zones is not ordered like the exported zones and includes border entries.
                // Keep the authored absolute zones; never index-join or affine-remap those arrays.
                return { ...best, key: entry.key, templateHash: entry.templateHash, rules: entry.rules,
                    titleBlockEdge: entry.titleBlockEdge, affineApplied: false, review: entry.review };
            }).sort((a, b) => b.score - a.score || a.placementError - b.placementError ||
                (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
            const winner = ranked[0] || { score: 0, key: null }, second = ranked[1];
            const ambiguous = !!second && winner.score >= .7 && winner.score - second.score < .03;
            return { ...winner, runnerUp: second ? { key: second.key, score: second.score, templateHash: second.templateHash } : null,
                ambiguous, review: ambiguous || winner.review || winner.score < .7,
                accepted: winner.score >= (this.tolerances.accept_score || .7) && !ambiguous &&
                    winner.placementError <= (this.tolerances.tb_bbox || .008) };
        }
    }

    class GeneratorState {
        static CATALOG_REVISION = CATALOG_REVISION;
        static MATCHER_REVISION = MATCHER_REVISION;
        static validateZones(zones) { return validZones(zones); }

        static async digest(bytes) {
            if (!root.crypto?.subtle) throw new Error('SHA-256 unavailable; generator export requires a secure browser context.');
            const hash = await root.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, '0')).join('');
        }

        constructor() {
            this.document = null;
            this.sourceBytes = null;
            this.pages = new Map();
            this.generation = 0;
            this.revision = 0;
            this.editRevision = 0;
            this.exportRevision = 0;
            this.scanGeneration = 0;
            this.pendingScans = 0;
            this.rendering = false;
            this.ready = false;
            this.documentReady = false;
            this.expectedPageCount = 0;
            this.zoneCounter = 0;
            this.catalogPromise = null;
            this.digestError = null;
        }

        async begin(bytes, generation) {
            const own = new Uint8Array(bytes instanceof ArrayBuffer ? bytes.slice(0) : bytes);
            this.generation = generation;
            this.ready = false;
            this.documentReady = false;
            this.expectedPageCount = 0;
            this.zoneCounter = 0;
            this.digestError = null;
            this.pages.clear();
            this.sourceBytes = own;
            this.document = { schema: 'schematicai-generator-document/1.0', schemaVersion: 1,
                generation, digest: null, revision: ++this.revision, matcherRevision: MATCHER_REVISION,
                catalog: { schema: CATALOG_SCHEMA, fingerprintSchema: FINGERPRINT_SCHEMA,
                    revision: CATALOG_REVISION, source: 'PDFmapping/core' } };
            this.editRevision = 0; this.pendingScans = 0; this.scanGeneration++;
            let digest;
            try { digest = await GeneratorState.digest(own); }
            catch (error) {
                if (this.generation === generation) this.digestError = error.message || 'SHA-256 digest failed';
                throw error;
            }
            if (this.generation !== generation) return false;
            this.document.digest = digest;
            return true;
        }

        invalidate() { this.ready = false; this.documentReady = false; this.scanGeneration++; this.touch(); }
        touch(number = null) {
            this.editRevision++; this.revision++;
            if (number !== null) this.page(number).editRevision++;
            if (this.document) this.document.revision = this.revision;
            if (this.onChange) this.onChange();
        }
        page(number) {
            if (!Number.isInteger(number) || number < 1) throw new Error('Invalid output page number');
            if (!this.pages.has(number)) this.pages.set(number, { outputPage: number, sourcePage: number,
                source: 'original', role: number === 1 ? 'cover' : 'drawing', intent: { mode: 'auto', key: null },
                assignment: null, zones: [], manualEdits: null, revision: 0, editRevision: 0 });
            return this.pages.get(number);
        }
        setPage(number, geometry) {
            if (!geometry || !Object.keys(geometry).every(key =>
                ['source', 'sourcePage', 'role', 'width', 'height', 'box', 'rotation'].includes(key)) ||
                !Number.isFinite(geometry.width) || geometry.width <= 0 ||
                !Number.isFinite(geometry.height) || geometry.height <= 0 ||
                !Array.isArray(geometry.box) || geometry.box.length !== 4 || !geometry.box.every(Number.isFinite) ||
                geometry.box[2] <= geometry.box[0] || geometry.box[3] <= geometry.box[1] ||
                ![0, 90, 180, 270].includes(geometry.rotation) ||
                !['original', 'replacement'].includes(geometry.source) ||
                (geometry.sourcePage !== undefined && (!Number.isInteger(geometry.sourcePage) || geometry.sourcePage < 1)) ||
                (geometry.role !== undefined && !['cover', 'drawing', 'schematic', 'info', 'door-drawing'].includes(geometry.role)))
                throw new Error('Invalid displayed page geometry contract');
            Object.assign(this.page(number), copy(geometry));
        }
        setIntent(number, key) {
            this.page(number).intent = { mode: key === 'AUTO' ? 'auto' : 'manual', key: key === 'AUTO' ? null : key };
            this.touch(number);
        }
        scanToken(number, renderGeneration) {
            const page = this.page(number);
            return { document: this.generation, scan: this.scanGeneration, edit: page.editRevision,
                pageRevision: ++page.revision, number, render: renderGeneration };
        }
        isCurrent(token, renderGeneration) {
            return token.document === this.generation && token.scan === this.scanGeneration &&
                token.edit === this.page(token.number).editRevision && token.render === renderGeneration &&
                this.page(token.number).revision === token.pageRevision;
        }
        assign(number, assignment, zones) {
            if (!validZones(zones)) throw new Error('Invalid effective zone geometry/map');
            const page = this.page(number);
            page.assignment = { ...copy(assignment), catalogRevision: CATALOG_REVISION, matcherRevision: MATCHER_REVISION };
            page.zones = zones.map((zone, index) => ({ ...copy(zone),
                id: `${number}:${assignment.namespace}:${assignment.key}:${index}` }));
            this.revision++;
            if (this.document) this.document.revision = this.revision;
            if (this.onChange) this.onChange();
        }
        nextZoneId(number) { return `${number}:manual:${++this.zoneCounter}`; }
        editPage(number, zones) {
            if (!validZones(zones)) throw new Error('Invalid manual zone geometry/map');
            const used = new Set();
            this.page(number).manualEdits = zones.map(zone => {
                const id = zone.id || this.nextZoneId(number);
                if (used.has(id)) throw new Error('Duplicate manual zone ID');
                used.add(id);
                return { ...copy(zone), id };
            });
            this.touch(number);
        }
        refreshReady() {
            this.ready = this.documentReady && !!this.document?.digest && !this.rendering && !this.pendingScans && this.expectedPageCount > 0 &&
                this.pages.size === this.expectedPageCount && [...this.pages.values()].every(page => page.assignment &&
                    (page.source === 'replacement' || (page.intent.mode === 'manual'
                        ? page.assignment.key === page.intent.key : page.assignment.evidence?.method !== 'manual')));
            return this.ready;
        }
        effectiveZones(number) { const page = this.page(number); return copy(page.manualEdits ?? page.zones); }
        snapshot({ replacement = null, context = {} } = {}) {
            const snapshot = freeze({ schema: 'schematicai-generator-export/1.0', schemaVersion: 1,
                catalog: copy(this.document?.catalog || null), matcherRevision: MATCHER_REVISION,
                documentDigest: this.document?.digest, documentGeneration: this.generation,
                documentRevision: this.revision, editRevision: this.editRevision, exportRevision: ++this.exportRevision,
                sourcePageCount: this.expectedPageCount,
                sourceBytes: Array.from(this.sourceBytes || []), replacement: replacement ? Array.from(new Uint8Array(replacement)) : null,
                templateRevision: replacement ? this.templateRevision : null,
                context: copy(context), pages: [...this.pages.values()].sort((a, b) => a.outputPage - b.outputPage)
                    .map(p => ({ ...copy(p), zones: this.effectiveZones(p.outputPage) })) });
            if (this.onChange) this.onChange();
            return snapshot;
        }
        snapshotCurrent(snapshot) {
            return !!snapshot && snapshot.schema === 'schematicai-generator-export/1.0' &&
                snapshot.matcherRevision === MATCHER_REVISION && snapshot.catalog?.revision === this.document?.catalog.revision &&
                snapshot.documentGeneration === this.generation &&
                snapshot.sourcePageCount === this.expectedPageCount &&
                snapshot.documentRevision === this.revision && snapshot.editRevision === this.editRevision &&
                snapshot.exportRevision === this.exportRevision;
        }
        async loadCatalog() {
            const revision = `?v=${encodeURIComponent(CATALOG_REVISION)}`;
            if (!this.catalogPromise) this.catalogPromise = Promise.all([
                fetch(`PDFmapping/layouts_overlay_core.json${revision}`).then(r => { if (!r.ok) throw new Error('Core layouts unavailable'); return r.json(); }),
                fetch(`PDFmapping/LAYOUT_FINGERPRINTS.json${revision}`).then(r => { if (!r.ok) throw new Error('Fingerprints unavailable'); return r.json(); }),
                fetch(`PDFmapping/layouts_overlay.meta.json${revision}`).then(r => { if (!r.ok) throw new Error('Layout metadata unavailable'); return r.json(); })
            ]).then(([core, catalog, metadata]) => new LayoutMatcher(core, catalog, metadata)).catch(error => {
                console.warn('[generator] Measured catalog unavailable; using legacy fallback', error);
                this.catalogPromise = null;
                return null;
            });
            return this.catalogPromise;
        }
    }
    root.GeneratorState = GeneratorState;
    root.LayoutMatcher = LayoutMatcher;
    if (typeof module !== 'undefined') module.exports = { GeneratorState, LayoutMatcher };
})(typeof globalThis !== 'undefined' ? globalThis : window);
