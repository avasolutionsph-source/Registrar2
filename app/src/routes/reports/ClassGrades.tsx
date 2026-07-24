import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { Button } from '@/components/ui/button';
import { listClasses, listStudentsByClass, listSubjects, listGradeSubjects } from '@/lib/db';
import { periodsForSy, gradeRank, gradeLabel } from '@/lib/forms';
import { evaluateHonor, HONOR_GA_MIN, HONOR_GRADE_FLOOR, type HonorPeriod } from '@/lib/honors';
import { formatLastFirstMiddle } from '@/lib/format';
import { ALL_TIME_CODE, type ClassRecord, type SchoolYear, type Student, type Subject } from '@/types';

// Reports ▸ Class Grades — the registrar's counter-checking sheet. One section,
// every learner × every subject, per term through Final. The GA column uses the
// SAME math as the Honors report (MAPEH counted once, same rounding), so this
// sheet and the honors list can never disagree. The Attitude view swaps the
// cells to each subject's attitude rating for the picked term — the screening
// view for the NPS Excellence Award at the end of the school year.
export default function ClassGrades() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const sy = currentSY && currentSY.code !== ALL_TIME_CODE ? currentSY.code : '';

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState('');
  const [roster, setRoster] = useState<Student[] | null>(null);
  const [gradeOrder, setGradeOrder] = useState<string[]>([]);
  const [period, setPeriod] = useState<HonorPeriod>('q1');
  const [showAttitude, setShowAttitude] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cs, subs] = await Promise.all([listClasses(), listSubjects()]);
        if (cancelled) return;
        setClasses(cs);
        setSubjects(subs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sections.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(
    () =>
      classes
        .filter((c) => !sy || c.sy === sy)
        .sort((a, b) => gradeRank(a.gradeLevel) - gradeRank(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName)),
    [classes, sy],
  );
  const cls = sections.find((c) => c.id === classId) ?? null;
  const clsSy = cls?.sy ?? sy;
  const periods = periodsForSy(clsSy);

  useEffect(() => {
    if (!classId) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    setRoster(null);
    (async () => {
      try {
        const r = await listStudentsByClass(classId);
        if (cancelled) return;
        setRoster(
          [...r].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the class.');
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  // Curriculum order (Setup ▸ Subjects) drives the column order, same as the
  // report card; subjects with encoded grades that fall outside it still show,
  // appended at the end, so nothing is ever hidden from the checker.
  const lvl = cls?.gradeLevel ?? '';
  useEffect(() => {
    if (!lvl) {
      setGradeOrder([]);
      return;
    }
    let cancelled = false;
    listGradeSubjects(lvl)
      .then((codes) => { if (!cancelled) setGradeOrder(codes); })
      .catch(() => { if (!cancelled) setGradeOrder([]); });
    return () => { cancelled = true; };
  }, [lvl]);

  const subjIndex = useMemo(() => new Map(subjects.map((s) => [s.code.toUpperCase(), s])), [subjects]);
  const gradesOf = (s: Student) => s.grades?.[clsSy as keyof typeof s.grades] ?? [];

  const columns = useMemo(() => {
    if (!roster) return [] as string[];
    const present = new Set<string>();
    for (const s of roster) for (const g of gradesOf(s)) present.add(g.subjectCode.toUpperCase());
    const ordered: string[] = [];
    for (const c of gradeOrder) {
      const u = c.toUpperCase();
      if (!ordered.includes(u)) ordered.push(u);
      present.delete(u);
    }
    return [...ordered, ...[...present].sort()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, gradeOrder, clsSy]);

  const entryOf = (s: Student, code: string) =>
    gradesOf(s).find((x) => x.subjectCode.toUpperCase() === code);
  // Attitude is stored on the grade entry but its declaration is landing in a
  // parallel types change — read it structurally so this page builds with or
  // without that declaration.
  type TermKey = Exclude<HonorPeriod, 'final'>;
  const attOf = (g: unknown, pk: TermKey): number | null =>
    (g as { attitude?: Partial<Record<TermKey, number | null>> } | undefined)?.attitude?.[pk] ?? null;

  const cellOf = (s: Student, code: string): number | null => {
    const g = entryOf(s, code);
    if (!g) return null;
    if (showAttitude) return period === 'final' ? null : attOf(g, period);
    return (period === 'final' ? g.final : g[period]) ?? null;
  };

  const colLabel = (code: string) => {
    const s = subjIndex.get(code);
    return { short: s?.abbreviation || code, full: s?.fullName || code };
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Class Grades' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Class Grades — Summary</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            Every learner × every subject of one section, per term through Final — the
            counter-checking sheet for the honors list. The GA column uses the same computation as
            Reports ▸ Honors (MAPEH counted once). Green GA = reaches {HONOR_GA_MIN}; a red grade is
            below the {HONOR_GRADE_FLOOR} floor (disqualifier). Switch to Attitude to screen
            Excellence Award candidates.
          </p>
        </div>
        {cls && roster && roster.length > 0 && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 shrink-0">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="mb-4 flex items-center gap-3 flex-wrap print:hidden">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] min-w-[260px]"
        >
          <option value="">— Pick a section —</option>
          {sections.map((c) => (
            <option key={c.id} value={c.id}>
              {gradeLabel(c.gradeLevel)} · {c.sectionName} · SY {c.sy}
            </option>
          ))}
        </select>
        {cls && (
          <>
            {/* Opens the DETAILED sheets (portal format, per-activity) in their
                own full-screen tab, where the wide table has room to fit. */}
            <Button
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => window.open(`/reports/class-grades/${classId}/sheets`, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Full gradesheets
            </Button>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {[...periods.map((p) => ({ key: p.key as HonorPeriod, label: p.label })), { key: 'final' as HonorPeriod, label: 'Final' }].map(
                (t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPeriod(t.key)}
                    className={`px-3 py-1.5 text-[12.5px] ${
                      period === t.key ? 'bg-nps-red text-white font-semibold' : 'text-ink-secondary hover:bg-panel-alt'
                    }`}
                  >
                    {t.label}
                  </button>
                ),
              )}
            </div>
            <label
              className={`flex items-center gap-1.5 text-[12.5px] ${
                period === 'final' ? 'text-ink-muted' : 'text-ink-secondary'
              }`}
              title={period === 'final' ? 'Attitude is rated per term, not for the Final.' : ''}
            >
              <input
                type="checkbox"
                checked={showAttitude && period !== 'final'}
                disabled={period === 'final'}
                onChange={(e) => setShowAttitude(e.target.checked)}
              />
              Show Attitude
            </label>
          </>
        )}
      </div>

      {!cls ? (
        <p className="text-[13px] text-ink-secondary">Pick a section to open its summary.</p>
      ) : roster === null ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : roster.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">No learners in this section.</p>
      ) : (
        <SectionCard
          heading={`${gradeLabel(cls.gradeLevel)} · ${cls.sectionName} — ${roster.length} learner${roster.length === 1 ? '' : 's'} · ${columns.length} subject${columns.length === 1 ? '' : 's'}${showAttitude && period !== 'final' ? ' · ATTITUDE' : ''}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] whitespace-nowrap">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                  <th className="py-2 pr-2 pl-1 w-8 text-right">#</th>
                  <th className="py-2 pr-3 min-w-[180px]">Learner</th>
                  {columns.map((code) => {
                    const l = colLabel(code);
                    return (
                      <th key={code} className="py-2 px-2 text-center" title={l.full}>
                        {l.short}
                      </th>
                    );
                  })}
                  {!showAttitude && <th className="py-2 px-2 text-center border-l border-border">GA</th>}
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => {
                  const honor = showAttitude ? null : evaluateHonor(gradesOf(s), subjIndex, period);
                  return (
                    <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                      <td className="py-1.5 pr-2 pl-1 text-right tabular-nums text-ink-muted">{i + 1}</td>
                      <td className="py-1.5 pr-3 text-ink-primary">{formatLastFirstMiddle(s)}</td>
                      {columns.map((code) => {
                        const v = cellOf(s, code);
                        const low = !showAttitude && v != null && v < HONOR_GRADE_FLOOR;
                        return (
                          <td
                            key={code}
                            className={`py-1.5 px-2 text-center tabular-nums ${
                              low ? 'text-nps-red font-semibold' : 'text-ink-primary'
                            }`}
                            title={low ? `Below the ${HONOR_GRADE_FLOOR} floor — honors disqualifier` : undefined}
                          >
                            {v ?? '—'}
                          </td>
                        );
                      })}
                      {!showAttitude && (
                        <td
                          className={`py-1.5 px-2 text-center tabular-nums font-semibold border-l border-border-soft ${
                            honor?.qualified
                              ? 'text-ok-fg bg-ok-fg/10'
                              : honor?.gaMet && honor.belowFloor
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-ink-primary'
                          }`}
                          title={
                            honor?.qualified
                              ? `GA reaches ${HONOR_GA_MIN} with no grade below ${HONOR_GRADE_FLOOR} — honors candidate`
                              : honor?.gaMet && honor.belowFloor
                                ? `GA reaches ${HONOR_GA_MIN} BUT a subject is below ${HONOR_GRADE_FLOOR}`
                                : undefined
                          }
                        >
                          {honor?.ga ?? '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </>
  );
}
