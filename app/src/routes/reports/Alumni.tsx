import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { listStudents } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { formatSy } from '@/lib/forms';
import { useNavigate } from 'react-router-dom';
import type { Student } from '@/types';

const TERMINAL_GRADES = [
  { key: 'VI', label: 'Grade 6 — Elementary' },
  { key: 'X', label: 'Grade 10 — Junior HS' },
  { key: 'XII', label: 'Grade 12 — Senior HS' },
] as const;

type TerminalKey = (typeof TERMINAL_GRADES)[number]['key'];

// The school year the learner graduated, taken from their last enrolment entry.
function graduationSy(s: Student): string {
  const hist = s.enrolmentHistory ?? [];
  return hist.length ? String(hist[hist.length - 1].sy) : String(s.currentSY ?? '');
}

function terminalGrade(s: Student): string {
  const hist = s.enrolmentHistory ?? [];
  return hist.length ? String(hist[hist.length - 1].gradeLevel) : '';
}

export default function Alumni() {
  const [grade, setGrade] = useState<TerminalKey>('XII');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await listStudents();
        if (cancelled) return;
        setStudents(s);
      } catch {
        /* leave empty — page shows "no alumni" */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Alumni = learners who have actually graduated (previous school years).
  const alumni = students
    .filter((s) => s.status === 'Graduated')
    .filter((s) => {
      const g = terminalGrade(s);
      if (grade === 'VI') return g === 'VI';
      if (grade === 'X') return g === 'X';
      return g.startsWith('XII');
    })
    .sort((a, b) => graduationSy(b).localeCompare(graduationSy(a)) || a.lastName.localeCompare(b.lastName));

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Alumni' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Alumni</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Graduates of previous school years (status “Graduated”), grouped by terminal grade.
          </p>
        </div>
        <ExportCsvButton
          rows={alumni}
          columns={[
            { header: 'Graduated SY', value: (s) => formatSy(graduationSy(s)) },
            { header: 'LRN', value: (s) => s.lrn },
            { header: 'Name', value: (s) => formatLastFirstMiddle(s) },
            { header: 'Loyalty Yrs', value: (s) => s.loyaltyYears },
          ]}
          filename={`alumni-grade-${grade}`}
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TERMINAL_GRADES.map((g) => (
          <button
            key={g.key}
            onClick={() => setGrade(g.key)}
            className={[
              'px-3 py-1.5 rounded text-[12.5px] border',
              grade === g.key
                ? 'bg-accent text-white border-accent'
                : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
            ].join(' ')}
          >
            {g.label}
          </button>
        ))}
      </div>

      <SectionCard
        heading={
          loading ? 'Loading…' : `${alumni.length} alumn${alumni.length === 1 ? 'us' : 'i'}`
        }
      >
        {loading ? (
          <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
        ) : alumni.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">
            No graduates on record for this terminal grade yet.
          </p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[14%]">Graduated SY</th>
                <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 w-[12%]">Loyalty Yrs</th>
              </tr>
            </thead>
            <tbody>
              {alumni.map((s) => (
                <tr
                  key={s.lrn}
                  onClick={() => navigate(`/students/${s.lrn}`)}
                  className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                >
                  <td className="py-1.5 pr-3 tabular-nums">{formatSy(graduationSy(s))}</td>
                  <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                  <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                  <td className="py-1.5 tabular-nums">{s.loyaltyYears}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
