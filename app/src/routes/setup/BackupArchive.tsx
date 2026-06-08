import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Lock, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { listSchoolYears, listStudents, importStudents } from '@/lib/db';
import { encryptArchive, plainArchive, decryptArchive, type ArchiveEnvelope } from '@/lib/archive';
import type { SchoolYear, Student } from '@/types';

interface ArchivePayload {
  kind: 'students';
  students: Student[];
}

// A student "belongs to" a school year if they were enrolled, graded, or had
// conduct recorded in it (records span many years, so this can overlap).
function inSchoolYear(s: Student, sy: string): boolean {
  if (s.currentSY === sy) return true;
  if ((s.enrolmentHistory ?? []).some((e) => e.sy === sy)) return true;
  if (s.grades && Object.prototype.hasOwnProperty.call(s.grades, sy)) return true;
  if (s.conduct && Object.prototype.hasOwnProperty.call(s.conduct, sy)) return true;
  return false;
}

function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BackupArchive() {
  const [years, setYears] = useState<SchoolYear[]>([]);

  // export state
  const [scope, setScope] = useState('all');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  // import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importPw, setImportPw] = useState('');
  const [preview, setPreview] = useState<{ env: ArchiveEnvelope; payload: ArchivePayload } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  useEffect(() => {
    listSchoolYears()
      .then(setYears)
      .catch(() => setYears([]));
  }, []);

  const scopeLabel = scope === 'all' ? 'All students' : years.find((y) => y.code === scope)?.label ?? scope;

  async function runExport() {
    setExportErr(null);
    setExportMsg(null);
    const usePassword = pw.length > 0;
    if (usePassword) {
      if (pw.length < 8) {
        setExportErr('Password must be at least 8 characters (or leave blank for no password).');
        return;
      }
      if (pw !== pw2) {
        setExportErr('Passwords do not match.');
        return;
      }
    }
    setExporting(true);
    try {
      const all = await listStudents();
      const students = scope === 'all' ? all : all.filter((s) => inSchoolYear(s, scope));
      if (students.length === 0) {
        setExportErr('No student records match this scope.');
        return;
      }
      const payload: ArchivePayload = { kind: 'students', students };
      const meta = {
        exportedAt: new Date().toISOString(),
        scope,
        scopeLabel,
        studentCount: students.length,
      };
      const env = usePassword ? await encryptArchive(payload, pw, meta) : plainArchive(payload, meta);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`nps-students-${scope}-${stamp}${usePassword ? '' : '-PLAIN'}.json`, env);
      const count = `${students.length} record${students.length === 1 ? '' : 's'} (${scopeLabel})`;
      setExportMsg(
        usePassword
          ? `Encrypted archive downloaded: ${count}. Check your browser’s Downloads folder.`
          : `Unencrypted archive downloaded: ${count}. Check your Downloads folder — this file is NOT password-protected.`,
      );
      setPw('');
      setPw2('');
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  async function loadPreview() {
    setImportErr(null);
    setImportMsg(null);
    setPreview(null);
    if (!file) {
      setImportErr('Pick an archive file first.');
      return;
    }
    setBusy(true);
    try {
      const env = JSON.parse(await file.text()) as ArchiveEnvelope;
      if (env.encryption !== 'none' && !importPw) {
        setImportErr('This file is password-protected — enter its password.');
        return;
      }
      const payload = await decryptArchive<ArchivePayload>(env, importPw);
      if (payload?.kind !== 'students' || !Array.isArray(payload.students)) {
        throw new Error('Hindi tama ang laman ng archive.');
      }
      setPreview({ env, payload });
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setImportErr(null);
    setImportMsg(null);
    setBusy(true);
    try {
      const n = await importStudents(preview.payload.students);
      setImportMsg(`Imported ${n} student record${n === 1 ? '' : 's'} into the cloud.`);
      setPreview(null);
      setImportPw('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full px-3 py-2 bg-app border border-border rounded text-[13px] text-ink-primary';
  const labelCls = 'text-[12px] font-medium text-ink-secondary';

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Backup & Archive' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Backup &amp; Archive</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Download student records as a password-encrypted file, or restore one back into the cloud.
          Nothing is deleted from the cloud here.
        </p>
      </div>

      <div className="flex items-start gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          The archive file contains learners’ personal data (decrypted). It is protected only by the
          password you set — keep it safe, and store the file securely. If the password is lost, the
          file cannot be recovered.
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* EXPORT */}
        <section className="bg-panel border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-ink-primary" />
            <h2 className="text-[14px] font-semibold text-ink-primary">Export (download)</h2>
          </div>

          <label className={labelCls}>Scope</label>
          <select className={`${field} mt-1 mb-3`} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All students</option>
            {years.map((y) => (
              <option key={y.code} value={y.code}>
                {y.label}
              </option>
            ))}
          </select>

          <label className={labelCls}>File password (optional)</label>
          <input
            type="password"
            className={`${field} mt-1 mb-2`}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Leave blank for no password"
            autoComplete="new-password"
          />
          {pw.length > 0 && (
            <>
              <label className={labelCls}>Confirm password</label>
              <input
                type="password"
                className={`${field} mt-1 mb-3`}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
              />
            </>
          )}
          {pw.length === 0 && (
            <p className="flex items-start gap-1.5 text-[11.5px] text-amber-700 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              No password: the file will NOT be encrypted — anyone who opens it can read the PII.
            </p>
          )}

          {exportErr && <p className="text-[12px] text-nps-red mb-2">{exportErr}</p>}
          {exportMsg && (
            <p className="flex items-start gap-1.5 text-[12px] text-ok-fg mb-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {exportMsg}
            </p>
          )}

          <Button onClick={runExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
            {exporting ? 'Exporting…' : 'Export & Download'}
          </Button>
        </section>

        {/* IMPORT */}
        <section className="bg-panel border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-ink-primary" />
            <h2 className="text-[14px] font-semibold text-ink-primary">Import (restore)</h2>
          </div>

          <label className={labelCls}>Archive file (.json)</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={`${field} mt-1 mb-3 file:mr-2 file:rounded file:border-0 file:bg-sidebar file:px-2 file:py-1 file:text-[12px]`}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setImportMsg(null);
              setImportErr(null);
            }}
          />

          <label className={labelCls}>File password (if encrypted)</label>
          <input
            type="password"
            className={`${field} mt-1 mb-3`}
            value={importPw}
            onChange={(e) => setImportPw(e.target.value)}
            placeholder="Leave blank for unencrypted files"
            autoComplete="off"
          />

          {importErr && <p className="text-[12px] text-nps-red mb-2">{importErr}</p>}
          {importMsg && (
            <p className="flex items-start gap-1.5 text-[12px] text-ok-fg mb-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {importMsg}
            </p>
          )}

          {!preview ? (
            <Button variant="secondary" onClick={loadPreview} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              {busy ? 'Reading…' : 'Open & preview'}
            </Button>
          ) : (
            <div className="border border-border rounded p-3 bg-app">
              <p className="text-[12px] text-ink-secondary mb-1">
                <span className="font-semibold text-ink-primary">{preview.payload.students.length}</span>{' '}
                student records · {preview.env.meta.scopeLabel}
              </p>
              <p className="text-[11px] text-ink-muted mb-3">
                Exported {new Date(preview.env.meta.exportedAt).toLocaleString()}. Importing
                overwrites records with the same LRN.
              </p>
              <div className="flex gap-2">
                <Button onClick={confirmImport} disabled={busy}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                  {busy ? 'Importing…' : `Import ${preview.payload.students.length} records`}
                </Button>
                <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
