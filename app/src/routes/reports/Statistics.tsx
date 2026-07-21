import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { Letterhead } from '@/components/print/parts';
import { listClasses, listStudentsLite, listStudentsBySy, type StudentYear } from '@/lib/db';
import { isAllTime } from '@/types';
import { gradeLabel } from '@/lib/forms';
import type { GradeLevel, SchoolYear, Student, ClassRecord } from '@/types';

type RegMode = 'current' | 'old';

interface Row {
  gradeLevel: GradeLevel;
  sectionName: string;
  male: number;
  female: number;
  annual: number; // annual enrolment = male + female
  dropped: number; // dropouts / transferred out
}
// Corrected enrolment = annual − dropped.
const corrected = (r: Row) => r.annual - r.dropped;
const isDropout = (status: Student['status']) => status === 'Dropped' || status === 'Transferred';

const GRADE_GROUPS: { label: string; levels: GradeLevel[] }[] = [
  { label: 'Pre-Elementary', levels: ['N1', 'N2', 'K'] },
  { label: 'Elementary', levels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'Junior High School', levels: ['VII', 'VIII', 'IX', 'X'] },
  {
    label: 'Senior High School',
    levels: [
      'XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM', 'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM',
      'XI-ASSH', 'XI-STEM-ENG', 'XI-STEM-HA', 'XII-ASSH', 'XII-STEM-ENG', 'XII-STEM-HA',
    ],
  },
  { label: 'SNED', levels: ['S'] },
];

export default function Statistics() {
  const { currentSY, mode } = useOutletContext<{ currentSY: SchoolYear | null; mode: RegMode }>();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [yearRoster, setYearRoster] = useState<StudentYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const code = currentSY?.code;
  const isOld = mode === 'old';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (isOld && code) {
          const roster = await listStudentsBySy(code);
          if (!cancelled) setYearRoster(roster);
        } else {
          const [cls, st] = await Promise.all([listClasses(), listStudentsLite()]);
          if (cancelled) return;
          setClasses(cls);
          setStudents(st);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load statistics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, isOld]);

  // Current tab: counts by live class. Old System: grouped from that year's
  // enrolment_history roster (grade × section the learner held that year).
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = (() => {
      if (isOld) {
        const map = new Map<string, Row>();
        for (const s of yearRoster) {
          const g = (s.yearGrade || '—') as GradeLevel;
          const sec = s.yearSection || '—';
          const key = `${g}|${sec}`;
          let r = map.get(key);
          if (!r) {
            r = { gradeLevel: g, sectionName: sec, male: 0, female: 0, annual: 0, dropped: 0 };
            map.set(key, r);
          }
          if (s.gender === 'Female') r.female++;
          else r.male++;
          r.annual++;
          if (isDropout(s.status)) r.dropped++;
        }
        return [...map.values()];
      }
      return classes
        .filter((c) => isAllTime(currentSY) || c.sy === currentSY?.code)
        .map((c) => {
          const roster = students.filter((s) => s.currentClassId === c.id);
          const male = roster.filter((s) => s.gender === 'Male').length;
          const female = roster.filter((s) => s.gender === 'Female').length;
          const dropped = roster.filter((s) => isDropout(s.status)).length;
          return { gradeLevel: c.gradeLevel, sectionName: c.sectionName, male, female, annual: male + female, dropped };
        });
    })();
    // Order by the standard grade sequence (Pre-Elem → SHS → SNED), section within.
    const order = new Map(GRADE_GROUPS.flatMap((g) => g.levels).map((lvl, i) => [lvl, i]));
    return list.sort(
      (a, b) =>
        (order.get(a.gradeLevel) ?? 999) - (order.get(b.gradeLevel) ?? 999) ||
        a.sectionName.localeCompare(b.sectionName),
    );
  }, [isOld, yearRoster, classes, students, currentSY]);

  const totals = useMemo(
    () => ({
      male: rows.reduce((a, r) => a + r.male, 0),
      female: rows.reduce((a, r) => a + r.female, 0),
      annual: rows.reduce((a, r) => a + r.annual, 0),
      dropped: rows.reduce((a, r) => a + r.dropped, 0),
      corrected: rows.reduce((a, r) => a + corrected(r), 0),
    }),
    [rows],
  );

  // The printable sheet — print-safe colours (black on white) so it renders both
  // in the on-screen report and inside the #print-root portal (PrintHost).
  const bd = 'border border-zinc-400';
  const table = (
    <table className="w-full text-[12.5px] border-collapse text-black">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.03em] bg-zinc-100">
            <th className={`${bd} px-2 py-1.5 text-left`}>Grade</th>
            <th className={`${bd} px-2 py-1.5 text-left`}>Section</th>
            <th className={`${bd} px-2 py-1.5 text-center w-[9%]`}>Male</th>
            <th className={`${bd} px-2 py-1.5 text-center w-[9%]`}>Female</th>
            <th className={`${bd} px-2 py-1.5 text-center w-[12%]`}>Annual Enrolment</th>
            <th className={`${bd} px-2 py-1.5 text-center w-[14%]`}>Dropouts / Transferred Out</th>
            <th className={`${bd} px-2 py-1.5 text-center w-[13%]`}>Corrected Enrolment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${bd} px-2 py-1`}>{gradeLabel(r.gradeLevel)}</td>
              <td className={`${bd} px-2 py-1`}>{r.sectionName}</td>
              <td className={`${bd} px-2 py-1 text-center tabular-nums`}>{r.male}</td>
              <td className={`${bd} px-2 py-1 text-center tabular-nums`}>{r.female}</td>
              <td className={`${bd} px-2 py-1 text-center tabular-nums`}>{r.annual}</td>
              <td className={`${bd} px-2 py-1 text-center tabular-nums`}>{r.dropped}</td>
              <td className={`${bd} px-2 py-1 text-center tabular-nums font-medium`}>{corrected(r)}</td>
            </tr>
          ))}
          <tr className="bg-zinc-100 font-bold">
            <td className={`${bd} px-2 py-1.5`} colSpan={2}>TOTAL</td>
            <td className={`${bd} px-2 py-1.5 text-center tabular-nums`}>{totals.male}</td>
            <td className={`${bd} px-2 py-1.5 text-center tabular-nums`}>{totals.female}</td>
            <td className={`${bd} px-2 py-1.5 text-center tabular-nums`}>{totals.annual}</td>
            <td className={`${bd} px-2 py-1.5 text-center tabular-nums`}>{totals.dropped}</td>
            <td className={`${bd} px-2 py-1.5 text-center tabular-nums`}>{totals.corrected}</td>
          </tr>
        </tbody>
      </table>
  );

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Statistics' }]} />
      <div className="mb-4 flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Statistics</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Enrolment per grade &amp; section · {currentSY?.label ?? 'All years'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPrinting(true)}
            disabled={rows.every((r) => r.annual === 0)}
            className="h-9 rounded-md border border-border px-3 text-[13px] hover:bg-panel-alt disabled:opacity-50"
          >
            Print
          </button>
          <ExportCsvButton
            rows={rows}
            columns={[
              { header: 'Grade', value: (r) => gradeLabel(r.gradeLevel) },
              { header: 'Section', value: (r) => r.sectionName },
              { header: 'Male', value: (r) => r.male },
              { header: 'Female', value: (r) => r.female },
              { header: 'Annual Enrolment', value: (r) => r.annual },
              { header: 'Dropouts/Transferred Out', value: (r) => r.dropped },
              { header: 'Corrected Enrolment', value: (r) => corrected(r) },
            ]}
            filename={`statistics-${currentSY?.code ?? 'all'}`}
          />
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : rows.every((r) => r.annual === 0) ? (
        <p className="text-[13px] text-ink-secondary">No enrolled students yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <h2 className="text-center text-[15px] font-bold text-ink-primary mb-3">
            Statistics for School Year {currentSY?.code ?? ''}
          </h2>
          {table}
        </div>
      )}

      <PrintHost
        open={printing}
        docTitle={`Statistics · SY ${currentSY?.code ?? ''}`}
        onClose={() => setPrinting(false)}
      >
        <Letterhead docTitle="Enrolment Statistics" docSubtitle={`School Year ${currentSY?.code ?? ''}`} />
        <div className="mt-3">{table}</div>
      </PrintHost>
    </>
  );
}
