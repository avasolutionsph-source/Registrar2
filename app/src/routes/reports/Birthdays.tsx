import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { listStudents, listClasses } from '@/lib/db';
import { formatLastFirstMiddle, formatBirthdate } from '@/lib/format';
import type { Student, ClassRecord } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthOf = (iso: string) => {
  const m = Number((iso || '').split('-')[1]);
  return Number.isFinite(m) ? m : 0; // 1–12, 0 = unknown
};
const dayOf = (iso: string) => Number((iso || '').split('-')[2]) || 0;

export default function Birthdays() {
  const navigate = useNavigate();
  // default to the current month
  const [month, setMonth] = useState<number>(() => 1);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([listStudents(), listClasses()]);
        if (cancelled) return;
        setStudents(s.filter((x) => x.status === 'Active'));
        setClasses(c);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const classOf = (s: Student) => classes.find((c) => c.id === s.currentClassId);

  const rows = useMemo(
    () =>
      students
        .filter((s) => monthOf(s.birthdate) === month)
        .sort((a, b) => dayOf(a.birthdate) - dayOf(b.birthdate) || a.lastName.localeCompare(b.lastName)),
    [students, month],
  );

  const countByMonth = useMemo(() => {
    const counts = new Array(13).fill(0);
    students.forEach((s) => {
      counts[monthOf(s.birthdate)] += 1;
    });
    return counts;
  }, [students]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Birthdays' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Birthdays per Month</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Active learners with a birthday in the selected month (for SCO / celebrations).
          </p>
        </div>
        <ExportCsvButton
          rows={rows}
          columns={[
            { header: 'Birthdate', value: (s) => (s.birthdate ? formatBirthdate(s.birthdate) : '') },
            { header: 'LRN', value: (s) => s.lrn },
            { header: 'Name', value: (s) => formatLastFirstMiddle(s) },
            { header: 'Grade & Section', value: (s) => {
              const k = classOf(s);
              return k ? `Grade ${k.gradeLevel} · ${k.sectionName}` : '';
            } },
          ]}
          filename={`birthdays-${MONTHS[month - 1]?.toLowerCase() ?? 'month'}`}
        />
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setMonth(i + 1)}
            className={[
              'px-2.5 py-1 rounded text-[12px] border',
              month === i + 1
                ? 'bg-accent text-white border-accent'
                : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
            ].join(' ')}
          >
            {m.slice(0, 3)}
            <span className="ml-1 text-[10px] opacity-70 tabular-nums">{countByMonth[i + 1]}</span>
          </button>
        ))}
      </div>

      <SectionCard
        heading={
          loading
            ? 'Loading…'
            : `${MONTHS[month - 1]} · ${rows.length} learner${rows.length === 1 ? '' : 's'}`
        }
      >
        {loading ? (
          <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">
            No active learners with a birthday in {MONTHS[month - 1]}.
          </p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[16%]">Birthdate</th>
                <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3 w-[26%]">Grade &amp; Section</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const k = classOf(s);
                return (
                  <tr
                    key={s.lrn}
                    onClick={() => navigate(`/students/${s.lrn}`)}
                    className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                  >
                    <td className="py-1.5 pr-3">{s.birthdate ? formatBirthdate(s.birthdate) : '—'}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                    <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">
                      {k ? `Grade ${k.gradeLevel} · ${k.sectionName}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
