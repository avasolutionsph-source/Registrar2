import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Save, Plus } from 'lucide-react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { Button } from '@/components/ui/button';
import {
  listStudentsByClass,
  listClasses,
  listSubjects,
  getTeacher,
  weightsForClassSubject,
  listTransmutation,
  listAttitudeScale,
  saveStudentGrades,
  type ClassSubjectWeights,
} from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { periodsForSy } from '@/lib/forms';
import {
  computeGradeWith,
  initialGrade,
  attitudeLetter,
  DEFAULT_ATTITUDE_SCALE,
  type AttitudeBand,
  type TransmuteRow,
} from '@/lib/grading';
import type { Student, ClassRecord, Subject, Teacher, QuarterGrade, QuarterKey } from '@/types';

// The FULL class × subject grade sheet, opened from a subject chip on the
// teacher profile: every activity score (WW / PT / EXs), the Initial and term
// grades, and the attitude rating — the same sheet the teacher encodes in the
// portal, not just the per-term summary. Editing is deliberately behind an
// "Edit grades" button so a correction is always an explicit act: scores are
// what get edited, and each term grade is recomputed from them with the same
// engine (weights by subject type + the SY's transmutation table).

type CompKey = 'ww' | 'pt' | 'st';
type CompArrays = Record<CompKey, string[]>;

const COMP_FULL: Record<CompKey, string> = {
  ww: 'Written Works & Oral Works',
  pt: 'Product / Performance Tasks',
  st: 'Summative Tests & Term Exam',
};

// EXs are a fixed trio per the official sheet: two Summative Tests + Term Exam.
const EX_LABELS = ['ST 1', 'ST 2', 'Term Exam'];

const num = (s: string | number | null | undefined): number | null => {
  if (s === '' || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Sum a component's activities into an { earned, total } aggregate, or null if
// nothing usable is entered. Blank student scores count as 0 once anything is
// encoded (a missed activity still lowers the grade) — same as the portal.
function aggregate(earnedArr: string[], hpsArr: string[]) {
  const totals = hpsArr.map(num).filter((v): v is number => v != null && v > 0);
  if (!totals.length) return null;
  if (!earnedArr.some((e) => num(e) != null)) return null;
  const total = totals.reduce((a, b) => a + b, 0);
  const earned = hpsArr.reduce((a, h, i) => (num(h) ? a + (num(earnedArr[i]) ?? 0) : a), 0);
  return { earned, total };
}

// EXs percentage, sub-weighted like the NPS sheet: the LAST activity is the
// Term Exam (40%); the Summative Tests share the other 60% equally.
function exPercent(earnedArr: string[], hpsArr: string[]): number | null {
  const acts = hpsArr
    .map((h, i) => ({ hps: num(h), earned: num(earnedArr[i]) ?? 0 }))
    .filter((a): a is { hps: number; earned: number } => a.hps != null && a.hps > 0);
  if (!acts.length) return null;
  if (!earnedArr.some((e) => num(e) != null)) return null;
  if (acts.length === 1) return (acts[0].earned / acts[0].hps) * 100;
  const termExam = acts[acts.length - 1];
  const sts = acts.slice(0, -1);
  const stMean = sts.reduce((a, x) => a + (x.earned / x.hps) * 100, 0) / sts.length;
  return stMean * 0.6 + (termExam.earned / termExam.hps) * 100 * 0.4;
}

// Raw components for the grade engine: WW/PT pooled, EXs sub-weighted (as a
// synthetic { earned: EX%, total: 100 }).
function buildRaw(sc: Partial<CompArrays>, hps: Partial<CompArrays>) {
  const raw: { ww?: { earned: number; total: number }; pt?: { earned: number; total: number }; st?: { earned: number; total: number } } = {};
  for (const c of ['ww', 'pt'] as const) {
    const agg = aggregate(sc[c] ?? [], hps[c] ?? []);
    if (agg) raw[c] = agg;
  }
  const ex = exPercent(sc.st ?? [], hps.st ?? []);
  if (ex != null) raw.st = { earned: ex, total: 100 };
  return raw;
}

const emptyComp = (): CompArrays => ({ ww: [''], pt: [''], st: ['', '', ''] });

const qOf = (e: QuarterGrade | undefined, pk: string): number | null => {
  const v = (e as Record<string, unknown> | undefined)?.[pk];
  return typeof v === 'number' ? v : null;
};

export default function TeacherClassGradesheet() {
  const { id, classId, subjectCode } = useParams<{ id: string; classId: string; subjectCode: string }>();
  const navigate = useNavigate();
  const code = (subjectCode ?? '').toUpperCase();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [cls, setCls] = useState<ClassRecord | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [roster, setRoster] = useState<Student[] | null>(null);
  // undefined = loading; null = no subject type configured (block editing).
  const [weights, setWeights] = useState<ClassSubjectWeights | null | undefined>(undefined);
  const [transmutation, setTransmutation] = useState<TransmuteRow[]>([]);
  const [attScale, setAttScale] = useState<AttitudeBand[]>(DEFAULT_ATTITUDE_SCALE);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<string>('summary'); // 'summary' | period key
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sheet state, seeded from the saved per-activity detail (grades JSON).
  const [acts, setActs] = useState<Record<string, CompArrays>>({}); // pk → HPS strings
  const [scores, setScores] = useState<Record<string, Record<string, CompArrays>>>({}); // lrn → pk → earned
  const [att, setAtt] = useState<Record<string, Record<string, string>>>({}); // lrn → pk

  const seedSheet = (r: Student[], sy: string) => {
    const pks = periodsForSy(sy).map((p) => p.key);
    const nextActs: Record<string, CompArrays> = {};
    const nextScores: Record<string, Record<string, CompArrays>> = {};
    const nextAtt: Record<string, Record<string, string>> = {};
    for (const pk of pks) nextActs[pk] = emptyComp();
    for (const stu of r) {
      const entry = (stu.grades?.[sy] ?? []).find((e) => e.subjectCode.toUpperCase() === code);
      nextScores[stu.lrn] = {};
      nextAtt[stu.lrn] = {};
      for (const pk of pks) {
        const items = entry?.items?.[pk as QuarterKey];
        const perComp = emptyComp();
        for (const c of ['ww', 'pt'] as const) {
          const arr = items?.[c];
          if (Array.isArray(arr) && arr.length) {
            perComp[c] = arr.map((it) => (it?.earned == null ? '' : String(it.earned)));
            if (arr.length > nextActs[pk][c].length) {
              nextActs[pk][c] = arr.map((it) => (it?.total == null ? '' : String(it.total)));
            }
          }
        }
        // EXs are fixed to 3 slots [ST1, ST2, TE] — pad/truncate saved data.
        const arr = items?.st;
        if (Array.isArray(arr) && arr.length) {
          const earned = arr.map((it) => (it?.earned == null ? '' : String(it.earned)));
          const totals = arr.map((it) => (it?.total == null ? '' : String(it.total)));
          while (earned.length < 3) earned.push('');
          while (totals.length < 3) totals.push('');
          perComp.st = earned.slice(0, 3);
          if (totals.some((t) => t !== '')) nextActs[pk].st = totals.slice(0, 3);
        }
        nextScores[stu.lrn][pk] = perComp;
        const a = entry?.attitude?.[pk as QuarterKey];
        nextAtt[stu.lrn][pk] = a == null ? '' : String(a);
      }
    }
    setActs(nextActs);
    setScores(nextScores);
    setAtt(nextAtt);
  };

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    (async () => {
      try {
        const [t, classes, subjects, r] = await Promise.all([
          id ? getTeacher(Number(id)) : Promise.resolve(null),
          listClasses(),
          listSubjects(),
          listStudentsByClass(classId),
        ]);
        if (cancelled) return;
        const c = classes.find((x) => x.id === classId) ?? null;
        setTeacher(t);
        setCls(c);
        setSubject(subjects.find((s) => s.code.toUpperCase() === code) ?? null);
        setRoster(r);
        if (c) seedSheet(r, c.sy);
        const [w, tr, sc] = await Promise.all([
          subjectCode ? weightsForClassSubject(classId, subjectCode).catch(() => null) : Promise.resolve(null),
          c ? listTransmutation(c.sy).catch(() => [] as TransmuteRow[]) : Promise.resolve([] as TransmuteRow[]),
          c ? listAttitudeScale(c.sy).catch(() => DEFAULT_ATTITUDE_SCALE) : Promise.resolve(DEFAULT_ATTITUDE_SCALE),
        ]);
        if (cancelled) return;
        setWeights(w);
        setTransmutation(tr);
        setAttScale(sc);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the grade sheet.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, classId, subjectCode]);

  const periods = useMemo(() => periodsForSy(cls?.sy), [cls?.sy]);
  const sy = cls?.sy ?? '';
  const subjName = subject?.fullName ?? subjectCode ?? '';
  const teacherName = teacher ? `${teacher.title} ${teacher.familyName}, ${teacher.firstName}`.replace(/\s+/g, ' ').trim() : '';

  const entryOf = (stu: Student) =>
    (stu.grades?.[sy as keyof Student['grades']] ?? []).find((e) => e.subjectCode.toUpperCase() === code);

  const cellOf = (g: QuarterGrade | undefined, key: string) => {
    const n = qOf(g, key);
    const letter = g?.letters?.[key as QuarterKey];
    return n != null ? n : letter || '—';
  };

  // ── sheet-state setters (edit mode) ──
  const setScore = (lrn: string, pk: string, c: CompKey, i: number, v: string) => {
    setScores((s) => {
      const stu = s[lrn] ?? {};
      const per = stu[pk] ?? emptyComp();
      const arr = [...(per[c] ?? [])];
      while (arr.length <= i) arr.push('');
      arr[i] = v;
      return { ...s, [lrn]: { ...stu, [pk]: { ...per, [c]: arr } } };
    });
    setSaved(false);
  };
  const setHps = (pk: string, c: CompKey, i: number, v: string) => {
    setActs((a) => {
      const per = a[pk] ?? emptyComp();
      const arr = [...(per[c] ?? [])];
      while (arr.length <= i) arr.push('');
      arr[i] = v;
      return { ...a, [pk]: { ...per, [c]: arr } };
    });
    setSaved(false);
  };
  const addActivity = (pk: string, c: CompKey) => {
    setActs((a) => {
      const per = a[pk] ?? emptyComp();
      return { ...a, [pk]: { ...per, [c]: [...(per[c] ?? []), ''] } };
    });
  };
  const setAttVal = (lrn: string, pk: string, v: string) => {
    setAtt((a) => ({ ...a, [lrn]: { ...(a[lrn] ?? {}), [pk]: v } }));
    setSaved(false);
  };

  const igFor = (lrn: string, pk: string): number | null => {
    if (!weights) return null;
    const raw = buildRaw(scores[lrn]?.[pk] ?? {}, acts[pk] ?? {});
    return Object.keys(raw).length ? initialGrade(raw, weights) : null;
  };
  const liveGrade = (lrn: string, pk: string): number | null => {
    if (!weights) return null;
    const raw = buildRaw(scores[lrn]?.[pk] ?? {}, acts[pk] ?? {});
    return Object.keys(raw).length ? computeGradeWith(raw, weights, transmutation) : null;
  };

  function cancelEditing() {
    if (roster && sy) seedSheet(roster, sy);
    setEditing(false);
    setError(null);
  }

  async function saveAll() {
    if (!cls || !weights || !roster) return;
    // An attitude score outside the scale would silently read wrong — block it.
    const badAtt = roster.filter((stu) =>
      periods.some((p) => {
        const raw = att[stu.lrn]?.[p.key] ?? '';
        if (raw === '') return false;
        const n = num(raw);
        return n == null || n >= 100 || !attitudeLetter(n, attScale);
      }),
    );
    if (badAtt.length) {
      setError(`Attitude must be within the scale (75–99). Please fix: ${badAtt.map((s) => `${s.lastName}, ${s.firstName}`).join('; ')}.`);
      return;
    }
    if (!window.confirm(
      `Save corrected grades for ${subjName} — ${cls.sectionName}?\n\nEach term grade is recomputed from the scores using the official weights and the SY's transmutation table. Only learners whose sheet actually changed are updated.`,
    )) return;

    setSaving(true);
    setError(null);
    try {
      const pks = periods.map((p) => p.key);
      await Promise.all(
        roster.map(async (stu) => {
          const yearGrades = stu.grades?.[sy as keyof Student['grades']] ?? [];
          const idx = yearGrades.findIndex((e) => e.subjectCode.toUpperCase() === code);
          const existing: QuarterGrade = idx >= 0 ? yearGrades[idx] : { subjectCode: subjectCode ?? code };

          const newRaw: NonNullable<QuarterGrade['raw']> = { ...(existing.raw ?? {}) };
          const newItems: NonNullable<QuarterGrade['items']> = { ...(existing.items ?? {}) };
          const newAtt: NonNullable<QuarterGrade['attitude']> = { ...(existing.attitude ?? {}) };
          for (const pk of pks) {
            const hpsMap = acts[pk] ?? emptyComp();
            const sc = scores[stu.lrn]?.[pk] ?? emptyComp();
            // Rebuild a period only when it holds ANY encoded state, so legacy
            // periods (grade only, no detail) are left exactly as stored.
            const hasAny = (['ww', 'pt', 'st'] as const).some(
              (c) => (sc[c] ?? []).some((v) => v !== '') || (hpsMap[c] ?? []).some((v) => v !== ''),
            );
            const aVal = num(att[stu.lrn]?.[pk]);
            if (hasAny) {
              const rawP: NonNullable<QuarterGrade['raw']>[QuarterKey] = {};
              const itemsP: NonNullable<QuarterGrade['items']>[QuarterKey] = {};
              for (const c of ['ww', 'pt'] as const) {
                const agg = aggregate(sc[c] ?? [], hpsMap[c] ?? []);
                if (agg) rawP[c] = agg;
              }
              const ex = exPercent(sc.st ?? [], hpsMap.st ?? []);
              if (ex != null) rawP.st = { earned: ex, total: 100 };
              for (const c of ['ww', 'pt', 'st'] as const) {
                itemsP[c] = (hpsMap[c] ?? []).map((h, i) => ({ earned: num((sc[c] ?? [])[i]), total: num(h) }));
              }
              newRaw[pk as QuarterKey] = rawP;
              newItems[pk as QuarterKey] = itemsP;
            }
            if (hasAny || aVal != null) newAtt[pk as QuarterKey] = aVal;
          }

          const entry: QuarterGrade = {
            ...existing,
            subjectCode: existing.subjectCode || (subjectCode ?? code),
            subjectType: weights.typeKey,
            raw: newRaw,
            items: newItems,
            attitude: newAtt,
          };
          const qvals: number[] = [];
          for (const pk of pks) {
            const rawPk = buildRaw(scores[stu.lrn]?.[pk] ?? {}, acts[pk] ?? {});
            const g = Object.keys(rawPk).length
              ? computeGradeWith(rawPk, weights, transmutation)
              : qOf(existing, pk);
            (entry as Record<string, unknown>)[pk] = g ?? undefined;
            if (typeof g === 'number') qvals.push(g);
          }
          entry.final = qvals.length
            ? Math.round(qvals.reduce((a, b) => a + b, 0) / qvals.length)
            : existing.final;

          // Skip untouched learners: no write when the rebuilt entry is
          // identical to what is stored (and never create an empty entry).
          if (idx >= 0 && JSON.stringify(entry) === JSON.stringify(existing)) return;
          if (idx < 0 && !qvals.length && Object.keys(newRaw).length === 0) return;

          const nextYear = idx >= 0 ? yearGrades.map((e, i) => (i === idx ? entry : e)) : [...yearGrades, entry];
          const grades = { ...(stu.grades ?? {}), [sy]: nextYear } as Student['grades'];
          await saveStudentGrades(stu.lrn, grades);
          stu.grades = grades; // keep the local roster in sync
        }),
      );
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the corrections.');
    } finally {
      setSaving(false);
    }
  }

  const fmtIG = (n: number | null) => (n == null ? '—' : n.toFixed(2));
  const periodLabel = periods.find((p) => p.key === view)?.label ?? '';
  const inputCls =
    'w-14 rounded border border-border bg-panel px-1.5 py-1 text-[12.5px] text-center tabular-nums focus:outline-none focus:border-nps-red';

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Teachers', to: '/teachers' },
          { label: teacherName || 'Teacher', to: `/teachers/${id ?? ''}` },
          { label: 'Grade Sheet' },
        ]}
      />

      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">{subjName}</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {cls ? `Grade ${cls.gradeLevel} · ${cls.sectionName} · SY ${cls.sy}` : ''}
            {teacherName && <> · {teacherName}</>}
          </p>
          <p className="text-[12px] text-ink-muted mt-0.5">
            {weights
              ? `Type: ${weights.label} · WW ${weights.ww}% · PT ${weights.pt}% · ${weights.exLabel} ${weights.st}%`
              : weights === null
                ? 'No subject type set for this section × subject — grades cannot be recomputed.'
                : 'Loading weights…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && !editing && <span className="text-[12px] text-ok-fg">✓ Corrections saved</span>}
          {!editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!weights || roster === null}
                title={weights ? 'Open the sheet for corrections' : 'Set the subject type in Setup ▸ Weight Components first'}
                onClick={() => { setEditing(true); setSaved(false); if (view === 'summary') setView(periods[0]?.key ?? 'q1'); }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit grades
              </Button>
              <button
                onClick={() => navigate(`/teachers/${id ?? ''}`)}
                className="h-9 rounded-md border border-border px-3 text-[13px] hover:bg-panel-alt"
              >
                ← Back to profile
              </button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={saving} onClick={cancelEditing}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5" disabled={saving} onClick={() => void saveAll()}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save corrections'}
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <p className="mb-3 text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Editing mode — you are correcting the teacher&rsquo;s encoded scores. Term grades and the
          Initial Grade recompute live as you type; nothing is stored until you press Save corrections.
        </p>
      )}

      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        {[{ key: 'summary', label: 'Summary' }, ...periods].map((p) => (
          <button
            key={p.key}
            onClick={() => setView(p.key)}
            className={`h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors ${
              view === p.key
                ? 'bg-nps-red text-white border-nps-red'
                : 'border-border text-ink-secondary hover:bg-panel-alt'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>
      )}

      {roster === null ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : roster.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">No learners in this section.</p>
      ) : view === 'summary' ? (
        <div className="overflow-x-auto border border-border rounded-lg bg-panel">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3 pl-3 w-10 text-right">#</th>
                <th className="py-2 pr-3">Learner</th>
                {periods.map((p) => (
                  <th key={p.key} className="py-2 px-3 text-center">{p.label}</th>
                ))}
                <th className="py-2 px-3 text-center">Final</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s, i) => {
                const g = entryOf(s);
                return (
                  <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                    <td className="py-1.5 pr-3 pl-3 text-right tabular-nums text-ink-muted">{i + 1}</td>
                    <td className="py-1.5 pr-3 text-ink-primary">{formatLastFirstMiddle(s)}</td>
                    {periods.map((p) => (
                      <td key={p.key} className="py-1.5 px-3 text-center tabular-nums">{cellOf(g, p.key)}</td>
                    ))}
                    <td className="py-1.5 px-3 text-center tabular-nums font-semibold">
                      {g?.final != null ? g.final : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11.5px] text-ink-muted border-t border-border-soft">
            Per-term grades as stored. Open a term tab to see every activity score behind them.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-panel">
          <table className="text-[12.5px] min-w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th rowSpan={2} className="py-2 pr-2 pl-3 w-8 text-right align-bottom">#</th>
                <th rowSpan={2} className="py-2 pr-3 min-w-[220px] align-bottom">Learner</th>
                {(['ww', 'pt', 'st'] as const).map((c) => (
                  <th
                    key={c}
                    colSpan={(acts[view]?.[c] ?? []).length}
                    className="py-2 px-2 text-center border-l border-border"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c === 'st' ? (weights?.exLabel ?? 'EXs') : c === 'ww' ? 'WWs' : 'PTs'} — {COMP_FULL[c]}
                      {weights && <> ({c === 'st' ? weights.st : weights[c]}%)</>}
                      {editing && c !== 'st' && (
                        <button
                          onClick={() => addActivity(view, c)}
                          title="Add an activity column"
                          className="inline-flex h-4 w-4 items-center justify-center rounded border border-border text-ink-muted hover:text-nps-red hover:border-nps-red"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th rowSpan={2} className="py-2 px-2 text-center border-l border-border align-bottom" title="Weighted percentage before transmutation">
                  Initial Grade
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-l border-border align-bottom" title="Initial Grade rounded, then transmuted">
                  {periodLabel} Grade
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-l border-border align-bottom">Attitude</th>
                <th rowSpan={2} className="py-2 px-2 pr-3 text-center align-bottom">Letter</th>
              </tr>
              {/* HPS row — the highest possible score of every activity. */}
              <tr className="text-[11px] text-ink-muted border-b border-border">
                {(['ww', 'pt', 'st'] as const).map((c) =>
                  (acts[view]?.[c] ?? []).map((h, i) => (
                    <th key={`${c}${i}`} className={`py-1.5 px-1.5 text-center font-normal ${i === 0 ? 'border-l border-border' : ''}`}>
                      <div className="font-medium text-ink-secondary">
                        {c === 'st' ? EX_LABELS[i] ?? `EX ${i + 1}` : `${c.toUpperCase()} ${i + 1}`}
                      </div>
                      {editing ? (
                        <input
                          value={h}
                          onChange={(e) => setHps(view, c, i, e.target.value)}
                          placeholder="HPS"
                          className={`${inputCls} mt-0.5`}
                        />
                      ) : (
                        <div className="tabular-nums mt-0.5">{h === '' ? '—' : h}</div>
                      )}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {roster.map((s, i) => {
                const g = entryOf(s);
                const stored = qOf(g, view);
                const shown = editing ? liveGrade(s.lrn, view) : stored ?? liveGrade(s.lrn, view);
                const attRaw = att[s.lrn]?.[view] ?? '';
                const attN = num(attRaw);
                const letter = attitudeLetter(attN, attScale);
                return (
                  <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                    <td className="py-1 pr-2 pl-3 text-right tabular-nums text-ink-muted">{i + 1}</td>
                    <td className="py-1 pr-3 text-ink-primary whitespace-nowrap">{formatLastFirstMiddle(s)}</td>
                    {(['ww', 'pt', 'st'] as const).map((c) =>
                      (acts[view]?.[c] ?? []).map((h, j) => {
                        const val = scores[s.lrn]?.[view]?.[c]?.[j] ?? '';
                        const over = num(val) != null && num(h) != null && (num(val) as number) > (num(h) as number);
                        return (
                          <td key={`${c}${j}`} className={`py-1 px-1.5 text-center ${j === 0 ? 'border-l border-border-soft' : ''}`}>
                            {editing ? (
                              <input
                                value={val}
                                onChange={(e) => setScore(s.lrn, view, c, j, e.target.value)}
                                className={`${inputCls} ${over ? 'border-nps-red text-nps-red' : ''}`}
                                title={over ? 'Higher than the HPS' : undefined}
                              />
                            ) : (
                              <span className={`tabular-nums ${over ? 'text-nps-red font-semibold' : ''}`}>
                                {val === '' ? '—' : val}
                              </span>
                            )}
                          </td>
                        );
                      }),
                    )}
                    <td className="py-1 px-2 text-center tabular-nums text-ink-secondary border-l border-border-soft">
                      {fmtIG(igFor(s.lrn, view))}
                    </td>
                    <td className="py-1 px-2 text-center tabular-nums font-semibold border-l border-border-soft">
                      {shown != null ? shown : cellOf(g, view) /* keeps KS1 letters visible */}
                    </td>
                    <td className="py-1 px-2 text-center border-l border-border-soft">
                      {editing ? (
                        <input
                          value={attRaw}
                          onChange={(e) => setAttVal(s.lrn, view, e.target.value)}
                          className={`${inputCls} ${attRaw !== '' && !letter ? 'border-nps-red text-nps-red' : ''}`}
                          title={attRaw !== '' && !letter ? 'Outside the attitude scale' : undefined}
                        />
                      ) : (
                        <span className="tabular-nums">{attRaw === '' ? '—' : attRaw}</span>
                      )}
                    </td>
                    <td className="py-1 px-2 pr-3 text-center font-medium">{letter?.letter ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11.5px] text-ink-muted border-t border-border-soft">
            {editing
              ? 'Blank scores count as 0 once a component has any encoded score. The last EX slot is the Term Exam (40%); the Summative Tests share 60%.'
              : 'Every encoded activity score for this term, exactly as the teacher entered it in the portal.'}
          </p>
        </div>
      )}
    </>
  );
}
