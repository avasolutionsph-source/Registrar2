// Loads the generated import SQL straight into Supabase via the Management API
// (POST /v1/projects/{ref}/database/query) using a Personal Access Token.
// No DB password / pooler needed. Idempotent files → safe to re-run.
//
//   SUPABASE_PAT=sbp_... node scripts/migrate/load-via-api.mjs
//
// Optional: pass file globs/names as args to run only a subset, e.g.
//   ... load-via-api.mjs 03-grades-005.sql 03-grades-006.sql

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = 'srgdrdnwkcwcafnmzkio';
const PAT = process.env.SUPABASE_PAT;
if (!PAT) { console.error('Missing SUPABASE_PAT env var'); process.exit(1); }

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

// default run order: all students then all grades (01 foundational already loaded)
let files = readdirSync(OUT)
  .filter((f) => /^(02-students|03-grades|04-conduct|05-form137log)-\d+\.sql$/.test(f))
  .sort();
if (process.argv.length > 2) {
  const want = new Set(process.argv.slice(2));
  files = files.filter((f) => want.has(f));
}

async function runFile(name) {
  const sql = readFileSync(join(OUT, name), 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      const txt = await r.text();
      if (r.ok) return true;
      // 5xx → retry; 4xx → hard fail (SQL/permission error)
      if (r.status >= 500 && attempt < 3) { console.log(`  ${name}: HTTP ${r.status}, retry ${attempt}…`); continue; }
      console.error(`  ✗ ${name}: HTTP ${r.status} ${txt.slice(0, 500)}`);
      return false;
    } catch (e) {
      if (attempt < 3) { console.log(`  ${name}: ${e.message}, retry ${attempt}…`); continue; }
      console.error(`  ✗ ${name}: ${e.message}`);
      return false;
    }
  }
  return false;
}

console.log(`Loading ${files.length} files into ${REF}…\n`);
let done = 0;
for (const name of files) {
  const t0 = process.hrtime.bigint();
  const ok = await runFile(name);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (!ok) { console.error(`\nStopped at ${name}. Fix and re-run (idempotent).`); process.exit(1); }
  done++;
  console.log(`  ✓ ${name}  (${(ms / 1000).toFixed(1)}s)  [${done}/${files.length}]`);
}
console.log(`\nDone. ${done} files loaded.`);
