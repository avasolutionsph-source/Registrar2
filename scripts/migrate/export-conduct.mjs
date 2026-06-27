// Set C: conduct. Aggregates attendance (tbldayspresent / tbldaystardy),
// core values (tbldeportment) and special programs (specialprograms) into a
// per-student `conduct` JSONB and writes UPDATE statements (run AFTER students).
//   04-conduct-001.sql … NNN.sql
//
// conduct shape:
//   { "<SY>": {
//       attendance: { present:{jun..apr}, tardy:{jun..apr}, totalPresent, totalTardy },
//       values:     { q:{ "1":{piety..rules}, "2":{…}, … }, average },
//       programs:   { q:{ "1":{computer,homeroom,sap,scouting}, … } }
//   }, … }
//
// Usage: node --max-old-space-size=4096 scripts/migrate/export-conduct.mjs [dump.sql]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DUMP, streamTables, normId } from './lib.mjs';

const DUMP = process.argv[2] || DEFAULT_DUMP;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });
const CHUNK = 400;

const MONTHS = ['jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr'];
const TRAITS = [
  'piety', 'simple', 'grateful', 'honest', 'humble', 'friendly', 'selfreliance',
  'diligent', 'initiative', 'punctual', 'environment', 'leadership', 'capacity', 'rules',
];
const PROGRAMS = ['computer', 'homeroom', 'sap', 'scouting'];

// ── 1. studprofile key map (identical keying to export-grades) ─────────────
console.log('Pass 1: studprofile…');
const profiles = [];
await streamTables(DUMP, new Set(['studprofile']), (_t, r) => profiles.push(r));
const keyByNorm = new Map();
const seenKeys = new Set();
for (const r of profiles) {
  const studID = r[1] || '';
  const lrn = String(r[2] || '').trim();
  let key = lrn || studID;
  if (!key) key = `ID${r[0]}`;
  if (seenKeys.has(key)) { key = studID || `ID${r[0]}`; if (seenKeys.has(key)) key = `${key}-${r[0]}`; }
  seenKeys.add(key);
  const nk = normId(studID);
  if (nk && !keyByNorm.has(nk)) keyByNorm.set(nk, key);
}
console.log(`  ${profiles.length} profiles, ${keyByNorm.size} normalized keys`);

// ── 2. aggregate conduct ───────────────────────────────────────────────────
// acc: nk → sy → { attendance:{present,tardy}, values:{q}, programs:{q} }
const acc = new Map();
const bySy = (nk, sy) => {
  let m = acc.get(nk);
  if (!m) acc.set(nk, (m = new Map()));
  let y = m.get(sy);
  if (!y) m.set(sy, (y = {}));
  return y;
};
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const counts = { present: 0, tardy: 0, deport: 0, prog: 0 };
console.log('Pass 2: attendance + deportment + special programs…');
await streamTables(
  DUMP,
  new Set(['tbldayspresent', 'tbldaystardy', 'tbldeportment', 'specialprograms']),
  (t, r) => {
    if (t === 'tbldayspresent' || t === 'tbldaystardy') {
      const nk = normId(r[1]); const sy = r[2];
      if (!nk || !sy) return;
      const y = bySy(nk, sy);
      const att = (y.attendance ??= {});
      const bucket = (att[t === 'tbldayspresent' ? 'present' : 'tardy'] ??= {});
      for (let i = 0; i < MONTHS.length; i++) {
        const v = num(r[3 + i]);
        if (v != null && v !== 0) bucket[MONTHS[i]] = v;
      }
      counts[t === 'tbldayspresent' ? 'present' : 'tardy']++;
      return;
    }
    if (t === 'tbldeportment') {
      const nk = normId(r[0]); const sy = r[1]; const q = String(parseInt(r[2], 10));
      if (!nk || !sy || !(q >= '1' && q <= '4')) return;
      const y = bySy(nk, sy);
      const qs = ((y.values ??= {}).q ??= {});
      const cell = (qs[q] ??= {});
      for (let i = 0; i < TRAITS.length; i++) {
        const v = num(r[3 + i]);
        if (v != null && v > 0) cell[TRAITS[i]] = v;
      }
      counts.deport++;
      return;
    }
    if (t === 'specialprograms') {
      const nk = normId(r[1]); const sy = r[2]; const q = String(parseInt(r[3], 10));
      if (!nk || !sy || !(q >= '1' && q <= '4')) return;
      const y = bySy(nk, sy);
      const qs = ((y.programs ??= {}).q ??= {});
      const cell = (qs[q] ??= {});
      for (let i = 0; i < PROGRAMS.length; i++) {
        const v = num(r[4 + i]);
        if (v != null && v > 0) cell[PROGRAMS[i]] = v;
      }
      counts.prog++;
    }
  },
);
console.log(`  rows — present:${counts.present} tardy:${counts.tardy} deportment:${counts.deport} programs:${counts.prog}`);
console.log(`  ${acc.size} students with some conduct data`);

// ── 3. finalize per-student JSON (totals + value average) ──────────────────
const round1 = (n) => Math.round(n * 10) / 10;
function finalizeYear(y) {
  const out = {};
  if (y.attendance && (y.attendance.present || y.attendance.tardy)) {
    const a = y.attendance;
    if (a.present) a.totalPresent = round1(Object.values(a.present).reduce((s, v) => s + v, 0));
    if (a.tardy) a.totalTardy = Object.values(a.tardy).reduce((s, v) => s + v, 0);
    out.attendance = a;
  }
  if (y.values?.q && Object.keys(y.values.q).length) {
    const all = [];
    for (const q of Object.values(y.values.q)) for (const v of Object.values(q)) all.push(v);
    if (all.length) y.values.average = Math.round(all.reduce((s, v) => s + v, 0) / all.length);
    out.values = y.values;
  }
  if (y.programs?.q && Object.keys(y.programs.q).length) out.programs = y.programs;
  return out;
}

const updates = [];
let orphans = 0;
for (const [nk, m] of acc) {
  const key = keyByNorm.get(nk);
  if (!key) { orphans++; continue; }
  const obj = {};
  for (const [sy, y] of m) {
    const fy = finalizeYear(y);
    if (Object.keys(fy).length) obj[sy] = fy;
  }
  if (Object.keys(obj).length) updates.push([key, JSON.stringify(obj)]);
}
console.log(`  ${updates.length} students mapped (${orphans} orphans with no profile)`);

// ── 4. emit chunked UPDATE files ──────────────────────────────────────────
const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
let part = 0;
for (let i = 0; i < updates.length; i += CHUNK) {
  part++;
  const slice = updates.slice(i, i + CHUNK);
  let body = `-- ════ Set C · 04 conduct part ${part} (students ${i + 1}–${i + slice.length}) ════\n`;
  body += 'begin;\n';
  body += 'update reg_students_data s set conduct = v.c::jsonb from (values\n';
  body += slice.map(([k, j]) => `(${esc(k)},${esc(j)})`).join(',\n');
  body += '\n) as v(lrn, c) where s.lrn = v.lrn;\n';
  body += 'commit;\n';
  const name = `04-conduct-${String(part).padStart(3, '0')}.sql`;
  writeFileSync(join(OUT, name), body);
  if (part % 5 === 0 || i + CHUNK >= updates.length)
    console.log(`  wrote ${name} (${slice.length} students, ${(body.length / 1024).toFixed(0)}KB)`);
}
console.log(`\nDone. ${part} conduct files in`, OUT);
