import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { listStudentsLite, listClasses, listStudentsBySy, type StudentYear } from '@/lib/db';
import { isAllTime } from '@/types';
import type { ClassRecord, SchoolYear } from '@/types';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel } from '@/lib/forms';

type RegMode = 'current' | 'old';

export default function StudentsList() {
  const navigate = useNavigate();
  const { currentSY, mode } = useOutletContext<{ currentSY: SchoolYear | null; mode: RegMode }>();
  const [students, setStudents] = useState<StudentYear[]>([]);
  const [classById, setClassById] = useState<Map<string, ClassRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const code = currentSY?.code;
  const isOld = mode === 'old';

  // Current tab → the live roster (filtered client-side by current_sy, with the
  // learner's live class). Old System → the TRUE roster for that year, read from
  // enrolment_history so it includes everyone who was at NPS that year.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (isOld && code) {
          const rows = await listStudentsBySy(code);
          if (cancelled) return;
          setStudents(rows);
          setClassById(new Map());
        } else {
          const [st, cls] = await Promise.all([listStudentsLite(), listClasses()]);
          if (cancelled) return;
          setStudents(st);
          setClassById(new Map(cls.map((c) => [c.id, c])));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load students.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, isOld]);

  const cols: Column<StudentYear>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '32%',
      render: (s) => formatLastFirstMiddle(s),
    },
    {
      key: 'lrn',
      header: 'LRN',
      width: '15%',
      render: (s) => <span className="font-mono">{s.lrn}</span>,
    },
    {
      key: 'class',
      header: isOld ? 'Grade that year' : 'Class',
      width: '24%',
      render: (s) => {
        if (isOld) {
          return s.yearGrade ? `${gradeLabel(s.yearGrade)}${s.yearSection ? ` · ${s.yearSection}` : ''}` : '—';
        }
        const c = classById.get(s.currentClassId);
        return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '—';
      },
    },
    { key: 'gender', header: 'Sex', width: '7%', render: (s) => s.gender.charAt(0) },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (s) => <StatusBadge tone="ok">{s.status}</StatusBadge>,
    },
  ];

  // Old System: the server already returned exactly that year's roster.
  // Current: filter the full list to the active SY.
  const visible = isOld
    ? students
    : isAllTime(currentSY)
      ? students
      : students.filter((s) => s.currentSY === currentSY!.code);

  return (
    <>
      <Breadcrumb items={[{ label: 'Students' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Students</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {loading
            ? 'Loading…'
            : `${visible.length} learner${visible.length === 1 ? '' : 's'}` +
              (isOld ? ` · ${currentSY!.label} · NPS` : isAllTime(currentSY) ? ' · all years' : ` · ${currentSY!.label}`)}
        </p>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : (
        <DataTable<StudentYear>
          data={visible}
          columns={cols}
          searchableText={(s) => `${formatLastFirstMiddle(s)} ${s.lrn} ${s.studentNo}`}
          onRowClick={(s) => navigate(`/students/${s.lrn}`)}
          searchPlaceholder="Search by name, LRN, or Student No.…"
          emptyText={
            loading
              ? 'Loading…'
              : isOld
                ? `No NPS learners on record for ${currentSY!.label}.`
                : isAllTime(currentSY)
                  ? 'No students yet. Click “Add Student” to create one.'
                  : `No learners for ${currentSY!.label}. Switch tabs (Old System) to browse another year.`
          }
          rightActions={
            isOld ? undefined : (
              <Button onClick={() => navigate('/students/new')}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
              </Button>
            )
          }
        />
      )}
    </>
  );
}
