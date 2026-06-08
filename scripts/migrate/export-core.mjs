// Set A: foundational + students (NO grades).
// Reads the legacy MySQL dump and writes ready-to-paste Postgres SQL into ./out.
//   01-foundational.sql              school years, teachers, subjects, schools, classes
//   02-students-001.sql … NNN.sql    students (profile + enrolment_history + credentials)
//
// Usage: node scripts/migrate/export-core.mjs [dump.sql]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DUMP, streamTables, uuid5, sq, num, intOr, jsonb,
  gradeLevel, normId, credState, normAction, normCategory, sex, fixText,
} from './lib.mjs';

const cleanDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !String(d).startsWith('0000') ? d : '');

const DUMP = process.argv[2] || DEFAULT_DUMP;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });
const ACTIVE_SY = '2025-2026';
const NPS_CODE = '403875';
const CHUNK = 800;

// ── collect raw rows ──────────────────────────────────────────────────────
const raw = {
  tblschoolyear: [], tblteachers: [], tbladdsubjects: [], tblschools: [],
  tbladdgrade: [], tbladdsections: [], tblsygradesection: [],
  studprofile: [], tblenrolment: [],
};
const wanted = new Set(Object.keys(raw));
console.log('Reading dump…', DUMP);
await streamTables(DUMP, wanted, (t, row) => raw[t].push(row));
for (const [t, rows] of Object.entries(raw)) console.log(`  ${t}: ${rows.length}`);

// ── lookups ───────────────────────────────────────────────────────────────
const years = raw.tblschoolyear.map((r) => r[1]).filter(Boolean);
const yearSet = new Set(years);

// teachers
const teacherById = new Map(); // id → {title,family,first,mi}
for (const r of raw.tblteachers) {
  teacherById.set(String(r[0]), {
    id: intOr(r[0], null), title: r[4] || '', family: fixText(r[5] || ''), first: fixText(r[6] || ''), mi: r[7] || '',
    email: r[10] || '', yearStart: intOr(r[2], 0), yearEnd: intOr(r[3], 0),
  });
}
const teacherName = (id) => {
  const t = teacherById.get(String(id));
  if (!t) return '';
  return `${t.title} ${t.family}, ${t.first} ${t.mi}`.replace(/\s+/g, ' ').trim();
};

// grades master: tbladdgrade ID ↔ gCode
const gradeIdToCode = new Map();
const gCodeToGradeId = new Map();
for (const r of raw.tbladdgrade) {
  gradeIdToCode.set(String(r[0]), r[2]);
  gCodeToGradeId.set(String(r[2]), String(r[0]));
}

// sections: ID → name
const sectionName = new Map(raw.tbladdsections.map((r) => [String(r[0]), fixText(r[1] || '')]));

// schools: DepEd code → name
const schoolByCode = new Map();
for (const r of raw.tblschools) {
  const code = String(r[2] || '').trim();
  if (code && !schoolByCode.has(code)) schoolByCode.set(code, fixText(r[1] || ''));
}

// ── classes (reg_classes) from tblsygradesection ──────────────────────────
const classKeySet = new Set(); // uuid5 ids actually emitted
const classByTriple = new Map(); // `${sy}|${gradeId}|${sectionId}` → {id, adviserId, curr, sy}
const adviserIds = new Set();
const classRows = [];
for (const r of raw.tblsygradesection) {
  const [, sy, gradeId, sectionId, adviserId, curr] = r;
  if (!yearSet.has(sy)) continue;
  const triple = `${sy}|${gradeId}|${sectionId}`;
  const id = uuid5(triple);
  if (classKeySet.has(id)) continue;
  classKeySet.add(id);
  const advOk = teacherById.has(String(adviserId));
  if (advOk) adviserIds.add(String(adviserId));
  classByTriple.set(triple, { id, sy, adviserId: advOk ? intOr(adviserId, null) : null, curr: curr || '' });
  classRows.push({
    id, sy,
    grade_level: gradeLevel(gradeIdToCode.get(String(gradeId))),
    section_name: sectionName.get(String(sectionId)) || '',
    adviser_id: advOk ? intOr(adviserId, null) : null,
    curriculum: curr || '',
  });
}

// ── enrolment history grouped by normalized studID ────────────────────────
const enrolByStud = new Map();
const latestTripleByStud = new Map(); // normId → {sy, triple} for the most recent enrolment
for (const r of raw.tblenrolment) {
  const [, studID, startyear, sy, grade, section, dateStart, dateLeft, daysPresent,
    adviserOut, schoolLast, schoolLastAve, , rem, remGo] = r;
  const key = normId(studID);
  if (!key) continue;
  const gradeId = gCodeToGradeId.get(String(grade));
  const triple = `${sy}|${gradeId}|${section}`;
  const prev = latestTripleByStud.get(key);
  if (!prev || String(sy).localeCompare(String(prev.sy)) > 0) latestTripleByStud.set(key, { sy, triple });
  const cls = classByTriple.get(triple);
  const adviser = cls ? teacherName(cls.adviserId) : fixText(adviserOut || '');
  const sl = String(schoolLast || '').trim();
  const isCode = /^\d{4,7}$/.test(sl);
  const entry = {
    sy: sy || '', gradeLevel: gradeLevel(grade),
    sectionName: sectionName.get(String(section)) || '',
    adviserName: adviser || '',
    generalAverage: schoolLastAve != null ? Number(num(schoolLastAve)) || undefined : undefined,
    action: normAction(rem),
    daysPresent: daysPresent != null ? Number(num(daysPresent)) || undefined : undefined,
    schoolId: isCode ? sl : '', schoolName: isCode ? (schoolByCode.get(sl) || '') : fixText(sl),
    dateEntered: cleanDate(dateStart), dateLeft: cleanDate(dateLeft),
    to: fixText(remGo || ''), startYear: intOr(startyear, undefined),
  };
  // prune undefined keys to keep JSON compact
  for (const k of Object.keys(entry)) if (entry[k] === undefined || entry[k] === '') delete entry[k];
  if (!enrolByStud.has(key)) enrolByStud.set(key, []);
  enrolByStud.get(key).push(entry);
}
// sort each student's history by SY
for (const list of enrolByStud.values()) list.sort((a, b) => String(a.sy).localeCompare(String(b.sy)));

// ── students ──────────────────────────────────────────────────────────────
const seenKeys = new Set();
const studentRows = [];
let blankLrn = 0, linkedClass = 0, collisions = 0;
for (const r of raw.studprofile) {
  const studID = r[1] || '';
  const lrn = String(r[2] || '').trim();
  let key = lrn || studID;
  if (!lrn) blankLrn++;
  if (!key) { key = `ID${r[0]}`; }
  if (seenKeys.has(key)) { key = studID || `ID${r[0]}`; if (seenKeys.has(key)) { key = `${key}-${r[0]}`; collisions++; } }
  seenKeys.add(key);

  const nkey = normId(studID);
  const hist = enrolByStud.get(nkey) || [];
  const latest = hist.length ? hist[hist.length - 1] : null;
  const currentSy = latest && yearSet.has(latest.sy) ? latest.sy : null;

  // resolve current class via the latest enrolment triple
  let currentClassId = null, curriculum = '';
  const lt = latestTripleByStud.get(nkey);
  if (lt) {
    const cls = classByTriple.get(lt.triple);
    if (cls && classKeySet.has(cls.id)) { currentClassId = cls.id; curriculum = cls.curr || ''; linkedClass++; }
  }

  const bday = /^\d{4}-\d{2}-\d{2}$/.test(String(r[13])) && !String(r[13]).startsWith('0000') ? r[13] : null;
  const rel = String(r[22] || '').trim();
  const guardianRelation = rel === 'Father' || rel === 'Mother' ? rel : rel ? 'Other' : 'Mother';
  const npsYears = hist.filter((h) => h.schoolId === NPS_CODE).length;

  const credentials = {
    bc: credState(r[40]), pix: credState(r[41]), rc: credState(r[42]), bp: credState(r[43]),
    rf: credState(r[44]), gmc: credState(r[45]), hc: credState(r[46]), f137: credState(r[47]),
  };

  studentRows.push({
    lrn: key, student_no: studID,
    first_name: fixText(r[5] || ''), middle_name: fixText(r[6] || ''), last_name: fixText(r[4] || ''), extension: '',
    gender: sex(r[19]), birthdate: bday, religion: fixText(r[18] || ''),
    address: fixText(r[7] || ''), contact_number: r[9] || r[8] || r[10] || '',
    father_name: fixText(r[23] || ''), mother_maiden_name: fixText(r[30] || ''), guardian_relation: guardianRelation,
    current_sy: currentSy, current_class_id: currentClassId, curriculum,
    status: currentSy === ACTIVE_SY ? 'Active' : 'Graduated',
    elem_school_graduated_from: '', school_type: '',
    loyalty_years: npsYears,
    enrolment_history: hist,
    credentials,
  });
}

console.log(`students: ${studentRows.length} (blank LRN: ${blankLrn}, key collisions: ${collisions}, class-linked: ${linkedClass})`);
console.log(`classes: ${classRows.length}, teachers: ${teacherById.size}, schools: ${schoolByCode.size}, years: ${years.length}`);

// ── emit foundational SQL ─────────────────────────────────────────────────
const L = (s) => s + '\n';
function upsert(table, cols, rowsSql, conflict, updateCols) {
  const set = updateCols.map((c) => `${c}=excluded.${c}`).join(', ');
  return `insert into ${table} (${cols.join(',')}) values\n${rowsSql.join(',\n')}\non conflict (${conflict}) do update set ${set};\n`;
}

let f = '';
f += L('-- ════ Set A · 01 foundational (school years, teachers, subjects, schools, classes) ════');
f += L('begin;');

// school years
{
  const rows = years.map((c) => {
    const [a, b] = c.split('-');
    return `(${sq(c)},${sq(`SY ${a}–${b}`)},${sq(`${a}-06-01`)},${sq(`${b}-03-31`)},${c === ACTIVE_SY})`;
  });
  f += L(upsert('reg_school_years', ['code', 'label', 'start_date', 'end_date', 'is_active'], rows,
    'code', ['label', 'start_date', 'end_date']));
}
// teachers
{
  const rows = [...teacherById.values()].filter((t) => t.id != null).map((t) =>
    `(${t.id},${sq(t.title)},${sq(t.family)},${sq(t.first)},${sq(t.mi)},${sq(t.email)},${t.yearStart},${t.yearEnd},${adviserIds.has(String(t.id))},'')`);
  f += L(upsert('reg_teachers',
    ['id', 'title', 'family_name', 'first_name', 'middle_initial', 'email', 'year_started', 'year_ended', 'is_adviser', 'curriculum'],
    rows, 'id', ['title', 'family_name', 'first_name', 'middle_initial', 'email', 'year_started', 'year_ended', 'is_adviser']));
  f += L(`select setval(pg_get_serial_sequence('reg_teachers','id'), (select max(id) from reg_teachers));`);
}
// subjects
{
  const seen = new Set();
  const rows = [];
  for (const r of raw.tbladdsubjects) {
    const code = String(r[1] || '').trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    rows.push(`(${sq(code)},${sq(fixText(r[2] || code))},${sq(r[3] || '')},${sq(normCategory(r[4]))})`);
  }
  f += L(upsert('reg_subjects', ['code', 'full_name', 'abbreviation', 'category'], rows,
    'code', ['full_name', 'abbreviation', 'category']));
}
// schools
{
  const seen = new Set();
  const rows = [];
  for (const r of raw.tblschools) {
    const code = String(r[2] || '').trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    rows.push(`(${sq(code)},${sq(fixText(r[1] || ''))},${sq(fixText(r[3] || ''))},${sq(fixText(r[4] || ''))},${sq(fixText(r[5] || ''))},${sq(r[6] || '')},${sq(r[7] || '')})`);
  }
  f += L(upsert('reg_schools', ['code', 'name', 'address', 'district', 'division', 'region', 'type'], rows,
    'code', ['name', 'address', 'district', 'division', 'region', 'type']));
}
// classes
{
  const rows = classRows.map((c) =>
    `(${sq(c.id)},${sq(c.sy)},${sq(c.grade_level)},${sq(c.section_name)},${c.adviser_id ?? 'NULL'},${sq(c.curriculum)})`);
  f += L(upsert('reg_classes', ['id', 'sy', 'grade_level', 'section_name', 'adviser_id', 'curriculum'], rows,
    'id', ['sy', 'grade_level', 'section_name', 'adviser_id', 'curriculum']));
}
f += L('commit;');
writeFileSync(join(OUT, '01-foundational.sql'), f);
console.log('wrote 01-foundational.sql', (f.length / 1024).toFixed(0) + 'KB');

// ── emit students SQL (chunked) ───────────────────────────────────────────
const SCOLS = ['lrn', 'student_no', 'first_name', 'middle_name', 'last_name', 'extension', 'gender',
  'birthdate', 'religion', 'address', 'contact_number', 'father_name', 'mother_maiden_name',
  'guardian_relation', 'current_sy', 'current_class_id', 'curriculum', 'status',
  'elem_school_graduated_from', 'school_type', 'loyalty_years', 'enrolment_history', 'credentials'];
const SUPD = SCOLS.filter((c) => c !== 'lrn'); // never clobber grades/ncae/nat here

function studentValues(s) {
  return '(' + [
    sq(s.lrn), sq(s.student_no), sq(s.first_name), sq(s.middle_name), sq(s.last_name), sq(s.extension),
    sq(s.gender), s.birthdate ? sq(s.birthdate) : 'NULL', sq(s.religion), sq(s.address), sq(s.contact_number),
    sq(s.father_name), sq(s.mother_maiden_name), sq(s.guardian_relation),
    s.current_sy ? sq(s.current_sy) : 'NULL', s.current_class_id ? sq(s.current_class_id) : 'NULL',
    sq(s.curriculum), sq(s.status), sq(s.elem_school_graduated_from), sq(s.school_type),
    s.loyalty_years, jsonb(s.enrolment_history), jsonb(s.credentials),
  ].join(',') + ')';
}

let part = 0;
for (let i = 0; i < studentRows.length; i += CHUNK) {
  part++;
  const slice = studentRows.slice(i, i + CHUNK);
  let body = '';
  body += L(`-- ════ Set A · 02 students part ${part} (rows ${i + 1}–${i + slice.length}) ════`);
  body += L('begin;');
  body += L(upsert('reg_students', SCOLS, slice.map(studentValues), 'lrn', SUPD));
  body += L('commit;');
  const name = `02-students-${String(part).padStart(3, '0')}.sql`;
  writeFileSync(join(OUT, name), body);
  console.log(`wrote ${name}`, (body.length / 1024).toFixed(0) + 'KB', `(${slice.length} rows)`);
}
console.log('\nDone. Files in', OUT);
