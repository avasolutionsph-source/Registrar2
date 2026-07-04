import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { listTeachers, listClasses } from '@/lib/db';
import type { Teacher, ClassRecord } from '@/types';

export default function TeachersList() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false); // default: active for the current year only

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
      render: (t) => (
        <StatusBadge tone={t.yearEnded === 0 ? 'ok' : 'na'}>
          {t.yearEnded === 0 ? 'Active' : 'Ended'}
        </StatusBadge>
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
    </>
  );
}
