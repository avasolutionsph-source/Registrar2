import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { listTeachers, listClasses, setTeacherActive } from '@/lib/db';
import type { Teacher, ClassRecord, SchoolYear } from '@/types';

export default function TeachersList() {
  const navigate = useNavigate();
  const ctx = useOutletContext<{ currentSY: SchoolYear | null } | null>();
  // The year stamped when a teacher is marked inactive — the current school
  // year's opening year, matching how "Year started" is recorded.
  const syYear =
    Number(String(ctx?.currentSY?.code ?? '').slice(0, 4)) || new Date().getFullYear();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false); // default: active for the current year only
  // Status change is confirmed first: it decides who can still be given a
  // class, so it is never one stray click away.
  const [confirmT, setConfirmT] = useState<Teacher | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, c] = await Promise.all([listTeachers(), listClasses()]);
        if (cancelled) return;
        setTeachers(t);
        setClasses(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load teachers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTeachers = teachers.filter((t) => t.yearEnded === 0);
  const visibleTeachers = showAll ? teachers : activeTeachers;

  const advisedSection = (t: Teacher) => {
    const klass = classes.find((c) => c.adviser.id === t.id);
    return klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—';
  };
  const advisoryOf = (t: Teacher) => classes.find((c) => c.adviser.id === t.id) ?? null;

  async function applyStatus() {
    if (!confirmT) return;
    const nextEnded = confirmT.yearEnded === 0 ? syYear : 0;
    setBusy(true);
    setError(null);
    try {
      await setTeacherActive(confirmT.id, nextEnded);
      setTeachers((ts) =>
        ts.map((x) => (x.id === confirmT.id ? { ...x, yearEnded: nextEnded } : x)),
      );
      setConfirmT(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change the status.');
    } finally {
      setBusy(false);
    }
  }

  const cols: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '30%',
      render: (t) => `${t.title} ${t.familyName}, ${t.firstName} ${t.middleInitial}`,
    },
    { key: 'email', header: 'Email', width: '24%', render: (t) => <span className="text-ink-secondary">{t.email}</span> },
    { key: 'years', header: 'Years', width: '12%', render: (t) => `${t.yearStarted} – ${t.yearEnded === 0 ? 'present' : t.yearEnded}` },
    { key: 'adviser', header: 'Advisory', width: '24%', render: (t) => advisedSection(t) },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      // Click the badge to switch — the row click still opens the profile.
      render: (t) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmT(t);
          }}
          title={t.yearEnded === 0 ? 'Mark as inactive' : 'Mark as active'}
          className="rounded-full hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <StatusBadge tone={t.yearEnded === 0 ? 'ok' : 'na'}>
            {t.yearEnded === 0 ? 'Active' : 'Inactive'}
          </StatusBadge>
        </button>
      ),
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Teachers' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Teachers</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {loading
            ? 'Loading…'
            : showAll
              ? `${teachers.length} on masterlist`
              : `${activeTeachers.length} active this year`}
          {!loading && (
            <span className="text-ink-muted">
              {' '}· click a status badge to mark a teacher active or inactive
            </span>
          )}
        </p>
      </div>

      {!loading && !error && (
        <div className="inline-flex rounded-md border border-border overflow-hidden mb-3 text-[12.5px]">
          <button
            onClick={() => setShowAll(false)}
            className={[
              'px-3 py-1.5',
              !showAll ? 'bg-accent text-white' : 'bg-panel text-ink-secondary hover:bg-panel-alt',
            ].join(' ')}
          >
            Active this year
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={[
              'px-3 py-1.5 border-l border-border',
              showAll ? 'bg-accent text-white' : 'bg-panel text-ink-secondary hover:bg-panel-alt',
            ].join(' ')}
          >
            Masterlist (all)
          </button>
        </div>
      )}

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : (
        <DataTable<Teacher>
          data={visibleTeachers}
          columns={cols}
          searchableText={(t) => `${t.familyName} ${t.firstName} ${t.email}`}
          onRowClick={(t) => navigate(`/teachers/${t.id}`)}
          searchPlaceholder="Search by name or email…"
          emptyText={loading ? 'Loading…' : 'No teachers yet. Click “Add Teacher” to create one.'}
          rightActions={
            <Button onClick={() => navigate('/teachers/new')}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Teacher
            </Button>
          }
        />
      )}

      {/* Confirm the switch and say plainly what it changes. Nothing is
          deleted either way — the record, past grades and any assignment
          stay exactly as they are. */}
      {confirmT && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-ink-primary">
              {confirmT.yearEnded === 0 ? 'Mark as inactive?' : 'Mark as active again?'}
            </h3>
            <p className="text-[13px] text-ink-secondary mt-2">
              <span className="font-semibold">
                {confirmT.title} {confirmT.familyName}, {confirmT.firstName}
              </span>{' '}
              {confirmT.yearEnded === 0 ? (
                <>
                  will be recorded as having ended in{' '}
                  <span className="font-semibold">{syYear}</span>. They drop off
                  &ldquo;Active this year&rdquo; and can no longer be picked as a teacher or
                  adviser anywhere in the system.
                </>
              ) : (
                <>
                  goes back to active. They reappear under &ldquo;Active this year&rdquo; and can
                  be assigned classes and subjects again.
                </>
              )}
            </p>
            {confirmT.yearEnded === 0 && advisoryOf(confirmT) && (
              <p className="mt-2 text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Still the adviser of{' '}
                <span className="font-semibold">{advisedSection(confirmT)}</span>. The section
                keeps them until you assign a new adviser.
              </p>
            )}
            <p className="text-[12.5px] text-ink-muted mt-2">
              Nothing is deleted — their record, past grades and current subject assignments
              stay as they are.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmT(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={applyStatus} disabled={busy}>
                {busy
                  ? 'Saving…'
                  : confirmT.yearEnded === 0
                    ? 'Mark inactive'
                    : 'Mark active'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
