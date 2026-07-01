import { useEffect, useMemo, useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { Button } from '@/components/ui/button';
import { listStudents, listClasses, listSubjects, listSchoolYears } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel, periodsForSy, formatSy } from '@/lib/forms';
import {
  evaluateHonor,
  isHonorEligibleLevel,
  subjectIndex,
  HONOR_TIERS,
  type HonorPeriod,
} from '@/lib/honors';
import type { Student, ClassRecord, Subject, SchoolYear } from '@/types';

// Grade-level display order (elementary → JHS → SHS), for grouping the list.
const LEVEL_ORDER = [
  'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X',
  'XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM',
  'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM',
];
const NPS_SCHOOL_ID = '403875';

// The "no grade below" policy floors the registrar can pick from.
const FLOORS: { label: string; value: number | null }[] = [
  { label: 'None', value: null },
  { label: '80', value: 80 },
  { label: '85', value: 85 },
  { label: '90', value: 90 },
];

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
  ga: number;
  lowest: number | null;
  tier: string;
  tierId: string;
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
  const [floor, setFloor] = useState<number | null>(85);

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
        // default SY: the context SY if it's a real year, else the active one.
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

  // Reset the period if the chosen SY doesn't have it (e.g. switching a 4-quarter
  // year back to a 3-term year while "Q4" was selected).
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
      if (!place || !isHonorEligibleLevel(place.gradeLevel)) continue;
      const r = evaluateHonor(grades, index, period, floor);
      if (!r.qualified || r.tier == null || r.ga == null) continue;
      out.push({
        lrn: s.lrn,
        name: formatLastFirstMiddle(s),
        gradeLevel: place.gradeLevel,
        gradeName: gradeLabel(place.gradeLevel),
        section: place.section,
        adviser: place.adviser,
        ga: r.ga,
        lowest: r.lowest,
        tier: r.tier.label,
        tierId: r.tier.id,
      });
    }
    // sort within a level: highest GA first, then name.
    return out.sort((a, b) => b.ga - a.ga || a.name.localeCompare(b.name));
  }, [students, classes, index, sy, period, floor]);

  // group awardees by grade level, in curriculum order.
  const groups = useMemo(() => {
    const byLevel = new Map<string, Awardee[]>();
    for (const a of awardees) {
      const arr = byLevel.get(a.gradeLevel) ?? [];
      arr.push(a);
      byLevel.set(a.gradeLevel, arr);
    }
    const known = LEVEL_ORDER.filter((lvl) => byLevel.has(lvl));
    const extra = [...byLevel.keys()].filter((lvl) => !LEVEL_ORDER.includes(lvl)).sort();
    return [...known, ...extra].map((lvl) => ({ level: lvl, rows: byLevel.get(lvl)! }));
  }, [awardees]);

  const periodLabel =
    period === 'final' ? 'Final (Year-end)' : periods.find((p) => p.key === period)?.label ?? period;

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Honor Students' }]} />

      <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Honor Students</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-2xl">
            System-computed qualifiers by General Average (DepEd DO 36, s. 2016). Use this to
            verify the Class Adviser's submitted list before forwarding it to the Academic
            Coordinator. Nursery–Grade 3 use descriptive grades and are not ranked.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={awardees.length === 0}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <ExportCsvButton
            rows={awardees}
            columns={[
              { header: 'Grade', value: (r) => r.gradeName },
              { header: 'Section', value: (r) => r.section },
              { header: 'LRN', value: (r) => r.lrn },
              { header: 'Name', value: (r) => r.name },
              { header: 'General Average', value: (r) => r.ga },
              { header: 'Lowest Grade', value: (r) => r.lowest ?? '' },
              { header: 'Honor', value: (r) => r.tier },
              { header: 'Adviser', value: (r) => r.adviser },
            ]}
            filename={`honor-students-${sy || 'sy'}-${period}`}
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
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={btnCls(period === p.key)}
              >
                {p.label}
              </button>
            ))}
            <button onClick={() => setPeriod('final')} className={btnCls(period === 'final')}>
              Year-end
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">No grade below</span>
          <div className="flex gap-1.5">
            {FLOORS.map((f) => (
              <button
                key={f.label}
                onClick={() => setFloor(f.value)}
                className={btnCls(floor === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-3">
        <h1 className="text-lg font-bold">Naga Parochial School — Honor Students</h1>
        <p className="text-sm">
          {sy ? formatSy(sy) : ''} · {periodLabel}
          {floor != null ? ` · no grade below ${floor}` : ''}
        </p>
      </div>

      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
        {HONOR_TIERS.map((t) => {
          const n = awardees.filter((a) => a.tierId === t.id).length;
          return (
            <span key={t.id} className="px-2.5 py-1 rounded bg-panel border border-border text-ink-secondary">
              {t.label}: <span className="font-semibold text-ink-primary">{n}</span>
            </span>
          );
        })}
        <span className="px-2.5 py-1 rounded bg-panel border border-border text-ink-secondary">
          Total: <span className="font-semibold text-ink-primary">{awardees.length}</span>
        </span>
      </div>

      {loading ? (
        <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
      ) : groups.length === 0 ? (
        <SectionCard heading="No qualifiers">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary px-1">
            <Award className="w-3.5 h-3.5 text-ink-muted" />
            <span>
              No students reach an honor tier for {periodLabel.toLowerCase()} in {sy ? formatSy(sy) : 'the selected year'}
              {floor != null ? ` with the "no grade below ${floor}" rule` : ''}. Check that grades are encoded
              for this period.
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
                    <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                    <th className="py-1.5 pr-3">Name</th>
                    <th className="py-1.5 pr-3 w-[20%]">Section</th>
                    <th className="py-1.5 pr-3 w-[8%]">GA</th>
                    <th className="py-1.5 pr-3 w-[8%]">Lowest</th>
                    <th className="py-1.5 w-[22%]">Honor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr
                      key={a.lrn}
                      onClick={() => navigate(`/students/${a.lrn}`)}
                      className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                    >
                      <td className="py-1.5 pr-3 font-mono">{a.lrn}</td>
                      <td className="py-1.5 pr-3">{a.name}</td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{a.section || '—'}</td>
                      <td className="py-1.5 pr-3 font-semibold tabular-nums">{a.ga}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-ink-secondary">{a.lowest ?? '—'}</td>
                      <td className="py-1.5">
                        <StatusBadge tone={a.tierId === 'honors' ? 'pending' : 'ok'}>{a.tier}</StatusBadge>
                      </td>
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
