// ==========================================
// 🧠 SCHEMATICA ai release v2.5.114 — Worker implementation v2.5.113 (unchanged)
// Pure parsing helpers mirrored in worker/lib/extract.js for unit testing.
// ==========================================

// Security: Keys are now read from Worker environment secrets
// Set these in your Cloudflare Worker dashboard:
// - AIRTABLE_WRITE_KEY: Read/write access key for Airtable
// - AIRTABLE_READ_KEY: Read-only access key for Airtable
// Note: Rotate existing keys out-of-band after deployment

const BASE_MAIN_ID = 'appgc1pbuOgmODRpj'; 
const TABLE_MAIN = 'Control%20Panel%20Items'; 

const BASE_USERS_ID = 'app88zF2k4FgjU8hK'; 
const TABLE_LEGACY = 'Legacy%20Panels';
const TABLE_FEEDBACK = 'Feedback';
const TABLE_USERS = 'Users';

// Security: Host allowlist for PDF fetching to prevent SSRF attacks
const ALLOWED_PDF_HOSTS = [
    'dl.airtable.com',
    'v5.airtableusercontent.com'
];

// Security: PDF download limits
const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const PDF_FETCH_TIMEOUT_MS = 30000; // 30 seconds

// --- IN-MEMORY EDGE CACHE ---
let CACHE_USERS = null;
let CACHE_HEALED = {};
let CACHE_NB_MODEL = null;
let CACHE_USERS_TIME = 0;
let CACHE_HEALED_TIME = 0;
let CACHE_USERS_PROMISE = null;
let CACHE_HEALED_PROMISE = null;
let IS_BUILDING_ML = false;
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour
const HEALER_CACHE_DURATION = 1000 * 60 * 10; // 10 minutes
const ENABLE_REQUEST_TIME_ML_TRAINING = false;
const MAIN_PAGE_CACHE_FRESH_SECONDS = 55 * 60;
const MAIN_PAGE_CACHE_STALE_SECONDS = 65 * 60;
const MAIN_PAGE_CACHE_CONTROL = `public, max-age=${MAIN_PAGE_CACHE_FRESH_SECONDS}, stale-while-revalidate=${Math.max(0, MAIN_PAGE_CACHE_STALE_SECONDS - MAIN_PAGE_CACHE_FRESH_SECONDS)}`;
const MAIN_PAGE_CACHE_FRESH_MS = MAIN_PAGE_CACHE_FRESH_SECONDS * 1000;
const MAIN_PAGE_CACHE_STALE_MS = MAIN_PAGE_CACHE_STALE_SECONDS * 1000;
const MAIN_PAGE_INFLIGHT = new Map();
const SHEETS_CACHE_MS = 5 * 60 * 1000;
const SHEETS_MAX_BYTES = 8 * 1024 * 1024;
const SHEETS_META_HEADER = 'X-SCHEMATICA-SHEETS-META';
const SPEC_TRANSFORM_VERSION = 'v2.5.113';
let CACHE_SHEETS = null;
let FEEDBACK_FINGERPRINT_SOURCE = null;
let FEEDBACK_FINGERPRINT = '';

// Deterministic content fingerprint (FNV-1a and a Murmur-style 32-bit hash + length). Used instead of a
// per-isolate counter so every isolate derives the same MAIN cache key for the same overrides.
function fingerprintText(text) {
    let a = 0x811c9dc5;
    let b = 0x01000193;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        a = Math.imul(a ^ c, 0x01000193);
        b = Math.imul(b + c, 0x5bd1e995) ^ (b >>> 15);
    }
    return `${text.length.toString(36)}-${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
}

function getFeedbackCacheVersion() {
    if (FEEDBACK_FINGERPRINT_SOURCE !== CACHE_HEALED) {
        FEEDBACK_FINGERPRINT_SOURCE = CACHE_HEALED;
        FEEDBACK_FINGERPRINT = fingerprintText(JSON.stringify(CACHE_HEALED || {}));
    }
    return FEEDBACK_FINGERPRINT;
}

function normalizeSheetPanelId(value) {
    // Fast path for the common already-canonical cell; identical to the full normalization below.
    const plain = typeof value === 'string' ? /^(?:CP-)?(\d+(?:R\d+)?)$/i.exec(value) : null;
    if (plain) return plain[1].toUpperCase();
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
    // Sheet and Airtable cells may spell the same panel `CP 1234`, `CP1234`, `CP–1234` or `1234-R1`.
    const id = String(value ?? '').replace(/[!?]/g, '').trim().replace(/^CP\s*[-\u2010-\u2015]?\s*(?=\d)/i, '')
        .replace(/\.(?:dwg|pdf)$/i, '').trim().replace(/^(\d+)\s*[-_]?\s*(R\d+)$/i, '$1$2').toUpperCase();
    return /^\d+(?:R\d+)?$/.test(id) ? id : null;
}

// Classified, secret-free reason for an unavailable Sheets overlay (surfaced as MAIN `sheetStatus`).
function sheetError(reason, message = `Sheets ${reason}`) {
    const error = new Error(message);
    error.sheetReason = reason;
    return error;
}

function sheetFailureReason(error) {
    if (error?.sheetReason) return error.sheetReason;
    if (error?.name === 'AbortError') return 'timeout';
    if (error instanceof SyntaxError) return 'json';
    return 'fetch';
}

const SHEET_FIELDS = {
    panelid: 'id', id: 'id', controlpanelname: 'id', panel: 'id',
    mfg: 'mfg', pumpmanufacturer: 'mfg', manufacturer: 'mfg', pumpmfg: 'mfg',
    hp: 'hp', horsepower: 'hp', motorhp: 'hp', motorhorsepower: 'hp',
    volt: 'volt', voltage: 'volt', servicevoltage: 'volt', panelvoltage: 'volt',
    phase: 'phase', servicephase: 'phase',
    enc: 'enc', enclosure: 'enc', nema: 'enc', nemarating: 'enc', enclosurerating: 'enc',
    sys: 'sys', systemtype: 'sys', paneltype: 'panelType',
    encmaterial: 'encMaterial', enclosurematerial: 'encMaterial', material: 'encMaterial'
};

function normalizeSheetSpec(field, raw) {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    let value = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
    if (!value || value.length > 100 || /\b(?:N\/?A|VARIES|VARIED|MULTIPLE|MIXED|PARTIAL|UNKNOWN|UNCERTAIN|UNSURE|TBD|NONE|NOT APPLICABLE|NOT AVAILABLE)\b/.test(value)
        || /^(?:[-–—?]+|NULL)$/.test(value)) return null;
    if (field === 'hp') {
        value = value.replace(/\s*(?:HP|HORSEPOWER)$/, '').trim();
        if (/^\d+\/\d+$/.test(value)) {
            const [a, b] = value.split('/').map(Number);
            value = String(a / b);
        }
        return /^\d+(?:\.\d+)?$/.test(value) && isValidHP(value) ? String(Number(value)) : null;
    }
    if (field === 'volt') {
        value = value.replace(/\s*(?:\(V\)|V|VAC|VOLTS?)$/, '').trim();
        value = ({ '120/240': '240', '120/208': '208', '277/480': '480' })[value.replace(/\s*\/\s*/g, '/')] || value;
        value = ({ '110': '120', '115': '120', '220': '240', '230': '240', '460': '480' })[value] || value;
        return isValidVoltage(value) ? value : null;
    }
    if (field === 'phase') {
        value = value.replace(/\s*(?:PH|PHASE|Ø)$/, '').trim();
        value = value.replace(/^([13])\s*\/\s*60$/, '$1');
        value = ({ SINGLE: '1', THREE: '3' })[value] || value;
        return isValidPhase(value) ? value : null;
    }
    if (field === 'sys') {
        return ({ SIMPLEX: 'Simplex', DUPLEX: 'Duplex', TRIPLEX: 'Triplex',
            QUADRAPLEX: 'Quadraplex', QUADRUPLEX: 'Quadraplex', QUADPLEX: 'Quadraplex' })[value] || null;
    }
    if (field === 'encMaterial') {
        value = value.replace(/^(STAINLESS STEEL)\s*\((?:304|316)\)$/, '$1');
        return ({ FIBERGLASS: 'Fiberglass', 'FIBREGLASS': 'Fiberglass', FG: 'Fiberglass',
            'STAINLESS STEEL': 'Stainless Steel', SS: 'Stainless Steel',
            'PAINTED STEEL': 'Painted Steel' })[value] || null;
    }
    if (field === 'enc') {
        value = value.replace(/^NEMA\s*/, '').replace(/\s+/g, '');
        return /^(?:1|3R|4|4X|4XFG|4XSS|12|POLY)$/.test(value) ? value : null;
    }
    if (field === 'mfg' && /^[A-Z][A-Z0-9 .'-]*$/.test(value) && !/\b(?:OR|AND)\b/.test(value)) {
        const alias = value.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ');
        const canonical = Object.keys(EXACT_MFGS).find(key => key === alias || EXACT_MFGS[key].includes(alias));
        return canonical || value;
    }
    return null;
}

function sheetSnapshotVersion(schema, revision, hash) {
    return JSON.stringify([SPEC_TRANSFORM_VERSION, schema, revision, hash]);
}

// Validates the whole payload and indexes panel IDs once, but normalizes a row's specs only when a
// MAIN record looks it up. Eagerly normalizing every row was the dominant cold-isolate CPU cost.
// Rows may be same-order arrays (trailing blank cells may be omitted) or objects keyed by column.
function compileSheetSnapshot(payload, previous = null) {
    if (!payload || payload.ok === false || payload.error !== undefined && payload.ok !== true
        || !['string', 'number'].includes(typeof payload.schema)
        || !['string', 'number'].includes(typeof payload.revision)
        || !String(payload.schema).trim() || !String(payload.revision).trim()
        || String(payload.schema).length > 100 || String(payload.revision).length > 100
        || !['string', 'number'].includes(typeof payload.hash) || !String(payload.hash).trim() || String(payload.hash).length > 200
        || !Array.isArray(payload.columns) || !payload.columns.length || payload.columns.length > 100
        || !payload.columns.every(c => typeof c === 'string')
        || !Array.isArray(payload.rows) || !payload.rows.length || payload.rows.length > 20000
        || payload.rowCount !== undefined && payload.rowCount !== payload.rows.length
        || !payload.rows.every(row => Array.isArray(row) ? row.length <= payload.columns.length
            : row !== null && typeof row === 'object')) {
        throw sheetError('payload', 'Invalid Sheets snapshot');
    }
    const fields = payload.columns.map(c => {
        const key = c.toLowerCase().replace(/[^a-z0-9]/g, '');
        return Object.hasOwn(SHEET_FIELDS, key) ? SHEET_FIELDS[key] : null;
    });
    if (fields.filter(f => f === 'id').length !== 1
        || fields.filter(Boolean).length !== new Set(fields.filter(Boolean)).size
        || !fields.some(f => f && f !== 'id')) throw sheetError('columns', 'Invalid Sheets columns');
    const version = sheetSnapshotVersion(payload.schema, payload.revision, payload.hash);
    if (previous?.version === version) return previous;
    const rowsById = new Map();
    const duplicateIds = new Set();
    if (payload.duplicates !== undefined) {
        if (!Array.isArray(payload.duplicates)) throw sheetError('payload');
        for (const duplicate of payload.duplicates) {
            const id = normalizeSheetPanelId(typeof duplicate === 'object' && duplicate !== null
                ? (duplicate.panelId ?? duplicate.panel_id ?? duplicate.id) : duplicate);
            if (id) duplicateIds.add(id);
        }
    }
    const idColumn = fields.indexOf('id');
    const columns = payload.columns;
    for (const raw of payload.rows) {
        const row = Array.isArray(raw) ? raw : columns.map(column => Object.hasOwn(raw, column) ? raw[column] : undefined);
        const id = normalizeSheetPanelId(row[idColumn]);
        if (!id) continue;
        if (rowsById.has(id)) { duplicateIds.add(id); continue; }
        rowsById.set(id, row);
    }
    for (const id of duplicateIds) rowsById.delete(id);
    if (!rowsById.size) throw sheetError('no-ids', 'Sheets snapshot has no unambiguous panel IDs');
    const compiled = new Map();
    const compileRow = id => {
        if (compiled.has(id)) return compiled.get(id);
        const row = rowsById.get(id);
        if (!row) return null;
        const specs = {};
        const rejected = {};
        const meta = {};
        fields.forEach((field, column) => {
            if (!field || field === 'id') return;
            if (field === 'panelType') {
                if (typeof row[column] === 'string' && row[column].trim()) meta.panelType = row[column].trim().slice(0, 100);
                return;
            }
            const value = normalizeSheetSpec(field, row[column]);
            if (value !== null) specs[field] = value;
            else if (['string', 'number'].includes(typeof row[column]) && String(row[column]).trim()) {
                rejected[field] = String(row[column]).slice(0, 100);
            }
        });
        const entry = { specs, rejected: Object.keys(rejected).length ? rejected : null,
            meta: Object.keys(meta).length ? meta : null };
        compiled.set(id, entry);
        return entry;
    };
    const view = key => ({
        has: id => Boolean(compileRow(id)?.[key]),
        get: id => compileRow(id)?.[key] || undefined
    });
    const index = { has: id => rowsById.has(id), get: id => compileRow(id)?.specs, get size() { return rowsById.size; } };
    return { version, index, uncertainty: view('rejected'), metadata: view('meta'),
        schema: payload.schema, revision: payload.revision, hash: payload.hash, updatedAt: payload.updatedAt };
}

async function fetchSheetText(endpoint) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        let url = new URL(endpoint);
        if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.username || url.password
            || !/^\/(?:a\/macros\/[^/]+|macros)\/s\/[^/]+\/exec$/.test(url.pathname)) throw sheetError('endpoint', 'Invalid Sheets endpoint');
        let response;
        for (let redirects = 0; redirects <= 3; redirects++) {
            response = await fetch(url.toString(), { redirect: 'manual', signal: controller.signal });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            // Release the redirect body so it cannot hold a connection open.
            try { await response.body?.cancel(); } catch { /* already consumed */ }
            const location = response.headers.get('Location');
            if (!location) throw sheetError('redirect');
            url = new URL(location, url);
            if (url.protocol !== 'https:' || !['script.google.com', 'script.googleusercontent.com'].includes(url.hostname)
                || url.username || url.password) throw sheetError('redirect');
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) throw sheetError('redirect');
        if (!response.ok) throw sheetError(`http-${response.status}`);
        if (Number(response.headers.get('Content-Length')) > SHEETS_MAX_BYTES) throw sheetError('too-large');
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > SHEETS_MAX_BYTES) {
                await reader.cancel();
                throw sheetError('too-large');
            }
            chunks.push(value);
        }
        return await new Response(new Blob(chunks)).text();
    } finally {
        clearTimeout(timeout);
    }
}

function sheetMetaOf(snapshot) {
    return snapshot ? { version: snapshot.version, schema: snapshot.schema, revision: snapshot.revision,
        hash: snapshot.hash, updatedAt: snapshot.updatedAt } : null;
}

function encodeSheetMetaHeader(meta) {
    const { schema, revision, hash, updatedAt } = meta;
    const encoded = encodeURIComponent(JSON.stringify({ schema, revision, hash, updatedAt }));
    return encoded.length <= 4000 ? encoded : null;
}

function decodeSheetMetaHeader(value) {
    if (!value) return null;
    const raw = JSON.parse(decodeURIComponent(value));
    if (!raw || !['string', 'number'].includes(typeof raw.schema) || !['string', 'number'].includes(typeof raw.revision)
        || !['string', 'number'].includes(typeof raw.hash)) return null;
    return { version: sheetSnapshotVersion(raw.schema, raw.revision, raw.hash), schema: raw.schema,
        revision: raw.revision, hash: raw.hash, updatedAt: raw.updatedAt };
}

// The validated raw Apps Script body is the canonical cached artifact: it is persisted verbatim
// (never re-serialized) with its identity in a header, so cold isolates can build MAIN cache keys
// without parsing it, and an unchanged refresh is a string comparison rather than parse + compile.
async function refreshSheetState(env, requestUrl) {
    const source = env.SHEETS_ENDPOINT;
    if (!source) return null;
    if (!CACHE_SHEETS || CACHE_SHEETS.source !== source) {
        CACHE_SHEETS = { source, snapshot: null, meta: null, rawText: null, nextCheck: 0, promise: null, failure: null };
    }
    const state = CACHE_SHEETS;
    if (state.promise) return state.promise;
    if (Date.now() < state.nextCheck) return state;
    state.promise = (async () => {
        state.nextCheck = Date.now() + SHEETS_CACHE_MS;
        const cache = typeof caches !== 'undefined' ? caches.default : null;
        const cacheUrl = new URL(requestUrl);
        cacheUrl.pathname = '/__schematica_sheets_v1';
        cacheUrl.search = '';
        cacheUrl.searchParams.set('source', source);
        const key = new Request(cacheUrl.toString());
        try {
            if (!state.meta && cache) {
                try {
                    const saved = await cache.match(key);
                    if (saved) {
                        const text = await saved.text();
                        const savedMeta = decodeSheetMetaHeader(saved.headers.get(SHEETS_META_HEADER));
                        if (savedMeta) {
                            Object.assign(state, { rawText: text, meta: savedMeta, snapshot: null });
                        } else {
                            // Entries persisted before v2.5.112 carry no identity header.
                            const snapshot = compileSheetSnapshot(JSON.parse(text));
                            Object.assign(state, { rawText: text, meta: sheetMetaOf(snapshot), snapshot });
                        }
                        const freshUntil = Number(saved.headers.get('X-SCHEMATICA-CACHED-AT')) + SHEETS_CACHE_MS;
                        if (Date.now() < freshUntil) {
                            state.nextCheck = freshUntil;
                            return state;
                        }
                    }
                } catch { /* A bad cache entry must not prevent a live refresh. */ }
            }
            const text = await fetchSheetText(source);
            if (text !== state.rawText || !state.meta) {
                const payload = JSON.parse(text);
                const snapshot = compileSheetSnapshot(payload, state.snapshot);
                Object.assign(state, { rawText: text, meta: sheetMetaOf(snapshot), snapshot });
            }
            state.failure = null;
            if (cache) {
                try {
                    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=604800',
                        'X-SCHEMATICA-CACHED-AT': String(Date.now()) });
                    const metaHeader = encodeSheetMetaHeader(state.meta);
                    if (metaHeader) headers.set(SHEETS_META_HEADER, metaHeader);
                    await cache.put(key, new Response(text, { headers }));
                } catch { /* Keep the validated in-memory snapshot if persistence fails. */ }
            }
        } catch (error) {
            state.failure = sheetFailureReason(error);
            console.warn(`[Sheets] Refresh unavailable (${state.failure}); retaining last good snapshot`);
        }
        return state;
    })();
    try { return await state.promise; } finally { state.promise = null; }
}

// Parses/indexes the persisted body only when a MAIN cache miss actually needs row specs.
function materializeSheetSnapshot(state) {
    if (!state) return null;
    if (!state.snapshot && state.rawText && state.meta) {
        try {
            state.snapshot = compileSheetSnapshot(JSON.parse(state.rawText));
            state.meta = sheetMetaOf(state.snapshot);
        } catch (error) {
            console.warn('[Sheets] Persisted snapshot unusable; continuing without overlay');
            Object.assign(state, { rawText: null, meta: null, snapshot: null, failure: `cached-${sheetFailureReason(error)}` });
        }
    }
    return state.snapshot;
}

// Secret-free Sheets authority state: `active` when a validated snapshot identity is in use
// (`refresh` then names a failed refresh that is serving the last good snapshot), otherwise
// `unavailable` with a classified reason, or `pending` before the first refresh completes.
function sheetStatusOf(state) {
    if (!state) return null;
    if (state.meta) return { state: 'active', refresh: state.failure || 'ok', transform: SPEC_TRANSFORM_VERSION };
    return { state: state.failure ? 'unavailable' : 'pending', reason: state.failure || null, transform: SPEC_TRANSFORM_VERSION };
}

function sheetStatusHeader(status) {
    if (!status) return 'unconfigured';
    return status.state === 'active' ? `active; refresh=${status.refresh}` : `${status.state}; reason=${status.reason || 'none'}`;
}

async function getSheetSnapshot(env, requestUrl) {
    return materializeSheetSnapshot(await refreshSheetState(env, requestUrl));
}

function applySheetSpecs(record, snapshot) {
    const id = normalizeSheetPanelId(record.id);
    if (snapshot?.uncertainty?.has(id)) record.sheetUncertainty = snapshot.uncertainty.get(id);
    if (snapshot?.metadata?.has(id)) record.sheetMetadata = snapshot.metadata.get(id);
    const specs = snapshot?.index.get(id);
    if (!specs || !Object.keys(specs).length) return record;
    record.sheetSpecs = specs;
    if (specs.enc !== undefined && specs.encMaterial === undefined) {
        record.sheetEnclosureFallback = { enc: record.enc, encV: record.encV === true };
    }
    for (const field of ['mfg', 'hp', 'volt', 'phase', 'enc']) {
        if (specs[field] !== undefined) {
            record[field] = specs[field];
            record[field + 'V'] = false;
        }
    }
    return record;
}

const VOTE_THRESHOLD = 3;

// --- EXACT DICTIONARIES ---
const EXACT_MFGS = {
    'GORMAN RUPP': ['GORMAN', 'GR', 'GRSP'],
    'BARNES': ['BARNES', 'SITHE', 'CRANE'],
    'SULZER': ['SULZER', 'SULZER PUMPS'],
    'HYDROMATIC': ['HYDROMATIC'],
    'FLYGT': ['FLYGT'],
    'MYERS': ['MYERS'],
    'GOULDS': ['GOULDS'],
    'ZOELLER': ['ZOELLER'],
    'LIBERTY': ['LIBERTY'],
    'WILO': ['WILO'],
    'PENTAIR': ['PENTAIR'],
    'ABS': ['ABS'],
    'GODWIN': ['GODWIN', 'GODWIN SP'],
    'FRANKLIN': ['FRANKLIN'],
    'EBARA': ['EBARA'],
    'HIDROSTAL': ['HIDROSTAL']
};

const VOLT_PRIORITY = [
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|(?<!208\/)230|(?<!208\/)220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?(?!208\b)[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*(?:[:\-]\s*)?[\d\.\/]*\b(?:120|115|110)\b/i }
];

// Canonical dual-voltage pairs (split-phase configurations)
// These should NOT be marked as varied - use the higher voltage as the primary value
const CANONICAL_DUAL_VOLTAGE_PAIRS = [
    { low: '120', high: '240' },   // Common residential/light commercial split-phase
    { low: '277', high: '480' }    // Common commercial/industrial split-phase
];

const STOP_WORDS = new Set(['PANEL','CONTROL','PUMP','MOTOR','VOLT','VAC','PHASE','HP','ALARM','RELAY','SWITCH','FLOAT','NEMA','ENCLOSURE']);

// Normalize CAD-style control codes from Airtable Items text
// CAD software (AutoCAD, etc.) uses control codes like %%U (underline), %%O (overline), etc.
// These codes prevent regex parsing (e.g., "%%U7.5HP" won't match HP patterns)
function normalizeCADText(text) {
    if (!text || typeof text !== 'string') return '';
    // Strip common CAD control codes:
    // - %%X (single letter): %%U, %%O, %%D (degree), %%P (plus/minus), %%C (diameter), etc.
    // - %%nnn (exactly 3 digits): ASCII character codes like %%175
    // Match both uppercase and lowercase variants
    return text.replace(/%%(?:[A-Za-z]|\d{3})/g, '');
}

function isValidHP(hp) {
    const val = parseFloat(hp);
    return !isNaN(val) && val >= 0.1 && val <= 500;
}

function isValidVoltage(volt) {
    const validVoltages = ['120', '208', '240', '277', '415', '480', '575'];
    return validVoltages.includes(String(volt));
}

function isValidPhase(phase) {
    return ['1', '3'].includes(String(phase));
}

function normalizeMainSortDirection(rawDirection) {
    return String(rawDirection || '').toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function normalizeMainOffset(rawOffset) {
    if (!rawOffset || typeof rawOffset !== 'string') return '';
    return rawOffset.trim();
}

function buildMainCacheKey(requestUrl, { pageSize, direction, offset, feedbackVersion, sheetVersion, sheetSource }) {
    const cacheUrl = new URL(requestUrl);
    cacheUrl.search = '';
    cacheUrl.searchParams.set('target', 'MAIN');
    cacheUrl.searchParams.set('pageSize', String(pageSize));
    cacheUrl.searchParams.set('sortDirection', direction);
    cacheUrl.searchParams.set('offset', offset || '');
    cacheUrl.searchParams.set('feedbackVersion', String(feedbackVersion || 0));
    cacheUrl.searchParams.set('specOverlay', SPEC_TRANSFORM_VERSION);
    cacheUrl.searchParams.set('sheetVersion', sheetVersion || '');
    cacheUrl.searchParams.set('sheetSource', sheetSource || '');
    return cacheUrl.toString();
}

function setMainTimingHeaders(headers, { cacheStatus, authMs = 0, upstreamMs = 0, processMs = 0, serializeMs = 0, totalMs = 0,
    parsedRecords = 0, parsedChars = 0, sheetRecords = 0 }) {
    headers.set('X-SCHEMATICA-MAIN-CACHE', cacheStatus);
    headers.set('X-SCHEMATICA-AUTH-MS', String(Math.max(0, Math.round(authMs))));
    headers.set('X-SCHEMATICA-MAIN-UPSTREAM-MS', String(Math.max(0, Math.round(upstreamMs))));
    headers.set('X-SCHEMATICA-MAIN-PROCESS-MS', String(Math.max(0, Math.round(processMs))));
    headers.set('X-SCHEMATICA-MAIN-SERIALIZE-MS', String(Math.max(0, Math.round(serializeMs))));
    headers.set('X-SCHEMATICA-MAIN-TOTAL-MS', String(Math.max(0, Math.round(totalMs))));
    // Workers freeze Date.now() while executing, so the *-MS headers capture I/O, not CPU. These
    // deterministic work counters (plus Workers Logs cpuTime) measure the CPU-bound fallback work.
    headers.set('X-SCHEMATICA-MAIN-PARSED-RECORDS', String(parsedRecords));
    headers.set('X-SCHEMATICA-MAIN-PARSED-CHARS', String(parsedChars));
    headers.set('X-SCHEMATICA-MAIN-SHEET-RECORDS', String(sheetRecords));
}

function sanitizePdfFilename(name, fallback = 'schematica.pdf') {
    const raw = String(name || '').trim();
    const cleaned = raw
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 96);
    const base = cleaned || fallback.replace(/\\.pdf$/i, '');
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function applyAttachmentDisposition(headers, filename) {
    const safeName = sanitizePdfFilename(filename);
    headers.set('Content-Disposition', `attachment; filename=\"${safeName}\"`);
    headers.set('X-Content-Type-Options', 'nosniff');
}

function getRequiredSecret(env, name) {
    const key = env && env[name];
    if (!key) {
        const err = new Error(`Worker configuration error: missing ${name}`);
        err.isWorkerConfigError = true;
        throw err;
    }
    return key;
}

function createAirtableCredentialError(scope, status, context) {
    const err = new Error(`Airtable ${scope} access denied${context ? ` (${context})` : ''}: HTTP ${status}`);
    err.isAirtableCredentialError = true;
    err.airtableScope = scope;
    err.upstreamStatus = status;
    return err;
}

function mainBaseHeaders(env) {
    const key = getRequiredSecret(env, 'AIRTABLE_READ_KEY');
    return { 'Authorization': 'Bearer ' + key };
}

function usersBaseHeaders(env, { json = false } = {}) {
    const key = getRequiredSecret(env, 'AIRTABLE_WRITE_KEY');
    const headers = { 'Authorization': 'Bearer ' + key };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
}

class NaiveBayes {
    constructor() {
        this.vocab = new Set();
        this.classCounts = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
        this.wordCounts = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
        this.classWordTotals = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
        this.totalDocs = { mfg: 0, enc: 0, hp: 0, volt: 0, phase: 0 };
        this.priorLog = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
        this.fallbackLog = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
        this.wordLog = { mfg: {}, enc: {}, hp: {}, volt: {}, phase: {} };
    }
    tokenize(text) { 
        // Normalize CAD control codes before tokenization
        const normalized = normalizeCADText(text);
        return (String(normalized).toUpperCase().match(/[A-Z0-9\-]+/g) || [])
            .filter(w => w.length > 2 && !STOP_WORDS.has(w)); 
    }
    train(text, labels) {
        const tokens = Array.from(new Set(this.tokenize(text))); 
        if (!tokens.length) return;
        tokens.forEach(t => this.vocab.add(t));
        
        for (const [category, rawLabel] of Object.entries(labels)) {
            if (!rawLabel || rawLabel === '-' || rawLabel === 'null' || rawLabel === '') continue;
            const label = String(rawLabel).trim();
            if (!label) continue;
            
            this.totalDocs[category]++;
            this.classCounts[category][label] = (this.classCounts[category][label] || 0) + 1;
            if (!this.wordCounts[category][label]) this.wordCounts[category][label] = {};
            if (!this.classWordTotals[category][label]) this.classWordTotals[category][label] = 0;
            
            tokens.forEach(t => {
                this.wordCounts[category][label][t] = (this.wordCounts[category][label][t] || 0) + 1;
                this.classWordTotals[category][label]++;
            });
        }
    }
    finalize() {
        const V = this.vocab.size;
        for (const cat of ['mfg', 'enc', 'hp', 'volt', 'phase']) {
            for (const label in this.classCounts[cat]) {
                this.priorLog[cat][label] = Math.log(this.classCounts[cat][label] / this.totalDocs[cat]);
                const denom = (this.classWordTotals[cat][label] || 0) + V;
                this.fallbackLog[cat][label] = Math.log(1 / denom);
                this.wordLog[cat][label] = {};
                for (const word in this.wordCounts[cat][label]) {
                    this.wordLog[cat][label][word] = Math.log((this.wordCounts[cat][label][word] + 1) / denom);
                }
            }
        }
    }
    predict(text, category) {
        if (!this.totalDocs[category]) return null;
        const tokens = Array.from(new Set(this.tokenize(text)));
        const knownTokens = tokens.filter(t => this.vocab.has(t));
        
        if (knownTokens.length < 2) return null; 

        let scores = [];
        for (const label in this.classCounts[category]) {
            let score = this.priorLog[category][label];
            const fallback = this.fallbackLog[category][label];
            const wLogs = this.wordLog[category][label];
            for (let i = 0; i < knownTokens.length; i++) {
                const wLog = wLogs[knownTokens[i]];
                score += (wLog !== undefined) ? wLog : fallback;
            }
            scores.push({ label, score });
        }
        
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 1) {
            const margin = scores[0].score - scores[1].score;
            if (margin < 2.0) return null; 
        }
        return scores.length ? scores[0].label : null;
    }
}

function normalizeLegacyMfg(raw) {
    if (!raw) return null;
    let u = String(raw).toUpperCase();
    if (u.includes('VFD') || u.includes('AERATOR') || u.includes('BLOWER') || u.includes('TESTSITE') || u.includes('VALVE') || u.includes('DRIP') || u === 'SP') return null;

    for (const [canon, aliases] of Object.entries(EXACT_MFGS)) {
        const canonicalPattern = canon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(^|[^A-Z0-9])${canonicalPattern}(?=$|[^A-Z0-9])`).test(u)) return canon;
        for (const alias of aliases) {
            if (new RegExp(`\\b${alias}\\b`).test(u)) return canon;
        }
    }
    return null; 
}

async function fetchAirtablePages(table, maxPages, fields = [], env) {
    let records = []; let offset = null; let pages = 0;
    let fieldQuery = fields.length > 0 ? '&' + fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&') : '';
    do {
        let url = `https://api.airtable.com/v0/${BASE_USERS_ID}/${table}?pageSize=100${fieldQuery}`;
        if (offset) url += `&offset=${encodeURIComponent(offset)}`;
        const resp = await fetch(url, { headers: usersBaseHeaders(env) });
        if (!resp.ok) {
            if (resp.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; }
            if (resp.status === 401 || resp.status === 403) {
                throw createAirtableCredentialError('Users', resp.status, `${table} page fetch`);
            }
            const err = new Error(`Airtable ${table} fetch HTTP ${resp.status}`);
            err.upstreamStatus = resp.status;
            throw err;
        }
        const data = await resp.json();
        if (data.records) records.push(...data.records);
        offset = data.offset; pages++;
    } while (offset && pages < maxPages);
    return records;
}

// 1. FAST CORE CACHE: Only fetches Auth and Feedback (Takes < 0.5s)
async function ensureUsersCache(env) {
    if (CACHE_USERS && (Date.now() - CACHE_USERS_TIME < CACHE_DURATION)) return;
    if (CACHE_USERS_PROMISE) return CACHE_USERS_PROMISE;
    CACHE_USERS_PROMISE = (async () => {
        const usersResp = await fetch(`https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_USERS}`, { headers: usersBaseHeaders(env) });
        if (!usersResp.ok) {
            if (usersResp.status === 401 || usersResp.status === 403) {
                throw createAirtableCredentialError('Users', usersResp.status, 'auth bootstrap');
            }
            const err = new Error(`AuthBackendUnavailable: Users fetch returned HTTP ${usersResp.status}`);
            err.isAuthBackendUnavailable = true;
            err.upstreamStatus = usersResp.status;
            throw err;
        }
        const usersData = await usersResp.json();
        CACHE_USERS = usersData.records || [];
        CACHE_USERS_TIME = Date.now();
    })();
    try {
        await CACHE_USERS_PROMISE;
    } finally {
        CACHE_USERS_PROMISE = null;
    }
}

async function ensureHealedCache(env) {
    if (CACHE_HEALED_TIME > 0 && (Date.now() - CACHE_HEALED_TIME < HEALER_CACHE_DURATION)) return;
    if (CACHE_HEALED_PROMISE) return CACHE_HEALED_PROMISE;
    CACHE_HEALED_PROMISE = (async () => {
        const fbData = await fetchAirtablePages(TABLE_FEEDBACK, 5, ['Panel ID', 'Corrections'], env);
        const nextHealed = {};
        const tallies = {};
        fbData.forEach(r => {
            const rawJson = r.fields['Corrections'];
            const id = r.fields['Panel ID'];
            if (rawJson && id) {
                try {
                    const c = JSON.parse(rawJson);
                    if (c && typeof c === 'object') {
                        Object.entries(c).forEach(([param, value]) => {
                            if (param === 'reject_keywords' && Array.isArray(value)) {
                                value.forEach(kw => { tallies[`${id}|reject_keyword|${kw}`] = (tallies[`${id}|reject_keyword|${kw}`] || 0) + 1; });
                            } else {
                                tallies[`${id}|${param}|${value}`] = (tallies[`${id}|${param}|${value}`] || 0) + 1;
                            }
                        });
                    }
                } catch(e) {}
            }
        });

        for (const [key, count] of Object.entries(tallies)) {
            if (count >= VOTE_THRESHOLD) {
                const parts = key.split('|');
                const id = parts[0]; const param = parts[1]; const value = parts.slice(2).join('|');
                if (!nextHealed[id]) nextHealed[id] = {};
                if (param === 'reject_keyword') {
                    if (!nextHealed[id].reject_keywords) nextHealed[id].reject_keywords = [];
                    nextHealed[id].reject_keywords.push(value);
                } else {
                    nextHealed[id][param] = value;
                }
            }
        }
        CACHE_HEALED = nextHealed;
        CACHE_HEALED_TIME = Date.now();
    })();
    try {
        await CACHE_HEALED_PROMISE;
    } finally {
        CACHE_HEALED_PROMISE = null;
    }
}

async function ensureAuthAndFeedback(env) {
    await ensureUsersCache(env);
    await ensureHealedCache(env);
}

// 2. BACKGROUND ML CACHE: Runs completely decoupled from User Requests
async function buildMLBackground(env) {
    if (CACHE_NB_MODEL || IS_BUILDING_ML) return;
    IS_BUILDING_ML = true;
    try {
        console.log("Building ML in background...");
        
        // Fetch from MAIN database instead of Legacy Panels
        let mainRecords = [];
        let offset = null;
        let pages = 0;
        const maxPages = 100; // Fetch up to 10,000 records (100 pages * 100 per page)
        
        do {
            let mainUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?pageSize=100` +
                          `&fields%5B%5D=Items`;
            if (offset) mainUrl += `&offset=${encodeURIComponent(offset)}`;
            
            const resp = await fetch(mainUrl, { headers: mainBaseHeaders(env) });
            if (!resp.ok) {
                if (resp.status === 429) { 
                    await new Promise(r => setTimeout(r, 500)); 
                    continue; 
                }
                if (resp.status === 401 || resp.status === 403) {
                    throw createAirtableCredentialError('Main', resp.status, 'ML background fetch');
                }
                break;
            }
            const data = await resp.json();
            if (data.records) mainRecords.push(...data.records);
            offset = data.offset;
            pages++;
        } while (offset && pages < maxPages);
        
        const nb = new NaiveBayes();
        mainRecords.forEach(r => {
            const rawItems = r.fields['Items'];
            let desc = (typeof rawItems === 'string' ? rawItems : Array.isArray(rawItems) ? rawItems.join(' ') : "");
            if (!desc) return;
            
            // Normalize CAD control codes before training
            desc = normalizeCADText(desc);
            
            const extracted = extractSpecsStrict(desc);
            
            const labels = {};
            if (extracted.mfg) labels.mfg = extracted.mfg;
            if (extracted.enc) labels.enc = extracted.enc;
            if (extracted.hp && isValidHP(extracted.hp)) labels.hp = extracted.hp;
            if (extracted.volt && isValidVoltage(extracted.volt)) labels.volt = extracted.volt;
            if (extracted.phase && isValidPhase(extracted.phase)) labels.phase = extracted.phase;
            
            // Only train if we have at least one valid label
            if (Object.keys(labels).length > 0) {
                nb.train(desc, labels);
            }
        });
        
        nb.finalize();
        CACHE_NB_MODEL = nb;
        console.log("ML Build Complete!");
    } catch(e) { console.error("ML Build Error:", e); }
    IS_BUILDING_ML = false;
}

// Security helper: Validate PDF URL against allowlist
function isAllowedPdfHost(url) {
    try {
        const urlObj = new URL(url);
        return ALLOWED_PDF_HOSTS.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host));
    } catch (e) {
        return false;
    }
}

function getPdfUrlHost(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

// Security helper: Fetch PDF with timeout and size limits
async function fetchPdfWithGuards(url) {
    // Early validation: Check for null, undefined, or empty URL
    if (!url || typeof url !== 'string' || url.trim() === '') {
        console.error('[fetchPdfWithGuards] Invalid or empty URL provided');
        throw new Error('Invalid or empty PDF URL');
    }
    
    // Validate against allowed hosts
    if (!isAllowedPdfHost(url)) {
        console.error('[fetchPdfWithGuards] PDF host not allowed. Host:', getPdfUrlHost(url), 'Allowed hosts:', ALLOWED_PDF_HOSTS);
        throw new Error(`PDF host not allowed. Only these hosts are permitted: ${ALLOWED_PDF_HOSTS.join(', ')}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
    
    try {
        console.log('[fetchPdfWithGuards] Fetching PDF from allowed host:', getPdfUrlHost(url));
        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) {
            console.error('[fetchPdfWithGuards] PDF fetch failed. Status:', response.status, 'Host:', getPdfUrlHost(url));
            throw new Error(`PDF fetch failed with status ${response.status}`);
        }
        
        // Check content length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE_BYTES) {
            console.error('[fetchPdfWithGuards] PDF too large. Size:', contentLength, 'Max allowed:', MAX_PDF_SIZE_BYTES, 'Host:', getPdfUrlHost(url));
            throw new Error(`PDF too large (${contentLength} bytes). Maximum allowed: ${MAX_PDF_SIZE_BYTES} bytes`);
        }
        
        console.log('[fetchPdfWithGuards] PDF fetch successful from host:', getPdfUrlHost(url));
        return response;
    } catch (error) {
        // Enhanced error logging for debugging
        if (error.name === 'AbortError') {
            console.error('[fetchPdfWithGuards] PDF fetch timeout after', PDF_FETCH_TIMEOUT_MS, 'ms. Host:', getPdfUrlHost(url));
            throw new Error(`PDF fetch timeout after ${PDF_FETCH_TIMEOUT_MS}ms`);
        }
        console.error('[fetchPdfWithGuards] Error fetching PDF:', error.message, 'Host:', getPdfUrlHost(url));
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Security helper: Validate and clamp pageSize parameter
function validatePageSize(pageSizeParam) {
    const pageSize = parseInt(pageSizeParam) || 100;
    return Math.min(Math.max(pageSize, 1), 100); // Clamp between 1 and 100
}

// Parse HP values from normalized text (number-before-unit and table formats).
// Logic mirrored in worker/lib/extract.js for unit testing.
function _parseHP(t) {
    const foundHPs = new Set();
    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\s*(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        let raw = match[1]; let val = 0;
        if (match[2] && match[2].toUpperCase().includes('KW')) val = parseFloat(raw) * 1.341;
        else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
            const mx = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
            val = parseFloat(mx[1]) + parseFloat(mx[2]) / parseFloat(mx[3]);
        } else if (/(\d+)([¼½¾])/.test(raw)) {
            const mx = raw.match(/(\d+)([¼½¾])/);
            val = parseFloat(mx[1]) + { '¼': 0.25, '½': 0.5, '¾': 0.75 }[mx[2]];
        } else if (raw.includes('-')) {
            const nums = raw.split('-').filter(Boolean).map(p => parseFloat(p)).filter(x => !isNaN(x));
            if (nums.length) val = Math.max(...nums);
        } else if (raw.includes('/')) {
            const [num, den] = raw.split('/');
            val = parseFloat(num) / parseFloat(den);
        } else {
            val = parseFloat(raw);
        }
        if (!isNaN(val) && val >= 0.1 && val <= 500) foundHPs.add((Math.round(val * 10) / 10).toString());
    }
    // Table/header format: "HP: 7.5", "MOTOR HP: 7.5"
    const tableHpRegex = /\b(?:MOTOR\s+)?(?:HP|HORSEPOWER)[:\s|]+(\d+(?:\.\d+)?)\b/gi;
    while ((match = tableHpRegex.exec(t)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0.1 && val <= 500) foundHPs.add((Math.round(val * 10) / 10).toString());
    }
    return foundHPs;
}

// Context-aware voltage extraction: separates service from control/transformer voltages.
// Inline transformer notation (e.g. "480V-120VAC") is classified as control-only.
// Logic mirrored in worker/lib/extract.js for unit testing.
function _parseVoltageContextAware(t) {
    const controlRanges = [];
    const xfmrInlineRegex = /\b\d{2,4}(?:VAC|V)\s*[-]\s*\d{2,4}VAC\b/gi;
    let m;
    while ((m = xfmrInlineRegex.exec(t)) !== null) {
        controlRanges.push([m.index, m.index + m[0].length]);
    }
    const XFMR_KEYWORDS = /\b(?:TRANSFORMER|XFORMER|XFMR|CPT|SECONDARY|PRIMARY)\b/i;
    const serviceVolts = new Set();
    const controlVolts = new Set();
    for (const v of VOLT_PRIORITY) {
        const r = new RegExp(v.match.source, 'gi');
        while ((m = r.exec(t)) !== null) {
            const pos = m.index;
            const end = pos + m[0].length;
            if (controlRanges.some(([s, e]) => pos >= s && pos < e)) {
                controlVolts.add(v.id);
                continue;
            }
            const ctx = t.slice(Math.max(0, pos - 40), Math.min(t.length, end + 40));
            if (XFMR_KEYWORDS.test(ctx)) {
                controlVolts.add(v.id);
            } else {
                serviceVolts.add(v.id);
            }
        }
    }
    return { serviceVolts, controlVolts };
}

// Parse enclosure type: detects NEMA 4X, NEMA4X, TYPE 4X, 4XSS, 4XFG, POLY.
// When both SS and FG detected, spec-table context keywords determine the winner.
// Logic mirrored in worker/lib/extract.js for unit testing.
function _parseEnclosure(t, inferBareRating = true, inferMaterial = true) {
    const foundEnclosures = new Set();
    const has4X = inferMaterial
        ? /\b(?:NEMA\s*|TYPE\s*)?4\s*X(?!FG|SS)\b/i.test(t)
        : /\b(?:NEMA\s*|TYPE\s*)?4\s*X(?:FG|SS)?\b/i.test(t);
    if (!inferMaterial) {
        if (has4X) foundEnclosures.add("4X");
        return foundEnclosures;
    }
    // Explicit compound codes take priority; track presence for tie-breaking
    const hasExplicit4XFG = /\b4XFG\b/i.test(t);
    const hasExplicit4XSS = /\b4XSS\b/i.test(t);
    if (hasExplicit4XFG) foundEnclosures.add("4XFG");
    if (hasExplicit4XSS) foundEnclosures.add("4XSS");
    // FRP is a strong FG signal alongside FIBERGLASS/FIBER GLASS
    const hasFG = /\b(?:FIBERGLASS|FIBER\s*GLASS|FRP)\b/i.test(t);
    const hasSS = /\bSTAINLESS\b/i.test(t);
    if (has4X) {
        if (hasFG) foundEnclosures.add("4XFG");
        if (hasSS) foundEnclosures.add("4XSS");
        if (!hasFG && !hasSS && !foundEnclosures.has("4XFG") && !foundEnclosures.has("4XSS")) foundEnclosures.add(inferBareRating ? "4XSS" : "4X");
    }
    if (/\bPOLY(?:CARBONATE)?\b/i.test(t)) foundEnclosures.add("POLY");

    // Spec-table precedence: when both SS and FG are detected, check which
    // material appears near high-confidence spec-table context keywords.
    if (foundEnclosures.has("4XFG") && foundEnclosures.has("4XSS")) {
        const SPEC_TABLE_KW = /\b(?:ENCLOSURE\s+MATERIAL|ENCLOSURE\s+NEMA\s+RATING|NAMEPLATE(?:\s+SCHEDULE)?|PANEL\s+TYPE)\b/i;
        const SPEC_TABLE_WINDOW = 150;
        let ssInSpecTable = false;
        let fgInSpecTable = false;
        const skRegex = new RegExp(SPEC_TABLE_KW, 'gi');
        let m;
        while ((m = skRegex.exec(t)) !== null) {
            // Look FORWARD only from the spec-table keyword: the value follows the label
            const start = m.index + m[0].length;
            const end = Math.min(t.length, start + SPEC_TABLE_WINDOW);
            const ctx = t.slice(start, end);
            if (/\bSTAINLESS\b/i.test(ctx)) ssInSpecTable = true;
            if (/\b(?:FIBERGLASS|FIBER\s*GLASS|FRP)\b/i.test(ctx)) fgInSpecTable = true;
        }
        if (ssInSpecTable) {
            // SS spec-table lock: stainless always wins, even if FG also appears in spec-table
            foundEnclosures.delete("4XFG");
        } else if (fgInSpecTable) {
            foundEnclosures.delete("4XSS");
        } else {
            // Spec-table did not resolve: prefer explicit compound token when unambiguous
            if (hasExplicit4XSS && !hasExplicit4XFG) {
                foundEnclosures.delete("4XFG");
            } else if (hasExplicit4XFG && !hasExplicit4XSS) {
                foundEnclosures.delete("4XSS");
            }
            // Both explicit tokens or neither → Varied / Multiple (leave both)
        }
    }

    return foundEnclosures;
}

function extractSpecsStrict(t, fields = ['mfg', 'hp', 'volt', 'phase', 'enc'], inferBareRating = true, inferMaterial = true) {
    if (!Array.isArray(fields)) fields = ['mfg', 'hp', 'volt', 'phase', 'enc'];
    // Return object: parameter values with variance flags (suffix 'V' indicates varied/ambiguous)
    const s = { 
        mfg: null, hp: null, volt: null, phase: null, enc: null,
        mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false
    };
    if (!t || typeof t !== 'string' || !fields.length) return s;
    
    // Normalize CAD control codes before parsing
    t = normalizeCADText(t);
    
    // --- Manufacturer ---
    if (fields.includes('mfg')) {
    const foundMfgs = new Set();
    // Case-insensitive ASCII aliases can only match where the uppercased text contains them, so the
    // substring prefilter skips the per-alias boundary regex scans that dominated MAIN CPU time.
    const upperText = t.toUpperCase();
    for (const [mfgKey, aliases] of Object.entries(EXACT_MFGS)) {
        for (const alias of aliases) {
            if (!upperText.includes(alias)) continue;
            const r = new RegExp(`(?:^|[^A-Z0-9])${alias}(?=[^A-Z0-9]|$)`, 'i');
            if (r.test(t)) {
                foundMfgs.add(mfgKey);
                break;
            }
        }
    }
    if (foundMfgs.size === 1) {
        s.mfg = [...foundMfgs][0];
    } else if (foundMfgs.size > 1) {
        s.mfg = [...foundMfgs][0];
        s.mfgV = true;
    }
    }

    // --- HP (number-before-unit + table format) ---
    if (fields.includes('hp')) {
    const foundHPs = _parseHP(t);
    if (foundHPs.size === 1) {
        s.hp = [...foundHPs][0];
    } else if (foundHPs.size > 1) {
        s.hp = [...foundHPs].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
        s.hpV = true;
    }
    }

    // --- Voltage (service-first, context-aware) ---
    if (fields.includes('volt')) {
    // Excludes inline transformer notation (e.g. "480V-120VAC") from service candidates.
    const { serviceVolts, controlVolts } = _parseVoltageContextAware(t);
    const targetVolts = serviceVolts.size > 0 ? serviceVolts : controlVolts;

    if (targetVolts.size > 0) {
        // Apply canonical dual-voltage pair handling (120+240 → keep 240; 277+480 → keep 480)
        if (targetVolts.size === 2) {
            const voltArray = [...targetVolts];
            const canonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(pair =>
                voltArray.includes(pair.low) && voltArray.includes(pair.high)
            );
            if (canonicalPair) targetVolts.delete(canonicalPair.low);
        }

        if (targetVolts.size === 1) {
            s.volt = [...targetVolts][0];
        } else {
            const voltArray = [...targetVolts];
            const isCanonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.some(pair =>
                voltArray.includes(pair.low) && voltArray.includes(pair.high) && voltArray.length === 2
            );
            if (isCanonicalPair) {
                const pair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(p =>
                    voltArray.includes(p.low) && voltArray.includes(p.high)
                );
                s.volt = pair.high;
                s.voltV = false;
            } else {
                // Multiple distinct service voltages → varied; pick highest priority
                s.volt = VOLT_PRIORITY.find(v => voltArray.includes(v.id))?.id || voltArray[0];
                s.voltV = true;
            }
        }
    }
    }

    // --- Phase ---
    if (fields.includes('phase')) {
    const foundPhases = new Set();
    if (/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*(?:[:\-]\s*)?3)\b/i.test(t)) foundPhases.add("3");
    if (/\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*(?:[:\-]\s*)?1)\b/i.test(t)) foundPhases.add("1");
    if (foundPhases.size === 1) {
        s.phase = [...foundPhases][0];
    } else if (foundPhases.size > 1) {
        s.phase = "3";
        s.phaseV = true;
    }
    }

    // --- Enclosure (NEMA 4X, NEMA4X, TYPE 4X, 4XSS, 4XFG, POLY) ---
    if (fields.includes('enc')) {
    const foundEnclosures = _parseEnclosure(t, inferBareRating, inferMaterial);
    if (foundEnclosures.size === 1) {
        s.enc = [...foundEnclosures][0];
    } else if (foundEnclosures.size > 1) {
        // Spec-table precedence already applied in _parseEnclosure.
        // If multiple enclosures still remain, output "Varied / Multiple" (no SS canonical tie-break).
        s.enc = "Varied / Multiple";
        s.encV = true;
    }
    }

    return s;
}

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Cox-User, X-Cox-Pass'
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        try {
            const url = new URL(request.url);
            const target = (url.searchParams.get('target') || '').toUpperCase();
            
            if (target === 'PDF') {
                const pdfUrl = url.searchParams.get('url');
                const attachmentMode = String(url.searchParams.get('mode') || '').toLowerCase() === 'attachment';
                const attachmentFilename = url.searchParams.get('filename') || 'schematica.pdf';
                if (!pdfUrl) {
                    console.error('[PDF] Missing URL parameter');
                    return new Response("Missing URL", { status: 400, headers: corsHeaders });
                }
                
                // Null/empty URL validation
                if (typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
                    console.error('[PDF] Invalid or empty URL parameter');
                    return new Response("Invalid URL parameter", { status: 400, headers: corsHeaders });
                }
                
                console.log('[PDF] Processing PDF request. Host:', getPdfUrlHost(pdfUrl));
                
                // Security: Validate PDF URL against allowlist
                if (!isAllowedPdfHost(pdfUrl)) {
                    console.error('[PDF] PDF host not allowed. Host:', getPdfUrlHost(pdfUrl));
                    return new Response("PDF host not allowed", { status: 403, headers: corsHeaders });
                }
                
                // Security: Fetch with timeout and size guards
                try {
                    const pdfResponse = await fetchPdfWithGuards(pdfUrl);
                    const newHeaders = new Headers(pdfResponse.headers);
                    newHeaders.set('Access-Control-Allow-Origin', '*');
                    newHeaders.set('Content-Type', 'application/pdf');
                    if (attachmentMode) applyAttachmentDisposition(newHeaders, attachmentFilename);
                    console.log('[PDF] Successfully fetched PDF');
                    return new Response(pdfResponse.body, { status: pdfResponse.status, headers: newHeaders });
                } catch (e) {
                    console.error('[PDF] PDF fetch failed. Host:', getPdfUrlHost(pdfUrl), 'Error:', e.message);
                    return new Response(`PDF fetch failed: ${e.message}`, { status: 400, headers: corsHeaders });
                }
            }

            if (target === 'PDF_BY_ID') {
                const panelId = url.searchParams.get('id');
                const attachmentMode = String(url.searchParams.get('mode') || '').toLowerCase() === 'attachment';
                const attachmentFilename = url.searchParams.get('filename') || `${panelId || 'schematica'}.pdf`;
                if (!panelId) return new Response("Missing ID", { status: 400, headers: corsHeaders });
                
                // Normalize the panel ID - remove CP- prefix, .dwg, .pdf extensions
                const cleanId = panelId.trim().replace(/^CP-|\.(?:dwg|pdf)$/gi, '');
                
                console.log('[PDF_BY_ID] Searching for panel. Original ID:', panelId, 'Clean ID:', cleanId);
                
                // Try multiple variations to find the record (most likely to least likely)
                // This typically matches on the first try with cleanId
                const variations = [
                    cleanId,
                    `CP-${cleanId}`,
                    `${cleanId}.dwg`,
                    `${cleanId}.pdf`,
                    `CP-${cleanId}.dwg`,
                    `CP-${cleanId}.pdf`
                ];
                
                let pdfUrl = null;
                let foundVariant = null;
                
                // Search for the record in the main database
                for (const variant of variations) {
                    try {
                        console.log('[PDF_BY_ID] Trying variant:', variant);
                        const searchUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?` +
                                        `filterByFormula=${encodeURIComponent(`{Control Panel Name}="${variant}"`)}` +
                                        `&fields%5B%5D=Control%20Panel%20PDF`;
                        
                        const searchResp = await fetch(searchUrl, { 
                            headers: mainBaseHeaders(env)
                        });
                        
                        if (!searchResp.ok) {
                            if (searchResp.status === 401 || searchResp.status === 403) {
                                throw createAirtableCredentialError('Main', searchResp.status, 'PDF_BY_ID exact lookup');
                            }
                            console.error('[PDF_BY_ID] Search failed for variant:', variant, 'Status:', searchResp.status);
                            continue;
                        }
                        
                        const searchData = await searchResp.json();
                        if (searchData.records && searchData.records.length > 0) {
                            const record = searchData.records[0];
                            pdfUrl = record.fields['Control Panel PDF']?.[0]?.url;
                            if (pdfUrl) {
                                foundVariant = variant;
                                console.log('[PDF_BY_ID] Found record with variant:', variant, 'PDF host:', getPdfUrlHost(pdfUrl));
                                break;
                            } else {
                                console.log('[PDF_BY_ID] Record found for variant:', variant, 'but no PDF URL attached');
                            }
                        } else {
                            console.log('[PDF_BY_ID] No records found for variant:', variant);
                        }
                    } catch (error) {
                        if (error?.isWorkerConfigError || error?.isAirtableCredentialError) throw error;
                        console.error('[PDF_BY_ID] Error searching variant:', variant, 'Error:', error.message);
                        // Continue to next variant on error
                    }
                }
                
                // If exact matches failed, try relaxed regex lookup for revision suffixes
                if (!pdfUrl) {
                    console.log('[PDF_BY_ID] Exact matches failed, attempting relaxed REGEX lookup for panel:', cleanId);
                    try {
                        // Escape special regex characters in cleanId for safe interpolation
                        const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        
                        // Use REGEX_MATCH to handle revision suffixes like r1, -REV, A, etc.
                        // This matches: CP-4167, CP-4167r1, CP-4167-REV, CP-4167 A, etc.
                        const regexPattern = `^CP-${escapedId}(?:[rR]\\d+|-REV|-rev|\\s*[A-Z])?(?:\\.dwg|\\.pdf)?$`;
                        const regexFormula = `REGEX_MATCH({Control Panel Name}, "${regexPattern}")`;
                        const regexSearchUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?` +
                                              `filterByFormula=${encodeURIComponent(regexFormula)}` +
                                              `&fields%5B%5D=Control%20Panel%20PDF&fields%5B%5D=Control%20Panel%20Name`;
                        
                        console.log('[PDF_BY_ID] Trying REGEX pattern:', regexPattern);
                        const regexResp = await fetch(regexSearchUrl, { 
                            headers: mainBaseHeaders(env)
                        });
                        
                        if (regexResp.ok) {
                            const regexData = await regexResp.json();
                            if (regexData.records && regexData.records.length > 0) {
                                // Use first match from regex search
                                const record = regexData.records[0];
                                pdfUrl = record.fields['Control Panel PDF']?.[0]?.url;
                                if (pdfUrl) {
                                    foundVariant = record.fields['Control Panel Name'] || 'regex-match';
                                    console.log('[PDF_BY_ID] REGEX match found:', foundVariant, 'PDF host:', getPdfUrlHost(pdfUrl));
                                } else {
                                    console.log('[PDF_BY_ID] REGEX matched record but no PDF URL attached');
                                }
                            } else {
                                console.log('[PDF_BY_ID] No REGEX matches found for pattern:', regexPattern);
                            }
                        } else {
                            if (regexResp.status === 401 || regexResp.status === 403) {
                                throw createAirtableCredentialError('Main', regexResp.status, 'PDF_BY_ID regex lookup');
                            }
                            console.warn('[PDF_BY_ID] REGEX search failed with status:', regexResp.status);
                        }
                    } catch (regexError) {
                        if (regexError?.isWorkerConfigError || regexError?.isAirtableCredentialError) throw regexError;
                        console.error('[PDF_BY_ID] REGEX lookup error:', regexError.message);
                        // Fall through to 404
                    }
                }
                
                // Null-URL validation
                if (!pdfUrl) {
                    console.error('[PDF_BY_ID] PDF not found. Panel ID:', panelId, 'Tried variations:', variations.join(', '));
                    return new Response("PDF not found for panel ID", { status: 404, headers: corsHeaders });
                }
                
                // Additional null/empty check before proceeding
                if (typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
                    console.error('[PDF_BY_ID] Invalid PDF URL format. Panel ID:', panelId);
                    return new Response("Invalid PDF URL for panel", { status: 500, headers: corsHeaders });
                }
                
                console.log('[PDF_BY_ID] Validated PDF URL for panel:', panelId, 'Variant used:', foundVariant);
                
                // Security: Validate PDF URL against allowlist
                if (!isAllowedPdfHost(pdfUrl)) {
                    console.error('[PDF_BY_ID] PDF host not allowed. Panel ID:', panelId, 'Host:', getPdfUrlHost(pdfUrl), 'Allowed hosts:', ALLOWED_PDF_HOSTS);
                    return new Response("PDF host not allowed", { status: 403, headers: corsHeaders });
                }
                
                // Security: Fetch with timeout and size guards
                try {
                    const pdfResponse = await fetchPdfWithGuards(pdfUrl);
                    const newHeaders = new Headers(pdfResponse.headers);
                    newHeaders.set('Access-Control-Allow-Origin', '*');
                    newHeaders.set('Content-Type', 'application/pdf');
                    if (attachmentMode) applyAttachmentDisposition(newHeaders, attachmentFilename);
                    console.log('[PDF_BY_ID] Successfully fetched PDF for panel:', panelId);
                    return new Response(pdfResponse.body, { status: pdfResponse.status, headers: newHeaders });
                } catch (e) {
                    console.error('[PDF_BY_ID] PDF fetch failed. Panel ID:', panelId, 'Host:', getPdfUrlHost(pdfUrl), 'Error:', e.message);
                    return new Response(`PDF fetch failed: ${e.message}`, { status: 400, headers: corsHeaders });
                }
            }

            const authStart = Date.now();
            // Immediately ready to authenticate!
            try {
                await ensureAuthAndFeedback(env);
            } catch(e) {
                if (e.isWorkerConfigError) {
                    console.error("Worker configuration error:", e.message);
                    return new Response(JSON.stringify({ error: "AirtableCredentialConfigurationError", scope: "WorkerConfig", message: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                if (e.isAirtableCredentialError) {
                    console.error("Airtable credential/configuration error:", e.message);
                    return new Response(JSON.stringify({ error: "AirtableCredentialConfigurationError", scope: e.airtableScope, status: e.upstreamStatus }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                if (e.isAuthBackendUnavailable) {
                    console.error("Auth backend unavailable:", e.message);
                    return new Response(JSON.stringify({ error: "AuthBackendUnavailable" }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '15' } });
                }
                throw e;
            }
            const authMs = Date.now() - authStart;

            // Fire and forget ML training in the background
            if (ENABLE_REQUEST_TIME_ML_TRAINING && !CACHE_NB_MODEL && !IS_BUILDING_ML && ctx && ctx.waitUntil) {
                ctx.waitUntil(buildMLBackground(env));
            }

            const u = request.headers.get('X-Cox-User');
            const p = request.headers.get('X-Cox-Pass');
            if (!CACHE_USERS || !CACHE_USERS.some(r => r.fields['Username']?.toLowerCase() === u?.toLowerCase() && r.fields['Passcode'] === p)) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (target === 'MAIN') {
                const offset = normalizeMainOffset(url.searchParams.get('offset'));
                const direction = normalizeMainSortDirection(url.searchParams.get('sort[0][direction]'));

                const pageSizeParam = url.searchParams.get('pageSize');
                const pageSize = validatePageSize(pageSizeParam);
                const mainStart = Date.now();
                // Cache hits only need the canonical sheet identity; the sheet body is parsed lazily on a miss.
                const sheetState = await refreshSheetState(env, request.url);
                const mainCacheKey = sheetVersion => buildMainCacheKey(request.url, { pageSize, direction, offset,
                    feedbackVersion: getFeedbackCacheVersion(), sheetVersion, sheetSource: env.SHEETS_ENDPOINT });
                const cacheKeyUrl = mainCacheKey(sheetState?.meta?.version);
                const cacheKeyRequest = new Request(cacheKeyUrl, { method: 'GET' });
                const workerCache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;

                const fetchMainPayload = async (sheetSnapshot, healedOverrides) => {
                    const upstreamStart = Date.now();
                    let mainUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?pageSize=${String(pageSize)}` +
                                `&fields%5B%5D=Control%20Panel%20Name` +
                                `&fields%5B%5D=Items` +
                                `&fields%5B%5D=Control%20Panel%20PDF` +
                                `&sort%5B0%5D%5Bfield%5D=Control%20Panel%20Name` +
                                `&sort%5B0%5D%5Bdirection%5D=${direction}`;

                    if (offset) mainUrl += `&offset=${encodeURIComponent(offset)}`;
                    const mainResp = await fetch(mainUrl, { headers: mainBaseHeaders(env) });
                    if (!mainResp.ok) {
                        if (mainResp.status === 401 || mainResp.status === 403) {
                            throw createAirtableCredentialError('Main', mainResp.status, 'MAIN fetch');
                        }
                        const err = new Error(`Airtable Main Data HTTP ${mainResp.status}`);
                        err.upstreamStatus = mainResp.status;
                        throw err;
                    }
                    const mainJson = await mainResp.json();
                    const upstreamMs = Date.now() - upstreamStart;

                    const processStart = Date.now();
                    let parsedRecords = 0;
                    let parsedChars = 0;
                    let sheetRecords = 0;
                    const sheetCounts = { matchedRows: 0, withSpecs: 0, withMetadata: 0, withUncertainty: 0 };
                    const activeRecords = (mainJson.records || []).map(r => {
                        const rawId = String(r.fields['Control Panel Name'] || "");
                        const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();

                        const rawItems = r.fields['Items'];
                        let fullDesc = (typeof rawItems === 'string' ? rawItems : Array.isArray(rawItems) ? rawItems.join(' ') : "");
                        fullDesc = normalizeCADText(fullDesc).toUpperCase();

                        const textToParse = fullDesc + " " + cleanId;
                        const sheet = sheetSnapshot?.index.get(normalizeSheetPanelId(cleanId)) || {};
                        // Rating and material fall back independently; trusted material never needs material inference.
                        const fallbackFields = ['mfg', 'hp', 'volt', 'phase'].filter(field => sheet[field] === undefined);
                        const inferMaterial = sheet.encMaterial === undefined;
                        if (sheet.enc === undefined || inferMaterial) fallbackFields.push('enc');
                        const explicit = fallbackFields.length ? extractSpecsStrict(textToParse, fallbackFields, false, inferMaterial) : {};
                        if (fallbackFields.length) {
                            parsedRecords++;
                            parsedChars += textToParse.length;
                        }
                        if (Object.keys(sheet).length) sheetRecords++;

                        let finalMfg = sheet.mfg ?? explicit.mfg ?? null;
                        let finalEnc = fallbackFields.includes('enc') ? explicit.enc : (sheet.enc ?? null);
                        let finalHp = sheet.hp ?? explicit.hp ?? null;
                        let finalVolt = sheet.volt ?? explicit.volt ?? null;
                        let finalPhase = sheet.phase ?? explicit.phase ?? null;

                        if (CACHE_NB_MODEL && fallbackFields.length) {
                            const bayesText = textToParse.slice(0, 1500);
                            if (!finalMfg) finalMfg = CACHE_NB_MODEL.predict(bayesText, 'mfg');
                            if (!finalEnc && fallbackFields.includes('enc')) finalEnc = CACHE_NB_MODEL.predict(bayesText, 'enc');
                            if (!finalHp) {
                                const predictedHp = CACHE_NB_MODEL.predict(bayesText, 'hp');
                                if (predictedHp && isValidHP(predictedHp)) finalHp = predictedHp;
                            }
                            if (!finalVolt) {
                                const predictedVolt = CACHE_NB_MODEL.predict(bayesText, 'volt');
                                if (predictedVolt && isValidVoltage(predictedVolt)) finalVolt = predictedVolt;
                            }
                            if (!finalPhase) {
                                const predictedPhase = CACHE_NB_MODEL.predict(bayesText, 'phase');
                                if (predictedPhase && isValidPhase(predictedPhase)) finalPhase = predictedPhase;
                            }
                        }

                        let finalCategory = null;
                        const overrides = healedOverrides[cleanId];
                        if (overrides) {
                            if (sheet.mfg === undefined && overrides.mfg) finalMfg = overrides.mfg;
                            if (sheet.hp === undefined && overrides.hp) finalHp = overrides.hp;
                            if (sheet.volt === undefined && overrides.volt) finalVolt = overrides.volt;
                            if (sheet.phase === undefined && overrides.phase) finalPhase = overrides.phase;
                            if (fallbackFields.includes('enc') && overrides.enc) finalEnc = overrides.enc;
                            if (overrides.category) finalCategory = overrides.category;
                        }
                        if (!inferMaterial && sheet.enc === undefined) {
                            const rating = normalizeSheetSpec('enc', finalEnc);
                            finalEnc = rating === '4XSS' || rating === '4XFG' ? '4X' : rating === 'POLY' ? null : rating;
                        }

                        const pdfUrl = r.fields['Control Panel PDF']?.[0]?.url || "";
                        const pdfStatus = pdfUrl ? "present" : "missing";

                        const record = applySheetSpecs({
                            id: cleanId,
                            displayId: "CP-" + cleanId,
                            desc: fullDesc,
                            pdfUrl,
                            pdfStatus,
                            mfg: finalMfg,
                            hp: finalHp,
                            volt: finalVolt,
                            phase: finalPhase,
                            enc: finalEnc,
                            category: finalCategory,
                            reject_keywords: overrides ? (overrides.reject_keywords || []) : [],
                            mfgV: explicit.mfgV || false,
                            hpV: explicit.hpV || false,
                            voltV: explicit.voltV || false,
                            phaseV: explicit.phaseV || false,
                            encV: explicit.encV || false
                        }, sheetSnapshot);
                        if (sheetSnapshot?.index.has(normalizeSheetPanelId(cleanId))) sheetCounts.matchedRows++;
                        if (record.sheetSpecs) sheetCounts.withSpecs++;
                        if (record.sheetMetadata) sheetCounts.withMetadata++;
                        if (record.sheetUncertainty) sheetCounts.withUncertainty++;
                        return record;
                    });
                    const processMs = Date.now() - processStart;
                    const serializeStart = Date.now();
                    // `sheetStatus` records the authority state this page was computed with (cached with the page);
                    // the live isolate state is in the X-SCHEMATICA-SHEETS-STATUS header.
                    const sheetStatus = { ...(sheetStatusOf(sheetState) || { state: 'unconfigured', transform: SPEC_TRANSFORM_VERSION }),
                        rows: sheetSnapshot ? sheetSnapshot.index.size : 0, records: activeRecords.length, ...sheetCounts };
                    const body = JSON.stringify({ records: activeRecords, offset: mainJson.offset,
                        sheets: sheetSnapshot ? { revision: sheetSnapshot.revision, hash: sheetSnapshot.hash, updatedAt: sheetSnapshot.updatedAt } : null,
                        sheetStatus });
                    const serializeMs = Date.now() - serializeStart;
                    return { body, upstreamMs, processMs, serializeMs, parsedRecords, parsedChars, sheetRecords };
                };

                const startRefresh = () => {
                    // Key the computed page by the snapshot actually applied, never by an unverified header.
                    const sheetSnapshot = materializeSheetSnapshot(sheetState);
                    const healedOverrides = CACHE_HEALED;
                    const refreshKeyUrl = mainCacheKey(sheetSnapshot?.version);
                    const existing = MAIN_PAGE_INFLIGHT.get(refreshKeyUrl);
                    if (existing) return { promise: existing, coalesced: true };
                    const promise = (async () => {
                        try {
                            const result = await fetchMainPayload(sheetSnapshot, healedOverrides);
                            if (workerCache) {
                                const cacheHeaders = new Headers({ ...corsHeaders, 'Content-Type': 'application/json' });
                                cacheHeaders.set('Cache-Control', MAIN_PAGE_CACHE_CONTROL);
                                cacheHeaders.set('X-SCHEMATICA-CACHED-AT', String(Date.now()));
                                const cacheResponse = new Response(result.body, { headers: cacheHeaders });
                                const refreshKeyRequest = new Request(refreshKeyUrl, { method: 'GET' });
                                if (ctx && ctx.waitUntil) ctx.waitUntil(workerCache.put(refreshKeyRequest, cacheResponse));
                                else await workerCache.put(refreshKeyRequest, cacheResponse);
                            }
                            return result;
                        } finally {
                            if (MAIN_PAGE_INFLIGHT.get(refreshKeyUrl) === promise) {
                                MAIN_PAGE_INFLIGHT.delete(refreshKeyUrl);
                            }
                        }
                    })();
                    MAIN_PAGE_INFLIGHT.set(refreshKeyUrl, promise);
                    return { promise, coalesced: false };
                };

                if (workerCache) {
                    const cached = await workerCache.match(cacheKeyRequest);
                    if (cached) {
                        const cachedAtRaw = Number(cached.headers.get('X-SCHEMATICA-CACHED-AT'));
                        const cachedAt = Number.isFinite(cachedAtRaw) ? cachedAtRaw : 0;
                        const ageMs = cachedAt > 0 ? (Date.now() - cachedAt) : Number.POSITIVE_INFINITY;
                        const isFresh = ageMs <= MAIN_PAGE_CACHE_FRESH_MS;
                        const isStaleServeable = ageMs > MAIN_PAGE_CACHE_FRESH_MS && ageMs <= MAIN_PAGE_CACHE_STALE_MS;
                        if (isFresh || isStaleServeable) {
                            if (isStaleServeable) {
                                const refresh = startRefresh();
                                if (ctx && ctx.waitUntil) ctx.waitUntil(refresh.promise.catch((err) => {
                                    console.warn('[MAIN] stale-refresh failed:', err?.message || err);
                                }));
                            }
                            const hitHeaders = new Headers(cached.headers);
                            hitHeaders.set('Cache-Control', env.SHEETS_ENDPOINT ? 'private, no-store' : MAIN_PAGE_CACHE_CONTROL);
                            hitHeaders.set('X-SCHEMATICA-SHEETS-STATUS', sheetStatusHeader(sheetStatusOf(sheetState)));
                            setMainTimingHeaders(hitHeaders, {
                                cacheStatus: isFresh ? 'HIT' : 'STALE',
                                authMs,
                                upstreamMs: 0,
                                processMs: 0,
                                serializeMs: 0,
                                totalMs: Date.now() - mainStart
                            });
                            return new Response(cached.body, { status: cached.status, headers: hitHeaders });
                        }
                    }
                }

                const refresh = startRefresh();
                const mainResult = await refresh.promise;
                const totalMs = Date.now() - mainStart;
                const responseHeaders = new Headers({ ...corsHeaders, 'Content-Type': 'application/json' });
                responseHeaders.set('Cache-Control', env.SHEETS_ENDPOINT ? 'private, no-store' : MAIN_PAGE_CACHE_CONTROL);
                responseHeaders.set('X-SCHEMATICA-SHEETS-STATUS', sheetStatusHeader(sheetStatusOf(sheetState)));
                setMainTimingHeaders(responseHeaders, {
                    cacheStatus: refresh.coalesced ? 'COALESCED' : 'MISS',
                    authMs,
                    upstreamMs: mainResult.upstreamMs,
                    processMs: mainResult.processMs,
                    serializeMs: mainResult.serializeMs,
                    totalMs,
                    parsedRecords: mainResult.parsedRecords,
                    parsedChars: mainResult.parsedChars,
                    sheetRecords: mainResult.sheetRecords
                });
                return new Response(mainResult.body, { headers: responseHeaders });
            }

            if (target === 'FEEDBACK') {
                const fbUrl = `https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_FEEDBACK}`;
                const body = await request.json();
                const resp = await fetch(fbUrl, {
                    method: 'POST',
                    headers: usersBaseHeaders(env, { json: true }),
                    body: JSON.stringify(body)
                });
                if (resp.ok) {
                    CACHE_HEALED = {};
                    CACHE_HEALED_TIME = 0;
                    const inflightRefresh = CACHE_HEALED_PROMISE;
                    if (inflightRefresh) {
                        try {
                            await inflightRefresh;
                        } catch (_inflightErr) {}
                    }
                    try {
                        await ensureHealedCache(env);
                    } catch (_refreshError) {
                        // CACHE_HEALED stays {}; its content fingerprint already keys MAIN pages apart.
                    }
                }
                return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            return new Response("Invalid Target", { status: 400, headers: corsHeaders });

        } catch (error) {
            if (error?.isWorkerConfigError) {
                return new Response(JSON.stringify({ error: "AirtableCredentialConfigurationError", scope: "WorkerConfig", message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            if (error?.isAirtableCredentialError) {
                return new Response(JSON.stringify({ error: "AirtableCredentialConfigurationError", scope: error.airtableScope, status: error.upstreamStatus }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const status = Number(error?.upstreamStatus) === 429 || Number(error?.upstreamStatus) >= 500 ? 503 : 500;
            const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
            if (status === 503) headers['Retry-After'] = '15';
            return new Response(JSON.stringify({ error: "Worker Exception", message: error.message }), { status, headers });
        }
    }
};
