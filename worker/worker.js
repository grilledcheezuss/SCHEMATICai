// ==========================================
// 🧠 SCHEMATICA ai WORKER v2.5.3 (Security Hardening & SSRF Guards)
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
let CACHE_TIME = 0;
let CACHE_AUTH_PROMISE = null;
let IS_BUILDING_ML = false;
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour

const VOTE_THRESHOLD = 3;

// --- EXACT DICTIONARIES ---
const EXACT_MFGS = {
    'GORMAN RUPP': ['GORMAN', 'GR', 'GRSP'],
    'BARNES': ['BARNES', 'SITHE', 'CRANE'],
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
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|230|220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:120|115|110)\b/i }
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
        if (u.includes(canon)) return canon;
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
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${env.AIRTABLE_WRITE_KEY}` } });
        if (!resp.ok) { if (resp.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; } break; }
        const data = await resp.json();
        if (data.records) records.push(...data.records);
        offset = data.offset; pages++;
    } while (offset && pages < maxPages);
    return records;
}

// 1. FAST CORE CACHE: Only fetches Auth and Feedback (Takes < 0.5s)
async function ensureAuthAndFeedback(env) {
    if (CACHE_USERS && (Date.now() - CACHE_TIME < CACHE_DURATION)) return;
    if (CACHE_AUTH_PROMISE) return CACHE_AUTH_PROMISE;
    
    CACHE_AUTH_PROMISE = (async () => {
        console.log("Fetching Auth & Feedback...");
        const [usersData, fbData] = await Promise.all([
            fetch(`https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_USERS}`, { headers: { 'Authorization': `Bearer ${env.AIRTABLE_WRITE_KEY}` } }).then(r=>r.json()),
            fetchAirtablePages(TABLE_FEEDBACK, 5, ['Panel ID', 'Corrections'], env) // Cap at 500 to keep it fast
        ]);

        CACHE_USERS = usersData.records || [];
        
        CACHE_HEALED = {};
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
                if (!CACHE_HEALED[id]) CACHE_HEALED[id] = {};
                if (param === 'reject_keyword') {
                    if (!CACHE_HEALED[id].reject_keywords) CACHE_HEALED[id].reject_keywords = [];
                    CACHE_HEALED[id].reject_keywords.push(value);
                } else {
                    CACHE_HEALED[id][param] = value;
                }
            }
        }
        CACHE_TIME = Date.now();
    })();
    await CACHE_AUTH_PROMISE;
    CACHE_AUTH_PROMISE = null;
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
            
            const resp = await fetch(mainUrl, { headers: { 'Authorization': `Bearer ${env.AIRTABLE_READ_KEY}` } });
            if (!resp.ok) {
                if (resp.status === 429) { 
                    await new Promise(r => setTimeout(r, 500)); 
                    continue; 
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

// Security helper: Fetch PDF with timeout and size limits
async function fetchPdfWithGuards(url) {
    if (!isAllowedPdfHost(url)) {
        throw new Error('PDF host not allowed');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        
        // Check content length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE_BYTES) {
            throw new Error('PDF too large');
        }
        
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Security helper: Validate and clamp pageSize parameter
function validatePageSize(pageSizeParam) {
    const pageSize = parseInt(pageSizeParam) || 100;
    return Math.min(Math.max(pageSize, 1), 100); // Clamp between 1 and 100
}

function extractSpecsStrict(t) {
    const s = { mfg: null, hp: null, volt: null, phase: null, enc: null };
    if (!t || typeof t !== 'string') return s;
    
    // Normalize CAD control codes before parsing
    t = normalizeCADText(t);
    
    for (const [mfgKey, aliases] of Object.entries(EXACT_MFGS)) {
        for (const alias of aliases) {
            const r = new RegExp(`(?<!(FOR|FITS|REPLACES|COMPATIBLE|LIKE|WITH)\\s+)\\b${alias}\\b`, 'i');
            if (r.test(t)) { s.mfg = mfgKey; break; }
        }
        if (s.mfg) break;
    }

    if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,100}(?:4XSS|STAINLESS|304|316)/i.test(t)) s.enc = '4XSS';
    else if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,100}(?:POLY|POLYCARBONATE)/i.test(t)) s.enc = 'POLY';
    else if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,100}(?:FIBERGLASS|FRP|NON-METALLIC|4XFG)/i.test(t)) s.enc = '4XFG';
    
    if (!s.enc) {
        if (/\b(POLY|POLYCARBONATE)\b/i.test(t)) s.enc = 'POLY';
        else if (/\b(FIBERGLASS|FRP|NON-METALLIC|4XFG)\b/i.test(t) || t.includes('NEMA 4X')) s.enc = '4XFG';
        else {
            const ssMatch = t.match(/\b(4XSS|STAINLESS|304|316|NEMA 4X SS|SS)\b/i);
            if (ssMatch) {
                const idx = ssMatch.index;
                const context = t.substring(Math.max(0, idx - 100), idx + 100);
                // Only reject if clearly hardware-related (not table context)
                if (!/SCREW|LATCH|HARDWARE|NAMEPLATE|HINGE|MOUNT|FEET/i.test(context)) s.enc = '4XSS';
            }
        }
    }

    let maxHP = 0; let m;
    const hpPatterns = [
        /\b(\d+)\s+(\d+\/\d+)\s*(?:HP|H\.P\.|HORSEPOWER|KW)\b/gi, 
        /(?:^|[^0-9a-z\/\.-])((?:\d*\.)?\d+(?:[\/-]\d+)?(?:\/\d+)?)\s*(?:HP|H\.P\.|HORSEPOWER|KW)\b/gi, 
        /\b(?:HP|H\.P\.|HORSEPOWER)\s*[:\-|]?\s*((?:\d*\.)?\d+(?:[\/-]\d+)?(?:\/\d+)?)\b/gi 
    ];

    for (const regex of hpPatterns) {
        for (const match of t.matchAll(regex)) {
            let raw = match[1]; let val = 0;
            if (match.length > 2 && match[2]) {
                const [num, den] = match[2].split('/');
                val = parseFloat(raw) + (parseFloat(num) / parseFloat(den));
            } else if (raw.includes('-')) {
                const parts = raw.split('-'); 
                if (parts[1] && parts[1].includes('/')) {
                    const frac = parts[1].split('/'); val = parseFloat(parts[0]) + (parseFloat(frac[0]) / parseFloat(frac[1])); 
                } else { val = parseFloat(parts[1] || parts[0]); }
            } else if (raw.includes('/')) {
                const parts = raw.split('/'); val = parseFloat(parts[0]) / parseFloat(parts[1]);
            } else { val = parseFloat(raw); }
            
            if (match[0].toUpperCase().includes('KW')) val *= 1.341;
            if (!isNaN(val) && val >= 0.1 && val <= 500 && val > maxHP) maxHP = val;
        }
    }
    if (maxHP > 0) s.hp = (Math.round(maxHP * 10) / 10).toString();

    for (const v of VOLT_PRIORITY) { if (v.match.test(t)) { s.volt = v.id; break; } }
    if (/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*3)\b/i.test(t)) s.phase = "3"; 
    else if (/\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*1)\b/i.test(t)) s.phase = "1"; 

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
                if (!pdfUrl) return new Response("Missing URL", { status: 400, headers: corsHeaders });
                
                // Security: Validate PDF URL against allowlist
                if (!isAllowedPdfHost(pdfUrl)) {
                    return new Response("PDF host not allowed", { status: 403, headers: corsHeaders });
                }
                
                // Security: Fetch with timeout and size guards
                try {
                    const pdfResponse = await fetchPdfWithGuards(pdfUrl);
                    const newHeaders = new Headers(pdfResponse.headers);
                    newHeaders.set('Access-Control-Allow-Origin', '*');
                    newHeaders.set('Content-Type', 'application/pdf');
                    return new Response(pdfResponse.body, { status: pdfResponse.status, headers: newHeaders });
                } catch (e) {
                    return new Response(`PDF fetch failed: ${e.message}`, { status: 400, headers: corsHeaders });
                }
            }

            if (target === 'PDF_BY_ID') {
                const panelId = url.searchParams.get('id');
                if (!panelId) return new Response("Missing ID", { status: 400, headers: corsHeaders });
                
                // Normalize the panel ID - remove CP- prefix, .dwg, .pdf extensions
                const cleanId = panelId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').trim();
                
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
                
                // Search for the record in the main database
                for (const variant of variations) {
                    const searchUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?` +
                                    `filterByFormula=${encodeURIComponent(`{Control Panel Name}="${variant}"`)}` +
                                    `&fields%5B%5D=Control%20Panel%20PDF`;
                    
                    const searchResp = await fetch(searchUrl, { 
                        headers: { 'Authorization': `Bearer ${env.AIRTABLE_READ_KEY}` } 
                    });
                    
                    if (!searchResp.ok) continue;
                    
                    const searchData = await searchResp.json();
                    if (searchData.records && searchData.records.length > 0) {
                        const record = searchData.records[0];
                        pdfUrl = record.fields['Control Panel PDF']?.[0]?.url;
                        if (pdfUrl) break;
                    }
                }
                
                if (!pdfUrl) {
                    return new Response("PDF not found for panel ID", { status: 404, headers: corsHeaders });
                }
                
                // Security: Validate PDF URL against allowlist
                if (!isAllowedPdfHost(pdfUrl)) {
                    return new Response("PDF host not allowed", { status: 403, headers: corsHeaders });
                }
                
                // Security: Fetch with timeout and size guards
                try {
                    const pdfResponse = await fetchPdfWithGuards(pdfUrl);
                    const newHeaders = new Headers(pdfResponse.headers);
                    newHeaders.set('Access-Control-Allow-Origin', '*');
                    newHeaders.set('Content-Type', 'application/pdf');
                    return new Response(pdfResponse.body, { status: pdfResponse.status, headers: newHeaders });
                } catch (e) {
                    return new Response(`PDF fetch failed: ${e.message}`, { status: 400, headers: corsHeaders });
                }
            }

            // Immediately ready to authenticate!
            await ensureAuthAndFeedback(env);

            // Fire and forget ML training in the background
            if (!CACHE_NB_MODEL && !IS_BUILDING_ML && ctx && ctx.waitUntil) {
                ctx.waitUntil(buildMLBackground(env));
            }

            const u = request.headers.get('X-Cox-User');
            const p = request.headers.get('X-Cox-Pass');
            if (!CACHE_USERS || !CACHE_USERS.some(r => r.fields['Username']?.toLowerCase() === u?.toLowerCase() && r.fields['Passcode'] === p)) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (target === 'MAIN') {
                const offset = url.searchParams.get('offset');
                const direction = url.searchParams.get('sort[0][direction]') || 'desc';
                
                // Security: Validate and clamp pageSize
                const pageSizeParam = url.searchParams.get('pageSize');
                const pageSize = validatePageSize(pageSizeParam);

                let mainUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?pageSize=${String(pageSize)}` +
                              `&fields%5B%5D=Control%20Panel%20Name` +
                              `&fields%5B%5D=Items` +
                              `&fields%5B%5D=Control%20Panel%20PDF` +
                              `&sort%5B0%5D%5Bfield%5D=Control%20Panel%20Name` +
                              `&sort%5B0%5D%5Bdirection%5D=${direction}`;
                
                if (offset) mainUrl += `&offset=${encodeURIComponent(offset)}`;

                const mainResp = await fetch(mainUrl, { headers: { 'Authorization': `Bearer ${env.AIRTABLE_READ_KEY}` } });
                if (!mainResp.ok) throw new Error(`Airtable Main Data HTTP ${mainResp.status}`);
                const mainJson = await mainResp.json();
                
                const activeRecords = (mainJson.records || []).map(r => {
                    const rawId = String(r.fields['Control Panel Name'] || "");
                    const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();
                    
                    const rawItems = r.fields['Items'];
                    let fullDesc = (typeof rawItems === 'string' ? rawItems : Array.isArray(rawItems) ? rawItems.join(' ') : "");
                    
                    // Normalize CAD control codes before case conversion to ensure lowercase codes are also removed
                    fullDesc = normalizeCADText(fullDesc).toUpperCase();
                    
                    const textToParse = fullDesc + " " + cleanId;
                    const explicit = extractSpecsStrict(textToParse);

                    let finalMfg = explicit.mfg;
                    let finalEnc = explicit.enc;
                    let finalHp = explicit.hp;
                    let finalVolt = explicit.volt;
                    let finalPhase = explicit.phase;
                    
                    if (CACHE_NB_MODEL) {
                        const bayesText = textToParse.slice(0, 1500); 
                        if (!finalMfg) finalMfg = CACHE_NB_MODEL.predict(bayesText, 'mfg');
                        if (!finalEnc) finalEnc = CACHE_NB_MODEL.predict(bayesText, 'enc');
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

                    const overrides = CACHE_HEALED[cleanId];
                    if (overrides) {
                        if (overrides.mfg) finalMfg = overrides.mfg;
                        if (overrides.hp) finalHp = overrides.hp;
                        if (overrides.volt) finalVolt = overrides.volt;
                        if (overrides.phase) finalPhase = overrides.phase;
                        if (overrides.enc) finalEnc = overrides.enc;
                        if (overrides.category) finalCategory = overrides.category;
                    }

                    return {
                        id: cleanId, displayId: "CP-" + cleanId, desc: fullDesc, pdfUrl: r.fields['Control Panel PDF']?.[0]?.url || "",
                        mfg: finalMfg, hp: finalHp, volt: finalVolt, phase: finalPhase, enc: finalEnc, category: finalCategory,
                        reject_keywords: overrides ? (overrides.reject_keywords || []) : []
                    };
                });

                return new Response(JSON.stringify({ records: activeRecords, offset: mainJson.offset }), { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }

            if (target === 'FEEDBACK') {
                const fbUrl = `https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_FEEDBACK}`;
                const body = await request.json();
                const resp = await fetch(fbUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.AIRTABLE_WRITE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                CACHE_TIME = 0; CACHE_USERS = null;
                return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            return new Response("Invalid Target", { status: 400, headers: corsHeaders });

        } catch (error) {
            return new Response(JSON.stringify({ error: "Worker Exception", message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
    }
};
