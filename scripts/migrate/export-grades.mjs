// Set B: grades. Aggregates every per-subject grade table (tblgra_*) into a
// per-student `grades` JSONB and writes UPDATE statements (run AFTER Set A).
//   03-grades-001.sql … NNN.sql
//
// grades shape:  { "<SY>": [ {subjectCode, q1, q2, q3, q4, final}, … ], … }
//
// Usage: node --max-old-space-size=4096 scripts/migrate/export-grades.mjs [dump.sql]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DUMP, streamTables, normId } from './lib.mjs';

const DUMP = process.argv[2] || DEFAULT_DUMP;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });
const CHUNK = 500;

// ── 1. studprofile key map + subject name→code map (for gradesum) ─────────
const profiles = [];
const subjRows = [];
console.log('Pass 1: studprofile + tbladdsubjects…');
await streamTables(DUMP, new Set(['studprofile', 'tbladdsubjects']), (t, r) => {
  if (t === 'studprofile') profiles.push(r); else subjRows.push(r);
});

const normName = (s) => String(s ?? '').toLowerCase().replace(/&amp;/g, 'and').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const nameToCode = new Map();
for (const r of subjRows) {
  const code = String(r[1] || '').trim().toUpperCase();
  if (code) nameToCode.set(normName(r[2]), code);
}
// gradesum spellings that differ from the master subject names
for (const [n, c] of Object.entries({
  mape: 'MAP', msep: 'MAP', mapeh: 'MAP', hekasi: 'HEK', sibikaatkultura: 'SIB',
  edukasyonsapagpapakatao: 'ESP', eduksapagpapakatao: 'ESP',
  scienceandhealth: 'SAH', languageandspelling: 'LAN', readingandphonics: 'REA', reading: 'REA',
  aralingpanlipunan: 'APN', mothertongue: 'MOT', physicaleducation: 'PED',
  christianlivinged: 'CLE', christianlivingeducation: 'CLE',
  tle: 'TLE', epptle: 'EPP', wika: 'FIL', pagbasa: 'FIL',
  christianliving: 'CLE', christianlifeeducation: 'CLE', religion: 'CLE',
  hele: 'EPP', valueseducation: 'ESP', socialstudies: 'APN',
  sibikaatkulturahekasi: 'HEK', mapemsep: 'MAP', filipinowika: 'FIL',
})) if (!nameToCode.has(n)) nameToCode.set(n, c);
// "Average" / "General Average" are gradesum summary rows, not subjects → never map
const NON_SUBJECT = new Set(['average', 'generalaverage', 'genave', 'genaverage']);
const keyByNorm = new Map(); // normId(studID) → reg_students.lrn key
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

// ── 2. aggregate grades ───────────────────────────────────────────────────
// acc: normId → sy → subjCode → {q1..q4}.  tblgra_* (detailed, recent) takes
// precedence over gradesum (older summary) for the same student/SY/subject.
const acc = new Map();
const ownedByGra = new Set(); // `${nk}|${sy}|${subj}` cells written by tblgra_*
let rows = 0, gsRows = 0, gsUnmapped = new Map(), tablesSeen = new Set();
const isGradeSrc = (n) => (n.startsWith('tblgra_') && n !== 'tblgra_clv') || n === 'gradesum';

const setCell = (nk, sy, subj, q, val) => {
  let bySy = acc.get(nk);
  if (!bySy) acc.set(nk, (bySy = new Map()));
  let bySubj = bySy.get(sy);
  if (!bySubj) bySy.set(sy, (bySubj = new Map()));
  let cell = bySubj.get(subj);
  if (!cell) bySubj.set(subj, (cell = {}));
  cell['q' + q] = val;
};

console.log('Pass 2: tblgra_* + gradesum …');
await streamTables(DUMP, isGradeSrc, (t, r) => {
  if (t === 'gradesum') {
    // ID, studID, sy, subjectFullName, q1, q2, q3, q4, final
    const nk = normId(r[1]);
    const sy = r[2];
    const nn = normName(r[3]);
    if (!nk || !sy || NON_SUBJECT.has(nn)) return;
    const subj = nameToCode.get(nn);
    if (!subj) { gsUnmapped.set(r[3], (gsUnmapped.get(r[3]) || 0) + 1); return; }
    for (let q = 1; q <= 4; q++) {
      const v = Number(r[3 + q]);
      if (Number.isFinite(v) && v > 0 && !ownedByGra.has(`${nk}|${sy}|${subj}`)) setCell(nk, sy, subj, q, v);
    }
    gsRows++;
    return;
  }
  tablesSeen.add(t);
  const sy = r[1];
  const subj = String(r[2] || '').trim().toUpperCase();
  const q = parseInt(r[3], 10);
  const nk = normId(r[4]);
  const qfin = Number(r[r.length - 1]);
  if (!sy || !subj || !nk || !(q >= 1 && q <= 4)) return;
  if (!Number.isFinite(qfin) || qfin <= 0) return; // 0/blank = not encoded
  rows++;
  ownedByGra.add(`${nk}|${sy}|${subj}`);
  setCell(nk, sy, subj, q, qfin);
});
const topUnmapped = [...gsUnmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`  tblgra_*: ${rows} rows / ${tablesSeen.size} tables · gradesum: ${gsRows} rows`);
console.log(`  ${acc.size} students with grades · unmapped gradesum subjects: ${gsUnmapped.size}`);
if (topUnmapped.length) console.log('  top unmapped:', topUnmapped.map(([n, c]) => `${n}(${c})`).join(', '));

// ── 3. build per-student grades JSONB ─────────────────────────────────────
function buildGrades(bySy) {
  const out = {};
  for (const [sy, bySubj] of bySy) {
    const list = [];
    for (const [code, cell] of [...bySubj].sort((a, b) => a[0].localeCompare(b[0]))) {
      const qs = [cell.q1, cell.q2, cell.q3, cell.q4].filter((v) => typeof v === 'number');
      const final = qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : undefined;
      const entry = { subjectCode: code };
      if (cell.q1 != null) entry.q1 = cell.q1;
      if (cell.q2 != null) entry.q2 = cell.q2;
      if (cell.q3 != null) entry.q3 = cell.q3;
      if (cell.q4 != null) entry.q4 = cell.q4;
      if (final != null) entry.final = final;
      list.push(entry);
    }
    out[sy] = list;
  }
  return out;
}

// ── 4. emit chunked UPDATE files ──────────────────────────────────────────
const updates = [];
let orphans = 0;
for (const [nk, bySy] of acc) {
  const key = keyByNorm.get(nk);
  if (!key) { orphans++; continue; }
  const json = JSON.stringify(buildGrades(bySy));
  updates.push([key, json]);
}
console.log(`  ${updates.length} students mapped (${orphans} orphan grade-sets with no profile)`);

const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
let part = 0;
for (let i = 0; i < updates.length; i += CHUNK) {
  part++;
  const slice = updates.slice(i, i + CHUNK);
  let body = `-- ════ Set B · 03 grades part ${part} (students ${i + 1}–${i + slice.length}) ════\n`;
  body += 'begin;\n';
  body += 'update reg_students s set grades = v.g::jsonb from (values\n';
  body += slice.map(([k, j]) => `(${esc(k)},${esc(j)})`).join(',\n');
  body += '\n) as v(lrn, g) where s.lrn = v.lrn;\n';
  body += 'commit;\n';
  const name = `03-grades-${String(part).padStart(3, '0')}.sql`;
  writeFileSync(join(OUT, name), body);
  if (part % 5 === 0 || i + CHUNK >= updates.length)
    console.log(`  wrote ${name} (${slice.length} students, ${(body.length / 1024).toFixed(0)}KB)`);
}
console.log(`\nDone. ${part} grade files in`, OUT);
