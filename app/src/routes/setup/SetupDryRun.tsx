import { useEffect, useState } from 'react';
import { Play, Square, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  getDryRunStatus,
  startDryRun,
  stopDryRun,
  type DryRunStatus,
  type DryRunStopResult,
} from '@/lib/db';

// Setup → Dry Run. Start takes a picture of everything a practice run can
// touch; Stop puts it all back. Meant for rehearsing the grade flow with real
// teachers without leaving practice grades behind.
//
// This page can erase work, so nothing here is one click: Stop asks the user to
// type the word, and the server refuses a snapshot older than 48 hours unless
// the same call is repeated deliberately.

const WHAT_IS_RESTORED = [
  'Encoded grades (scores, HPS, attitude)',
  'Adviser conduct and values',
  'Review states — For Checking, Returned, Approved, and the locks',
  'Teaching loads and term coverage',
  'Substitute access',
  'Office teacher rosters',
  'MAPEH rotation hand-overs',
  'Open / closed terms',
];

const WHAT_IS_KEPT = [
  'Subject order per grade',
  'Weight components and transmutation',
  'Honor criteria and grading policy',
  'Approval routing',
  'School years, school profile, officials',
  'Learner records and their personal details',
];

// The one failure worth naming precisely: the SQL has not been pasted yet, so
// the RPC does not exist. Anything else is shown as the server said it.
const statusError = (e: unknown) =>
  e instanceof Error && /dryrun_status|PGRST202|does not exist/i.test(e.message)
    ? 'The dry-run tooling is not installed yet. In the Supabase SQL editor, run dryrun-snapshot-and-restore.sql first, then setup-dryrun-controls.sql.'
    : e instanceof Error
      ? e.message
      : 'Could not read the dry-run status.';

export default function SetupDryRun() {
  const [status, setStatus] = useState<DryRunStatus | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<DryRunStopResult | null>(null);
  const [startedMsg, setStartedMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      setStatus(await getDryRunStatus());
      setError(null);
    } catch (e) {
      setStatus(null);
      setError(statusError(e));
    }
  }

  // Cancelled-flag IIFE: no setState in the effect body itself, so a slow first
  // load cannot write into an unmounted page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getDryRunStatus();
        if (cancelled) return;
        setStatus(s);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setStatus(null);
        setError(statusError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onStart() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const saved = await startDryRun(note.trim() || undefined);
      const total = Object.values(saved).reduce((a, b) => a + Number(b), 0);
      setStartedMsg(`Snapshot taken — ${total.toLocaleString()} rows saved. The dry run is running.`);
      setNote('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the dry run.');
    } finally {
      setBusy(false);
    }
  }

  async function onStop(force: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await stopDryRun(force);
      setResult(r);
      setStartedMsg(null);
      setConfirmStop(false);
      setTyped('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not stop the dry run.');
    } finally {
      setBusy(false);
    }
  }

  const running = !!status;
  const stale = (status?.hoursElapsed ?? 0) > 48;

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Dry Run' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Dry Run</h1>
        <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
          Rehearse with real teachers without leaving practice data behind. Start takes a picture
          of everything a practice run can touch; Stop puts it back exactly as it was.
        </p>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* The state of the world, stated plainly and first — this is the one
          thing someone opening this page needs to know. */}
      <div
        className={`mb-4 rounded-md border px-4 py-3 ${
          running
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-border bg-app text-ink-secondary'
        }`}
      >
        {status === undefined ? (
          <span className="text-[13px]">Checking…</span>
        ) : running ? (
          <div className="text-[13px]">
            <div className="font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              A dry run is running.
            </div>
            <div className="mt-1">
              Started {new Date(status.takenAt).toLocaleString()} by {status.takenBy} —{' '}
              {status.hoursElapsed} hour{status.hoursElapsed === 1 ? '' : 's'} ago.
              {status.note ? ` “${status.note}”` : ''}
            </div>
            <div className="mt-1">
              Everything entered from now until you press Stop will be undone.{' '}
              <span className="font-semibold">Do not use the system for real work.</span>
            </div>
          </div>
        ) : (
          <span className="text-[13px]">
            No dry run is running. The system is in normal use.
          </span>
        )}
      </div>

      {startedMsg && !result && (
        <p className="mb-3 text-[13px] text-ok-fg bg-ok-fg/10 border border-ok-fg/20 rounded-md px-3 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {startedMsg}
        </p>
      )}

      <SectionCard heading={running ? 'Stop and put everything back' : 'Start a dry run'}>
        {!running ? (
          <div className="max-w-[560px]">
            <label className="block text-[12.5px] font-semibold text-ink-primary mb-1.5">
              What is this run for? <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Grade flow rehearsal with the GS teachers"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] mb-3"
            />
            <Button onClick={() => void onStart()} disabled={busy} className="gap-2">
              <Play className="w-3.5 h-3.5" /> {busy ? 'Taking the snapshot…' : 'Start dry run'}
            </Button>
            <p className="text-[12px] text-ink-muted mt-2">
              Takes a few seconds. Nothing changes for anyone using the system — the snapshot is
              only a copy. Every table is counted against the live one before the run is allowed to
              start, so an incomplete picture stops here instead of at the restore.
            </p>
            <div className="mt-3 rounded-md border border-border bg-app p-3 text-[12px] text-ink-secondary">
              <span className="font-semibold text-ink-primary">Before you press Start:</span> tell
              everyone to stay out of the system. Anything entered during the run — including real
              work — is erased when you stop.
            </div>
          </div>
        ) : (
          <div className="max-w-[560px]">
            <div className="rounded-md border border-nps-red/30 bg-nps-red/5 p-3 text-[12.5px] text-nps-red mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  Stopping restores the database to{' '}
                  <span className="font-semibold">
                    {new Date(status.takenAt).toLocaleString()}
                  </span>
                  . Everything entered since then is erased — including real work, if any was done
                  by mistake during the run.
                  {stale && (
                    <div className="mt-1.5 font-semibold">
                      This run started {status.hoursElapsed} hours ago. Check with everyone before
                      you stop it.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!confirmStop ? (
              <Button variant="outline" onClick={() => setConfirmStop(true)} className="gap-2">
                <Square className="w-3.5 h-3.5" /> Stop dry run and restore
              </Button>
            ) : (
              <>
                <label className="block text-[12.5px] font-semibold text-ink-primary mb-1.5">
                  Type <span className="font-mono">RESTORE</span> to confirm
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConfirmStop(false);
                      setTyped('');
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void onStop(stale)}
                    disabled={busy || typed.trim().toUpperCase() !== 'RESTORE'}
                    className="gap-2"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {busy ? 'Restoring…' : 'Restore now'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </SectionCard>

      {result && (
        <div className="mt-4">
          <SectionCard heading="Restored">
            <ul className="text-[13px] text-ink-primary space-y-1">
              {result.restored.map((r) => (
                <li key={r.src}>
                  {r.src} — <span className="tabular-nums">{Number(r.n).toLocaleString()}</span> rows
                </li>
              ))}
            </ul>
            {result.extras.length > 0 ? (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900">
                <div className="font-semibold mb-1.5">
                  {result.extras.length} thing{result.extras.length === 1 ? '' : 's'} created during
                  the run were left in place
                </div>
                <p className="mb-2">
                  Learners, sections, teachers and accounts are never deleted automatically — decide
                  each one yourself.
                </p>
                <ul className="space-y-0.5">
                  {result.extras.map((e, i) => (
                    <li key={`${e.kind}-${e.identifier}-${i}`}>
                      <span className="font-medium">{e.kind}</span> — {e.identifier}
                      {e.detail ? ` · ${e.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-ink-secondary">
                Nothing new was created during the run — the restore is complete.
              </p>
            )}
          </SectionCard>
        </div>
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <SectionCard heading="Put back by Stop">
          <ul className="text-[12.5px] text-ink-secondary space-y-1 list-disc pl-4">
            {WHAT_IS_RESTORED.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard heading="Left alone">
          <ul className="text-[12.5px] text-ink-secondary space-y-1 list-disc pl-4">
            {WHAT_IS_KEPT.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="text-[12px] text-ink-muted mt-2">
            Setup is not practice data — it stays exactly as you configured it.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
