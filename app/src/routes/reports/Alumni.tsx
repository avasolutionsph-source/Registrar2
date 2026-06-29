import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { listStudentsLite, listClasses } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { isAllTime } from '@/types';
import type { Student, ClassRecord, SchoolYear } from '@/types';

const TERMINAL_GRADES = [
  { key: 'VI', label: 'Grade 6 — graduating Elementary' },
  { key: 'X', label: 'Grade 10 — graduating Junior HS' },
  { key: 'XII', label: 'Grade 12 — graduating Senior HS' },
] as const;

type TerminalKey = (typeof TERMINAL_GRADES)[number]['key'];

export default function Alumni() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [grade, setGrade] = useState<TerminalKey>('VI');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([listStudentsLite(), listClasses()]);
        if (cancelled) return;
        setStudents(s);
        setClasses(c);
      } catch {
        /* leave empty — page shows "no candidates" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchingClasses = classes.filter((c) => {
    if (!isAllTime(currentSY) && c.sy !== currentSY?.code) return false;
    if (grade === 'VI') return c.gradeLevel === 'VI';
    if (grade === 'X') return c.gradeLevel === 'X';
    return c.gradeLevel.startsWith('XII');
  });

  const candidates = students.filter((s) => matchingClasses.some((c) => c.id === s.currentClassId));

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Alumni' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Alumni</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Forward-looking — current students about to graduate from this terminal grade.
          </p>
        </div>
        <ExportCsvButton
          rows={candidates}
          columns={[
            { header: 'LRN', value: (s) => s.lrn },
            { header: 'Name', value: (s) => formatLastFirstMiddle(s) },
            {
              header: 'Section',
              value: (s) => matchingClasses.find((c) => c.id === s.currentClassId)?.sectionName ?? '',
            },
            { header: 'Loyalty Yrs', value: (s) => s.loyaltyYears },
          ]}
          filename={`alumni-grade-${grade}-${currentSY?.code ?? 'all'}`}
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

      <SectionCard heading={`${candidates.length} candidate${candidates.length === 1 ? '' : 's'}`}>
        {candidates.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">
            No students enrolled in this terminal grade for {currentSY?.label ?? 'any year'}.
          </p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3 w-[22%]">Section</th>
                <th className="py-1.5 w-[12%]">Loyalty Yrs</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((s) => {
                const klass = matchingClasses.find((c) => c.id === s.currentClassId);
                return (
                  <tr
                    key={s.lrn}
                    onClick={() => navigate(`/students/${s.lrn}`)}
                    className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                  >
                    <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                    <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">
                      {klass ? klass.sectionName : '—'}
                    </td>
                    <td className="py-1.5 tabular-nums">{s.loyaltyYears}</td>
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
