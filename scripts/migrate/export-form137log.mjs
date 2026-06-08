// Set D: Form 137 release log. Maps legacy tblformlog rows to reg_form137_log
// (keyed to reg_students by the same studID→key logic as grades/conduct).
//   05-form137log-001.sql … NNN.sql   (idempotent via legacy_id)
//
// Usage: node --max-old-space-size=4096 scripts/migrate/export-form137log.mjs [dump.sql]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DUMP, streamTables, normId } from './lib.mjs';

const DUMP = process.argv[2] || DEFAULT_DUMP;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });
const CHUNK = 1000;

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};
// "May 2, 2016" / "March 16,2012" / "May 6,2016" → ISO, else null.
// Rejects impossible calendar dates ("February 38, 1990") so the load can't fail.
function parseDate(s) {
  const m = String(s || '').match(/([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})(?!\d)/);
  if (!m) return null;
  const mm = MONTHS[m[1].toLowerCase()];
  if (!mm) return null;
  const year = +m[3];
  if (year < 1980 || year > 2030) return null; // typo year (e.g. "2996") → keep raw text
  const iso = `${m[3]}-${mm}-${String(m[2]).padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (
    isNaN(d.getTime()) ||
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== +mm ||
    d.getUTCDate() !== +m[2]
  )
    return null; // out-of-range day (keep the raw text instead)
  return iso;
}

// ── 1. studprofile key map (same keying as grades/conduct) ─────────────────
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

// ── 2. read tblformlog ─────────────────────────────────────────────────────
const records = [];
let orphans = 0;
console.log('Pass 2: tblformlog…');
await streamTables(DUMP, new Set(['tblformlog']), (_t, r) => {
  const legacyId = parseInt(r[0], 10);
  const key = keyByNorm.get(normId(r[1]));
  if (!key) { orphans++; return; }
  const level = r[2] == null || r[2] === '' ? null : parseInt(r[2], 10);
  records.push({
    legacyId,
    lrn: key,
    level: Number.isFinite(level) ? level : null,
    releasedText: String(r[3] || '').trim(),
    releasedDate: parseDate(r[3]),
    school: String(r[4] || '').trim(),
    purpose: String(r[5] || '').trim(),
  });
});
console.log(`  ${records.length} log rows mapped (${orphans} orphans with no profile)`);

// ── 3. emit chunked idempotent INSERTs ─────────────────────────────────────
const esc = (s) => (s == null || s === '' ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");
const intOrNull = (n) => (n == null || !Number.isFinite(n) ? 'null' : String(n));
let part = 0;
for (let i = 0; i < records.length; i += CHUNK) {
  part++;
  const slice = records.slice(i, i + CHUNK);
  let body = `-- ════ Set D · 05 Form 137 release log part ${part} (rows ${i + 1}–${i + slice.length}) ════\n`;
  body += 'begin;\n';
  body += 'insert into reg_form137_log (legacy_id, lrn, level, released_text, released_date, requesting_school, purpose) values\n';
  body += slice
    .map((r) => `(${intOrNull(r.legacyId)},${esc(r.lrn)},${intOrNull(r.level)},${esc(r.releasedText)},${esc(r.releasedDate)},${esc(r.school)},${esc(r.purpose)})`)
    .join(',\n');
  body += '\non conflict (legacy_id) do update set\n';
  body += '  lrn = excluded.lrn, level = excluded.level, released_text = excluded.released_text,\n';
  body += '  released_date = excluded.released_date, requesting_school = excluded.requesting_school,\n';
  body += '  purpose = excluded.purpose;\n';
  body += 'commit;\n';
  const name = `05-form137log-${String(part).padStart(3, '0')}.sql`;
  writeFileSync(join(OUT, name), body);
  console.log(`  wrote ${name} (${slice.length} rows, ${(body.length / 1024).toFixed(0)}KB)`);
}
console.log(`\nDone. ${part} log files in`, OUT);
