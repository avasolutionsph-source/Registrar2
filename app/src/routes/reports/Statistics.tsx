import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listClasses, listStudentsLite } from '@/lib/db';
import { isAllTime } from '@/types';
import type { GradeLevel, SchoolYear, Student, ClassRecord } from '@/types';

interface Row {
  gradeLevel: GradeLevel;
  sectionName: string;
  male: number;
  female: number;
  total: number;
}

const GRADE_GROUPS: { label: string; levels: GradeLevel[] }[] = [
  { label: 'Pre-Elementary', levels: ['N1', 'N2', 'K'] },
  { label: 'Elementary', levels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'Junior High School', levels: ['VII', 'VIII', 'IX', 'X'] },
  {
    label: 'Senior High School',
    levels: ['XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM', 'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM'],
  },
  { label: 'SPED', levels: ['S'] },
];

export default function Statistics() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cls, st] = await Promise.all([listClasses(), listStudentsLite()]);
        if (cancelled) return;
        setClasses(cls);
        setStudents(st);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load statistics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Counts for the selected school year only (sections belong to one SY).
  const rows = useMemo<Row[]>(() => {
    return classes
      .filter((c) => isAllTime(currentSY) || c.sy === currentSY?.code)
      .map((c) => {
        const roster = students.filter((s) => s.currentClassId === c.id);
        const male = roster.filter((s) => s.gender === 'Male').length;
        const female = roster.filter((s) => s.gender === 'Female').length;
        return { gradeLevel: c.gradeLevel, sectionName: c.sectionName, male, female, total: male + female };
      });
  }, [classes, students, currentSY]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Statistics' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Statistics</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Enrollment counts by grade level × section · {currentSY?.label ?? 'All years'}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Printer className="w-3.5 h-3.5" /> Export PDF
        </Button>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : rows.every((r) => r.total === 0) ? (
        <p className="text-[13px] text-ink-secondary">No enrolled students yet.</p>
      ) : (
      <div className="flex flex-col gap-4">
        {GRADE_GROUPS.map((group) => {
          const groupRows = rows.filter((r) => group.levels.includes(r.gradeLevel));
          if (groupRows.length === 0) return null;
          const m = groupRows.reduce((a, r) => a + r.male, 0);
          const f = groupRows.reduce((a, r) => a + r.female, 0);

          return (
            <SectionCard key={group.label} heading={`${group.label} · ${m + f} learners`}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-1.5 pr-3 w-[18%]">Grade</th>
                    <th className="py-1.5 pr-3">Section</th>
                    <th className="py-1.5 pr-3 text-right w-[12%]">Male</th>
                    <th className="py-1.5 pr-3 text-right w-[12%]">Female</th>
                    <th className="py-1.5 text-right w-[12%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((r, i) => (
                    <tr key={i} className="border-b border-border-soft last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-ink-secondary">{r.gradeLevel}</td>
                      <td className="py-1.5 pr-3">{r.sectionName}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{r.male}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{r.female}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{r.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-panel-alt">
                    <td colSpan={2} className="py-2 pr-3 font-semibold text-ink-primary">
                      Subtotal
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold">{m}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold">{f}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{m + f}</td>
                  </tr>
                </tbody>
              </table>
            </SectionCard>
          );
        })}
      </div>
      )}
    </>
  );
}
