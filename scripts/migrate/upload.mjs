// One-command uploader — runs every out/*.sql against the Supabase Postgres DB,
// in order, each file in its own transaction. Use this instead of pasting 33
// files into the SQL Editor by hand.
//
// ── Setup (one time) ───────────────────────────────────────────────────────
//   1. Supabase Dashboard → Project Settings → Database → "Connection string".
//      Pick **Session pooler** (or **Direct connection**) — NOT "Transaction
//      pooler". Copy the URI and replace [YOUR-PASSWORD] with your DB password.
//   2. Create  scripts/migrate/.env  with one line:
//          DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-...:5432/postgres
//   3. cd scripts/migrate && npm install
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node upload.mjs                       # run all files in order
//   node upload.mjs --from 03-grades-004.sql   # resume from a file (after a fix)
//
// Each out/*.sql is its own `begin … commit`, so a failure rolls back cleanly
// and the script stops with a resume hint. Every file is idempotent (upserts),
// so re-running is safe.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');

// ── resolve the connection string ──────────────────────────────────────────
function loadDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const envPath = join(HERE, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:DATABASE_URL|SUPABASE_DB_URL)\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const url = loadDbUrl();
if (!url) {
  console.error('✖ No database URL found.');
  console.error('  Create scripts/migrate/.env with:  DATABASE_URL=postgresql://…');
  console.error('  (Supabase → Settings → Database → Connection string → Session pooler)');
  process.exit(1);
}

// ── pick the files (in order), optionally resuming ─────────────────────────
const fromIdx = process.argv.indexOf('--from');
const fromFile = fromIdx !== -1 ? process.argv[fromIdx + 1] : null;

const files = readdirSync(OUT).filter((f) => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.error(`✖ No .sql files in ${OUT}. Generate them first (see README).`);
  process.exit(1);
}
let start = 0;
if (fromFile) {
  start = files.indexOf(fromFile);
  if (start === -1) {
    console.error(`✖ --from ${fromFile} not found in out/`);
    process.exit(1);
  }
}
const todo = files.slice(start);

// ── run ────────────────────────────────────────────────────────────────────
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

console.log('Connecting to Supabase…');
try {
  await client.connect();
} catch (e) {
  console.error(`✖ Could not connect: ${e.message}`);
  console.error('  Check the password and that you used the Session pooler / Direct URI.');
  process.exit(1);
}
console.log(`Connected. Running ${todo.length} file(s)${fromFile ? ` from ${fromFile}` : ''}.\n`);

const t0 = Date.now();
let done = 0;
for (const f of todo) {
  const sql = readFileSync(join(OUT, f), 'utf8');
  process.stdout.write(`→ ${f.padEnd(26)} `);
  try {
    await client.query(sql);
    done++;
    process.stdout.write('OK\n');
  } catch (e) {
    process.stdout.write('FAILED\n');
    console.error(`\n✖ ${f}: ${e.message}`);
    console.error(`\nNothing from this file was saved (it rolled back).`);
    console.error(`Fix the cause, then resume with:\n  node upload.mjs --from ${f}`);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log(`\n✓ Done — ${done}/${todo.length} files in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
console.log('Open the Registrar System; the "2026–2027" tab should now show learners.');
