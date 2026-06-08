// Print fuller sample rows for transform-critical legacy tables (read-only).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const SQL =
  process.argv[2] ||
  String.raw`c:\Users\opet_\OneDrive\Desktop\NPS\nps sql old registrar\npsnps_06-05-2026.sql`;

// table -> how many chars of the first INSERT to print
const WANT = {
  tbladdgrade: 4000, // full grade-code map
  tblsetsconfig: 4000,
  tblsets: 4000,
  tblsygradesection: 1600,
  tbladdsubjects: 4000,
  tblschools: 1200,
  gradesum: 1200,
  tblde: 1200,
  tbldeportment: 1200,
  tblattitude: 1200,
  specialprograms: 1200,
  tbldayspresent: 1200,
  tbldaystardy: 1200,
  tblformlog: 1200,
  studprofile: 2200,
  tblgra_mat: 1600,
  tblteachers: 1600,
  tblsubjcriteria: 1600,
  tblsubjteach: 1200,
  tblassignadviser: 1200,
  tblschoolyear: 1200,
  tblremedial: 1200,
};
const got = {};

const rl = createInterface({
  input: createReadStream(SQL, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});
rl.on('line', (line) => {
  const m = line.match(/^INSERT INTO `([^`]+)` VALUES /);
  if (!m) return;
  const name = m[1];
  if (WANT[name] && !got[name]) {
    const v = line.indexOf('VALUES ') + 7;
    got[name] = line.slice(v, v + WANT[name]);
  }
});
rl.on('close', () => {
  for (const name of Object.keys(WANT)) {
    console.log(`\n===== ${name} =====`);
    console.log(got[name] ?? '(no rows)');
  }
});
