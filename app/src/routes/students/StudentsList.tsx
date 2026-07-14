import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { StatusBadge } from '@/components/entity/StatusBadge';
import {
  listStudentsLite,
  listClasses,
  listStudentsBySy,
  setStudentStatus,
  studentHasRecords,
  deleteStudent,
  type StudentYear,
} from '@/lib/db';
import type { Student } from '@/types';
import { isAllTime } from '@/types';
import type { ClassRecord, SchoolYear } from '@/types';
import { formatLastFirstMiddle } from '@/lib/format';
import { displayLrn } from '@/lib/lrn';
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

  // Per-row actions (registrar-only): change status or permanently delete.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<StudentYear | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyLrn, setBusyLrn] = useState<string | null>(null);
  const menuAnchor = useRef<HTMLDivElement | null>(null);

  // Close the row menu when clicking anywhere else.
  useEffect(() => {
    if (!menuFor) return;
    const onDoc = () => setMenuFor(null);
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuFor]);

  const statusTone = (st: string): 'ok' | 'pending' | 'na' =>
    st === 'Active' ? 'ok' : st === 'Dropped' ? 'na' : 'pending';

  // Transferred Out / Dropped / Mark Active — a pure status change, no data removed.
  async function changeStatus(s: StudentYear, status: Student['status']) {
    setMenuFor(null);
    setActionMsg(null);
    setBusyLrn(s.lrn);
    try {
      await setStudentStatus(s.lrn, status);
      setStudents((cur) => cur.map((x) => (x.lrn === s.lrn ? { ...x, status } : x)));
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Failed to update the status.');
    } finally {
      setBusyLrn(null);
    }
  }

  // Delete flow: block when the learner has academic records; otherwise confirm.
  async function askDelete(s: StudentYear) {
    setMenuFor(null);
    setActionMsg(null);
    setBusyLrn(s.lrn);
    try {
      const has = await studentHasRecords(s.lrn);
      if (has) {
        setActionMsg(
          `Cannot delete ${formatLastFirstMiddle(s)} — this learner has existing records (grades or enrolment history). Set them to Transferred Out or Dropped instead.`,
        );
        return;
      }
      setConfirm(s);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Failed to check the learner.');
    } finally {
      setBusyLrn(null);
    }
  }

  async function doDelete() {
    if (!confirm) return;
    const s = confirm;
    setBusyLrn(s.lrn);
    try {
      await deleteStudent(s.lrn);
      setStudents((cur) => cur.filter((x) => x.lrn !== s.lrn));
      setConfirm(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Failed to delete the learner.');
      setConfirm(null);
    } finally {
      setBusyLrn(null);
    }
  }

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
      render: (s) => <span className="font-mono">{displayLrn(s.lrn) || '—'}</span>,
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
      render: (s) => <StatusBadge tone={statusTone(s.status)}>{s.status}</StatusBadge>,
    },
    // Registrar-only row actions — only on the Current tab (live roster).
    ...(!isOld
      ? [
          {
            key: 'actions',
            header: '',
            width: '6%',
            render: (s: StudentYear) => (
              <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === s.lrn ? null : s.lrn);
                  }}
                  disabled={busyLrn === s.lrn}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-ink-secondary hover:bg-app hover:text-ink-primary disabled:opacity-50"
                  aria-label="Edit"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" /> Edit
                </button>
                {menuFor === s.lrn && (
                  <div
                    ref={menuAnchor}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-20 w-44 rounded-md border border-border bg-panel shadow-lg py-1 text-[12.5px]"
                  >
                    {s.status !== 'Transferred' && (
                      <button onClick={() => changeStatus(s, 'Transferred')} className="block w-full text-left px-3 py-1.5 text-ink-primary hover:bg-app">
                        Transferred Out
                      </button>
                    )}
                    {s.status !== 'Dropped' && (
                      <button onClick={() => changeStatus(s, 'Dropped')} className="block w-full text-left px-3 py-1.5 text-ink-primary hover:bg-app">
                        Dropped
                      </button>
                    )}
                    {s.status !== 'Active' && (
                      <button onClick={() => changeStatus(s, 'Active')} className="block w-full text-left px-3 py-1.5 text-ink-primary hover:bg-app">
                        Mark Active
                      </button>
                    )}
                    <div className="my-1 border-t border-border-soft" />
                    <button onClick={() => askDelete(s)} className="block w-full text-left px-3 py-1.5 text-nps-red hover:bg-nps-red/10">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ),
          } as Column<StudentYear>,
        ]
      : []),
  ];

  // Old System: the server already returned exactly that year's roster.
  // Current: filter the full list to the active SY.
  const visible = isOld
    ? students
    : isAllTime(currentSY)
      ? students
      : students.filter((s) => s.currentSY === currentSY!.code);
  // Header count reflects ACTIVE learners only; Transferred/Dropped stay listed
  // (with their badge) but no longer count toward the active total.
  const activeCount = visible.filter((s) => s.status === 'Active').length;

  const classLabel = (s: StudentYear): string => {
    if (isOld) {
      return s.yearGrade ? `${gradeLabel(s.yearGrade)}${s.yearSection ? ` · ${s.yearSection}` : ''}` : '';
    }
    const c = classById.get(s.currentClassId);
    return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '';
  };
  const csvColumns = [
    { header: 'Name', value: (s: StudentYear) => formatLastFirstMiddle(s) },
    { header: 'LRN', value: (s: StudentYear) => displayLrn(s.lrn) },
    { header: 'Student No.', value: (s: StudentYear) => s.studentNo },
    { header: isOld ? 'Grade that year' : 'Class', value: classLabel },
    { header: 'Sex', value: (s: StudentYear) => s.gender },
    { header: 'Status', value: (s: StudentYear) => s.status },
  ];
  const exportName = `students-${isOld || !isAllTime(currentSY) ? (currentSY?.code ?? 'all') : 'all'}`;

  return (
    <>
      <Breadcrumb items={[{ label: 'Students' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Students</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {loading
            ? 'Loading…'
            : isOld
              ? `${visible.length} learner${visible.length === 1 ? '' : 's'} · ${currentSY!.label} · NPS`
              : `${activeCount} active learner${activeCount === 1 ? '' : 's'}` +
                (visible.length !== activeCount ? ` · ${visible.length - activeCount} inactive` : '') +
                (isAllTime(currentSY) ? ' · all years' : ` · ${currentSY!.label}`)}
        </p>
      </div>

      {actionMsg && (
        <div className="mb-3 flex items-start justify-between gap-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-nps-red/70 hover:text-nps-red" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : (
        <DataTable<StudentYear>
          data={visible}
          columns={cols}
          searchableText={(s) => `${formatLastFirstMiddle(s)} ${displayLrn(s.lrn)} ${s.studentNo}`}
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
            <>
              <ExportCsvButton rows={visible} columns={csvColumns} filename={exportName} />
              {!isOld && (
                <Button onClick={() => navigate('/students/new')}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
                </Button>
              )}
            </>
          }
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-lg bg-panel border border-border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-ink-primary mb-1.5">Delete learner?</h2>
            <p className="text-[13px] text-ink-secondary mb-1">
              {formatLastFirstMiddle(confirm)}
            </p>
            <p className="text-[13px] text-ink-secondary mb-4">
              Are you sure you want to delete? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={busyLrn === confirm.lrn}>
                Cancel
              </Button>
              <Button
                onClick={doDelete}
                disabled={busyLrn === confirm.lrn}
                className="bg-nps-red hover:bg-nps-red/90 text-white"
              >
                {busyLrn === confirm.lrn ? 'Deleting…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
