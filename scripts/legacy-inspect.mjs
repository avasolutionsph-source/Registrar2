// Recon for the legacy MySQL dump (read-only).
// Streams the dump line-by-line and reports, per table:
//   - column list (from CREATE TABLE)
//   - approximate row count (counts `),(` tuple separators in INSERTs)
// Also prints the CREATE TABLE block + first sample row for a focus set.
//
// Usage: node scripts/legacy-inspect.mjs [path-to-sql]

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const SQL =
  process.argv[2] ||
  String.raw`c:\Users\opet_\OneDrive\Desktop\NPS\nps sql old registrar\npsnps_06-05-2026.sql`;

const FOCUS = new Set([
  'studprofile',
  'tblenrolment',
  'tblschoolyear',
  'tblteachers',
  'tbladdsections',
  'tblsygradesection',
  'tbladdsubjects',
  'tblsubjects',
  'tblparents',
  'tblschools',
  'tblformlog',
  'tblremedial',
  'tblgra_mat',
  'tblsubjcriteria',
  'tblsets',
  'tblsetsconfig',
  'tbladdgrade',
  'tblassignadviser',
  'tblsubjteach',
]);

const tables = {}; // name -> { cols: [], rows: 0 }
let curCreate = null; // { name, lines: [] }
let order = [];

function countTuples(line) {
  // crude tuple counter: number of "),(" plus 1 if there's at least one "("
  // good enough for volume estimates; not exact when data contains "),("
  const m = line.match(/\),\(/g);
  const base = m ? m.length + 1 : line.includes('VALUES (') ? 1 : 0;
  return base;
}

const sampleRow = {}; // name -> first VALUES tuple text (truncated)

const rl = createInterface({
  input: createReadStream(SQL, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  // CREATE TABLE start
  let m = line.match(/^CREATE TABLE `([^`]+)`/);
  if (m) {
    curCreate = { name: m[1], lines: [] };
    tables[m[1]] ||= { cols: [], rows: 0 };
    order.push(m[1]);
    return;
  }
  if (curCreate) {
    curCreate.lines.push(line);
    // column definitions: lines starting with `  \`col\` `
    const cm = line.match(/^\s+`([^`]+)`\s+/);
    if (cm) tables[curCreate.name].cols.push(cm[1]);
    if (/^\)\s*ENGINE/.test(line) || /^\);?\s*$/.test(line)) {
      if (FOCUS.has(curCreate.name)) {
        console.log(`\n===== CREATE TABLE ${curCreate.name} =====`);
        console.log('cols:', tables[curCreate.name].cols.join(', '));
      }
      curCreate = null;
    }
    return;
  }
  // INSERT rows
  m = line.match(/^INSERT INTO `([^`]+)` VALUES /);
  if (m) {
    const name = m[1];
    tables[name] ||= { cols: [], rows: 0 };
    tables[name].rows += countTuples(line);
    if (FOCUS.has(name) && !sampleRow[name]) {
      const vidx = line.indexOf('VALUES ');
      sampleRow[name] = line.slice(vidx + 7, vidx + 7 + 400);
    }
  }
});

rl.on('close', () => {
  console.log('\n\n========== TABLE ROW COUNTS (approx) ==========');
  const sorted = Object.entries(tables).sort((a, b) => b[1].rows - a[1].rows);
  for (const [name, t] of sorted) {
    console.log(`${String(t.rows).padStart(8)}  ${name}  (${t.cols.length} cols)`);
  }
  console.log('\n========== SAMPLE ROWS (focus tables) ==========');
  for (const name of FOCUS) {
    if (sampleRow[name]) console.log(`\n--- ${name} ---\n${sampleRow[name]}`);
  }
});
