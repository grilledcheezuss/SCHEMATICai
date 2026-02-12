// --- SCHEMATICA ai v1.78 ---
const APP_VERSION = "v1.78";
const WORKER_URL = "https://cox-proxy.thomas-85a.workers.dev"; 
const CONFIG = { mainTable: 'MAIN', feedbackTable: 'FEEDBACK', voteThreshold: 3, estTotal: 7500 };

window.TEMPLATE_BYTES = null;
window.BORDER_INFO_BYTES = null;
window.BORDER_STD_BYTES = null;

const LAYOUT_RULES = {
    TITLE: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "CONTROL PANEL", x: 0.15, y: 0.569, w: 0.7, h: 0.04, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PROJECT SUBMITTAL", x: 0.201, y: 0.69, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PLEASE REVIEW THOROUGHLY...", x: 0.201, y: 0.72, w: 0.6, h: 0.03, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.25, y: 0.75, w: 0.499, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.835, y: 0.948, w: 0.15, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    INFO: [
        { map: "cust", x: 0.119, y: 0.085, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.058, y: 0.108, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.149, y: 0.889, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.909, y: 0.94, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_PORTRAIT: [
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.144, y: 0.89, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.92, y: 0.945, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_LANDSCAPE: [
        { x: 0.88, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.88, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.05, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.12, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.05, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    GENERAL: [
        { map: "custom", text: "GENERAL LAYOUT PLACEHOLDER", x: 0.499, y: 0.499, w: 0.3, h: 0.051, fontSize: 14, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ]
};

const AI_TRAINING_DATA = { 
    MANUFACTURERS: { 
        'GORMAN RUPP':['gorman','gr'], 
        'BARNES':['barnes','sithe','crane'], 
        'HYDROMATIC':['hydromatic'], 
        'FLYGT':['flygt'], 
        'MYERS':['myers'], 
        'GOULDS':['goulds'], 
        'ZOELLER':['zoeller'], 
        'LIBERTY':['liberty'], 
        'WILO':['wilo'], 
        'PENTAIR':['pentair'], 
        'ABS':['abs']
    },
    ENCLOSURES: { 
        '4XSS': ['4XSS', 'STAINLESS', '304', '316', 'NEMA 4X SS', 'SS'], 
        '4XFG': ['4XFG', 'FIBERGLASS', 'FG', 'NON-METALLIC', 'NEMA 4X FG', 'FRP', 'NEMA 4X'], 
        'POLY': ['POLY', 'POLYCARBONATE'] 
    },
    ALIASES: {
        'LA': ['LA', 'SA', 'LIGHTNING ARRESTOR', 'SURGE ARRESTOR', 'SURGE SUPPRESSOR', 'TVSS', 'SPD', 'SURGE PROTECTOR', 'LIGHTNING ARRESTORS', 'SURGE ARRESTORS'],
        'PM': ['PM', 'PHASE MONITOR', 'PHASE FAIL', 'PHASE RELAY', 'MONITOR RELAY', 'PHASE MONITORS'],
        'VFD': ['VFD', 'VFDS', 'VARIABLE FREQUENCY DRIVE', 'DRIVE', 'INVERTER', 'DRIVES', 'INVERTERS', 'SOFT START', 'SOFTSTART'],
        'HOA': ['HOA', 'HAND OFF AUTO', 'HAND-OFF-AUTO', 'SELECTOR SWITCH', 'SWITCHES'],
        'IS': ['IS', 'INTRINSICALLY SAFE', 'INTRINSIC SAFETY']
    },
    DATA: { 
        HP: [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100], 
        VOLT: [120, 208, 240, 480, 575], 
        PHASE: [1, 3] 
    } 
};

class DB {
    static open() { return new Promise((r, j) => { const q = indexedDB.open("CoxSchematicDB", 8); q.onupgradeneeded = e => { const d = e.target.result; if(d.objectStoreNames.contains("cache")) d.deleteObjectStore("cache"); if(d.objectStoreNames.contains("chunks")) d.deleteObjectStore("chunks"); d.createObjectStore("chunks"); }; q.onsuccess = e => r(e.target.result); q.onerror = e => j(e); }); }
    static async putChunk(k, v) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readwrite"); t.objectStore("chunks").put(v, k); t.oncomplete = r; t.onerror = j; }); }
    static async getChunk(k) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").get(k); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async getChunkKeys() { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async deleteLegacy() { try { const d = await this.open(); const t = d.transaction("cache", "readwrite"); t.objectStore("cache").clear(); } catch(e){} }
    static async clear() { const d=await this.open(); return new Promise(r=>{ const t=d.transaction("chunks","readwrite"); t.objectStore("chunks").clear(); t.oncomplete=r; }); }
    static deleteDatabase() { return new Promise((resolve, reject) => { const req = indexedDB.deleteDatabase("CoxSchematicDB"); req.onsuccess = () => resolve(); req.onerror = () => reject(); req.onblocked = () => resolve(); }); }
}

class CacheService {
    static activeKey = null;
    static async prepareKey(p) { if(!p) return null; const e = new TextEncoder(); const k = await crypto.subtle.importKey("raw", e.encode(p), "PBKDF2", false, ["deriveKey"]); this.activeKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: e.encode("COX_SALT_V1"), iterations: 100000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); return this.activeKey; }
    static async saveShard(id, data) { if(!this.activeKey) return; const j = JSON.stringify(data); const e = await this.enc(j); await DB.putChunk(id, e); }
    static async loadAllWithProgress(progressCallback) { if(!this.activeKey) return null; const keys = await DB.getChunkKeys(); if(!keys || keys.length === 0) return null; for(let i = 0; i < keys.length; i++) { if(i % 5 === 0) await new Promise(r => setTimeout(r, 5)); const chunk = await DB.getChunk(keys[i]); if(chunk) { try { const dec = await this.dec(chunk); if(dec) { const data = JSON.parse(dec); data.forEach(r => { window.LOCAL_DB.push(r); window.ID_MAP.set(r.id, r); if(r.mfg) window.FOUND_MFGS.add(r.mfg); }); } } catch(e) {} } if(progressCallback) progressCallback(Math.round(((i + 1) / keys.length) * 100)); } return true; }
    static async enc(t) { const iv = crypto.getRandomValues(new Uint8Array(12)); const e = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.activeKey, new TextEncoder().encode(t)); return Array.from(iv).map(b=>b.toString(16).padStart(2,'0')).join('') + ":" + Array.from(new Uint8Array(e)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
    static async dec(t) { const [i, d] = t.split(':'); const iv = new Uint8Array(i.match(/.{1,2}/g).map(b=>parseInt(b,16))); const da = new Uint8Array(d.match(/.{1,2}/g).map(b=>parseInt(b,16))); try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, this.activeKey, da)); } catch { return null; } }
}

class AuthService {
    static init() { const u = localStorage.getItem('cox_user'); const p = localStorage.getItem('cox_pass'); if (u && p) { document.documentElement.classList.add('logged-in'); document.getElementById('auth-overlay').classList.remove('active-modal'); UI.pop(); return true; } return false; }
    static login() { const u = document.getElementById('auth-user').value.trim(); const p = document.getElementById('auth-pass').value.trim(); if (!u || !p) return alert("Missing Credentials"); localStorage.setItem('cox_user', u); localStorage.setItem('cox_pass', p); location.reload(); }
    static logout() { localStorage.clear(); sessionStorage.clear(); location.reload(); }
    static headers() { return { 'X-Cox-User': localStorage.getItem('cox_user'), 'X-Cox-Pass': localStorage.getItem('cox_pass') }; }
}

class NetworkService {
    static async fetch(t, p='') { 
        const b = WORKER_URL.startsWith('http') ? WORKER_URL : `https://${WORKER_URL}`;
        const h = AuthService.headers();
        console.log(`🌐 Fetching ${t}...`);
        return fetch(`${b}?target=${encodeURIComponent(t)}${p.replace('?', '&')}`, { headers: h }); 
    }
}

class AIParser {
    static parse(t, id) {
        const healed = TheHealer.healedData[id];
        const s = { mfg: healed?.mfg||null, hp: healed?.hp||null, enc: healed?.enc||null, volt: healed?.volt||null, phase: healed?.phase||null, category: healed?.category||null };
        t = (t||"").toUpperCase();
        
        for (const [k, v] of Object.entries(AI_TRAINING_DATA.MANUFACTURERS)) { const regex = new RegExp(`(?<!(FOR|FITS|REPLACES|COMPATIBLE|LIKE|WITH)\\s+)\\b(${v.join('|').toUpperCase()})\\b`, 'i'); if (regex.test(t)) s.mfg = k.toUpperCase(); }
        
        // ENC
        if (!s.enc) {
            if (AI_DATA.ENC['POLY'].some(v => new RegExp(`\\b${v}\\b`, 'i').test(t))) s.enc = 'POLY';
            else if (['FIBERGLASS', 'FRP', 'NON-METALLIC', '4XFG'].some(v => new RegExp(`\\b${v}\\b`, 'i').test(t))) s.enc = '4XFG';
            else if (AI_DATA.ENC['4XSS'].some(v => {
                const regex = new RegExp(`\\b${v}\\b`, 'i');
                if (!regex.test(t)) return false;
                const idx = t.indexOf(v);
                if (idx > -1) {
                    const context = t.substring(idx, idx + 50); 
                    if (/SCREW|LATCH|HARDWARE|NAMEPLATE|HINGE|MOUNT|FEET|SWITCH|SELECTOR|POS/.test(context)) return false;
                    return true;
                }
                return false;
            })) s.enc = '4XSS';
            else if (t.includes('NEMA 4X')) s.enc = '4XFG';
        }
        
        // HP
        if (!s.hp) {
            let maxHP = 0;
            const compoundRegex = /(\d+)\s+(\d+\/\d+)\s*(?:HP|H\.P\.|HORSEPOWER)\b/gi;
            [...t.matchAll(compoundRegex)].forEach(m => {
                const whole = parseFloat(m[1]); const [num, den] = m[2].split('/'); const val = whole + (parseFloat(num) / parseFloat(den)); if (val > maxHP) maxHP = val;
            });
            const standardRegex = /(?:^|[^0-9\/\.-])((?:\d*\.)?\d+(?:[\/-]\d+)?(?:\/\d+)?)\s*(?:HP|H\.P\.|HORSEPOWER|H|KW)\b/gi;
            [...t.matchAll(standardRegex)].forEach(m => {
                let val = 0; const raw = m[1];
                if(raw.includes('/')) {
                    if (raw.includes('-')) { const parts = raw.split('-'); const frac = parts[1].split('/'); val = parseFloat(parts[0]) + (parseFloat(frac[0]) / parseFloat(frac[1])); } 
                    else { const [n,d] = raw.split('/'); val = parseFloat(n) / parseFloat(d); }
                } else { val = parseFloat(raw); }
                if (m[0].toUpperCase().includes('KW')) val = val * 1.341;
                if (val >= 0.1 && val <= 300 && val > maxHP) maxHP = val;
            });
            if (maxHP > 0) { if (Math.abs(maxHP - Math.round(maxHP)) < 0.1) maxHP = Math.round(maxHP); s.hp = maxHP.toString(); }
        }

        // VOLT
        if (!s.volt) {
            const voltPriority = [{ id: '575', match: ['575', '600'] }, { id: '480', match: ['480', '460', '440'] }, { id: '415', match: ['415', '380'] }, { id: '277', match: ['277'] }, { id: '240', match: ['240', '230', '220'] }, { id: '208', match: ['208'] }, { id: '120', match: ['120', '115', '110'] }];
            for (const vGroup of voltPriority) {
                const regex = new RegExp(`\\b(${vGroup.match.join('|')})\\s*(?:V|VAC|VOLT|PH)`, 'i');
                if (regex.test(t)) { s.volt = vGroup.id; break; }
            }
        }

        if (!s.phase) { 
            if (t.includes("3 PHASE") || t.includes("3PH") || t.includes("3Ø") || t.includes("3/60")) s.phase = "3"; 
            else if (t.includes("1 PHASE") || t.includes("1PH") || t.includes("1Ø") || t.includes("1/60")) s.phase = "1"; 
        }
        
        // v1.78: Expanded Category Keywords for Treatment/Residential
        if (!s.category) {
            if (/(?:BLOWER|AERATION|CLARIFIER|DIGESTER|UV|ULTRAVIOLET|SCREEN|PRESS|DEWATERING|MIXER|2\+2|4\s+MOTOR|TRIPLEX|QUADPLEX|HEADWORKS|OXIDATION|LIFT\s+STATION|3\s+PUMP|4\s+PUMP)/i.test(t)) {
                s.category = 'treatment';
            } else if (/(?:RESIDENTIAL|GRINDER\s+STATION|SIMPLEX\s+GRINDER|HOME|RESIDENCE|STEP\s+SYSTEM|SEPTIC)/i.test(t)) {
                s.category = 'residential';
            } else if (t.includes('LOW VOLTAGE') || t.includes('CONTROL BOX') || t.includes('JB') || t.includes('JUNCTION BOX')) {
                s.category = 'low_voltage';
            }
        }

        return s;
    }
}

// ... [TheHealer, DataLoader, DragManager, DemoManager, etc] ...
class TheHealer {
    static healedData = {}; 
    static async fetchAndTally() { 
        try { 
            const resp = await NetworkService.fetch(CONFIG.feedbackTable, '?pageSize=100'); 
            if(resp.status === 401) { AuthService.logout(); return; } 
            const data = await resp.json(); 
            if(data.records) { 
                const tallies = {}; 
                data.records.forEach(r => { 
                    const rawJson = r.fields['Corrections']; 
                    const id = r.fields['Panel ID']; 
                    if (rawJson && id) { 
                        try { const corrections = JSON.parse(rawJson); Object.entries(corrections).forEach(([param, value]) => { const key = `${id}|${param}|${value}`; tallies[key] = (tallies[key] || 0) + 1; }); } catch(e) { } 
                    } 
                }); 
                for (const [key, count] of Object.entries(tallies)) { 
                    if (count >= CONFIG.voteThreshold) { 
                        const [id, param, value] = key.split('|'); 
                        if (!this.healedData[id]) this.healedData[id] = {}; 
                        this.healedData[id][param] = value; 
                    } 
                } 
            } 
        } catch(e) { console.error("Healing Failed", e); } 
    }
}

class DataLoader {
    static async preload() {
        const lastVer = localStorage.getItem('cox_version');
        if (lastVer !== APP_VERSION) {
            console.warn(`⚡ v1.78 Update: Purging Cache...`);
            await DB.deleteDatabase();
            localStorage.removeItem('cox_db_complete');
            localStorage.removeItem('cox_sync_attempts');
            localStorage.setItem('cox_version', APP_VERSION);
        }

        console.log("🚀 Starting Preload...");
        const btn = document.getElementById('searchBtn'); btn.disabled = true; btn.innerText = "🔒 PREPARING...";
        
        const loads = [
            fetch('cover_sheet_template.pdf').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.TEMPLATE_BYTES=b; console.log("✅ PDF Template Loaded");}).catch(e=>console.warn("⚠️ PDF Template Missing")),
            fetch('border_info.png').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.BORDER_INFO_BYTES=b; console.log("✅ Info Border Loaded");}).catch(e=>console.warn("⚠️ Info Border Missing")),
            fetch('border_standard.png').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.BORDER_STD_BYTES=b; console.log("✅ Std Border Loaded");}).catch(e=>console.warn("⚠️ Std Border Missing"))
        ];
        await Promise.allSettled(loads);

        await new Promise(r => setTimeout(r, 200)); 
        const p = localStorage.getItem('cox_pass'); await CacheService.prepareKey(p); await DB.deleteLegacy();
        let attempts = parseInt(localStorage.getItem('cox_sync_attempts') || '0');
        if(attempts > 5) { btn.innerText = "⚠️ SYNC INTERRUPTED"; btn.classList.add('warning'); btn.disabled = false; btn.onclick = () => { localStorage.setItem('cox_sync_attempts', '0'); location.reload(); }; return; }
        localStorage.setItem('cox_sync_attempts', (attempts + 1).toString());
        const hasData = await CacheService.loadAllWithProgress((pct) => { btn.innerText = `🔒 DECRYPTING ${pct}%`; });
        if(hasData) { 
            if(window.LOCAL_DB.length > 7000) { localStorage.setItem('cox_db_complete', 'true'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; }
            if(localStorage.getItem('cox_db_complete')) { localStorage.setItem('cox_sync_attempts', '0'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; } else { btn.innerText = "⬇️ RESUMING..."; } 
        } else { btn.innerText = "⬇️ SYNCING..."; }
        await this.fetchPartition('desc', btn);
        if(!btn.classList.contains('error')) { 
            btn.innerText = "✅ FINALIZING..."; 
            localStorage.setItem('cox_sync_attempts', '0'); 
            UI.pop(); 
            btn.innerText = "SEARCH"; btn.disabled = false;
        }
    }
    static resetSync() { localStorage.removeItem('cox_db_complete'); localStorage.setItem('cox_sync_attempts', '0'); location.reload(); }
    static async fetchPartition(dir, btn) {
        let offset = null, loop = 0; let buffer = []; let shardCount = 0;
        let fetchedCount = 0;
        try {
            do {
                loop++; if(loop > 300 || window.LOCAL_DB.length >= 10000) break;
                console.group(`📥 Sync Batch ${loop}`); await new Promise(r => setTimeout(r, 10)); 
                if(btn && !btn.classList.contains('warning') && !btn.classList.contains('error')) { const pct = Math.min(99, Math.round((fetchedCount/CONFIG.estTotal)*100)); btn.innerText = `⬇️ UPDATING ${pct}%`; }
                const r = await NetworkService.fetch(CONFIG.mainTable, `?pageSize=100&fields[]=Control Panel Name&fields[]=Items&fields[]=Control Panel PDF${offset ? '&offset='+offset : ''}&sort%5B0%5D%5Bfield%5D=Control%20Panel%20Name&sort%5B0%5D%5Bdirection%5D=${dir}`);
                if(r.status===401) { console.error("Sync Failed 401"); btn.classList.add('error'); btn.innerText="AUTH ERROR"; break; }
                if(r.status!==200) { console.error("Sync Failed", r.status); break; }
                const d = await r.json(); if(!d.records || d.records.length === 0) { console.log("✅ Sync Complete"); break; }
                fetchedCount += d.records.length;
                d.records.forEach(r => {
                    try {
                        let rec = {};
                        if(r.mfg !== undefined && r.id !== undefined) {
                            rec = { id: r.id, displayId: r.displayId, desc: r.desc, pdfUrl: r.pdfUrl, mfg: r.mfg, hp: r.hp, volt: r.volt, phase: r.phase, enc: r.enc, category: r.category };
                        } else {
                            const rawId = (r.fields['Control Panel Name']||"");
                            const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();
                            const displayId = "CP-" + cleanId;
                            const desc = (r.fields['Items']||"").toUpperCase();
                            const parsed = AIParser.parse(desc + " " + cleanId);
                            let cleanMfg = parsed.mfg;
                            if(cleanMfg) { let isValid = false; for(const validMfg in AI_TRAINING_DATA.MANUFACTURERS) { if(cleanMfg === validMfg) { isValid=true; break; } } if(!isValid) cleanMfg = null; }
                            rec = { id: cleanId, displayId: displayId, desc: desc, pdfUrl: r.fields['Control Panel PDF']?.[0]?.url, mfg: cleanMfg, hp: parsed.hp, volt: parsed.volt, phase: parsed.phase, enc: parsed.enc, category: parsed.category };
                        }
                        if(window.ID_MAP.has(rec.id)) { } else { window.LOCAL_DB.push(rec); window.ID_MAP.set(rec.id, rec); if(rec.mfg) window.FOUND_MFGS.add(rec.mfg); }
                        buffer.push(rec);
                    } catch(e) { console.warn("Record Skip", e); }
                });
                console.groupEnd();
                if(buffer.length >= 50) { await CacheService.saveShard(`shard_${Date.now()}_${shardCount++}`, buffer); buffer = []; }
                offset = d.offset;
            } while(offset);
            localStorage.setItem('cox_db_complete', 'true'); if(buffer.length > 0) { await CacheService.saveShard(`shard_${Date.now()}_final`, buffer); }
        } catch(e) { console.error("Sync Critical Error", e); } 
    }
    static harvestCSV() { alert('Harvesting...'); }
}

class DragManager {
    static init() {
        const handle = document.getElementById('gen-drag-handle');
        const panel = document.getElementById('generator-panel');
        if(!handle || !panel) return;

        let isDragging = false;
        let shiftX, shiftY;

        const startDrag = (clientX, clientY) => {
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;
            const absLeft = rect.left;
            const absTop = rect.top;
            panel.style.transition = 'none'; 
            panel.style.right = 'auto'; 
            panel.style.bottom = 'auto';
            panel.style.left = `${absLeft}px`;
            panel.style.top = `${absTop}px`;
            handle.style.cursor = 'grabbing';
        };

        const moveDrag = (clientX, clientY) => {
            if(!isDragging) return;
            const newLeft = clientX - shiftX;
            const newTop = clientY - shiftY;
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        };

        const endDrag = () => {
            if(isDragging) { 
                isDragging = false; 
                panel.style.transition = ''; 
                handle.style.cursor = 'move'; 
            }
        };

        handle.onmousedown = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        };
        document.onmousemove = (e) => moveDrag(e.clientX, e.clientY);
        document.onmouseup = endDrag;

        handle.ontouchstart = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        };
        document.ontouchmove = (e) => {
            if(!isDragging) return;
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
        };
        document.ontouchend = endDrag;
    }
}

class DemoManager {
    static isGeneratorActive = false;

    static toggleGenerator() {
        this.isGeneratorActive = !this.isGeneratorActive;
        const btn = document.getElementById('menu-demo');
        const indicator = document.getElementById('gen-status');
        const panel = document.getElementById('generator-panel');
        const restoreBtn = document.getElementById('generator-restore-btn');
        
        if(this.isGeneratorActive) { 
            document.body.classList.add('demo-mode'); 
            this.restorePanel(); 
            if(indicator) indicator.style.display = 'inline-block';
            if(btn) btn.style.color = 'var(--app-primary)';
            if(!document.getElementById('demo-date').value) document.getElementById('demo-date').valueAsDate = new Date(); 
            if(PdfViewer.doc) PdfViewer.renderStack();
            DragManager.init();
        } else { 
            document.body.classList.remove('demo-mode'); 
            document.body.classList.remove('editor-active'); 
            panel.style.display = 'none';
            restoreBtn.style.display = 'none';
            if(indicator) indicator.style.display = 'none';
            if(btn) btn.style.color = ''; 
            if(PdfViewer.doc) PdfViewer.renderStack();
        }
    }

    static minimizePanel() {
        document.getElementById('generator-panel').classList.add('minimized');
        document.getElementById('generator-restore-btn').style.display = 'flex';
        document.body.classList.remove('editor-active');
        document.body.classList.add('gen-minimized');
    }

    static restorePanel() {
        const panel = document.getElementById('generator-panel');
        panel.style.display = 'flex';
        panel.classList.remove('minimized');
        document.getElementById('generator-restore-btn').style.display = 'none';
        document.body.classList.add('editor-active');
        document.body.classList.remove('gen-minimized');
    }

    static toggleContext() {
        const panel = document.getElementById('demo-context-panel');
        const content = document.getElementById('demo-context-content');
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            panel.classList.remove('collapsed-state');
        } else {
            content.classList.add('collapsed');
            panel.classList.add('collapsed-state');
        }
    }

    static getContext() {
        return { cust: document.getElementById('demo-cust-name').value || "CUSTOMER NAME", job: document.getElementById('demo-job-name').value || "JOB TITLE", type: document.getElementById('demo-system-type').value || "SYSTEM TYPE", cpid: document.getElementById('demo-panel-id').value || "CP-####", date: document.getElementById('demo-date').value || "YYYY-MM-DD", stage: document.getElementById('demo-stage').value || "STAGE" };
    }
}

class ProfileManager {
    static getCustomProfiles() {
        const stored = localStorage.getItem('cox_custom_profiles');
        return stored ? JSON.parse(stored) : {};
    }

    static saveProfile(name, rules) {
        const profiles = this.getCustomProfiles();
        profiles[name] = rules;
        localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
        LayoutScanner.refreshProfileOptions(); 
        alert(`Profile "${name}" saved!`);
    }

    static deleteProfile(name) {
        const profiles = this.getCustomProfiles();
        if (profiles[name]) {
            delete profiles[name];
            localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
            LayoutScanner.refreshProfileOptions();
        }
    }

    static saveCurrentPageAsProfile() {
        const name = document.getElementById('new-profile-name').value.trim();
        if (!name) return alert("Please enter a profile name.");
        
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        let targetContainer = null;
        for(const w of wrappers) {
             const rect = w.getBoundingClientRect();
             if (rect.top >= -100 && rect.top < window.innerHeight) {
                 targetContainer = w.querySelector('.pdf-content-container');
                 break;
             }
        }

        if (!targetContainer) return alert("No visible page found.");

        const w = targetContainer.offsetWidth;
        const h = targetContainer.offsetHeight;
        const boxes = [];

        targetContainer.querySelectorAll('.redaction-box').forEach(box => {
            boxes.push({
                map: box.dataset.map,
                x: parseFloat((box.offsetLeft / w).toFixed(4)),
                y: parseFloat((box.offsetTop / h).toFixed(4)),
                w: parseFloat((box.offsetWidth / w).toFixed(4)),
                h: parseFloat((box.offsetHeight / h).toFixed(4)),
                text: box.dataset.customText || null,
                fontSize: parseInt(box.style.fontSize),
                fontFamily: box.style.fontFamily, 
                rotation: parseFloat(box.dataset.rotation || 0),
                textAlign: box.style.textAlign || 'center', 
                transparent: box.dataset.transparent === "true"
            });
        });

        if (boxes.length === 0) return alert("Add some boxes first!");
        
        this.saveProfile(name, boxes);
        document.getElementById('new-profile-name').value = '';
    }
}

class ConfigExporter {
    static export() {
        const pages = [];
        document.querySelectorAll('.pdf-page-wrapper').forEach((wrapper, index) => {
            const pageNum = index + 1;
            const select = wrapper.querySelector('.page-profile-select');
            const profile = select ? select.value : 'UNKNOWN';
            
            const container = wrapper.querySelector('.pdf-content-container');
            const w = container.offsetWidth;
            const h = container.offsetHeight;

            const boxes = [];
            container.querySelectorAll('.redaction-box').forEach(box => {
                boxes.push({
                    map: box.dataset.map,
                    x: parseFloat((box.offsetLeft / w).toFixed(3)),
                    y: parseFloat((box.offsetTop / h).toFixed(3)),
                    w: parseFloat((box.offsetWidth / w).toFixed(3)),
                    h: parseFloat((box.offsetHeight / h).toFixed(3)),
                    text: box.dataset.customText || null,
                    fontSize: parseInt(box.style.fontSize),
                    fontFamily: box.style.fontFamily, 
                    rotation: parseFloat(box.dataset.rotation || 0),
                    textAlign: box.style.textAlign || 'center', 
                    transparent: box.dataset.transparent === "true"
                });
            });
            pages.push({ page: pageNum, profile: profile, boxes: boxes });
        });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pages, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `layout_config_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

class PdfViewer {
    static doc = null; 
    static currentScale = 1.1; 
    static url = ""; 
    static currentBlobUrl = "";
    
    static async load(url) {
        this.url = url;
        document.getElementById('pdf-fallback').style.display = 'none'; 
        document.getElementById('pdf-toolbar').style.display = 'flex';
        document.getElementById('custom-pdf-viewer').style.display = 'flex'; 
        document.getElementById('pdf-viewer-frame').style.display = 'none';

        const proxyUrl = `${WORKER_URL}?target=pdf&url=${encodeURIComponent(url)}`;
        const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
        if (!resp.ok) throw new Error(`Fetch Error: ${resp.status}`);
        const blob = await resp.blob();
        if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
        this.currentBlobUrl = URL.createObjectURL(blob);
        const task = pdfjsLib.getDocument(this.currentBlobUrl);
        this.doc = await task.promise; 

        if (window.innerWidth < 768) {
             this.currentScale = 0.8;
             UI.toggleSearch(true); 
        } else {
             this.currentScale = 1.1;
        }

        this.renderStack(); 
    }

    static print() {
        if (!this.currentBlobUrl) return alert("No PDF loaded to print.");
        const iframe = document.createElement('iframe'); iframe.style.display = 'none'; iframe.src = this.currentBlobUrl; document.body.appendChild(iframe);
        iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 2000); };
    }

    // v1.78: Instant Overlay Logic - Apply rule as page renders
    static async renderStack() {
        const container = document.getElementById('pdf-main-view'); 
        container.innerHTML = ''; 
        document.getElementById('pdf-zoom-level').innerText = Math.round(this.currentScale * 100) + "%";
        
        let coverDoc = this.doc;
        if (window.TEMPLATE_BYTES) {
             const tTask = pdfjsLib.getDocument(window.TEMPLATE_BYTES.slice(0));
             coverDoc = await tTask.promise;
        }

        let infoImgUrl, stdImgUrl;
        if (window.BORDER_INFO_BYTES) {
            const blob = new Blob([window.BORDER_INFO_BYTES.slice(0)], { type: "image/png" });
            infoImgUrl = URL.createObjectURL(blob);
        }
        if (window.BORDER_STD_BYTES) {
            const blob = new Blob([window.BORDER_STD_BYTES.slice(0)], { type: "image/png" });
            stdImgUrl = URL.createObjectURL(blob);
        }

        for (let i = 1; i <= this.doc.numPages; i++) {
            await new Promise(r => setTimeout(r, 10)); // Tiny yield to keep UI responsive
            
            let page; let isTemplate = false;
            if (i === 1 && window.TEMPLATE_BYTES && DemoManager.isGeneratorActive) { page = await coverDoc.getPage(1); isTemplate = true; } else { page = await this.doc.getPage(i); }

            const viewport = page.getViewport({ scale: this.currentScale });
            const wrapper = document.createElement('div'); wrapper.className = 'pdf-page-wrapper';
            wrapper.style.width = Math.floor(viewport.width) + "px"; 
            wrapper.dataset.pageNumber = i; 
            
            const toolbar = document.createElement('div');
            toolbar.className = 'page-toolbar';
            toolbar.innerHTML = `
                <span>PAGE ${i}</span>
                <select class="page-profile-select" onchange="LayoutScanner.updatePageProfile(${i}, this.value)">
                    <option value="AUTO">✨ Auto (Detected)</option>
                    <option value="TITLE">🏷️ Title Sheet</option>
                    <option value="INFO">📝 Info / Notes</option>
                    <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Std)</option>
                    <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Land)</option>
                    <option value="GENERAL">📐 General</option>
                </select>
            `;
            wrapper.appendChild(toolbar);

            const contentContainer = document.createElement('div');
            contentContainer.className = 'pdf-content-container';
            contentContainer.style.width = Math.floor(viewport.width) + "px";
            contentContainer.style.height = Math.floor(viewport.height) + "px";

            const canvas = document.createElement('canvas'); canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width; canvas.height = viewport.height; 
            
            if (DemoManager.isGeneratorActive && !isTemplate) { 
                const img = document.createElement('img'); img.className = 'pdf-border-overlay';
                if (i === 2 && infoImgUrl) img.src = infoImgUrl; else if (i > 2 && stdImgUrl) img.src = stdImgUrl;
                if (img.src) contentContainer.appendChild(img);
            }

            const rLayer = document.createElement('div'); rLayer.className = 'redaction-layer';
            if(document.body.classList.contains('demo-mode')) rLayer.classList.add('editing');
            
            contentContainer.appendChild(canvas); 
            contentContainer.appendChild(rLayer); 
            wrapper.appendChild(contentContainer); 
            container.appendChild(wrapper); 

            // v1.78: INSTANT OVERLAY APPLICATION
            // We apply the rule *before* the render promise completes so the boxes are there instantly
            if (DemoManager.isGeneratorActive) {
                // Determine profile immediately
                let profileKey = "AUTO"; 
                // Simple heuristic for instant profile guess based on dimensions
                // (Detailed classification happens if needed, but this is 99% accurate for layout)
                if (i === 1) profileKey = 'TITLE';
                else if (i === 2) profileKey = 'INFO';
                else {
                    const w = viewport.width; const h = viewport.height;
                    profileKey = (w > h) ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
                }
                
                // Set the dropdown
                const select = toolbar.querySelector('.page-profile-select');
                if(select) select.value = profileKey;

                // Apply the rule
                LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES[profileKey]);
                // Refresh text content
                RedactionManager.refreshContent();
            }

            page.render({ canvasContext: canvas.getContext('2d'), viewport });
        }
    }
    static zoom(delta) { this.currentScale+=delta; if(this.currentScale<0.2) this.currentScale=0.2; this.renderStack(); }
}

class PdfController {
    static load(id, url) {
        document.getElementById('pdf-placeholder-text').style.display = 'none';
        const rec = window.ID_MAP.get(id);
        if(rec && rec.displayId) { document.getElementById('demo-panel-id').value = rec.displayId; }
        if (!url) { document.getElementById('pdf-fallback').style.display = 'block'; return; }
        PdfViewer.load(url);
    }
}

class UI {
    static init() { if(localStorage.getItem('cox_theme') === 'dark') { document.body.classList.add('dark-mode'); } window.addEventListener('mousemove', (e) => RedactionManager.handleDrag(e)); window.addEventListener('mouseup', () => RedactionManager.endDrag()); document.addEventListener('click', (e) => { const menu = document.getElementById('main-menu'); const btn = document.querySelector('.menu-btn'); if (menu.classList.contains('visible') && !menu.contains(e.target) && !btn.contains(e.target)) { menu.classList.remove('visible'); } }); }
    static toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('cox_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); }
    static handleEnter(e) { if(e.key==='Enter') SearchEngine.perform(); }
    static resetSearch() { document.querySelectorAll('select').forEach(s=>s.value="Any"); document.getElementById('keywordInput').value=''; this.toggleSearch(true); }
    static closeMobilePreview() { document.body.classList.remove('viewing-pdf'); }
    static toggleLeftSidebar() { document.getElementById('sidebar-left').classList.toggle('collapsed'); document.getElementById('toggle-left').innerText = document.getElementById('sidebar-left').classList.contains('collapsed') ? '›' : '‹'; }
    static toggleRightSidebar() { const el = document.getElementById('sidebar-right'); el.classList.toggle('collapsed'); document.getElementById('toggle-right').innerText = el.classList.contains('collapsed') ? '⚙️' : '›'; }
    static toggleSearch(e) { const c = document.getElementById('search-controls'); if(!c) return; if(e) { c.classList.remove('collapsed'); document.getElementById('refine-btn-area').classList.remove('visible'); } else { c.classList.add('collapsed'); document.getElementById('refine-btn-area').classList.add('visible'); } }
    static toggleMenu() { document.getElementById('main-menu').classList.toggle('visible'); }
    static pop() { const m = document.getElementById('mfgInput'); const cv = m.value; const whitelist = Object.keys(AI_TRAINING_DATA.MANUFACTURERS); const fullList = new Set([...whitelist, ...window.FOUND_MFGS]); const cleanList = Array.from(fullList).filter(mf => whitelist.includes(mf)).sort(); m.innerHTML='<option value="Any">Any</option>'; cleanList.forEach(v=>m.add(new Option(v,v))); m.value=cv; ['hp','volt','phase','enc'].forEach(k=>{ const s=document.getElementById(k+'Input'); if(!s)return; const d=(k==='enc')?Object.keys(AI_TRAINING_DATA.ENCLOSURES):AI_TRAINING_DATA.DATA[k.toUpperCase()]; s.innerHTML='<option value="Any">Any</option>'; d.forEach(v=>s.add(new Option(v,v))); }); }
    static render(res, crit, totalCount) { const a = document.getElementById('results-area'); a.innerHTML = `<div style="padding:5px;font-size:12px;opacity:0.7;">Found ${totalCount || res.length} records</div>`; const critJson = JSON.stringify(crit).replace(/"/g, '&quot;'); res.forEach(i => { const h = TheHealer.healedData[i.id]; let b = ''; if(i.category === 'low_voltage') b+=`<span class="hud-badge match-orange">LOW VOLT</span>`; if (crit.mfg !== "Any" && i.mfg) { const isMatch = (i.mfg === crit.mfg); const style = isMatch ? 'match-green' : 'match-orange'; b += `<span class="hud-badge ${style}">${h?.mfg || i.mfg}</span>`; } if(crit.volt !== "Any") { if(i.volt) b+=`<span class="hud-badge match-green">${h?.volt||i.volt}V</span>`; else b+=`<span class="hud-badge match-orange">? V</span>`; } if(crit.phase !== "Any") { if(i.phase) b+=`<span class="hud-badge match-green">${h?.phase||i.phase}PH</span>`; else b+=`<span class="hud-badge match-orange">? PH</span>`; } if(crit.hp !== "Any") { if(i.hp) { if (parseFloat(i.hp) === parseFloat(crit.hp)) b+=`<span class="hud-badge match-green">${h?.hp||i.hp} HP</span>`; else b+=`<span class="hud-badge match-orange">${h?.hp||i.hp} HP</span>`; } else { b+=`<span class="hud-badge match-orange">? HP</span>`; } } if(crit.enc !== "Any" && i.enc) { b+=`<span class="hud-badge match-green">${h?.enc||i.enc}</span>`; } if(crit.kw && crit.kw.length > 0) { crit.kw.forEach(k => { if(crit.mfg !== "Any" && i.mfg === k.toUpperCase()) return; b += `<span class="hud-badge match-keyword">${k.toUpperCase()}</span>`; }); } if(!i.pdfUrl) b += `<span class="hud-badge no-pdf">NO PDF</span>`; const c = document.createElement('div'); c.className = `record-card ${!i.p?'varied-result':''}`; c.innerHTML = `<div class="panel-name">${i.displayId || i.id}</div><div class="badge-row">${b}</div><div class="card-actions"><button class="thumb-btn up" onclick="event.stopPropagation();FeedbackService.up('${i.id}',this, ${critJson})">👍</button><button class="thumb-btn down" onclick="event.stopPropagation();FeedbackService.down('${i.id}')">👎</button></div>`; c.onclick = () => { document.querySelectorAll('.record-card').forEach(x=>x.classList.remove('active-view')); c.classList.add('active-view'); PdfController.load(i.id, i.pdfUrl); }; a.appendChild(c); }); }
}

window.UI = UI;

window.LOCAL_DB = []; window.ID_MAP = new Map(); window.FOUND_MFGS = new Set();
document.addEventListener('DOMContentLoaded', () => { 
    try {
        UI.init(); 
        if(AuthService.init()) { 
            DataLoader.preload(); 
        }
    } catch(e) {
        console.error("Critical Init Error:", e);
        alert("System failed to initialize. Please clear cache and reload.");
    }
});