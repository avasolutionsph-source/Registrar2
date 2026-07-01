import { useEffect, useMemo, useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { Button } from '@/components/ui/button';
import { listStudents, listClasses, listSubjects, listSchoolYears } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel, periodsForSy, formatSy } from '@/lib/forms';
import {
  evaluateHonor,
  isHonorEligibleLevel,
  minHonorGradeForSy,
  subjectIndex,
  HONOR_GA_MIN,
  HONOR_GRADE_FLOOR,
  type HonorPeriod,
} from '@/lib/honors';
import type { Student, ClassRecord, Subject, SchoolYear } from '@/types';

// Grade-level display order (elementary → JHS → SHS), for grouping the list.
const LEVEL_ORDER = [
  'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X',
  'XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM',
  'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM',
];
const NPS_SCHOOL_ID = '403875';

interface Placement {
  gradeLevel: string;
  section: string;
  adviser: string;
}

function placementFor(s: Student, sy: string, classes: ClassRecord[]): Placement | null {
  const hist = s.enrolmentHistory ?? [];
  const e = hist.find((x) => x.sy === sy && x.schoolId === NPS_SCHOOL_ID) ?? hist.find((x) => x.sy === sy);
  if (e) return { gradeLevel: e.gradeLevel, section: e.sectionName, adviser: e.adviserName ?? '' };
  if (sy === s.currentSY) {
    const k = classes.find((c) => c.id === s.currentClassId);
    if (k) {
      const a = k.adviser;
      const adviser = a ? `${a.title ?? ''} ${a.firstName ?? ''} ${a.familyName ?? ''}`.trim() : '';
      return { gradeLevel: k.gradeLevel, section: k.sectionName, adviser };
    }
  }
  return null;
}

interface Awardee {
  lrn: string;
  name: string;
  gradeLevel: string;
  gradeName: string;
  section: string;
  adviser: string;
  ga: number; // whole-number GA (matches the card)
  gaExact: number; // decimal average (for ranking)
  lowest: number | null;
}

export default function Honors() {
  const navigate = useNavigate();
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [sy, setSy] = useState<string>('');
  const [period, setPeriod] = useState<HonorPeriod>('final');
  // Default order is alphabetical (per policy). Ranking order (by decimal
  // average) helps pick the year-end NPS Excellence Award for Grade 6/10/12.
  const [order, setOrder] = useState<'alpha' | 'rank'>('alpha');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [st, cl, su, yr] = await Promise.all([
          listStudents(),
          listClasses(),
          listSubjects(),
          listSchoolYears(),
        ]);
        if (cancelled) return;
        setStudents(st);
        setClasses(cl);
        setSubjects(su);
        setYears(yr);
        const concrete = currentSY && currentSY.code !== 'all' ? currentSY.code : null;
        const active = yr.find((y) => y.isActive)?.code;
        setSy(concrete ?? active ?? yr[0]?.code ?? '');
      } catch {
        /* leave empty — shows "no qualifiers" */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSY]);

  const index = useMemo(() => subjectIndex(subjects), [subjects]);
  const periods = useMemo(() => periodsForSy(sy), [sy]);

  useEffect(() => {
    if (period === 'final') return;
    if (!periods.some((p) => p.key === period)) setPeriod('final');
  }, [periods, period]);

  const awardees = useMemo<Awardee[]>(() => {
    if (!sy) return [];
    const out: Awardee[] = [];
    for (const s of students) {
      const grades = s.grades?.[sy as keyof typeof s.grades];
      if (!grades || !grades.length) continue;
      const place = placementFor(s, sy, classes);
      if (!place || !isHonorEligibleLevel(place.gradeLevel, sy)) continue;
      const r = evaluateHonor(grades, index, period);
      if (!r.qualified || r.ga == null || r.gaExact == null) continue;
      out.push({
        lrn: s.lrn,
        name: formatLastFirstMiddle(s),
        gradeLevel: place.gradeLevel,
        gradeName: gradeLabel(place.gradeLevel),
        section: place.section,
        adviser: place.adviser,
        ga: r.ga,
        gaExact: r.gaExact,
        lowest: r.lowest,
      });
    }
    return out;
  }, [students, classes, index, sy, period]);

  // group by grade level, in curriculum order; sort inside each group.
  const groups = useMemo(() => {
    const byLevel = new Map<string, Awardee[]>();
    for (const a of awardees) {
      const arr = byLevel.get(a.gradeLevel) ?? [];
      arr.push(a);
      byLevel.set(a.gradeLevel, arr);
    }
    const sorter =
      order === 'rank'
        ? (a: Awardee, b: Awardee) => b.gaExact - a.gaExact || a.name.localeCompare(b.name)
        : (a: Awardee, b: Awardee) => a.name.localeCompare(b.name);
    const known = LEVEL_ORDER.filter((lvl) => byLevel.has(lvl));
    const extra = [...byLevel.keys()].filter((lvl) => !LEVEL_ORDER.includes(lvl)).sort();
    return [...known, ...extra].map((lvl) => ({ level: lvl, rows: byLevel.get(lvl)!.slice().sort(sorter) }));
  }, [awardees, order]);

  const periodLabel =
    period === 'final' ? 'Final (Year-end)' : periods.find((p) => p.key === period)?.label ?? period;
  const minGrade = minHonorGradeForSy(sy);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Honor Students' }]} />

      <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Academic Excellence Award</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-2xl">
            System-computed qualifiers: General Average of at least {HONOR_GA_MIN}, with no learning-area
            grade lower than {HONOR_GRADE_FLOOR}. Single flat award, listed alphabetically. Use this to
            verify the Class Adviser's submitted list before forwarding it to the Academic Coordinator.
            Derogatory-record screening is a manual check. This SY covers Grade {minGrade}–12.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={awardees.length === 0}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <ExportCsvButton
            rows={groups.flatMap((g) => g.rows)}
            columns={[
              { header: 'Grade', value: (r) => r.gradeName },
              { header: 'Section', value: (r) => r.section },
              { header: 'LRN', value: (r) => r.lrn },
              { header: 'Name', value: (r) => r.name },
              { header: 'General Average', value: (r) => r.ga },
              { header: 'Average (decimal)', value: (r) => r.gaExact.toFixed(2) },
              { header: 'Lowest Grade', value: (r) => r.lowest ?? '' },
              { header: 'Adviser', value: (r) => r.adviser },
            ]}
            filename={`academic-excellence-${sy || 'sy'}-${period}`}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-end gap-4 print:hidden">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">School Year</span>
          <select
            value={sy}
            onChange={(e) => setSy(e.target.value)}
            className="bg-panel border border-border rounded px-2.5 py-1.5 text-[13px] text-ink-primary"
          >
            {years
              .filter((y) => y.code !== 'all')
              .map((y) => (
                <option key={y.code} value={y.code}>
                  {y.label}
                </option>
              ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">Period</span>
          <div className="flex gap-1.5">
            {periods.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className={btnCls(period === p.key)}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setPeriod('final')} className={btnCls(period === 'final')}>
              Year-end
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">Order</span>
          <div className="flex gap-1.5">
            <button onClick={() => setOrder('alpha')} className={btnCls(order === 'alpha')}>
              Alphabetical
            </button>
            <button onClick={() => setOrder('rank')} className={btnCls(order === 'rank')}>
              Ranking (decimal)
            </button>
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-3">
        <h1 className="text-lg font-bold">Naga Parochial School — Academic Excellence Award</h1>
        <p className="text-sm">
          {sy ? formatSy(sy) : ''} · {periodLabel} · Grade {minGrade}–12 · GA ≥ {HONOR_GA_MIN}, no grade below{' '}
          {HONOR_GRADE_FLOOR}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
        <span className="px-2.5 py-1 rounded bg-panel border border-border text-ink-secondary">
          Total awardees: <span className="font-semibold text-ink-primary">{awardees.length}</span>
        </span>
      </div>

      {loading ? (
        <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
      ) : groups.length === 0 ? (
        <SectionCard heading="No qualifiers">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary px-1">
            <Award className="w-3.5 h-3.5 text-ink-muted" />
            <span>
              No students reach the Academic Excellence Award for {periodLabel.toLowerCase()} in{' '}
              {sy ? formatSy(sy) : 'the selected year'}. Check that grades are encoded for this period.
            </span>
          </div>
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-3.5">
          {groups.map(({ level, rows }) => (
            <SectionCard
              key={level}
              heading={`${gradeLabel(level)} · ${rows.length} awardee${rows.length === 1 ? '' : 's'}`}
            >
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    {order === 'rank' && <th className="py-1.5 pr-2 w-[5%]">#</th>}
                    <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                    <th className="py-1.5 pr-3">Name</th>
                    <th className="py-1.5 pr-3 w-[18%]">Section</th>
                    <th className="py-1.5 pr-3 w-[7%]">GA</th>
                    <th className="py-1.5 pr-3 w-[10%]">Average</th>
                    <th className="py-1.5 w-[8%]">Lowest</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr
                      key={a.lrn}
                      onClick={() => navigate(`/students/${a.lrn}`)}
                      className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                    >
                      {order === 'rank' && <td className="py-1.5 pr-2 tabular-nums text-ink-secondary">{i + 1}</td>}
                      <td className="py-1.5 pr-3 font-mono">{a.lrn}</td>
                      <td className="py-1.5 pr-3">{a.name}</td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{a.section || '—'}</td>
                      <td className="py-1.5 pr-3 font-semibold tabular-nums">{a.ga}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-ink-secondary">{a.gaExact.toFixed(2)}</td>
                      <td className="py-1.5 tabular-nums text-ink-secondary">{a.lowest ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          ))}
        </div>
      )}
    </>
  );
}

function btnCls(active: boolean): string {
  return [
    'px-2.5 py-1.5 rounded text-[12px] border',
    active
      ? 'bg-accent text-white border-accent'
      : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
  ].join(' ');
}
