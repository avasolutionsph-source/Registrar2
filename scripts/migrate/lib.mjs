// Shared helpers for the legacy → Supabase ETL (read-only on the dump; emits SQL).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';

export const DEFAULT_DUMP = String.raw`c:\Users\opet_\OneDrive\Desktop\NPS\nps sql old registrar\npsnps_06-05-2026.sql`;

// ── MySQL dump tuple parser ───────────────────────────────────────────────
function unesc(c) {
  switch (c) {
    case 'n': return '\n';
    case 'r': return '\r';
    case 't': return '\t';
    case '0': return '\0';
    case 'b': return '\b';
    case 'Z': return '\x1a';
    default: return c; // \' \\ \" etc → the literal char
  }
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  if (s == null || s.indexOf('&') === -1) return s;
  return s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENT[e] ?? _);
}

// Parse the part after "VALUES " (the "(...),(...);" run) into an array of rows.
export function parseValues(s) {
  const rows = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && s[i] !== '(') i++;
    if (i >= n) break;
    i++; // (
    const row = [];
    while (i < n) {
      while (i < n && /\s/.test(s[i])) i++;
      let val;
      if (s[i] === "'") {
        i++;
        let str = '';
        while (i < n) {
          const c = s[i];
          if (c === '\\') { str += unesc(s[i + 1]); i += 2; continue; }
          if (c === "'") {
            if (s[i + 1] === "'") { str += "'"; i += 2; continue; }
            i++; break;
          }
          str += c; i++;
        }
        val = decodeEntities(str);
      } else {
        let tok = '';
        while (i < n && s[i] !== ',' && s[i] !== ')') { tok += s[i]; i++; }
        tok = tok.trim();
        val = tok === 'NULL' || tok === '' ? null : tok;
      }
      row.push(val);
      while (i < n && /\s/.test(s[i])) i++;
      if (s[i] === ',') { i++; continue; }
      if (s[i] === ')') { i++; break; }
      if (i >= n) break;
    }
    rows.push(row);
  }
  return rows;
}

// Stream the dump; for each matching table call onRow(tableName, rowArray).
// `match` is a Set of names or a predicate fn(name)→bool. Returns a promise.
export function streamTables(dumpPath, match, onRow, onInsertLine) {
  const test = typeof match === 'function' ? match : (n) => match.has(n);
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: createReadStream(dumpPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    rl.on('line', (line) => {
      const m = line.match(/^INSERT INTO `([^`]+)` VALUES /);
      if (!m) return;
      const name = m[1];
      if (!test(name)) return;
      const body = line.slice(line.indexOf('VALUES ') + 7);
      if (onInsertLine) { onInsertLine(name, body); return; }
      for (const row of parseValues(body)) onRow(name, row);
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });
}

// ── deterministic UUIDv5 (so class IDs are stable + linkable across re-runs) ─
const NS = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');
export function uuid5(name) {
  const h = createHash('sha1').update(NS).update(String(name)).digest();
  const b = h.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

// ── SQL emit helpers ──────────────────────────────────────────────────────
export function sq(v) {
  if (v == null) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}
export function num(v) {
  if (v == null || v === '') return 'NULL';
  const f = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(f) ? String(f) : 'NULL';
}
export function intOr(v, dflt) {
  const f = parseInt(String(v ?? '').replace(/[^0-9\-]/g, ''), 10);
  return Number.isFinite(f) ? f : dflt;
}
export function jsonb(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

// ── domain mappings ───────────────────────────────────────────────────────
// gCode (legacy) → app GradeLevel display code.
export const GCODE_TO_LEVEL = {
  S: 'S', K: 'K', N1: 'N1', N2: 'N2',
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI',
  '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X',
  '11-1': 'XI-GAS', '11-2': 'XI-HUMSS', '11-3': 'XI-STEM', '11-4': 'XI-ABM',
  '11-5': 'XI-HUMSS', '11-6': 'XI-STEM', '11-7': 'XI-STEM',
  '12-1': 'XII-GAS', '12-2': 'XII-HUMSS', '12-3': 'XII-STEM', '12-4': 'XII-ABM',
  // legacy OUT codes kept verbatim for transferee history
  N: 'N', P: 'P', K1: 'K1', K2: 'K2', JC: 'JC', AC: 'AC', SC: 'SC', JA: 'JA',
  '1y': '1y', '2y': '2y', '3y': '3y', '4y': '4y',
};
export function gradeLevel(gcode) {
  if (gcode == null) return '';
  const g = String(gcode).trim();
  return GCODE_TO_LEVEL[g] ?? g;
}

// normalize a studID for joining (strip hyphens/spaces; the legacy data writes
// the same student as both "09-10165" and "0910165")
export function normId(v) {
  return String(v ?? '').replace(/[^0-9A-Za-z]/g, '').toLowerCase();
}

export function credState(v) {
  return String(v) === '1' ? 'on-file' : 'pending';
}

export function normAction(rem) {
  const r = String(rem ?? '').toLowerCase();
  if (r.includes('retain')) return 'retained';
  if (r.includes('irreg')) return 'irregular';
  if (r.includes('promot')) return 'promoted';
  return undefined;
}

export function normCategory(c) {
  const t = String(c ?? '').trim().toLowerCase();
  if (t.startsWith('special')) return 'Specialized';
  if (t.startsWith('applied')) return 'Applied';
  if (t.startsWith('elect')) return 'Elective';
  if (t.startsWith('core')) return 'Core';
  return 'Core';
}

export function sex(v) {
  const s = String(v ?? '').trim().toUpperCase();
  return s === 'F' ? 'Female' : 'Male';
}

// ── mojibake repair ───────────────────────────────────────────────────────
// Legacy data has UTF-8 that was mis-decoded as CP1252 one or more times
// ("ñ" → "Ã±" → "ÃƒÂ±" → "ÃƒÆ’Ã‚Â±"). Reverse each layer by re-encoding to
// CP1252 bytes and decoding as UTF-8, until the string stops changing.
const CP1252_SPECIAL = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85,
  '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A,
  '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C,
  'ž': 0x9E, 'Ÿ': 0x9F,
};
function encodeCp1252(s) {
  const out = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i);
    if (cp > 0xffff) return null; // surrogate pair → not reversible
    if (cp <= 0xff) out[i] = cp;
    else if (CP1252_SPECIAL[s[i]] != null) out[i] = CP1252_SPECIAL[s[i]];
    else return null; // contains a char not representable in cp1252 → stop
  }
  return out;
}
const MOJI = /[ÂÃÅÆƒ’‚„†‰]/;
export function fixText(s) {
  if (s == null || s === '') return s;
  let cur = String(s);
  for (let pass = 0; pass < 12; pass++) {
    if (!MOJI.test(cur)) break;
    const bytes = encodeCp1252(cur);
    if (!bytes) break;
    const next = bytes.toString('utf8');
    if (next === cur) break;
    if (next.includes('�') && !cur.includes('�')) break; // would corrupt → stop
    cur = next;
  }
  // leftover stray "Ã"/"Â" immediately before an already-correct ñ/Ñ/vowel-accent
  cur = cur.replace(/[ÃÂ](?=[ñÑáéíóúÁÉÍÓÚ])/g, '');
  // final fallback: an irrecoverable garbage run (>=2 weird non-ASCII chars) in
  // this dataset is always a mangled "ñ" (Filipino/Spanish names & places)
  if (MOJI.test(cur)) cur = cur.replace(/[^\x00-\x7FñÑáéíóúüÁÉÍÓÚÜ°º]{2,}/g, 'ñ');
  return cur;
}
