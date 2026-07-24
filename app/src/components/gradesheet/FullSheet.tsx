import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  listStudentsByClass,
  listClasses,
  listSubjects,
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
import type { Student, ClassRecord, Subject, QuarterGrade, QuarterKey } from '@/types';

// The FULL class × subject grade sheet — the registrar's view of exactly what
// the teacher encodes in the portal: per-activity scores with Total / PS /
// Weighted Score per component, the EXs ST1/ST2/Term-Exam breakdown with EX %,
// Initial and Final Grade, Attitude, male/female grouping, and the Final tab.
// One component, mounted anywhere a full sheet is needed (teacher profile,
// Reports ▸ Class Grades full-screen view) so the sheet reads the SAME
// everywhere in the system. Editing is behind an explicit "Edit grades"
// button: corrections change the SCORES, and each term grade recomputes with
// the same engine the teacher portal uses (weights by subject type + the SY's
// transmutation table).

type CompKey = 'ww' | 'pt' | 'st';
type CompArrays = Record<CompKey, string[]>;

const GROUP_FULL: Record<CompKey, string> = {
  ww: 'Written Works & Oral Works',
  pt: 'Product / Performance Tasks',
  st: 'Summative Tests & Term Exam',
};

// EXs are a FIXED structure per the official sheet: exactly two Summative Tests
// (30% each) and one Term Exam (40%). Slot index → its label + internal weight.
const EX_SLOTS = [
  { idx: 0, label: 'Summative Test 1', short: 'ST 1', weight: 30 },
  { idx: 1, label: 'Summative Test 2', short: 'ST 2', weight: 30 },
  { idx: 2, label: 'Term Examination', short: 'Term Exam', weight: 40 },
];

// One alignment rule for every score cell — same as the portal sheet.
const SCORE_CELL = 'px-1 py-1 text-left';

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

// Standard class-list grouping (same as the portal sheet): MALE first, then
// FEMALE, each alphabetical with its OWN numbering; learners with no gender
// value go to an "Unspecified" group at the end instead of being dropped.
function groupRosterBySex(roster: Student[]) {
  const byName = (a: Student, b: Student) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  const groups = [
    { key: 'Male', label: 'Male', students: roster.filter((s) => s.gender === 'Male').sort(byName) },
    { key: 'Female', label: 'Female', students: roster.filter((s) => s.gender === 'Female').sort(byName) },
  ];
  const other = roster.filter((s) => s.gender !== 'Male' && s.gender !== 'Female').sort(byName);
  if (other.length) groups.push({ key: 'Unspecified', label: 'Unspecified', students: other });
  return groups.filter((g) => g.students.length > 0);
}

export function FullSheet({
  classId,
  subjectCode,
  teacherName,
  actions,
}: {
  classId: string;
  subjectCode: string;
  // Shown in the meta line when the sheet is opened from a teacher's profile.
  teacherName?: string;
  // Extra header controls (e.g. a Back button) rendered beside Edit grades.
  actions?: ReactNode;
}) {
  const code = (subjectCode ?? '').toUpperCase();

  const [cls, setCls] = useState<ClassRecord | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [roster, setRoster] = useState<Student[] | null>(null);
  // undefined = loading; null = no subject type configured (block editing).
  const [weights, setWeights] = useState<ClassSubjectWeights | null | undefined>(undefined);
  const [transmutation, setTransmutation] = useState<TransmuteRow[]>([]);
  const [attScale, setAttScale] = useState<AttitudeBand[]>(DEFAULT_ATTITUDE_SCALE);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<string>('q1');
  const [showFinal, setShowFinal] = useState(false);
  const [finalSort, setFinalSort] = useState<'rank' | 'name'>('rank');
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
      const entry = (stu.grades?.[sy as keyof Student['grades']] ?? []).find(
        (e) => e.subjectCode.toUpperCase() === code,
      );
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
    // Keep every learner's score rows as long as the class HPS rows.
    for (const stu of r) {
      for (const pk of pks) {
        for (const c of ['ww', 'pt'] as const) {
          const arr = nextScores[stu.lrn][pk][c];
          while (arr.length < nextActs[pk][c].length) arr.push('');
        }
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
        const [classes, subjects, r] = await Promise.all([
          listClasses(),
          listSubjects(),
          listStudentsByClass(classId),
        ]);
        if (cancelled) return;
        const c = classes.find((x) => x.id === classId) ?? null;
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
  }, [classId, subjectCode]);

  const periods = useMemo(() => periodsForSy(cls?.sy), [cls?.sy]);
  const sy = cls?.sy ?? '';
  const subjName = subject?.fullName ?? subjectCode ?? '';
  const readOnly = !editing;

  const COMPONENTS: { key: CompKey; label: string }[] = [
    { key: 'ww', label: 'WWs' },
    { key: 'pt', label: 'PTs' },
    { key: 'st', label: weights?.exLabel ?? 'EXs' },
  ];

  const entryFor = (stu: Student) =>
    (stu.grades?.[sy as keyof Student['grades']] ?? []).find((e) => e.subjectCode.toUpperCase() === code);

  // ── column helpers (same shapes as the portal sheet) ──
  const colFor = (c: CompKey) => acts[period]?.[c] ?? [''];
  // WW/PT: inputs + add col + (Total, PS, Weighted) = len + 4; EX fixed = 10.
  const spanFor = (cKey: CompKey) => (cKey === 'st' ? 10 : colFor(cKey).length + 4);

  const setHps = (c: CompKey, i: number, v: string) => {
    setActs((a) => {
      const per = a[period] ?? emptyComp();
      const arr = [...(per[c] ?? [])];
      while (arr.length <= i) arr.push('');
      arr[i] = v;
      return { ...a, [period]: { ...per, [c]: arr } };
    });
    setSaved(false);
  };
  const addActivity = (c: CompKey) => {
    setActs((a) => {
      const per = a[period] ?? emptyComp();
      return { ...a, [period]: { ...per, [c]: [...(per[c] ?? []), ''] } };
    });
    setScores((s) => {
      const next = { ...s };
      for (const lrn of Object.keys(next)) {
        const cur = next[lrn][period]?.[c] ?? [];
        next[lrn] = { ...next[lrn], [period]: { ...(next[lrn][period] ?? emptyComp()), [c]: [...cur, ''] } };
      }
      return next;
    });
    setSaved(false);
  };
  const removeActivity = (c: CompKey, i: number) => {
    setActs((a) => {
      const per = a[period] ?? emptyComp();
      const arr = [...(per[c] ?? [])];
      if (arr.length <= 1) return a;
      arr.splice(i, 1);
      return { ...a, [period]: { ...per, [c]: arr } };
    });
    setScores((s) => {
      const next = { ...s };
      for (const lrn of Object.keys(next)) {
        const arr = [...(next[lrn][period]?.[c] ?? [])];
        if (arr.length > i) arr.splice(i, 1);
        next[lrn] = { ...next[lrn], [period]: { ...(next[lrn][period] ?? emptyComp()), [c]: arr } };
      }
      return next;
    });
    setSaved(false);
  };
  const setScore = (lrn: string, c: CompKey, i: number, v: string) => {
    setScores((s) => {
      const per = s[lrn]?.[period] ?? emptyComp();
      const arr = [...(per[c] ?? [])];
      while (arr.length <= i) arr.push('');
      arr[i] = v;
      return { ...s, [lrn]: { ...s[lrn], [period]: { ...per, [c]: arr } } };
    });
    setSaved(false);
  };
  const setAttitude = (lrn: string, v: string) => {
    setAtt((a) => ({ ...a, [lrn]: { ...(a[lrn] ?? {}), [period]: v } }));
    setSaved(false);
  };

  // ── computed cells (same math as the portal sheet) ──
  const fmtNum = (x: number | null) => (x == null ? '—' : Number.isInteger(x) ? String(x) : x.toFixed(1));
  const compFor = (lrn: string, c: CompKey) => {
    const agg = aggregate(scores[lrn]?.[period]?.[c] ?? [], acts[period]?.[c] ?? []);
    if (!agg || !agg.total) return null;
    const ps = c === 'st'
      ? exPercent(scores[lrn]?.[period]?.st ?? [], acts[period]?.st ?? [])
      : (agg.earned / agg.total) * 100;
    if (ps == null) return null;
    return { ts: agg.earned, hps: agg.total, ps, ws: (ps * (weights?.[c] ?? 0)) / 100 };
  };

  const liveGradeFor = (lrn: string, pk: string): number | null => {
    if (!weights) return null;
    const raw = buildRaw(scores[lrn]?.[pk] ?? {}, acts[pk] ?? {});
    return Object.keys(raw).length ? computeGradeWith(raw, weights, transmutation) : null;
  };
  // The grade shown for a period: while editing, the live recompute leads; in
  // view mode the STORED grade is authoritative (covers legacy entries with no
  // per-activity detail), with the live value as fallback.
  const gradeForPeriod = (stu: Student, pk: string): number | null => {
    const live = liveGradeFor(stu.lrn, pk);
    const stored = qOf(entryFor(stu), pk);
    return editing ? live ?? stored : stored ?? live;
  };
  const igFor = (lrn: string): number | null => {
    if (!weights) return null;
    const raw = buildRaw(scores[lrn]?.[period] ?? {}, acts[period] ?? {});
    return Object.keys(raw).length ? initialGrade(raw, weights) : null;
  };
  const overHps = (c: CompKey, i: number, val: string) => {
    const hps = num((acts[period]?.[c] ?? [])[i]);
    const v = num(val);
    return v != null && hps != null && v > hps;
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
            Object.assign(entry, { [pk]: g ?? undefined });
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

  const scoreInputCls = (bad: boolean) =>
    `w-11 rounded border px-1 py-0.5 text-center disabled:bg-slate-100 disabled:text-slate-600 ${
      bad ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'
    }`;

  return (
    <>
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
                onClick={() => { setEditing(true); setSaved(false); setShowFinal(false); }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit grades
              </Button>
              {actions}
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

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>
      )}

      {/* period tabs + FINAL summary — same switcher as the portal sheet */}
      <div className="inline-flex rounded-md border border-slate-300 overflow-hidden mb-3 text-sm bg-panel">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setShowFinal(false); }}
            className={`px-3 py-1.5 ${
              !showFinal && period === p.key ? 'bg-nps-red text-white' : 'text-ink-secondary hover:bg-panel-alt'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowFinal(true)}
          className={`px-3 py-1.5 border-l border-slate-300 font-medium ${
            showFinal ? 'bg-nps-red text-white' : 'text-ink-secondary hover:bg-panel-alt'
          }`}
        >
          Final
        </button>
      </div>

      {roster === null ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : showFinal ? (
        <FinalSummary
          roster={roster}
          periods={periods}
          gradeForPeriod={gradeForPeriod}
          sort={finalSort}
          setSort={setFinalSort}
          subjectName={subjName}
        />
      ) : (
        <>
          <p className="text-xs text-ink-muted mb-2">
            <span className="font-medium">Written Works &amp; Oral Works</span> and{' '}
            <span className="font-medium">Product / Performance Tasks</span> show the Total Raw Score,
            Percentage Score (PS) and the Weighted Score.{' '}
            <span className="font-medium">Summative Tests &amp; Term Exam</span> has a fixed breakdown:{' '}
            <span className="font-medium">Summative Test 1 (30%)</span>,{' '}
            <span className="font-medium">Summative Test 2 (30%)</span> and the{' '}
            <span className="font-medium">Term Examination (40%)</span> — each shows its own Percentage &amp;
            Weighted Score, which add up to the {weights?.exLabel ?? 'EXs'} Component Percentage Score that
            feeds the Initial and Final Grade.
            {weights && <> Weights for this subject: {weights.ww}/{weights.pt}/{weights.st} (WWs/PTs/{weights.exLabel}) — {weights.label}.</>}
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-panel">
            <table className="text-[12px] whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2 text-left sticky left-0 bg-slate-50 min-w-[180px]">Learner</th>
                  {COMPONENTS.map((c) => (
                    <th key={c.key} className="px-2 py-1 text-center border-l border-slate-200" colSpan={spanFor(c.key)}>
                      {c.label} — {GROUP_FULL[c.key]} ({weights ? (c.key === 'st' ? weights.st : weights[c.key]) : '—'}%)
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center border-l border-slate-200" title="Sum of the weighted component scores, before transmutation">Initial Grade</th>
                  <th className="px-2 py-2 text-center border-l border-slate-200" title="Initial Grade rounded, then transmuted">Final Grade</th>
                  <th className="px-2 py-2 text-center border-l border-slate-200">Attitude</th>
                  <th className="px-2 py-2 text-center">Letter</th>
                </tr>
                <tr className="bg-panel border-b border-slate-200 text-slate-400 text-[10.5px]">
                  <th className="px-2 py-1 text-left sticky left-0 bg-panel">HPS →</th>
                  {COMPONENTS.map((c) =>
                    c.key === 'st' ? (
                      <Fragment key="st">
                        {EX_SLOTS.map((slot) => (
                          <Fragment key={`st-h-${slot.idx}`}>
                            <th className={`${SCORE_CELL} align-top ${slot.idx === 0 ? 'border-l border-slate-200' : ''}`}>
                              <input
                                value={colFor('st')[slot.idx] ?? ''}
                                onChange={(e) => setHps('st', slot.idx, e.target.value)}
                                disabled={readOnly}
                                placeholder="HPS"
                                className="w-11 rounded border border-slate-300 px-1 py-0.5 text-center disabled:bg-slate-100 disabled:text-slate-500"
                              />
                              <div className="text-[8.5px] text-slate-400 mt-0.5">{slot.label}</div>
                            </th>
                            <th className="px-1 py-1 text-center text-[9.5px] font-semibold text-slate-500 bg-slate-50" title={`${slot.short} Percentage Score`}>
                              PS
                            </th>
                            <th className="px-1 py-1 text-center text-[9.5px] font-semibold text-slate-500 bg-slate-50" title={`${slot.short} Weighted Score (${slot.weight}%)`}>
                              {slot.weight}%
                            </th>
                          </Fragment>
                        ))}
                        <th className="px-1 py-1 text-center text-[10px] font-semibold text-slate-600 bg-slate-100 border-l border-slate-200" title="EX Component Percentage Score = ST1 + ST2 + Term Exam weighted scores">
                          EX %
                        </th>
                      </Fragment>
                    ) : (
                      <Fragment key={c.key}>
                        {colFor(c.key).map((h, i) => (
                          <th key={`${c.key}-${i}`} className={`${SCORE_CELL} ${i === 0 ? 'border-l border-slate-200' : ''}`}>
                            <div className="flex items-center gap-0.5">
                              <input
                                value={h}
                                onChange={(e) => setHps(c.key, i, e.target.value)}
                                disabled={readOnly}
                                placeholder="HPS"
                                className="w-11 rounded border border-slate-300 px-1 py-0.5 text-center disabled:bg-slate-100 disabled:text-slate-500"
                              />
                              {!readOnly && (
                                <button
                                  onClick={() => removeActivity(c.key, i)}
                                  title="Remove activity"
                                  className="text-slate-300 hover:text-red-500"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th key={`${c.key}-add`} className="px-1 py-1 align-top">
                          {!readOnly && (
                            <button
                              onClick={() => addActivity(c.key)}
                              className="text-nps-red hover:underline text-[11px]"
                              title={`Add ${c.label}`}
                            >
                              + {c.label.slice(0, -1)}
                            </button>
                          )}
                        </th>
                        <th className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500 border-l border-slate-200 bg-slate-50" title="Total Raw Score">Total</th>
                        <th className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500 bg-slate-50" title="Percentage Score">PS</th>
                        <th className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500 bg-slate-50" title={`Weighted Score (${weights ? weights[c.key] : '—'}%)`}>
                          {weights ? weights[c.key] : '—'}%
                        </th>
                      </Fragment>
                    ),
                  )}
                  <th className="border-l border-slate-200" />
                  <th className="border-l border-slate-200" />
                  <th className="border-l border-slate-200" />
                  <th />
                </tr>
              </thead>
              <tbody>
                {groupRosterBySex(roster).map((grp) => (
                  <Fragment key={grp.key}>
                    <tr>
                      <td
                        colSpan={99}
                        className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider sticky left-0 ${
                          grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {grp.label} · {grp.students.length}
                      </td>
                    </tr>
                    {grp.students.map((stu, gi) => {
                      const g = gradeForPeriod(stu, period);
                      const attRaw = att[stu.lrn]?.[period] ?? '';
                      const attVal = num(attRaw);
                      const band = attitudeLetter(attVal, attScale);
                      const attBad = attVal != null && !band;
                      const stEarned = scores[stu.lrn]?.[period]?.st ?? [];
                      const stHps = acts[period]?.st ?? [];
                      return (
                        <tr key={stu.lrn} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-1 sticky left-0 bg-panel">
                            {gi + 1}. {formatLastFirstMiddle(stu)}
                          </td>
                          {COMPONENTS.map((c) =>
                            c.key === 'st' ? (
                              <Fragment key="st">
                                {EX_SLOTS.map((slot) => {
                                  const val = stEarned[slot.idx] ?? '';
                                  const e = num(val);
                                  const h = num(stHps[slot.idx]);
                                  const ok = h != null && h > 0 && e != null;
                                  const ps = ok ? (e / h) * 100 : null;
                                  const ws = ps != null ? (ps * slot.weight) / 100 : null;
                                  const over = overHps('st', slot.idx, val);
                                  return (
                                    <Fragment key={`${stu.lrn}-st-${slot.idx}`}>
                                      <td className={`${SCORE_CELL} ${slot.idx === 0 ? 'border-l border-slate-100' : ''}`}>
                                        <input
                                          value={val}
                                          onChange={(ev) => setScore(stu.lrn, 'st', slot.idx, ev.target.value)}
                                          disabled={readOnly}
                                          title={over ? 'Score exceeds the highest possible score (HPS)' : undefined}
                                          className={scoreInputCls(over)}
                                        />
                                      </td>
                                      <td className="px-1.5 py-1 text-center text-slate-500 tabular-nums bg-slate-50/60" title={`${slot.short} Percentage Score`}>
                                        {ps == null ? '—' : fmtNum(ps)}
                                      </td>
                                      <td className="px-1.5 py-1 text-center text-slate-700 font-medium tabular-nums bg-slate-50/60" title={`${slot.short} Weighted Score (${slot.weight}%)`}>
                                        {ws == null ? '—' : fmtNum(ws)}
                                      </td>
                                    </Fragment>
                                  );
                                })}
                                <td className="px-1.5 py-1 text-center text-slate-800 font-semibold tabular-nums bg-slate-100 border-l border-slate-100" title="EX Component Percentage Score">
                                  {(() => { const cp = compFor(stu.lrn, 'st'); return cp ? fmtNum(cp.ps) : '—'; })()}
                                </td>
                              </Fragment>
                            ) : (
                              <Fragment key={c.key}>
                                {colFor(c.key).map((_, i) => {
                                  const val = scores[stu.lrn]?.[period]?.[c.key]?.[i] ?? '';
                                  const over = overHps(c.key, i, val);
                                  return (
                                    <td key={`${stu.lrn}-${c.key}-${i}`} className={`${SCORE_CELL} ${i === 0 ? 'border-l border-slate-100' : ''}`}>
                                      <input
                                        value={val}
                                        onChange={(e) => setScore(stu.lrn, c.key, i, e.target.value)}
                                        disabled={readOnly}
                                        title={over ? 'Score exceeds the highest possible score (HPS)' : undefined}
                                        className={scoreInputCls(over)}
                                      />
                                    </td>
                                  );
                                })}
                                <td className="px-0.5 py-1" />
                                {(() => {
                                  const cp = compFor(stu.lrn, c.key);
                                  return (
                                    <>
                                      <td className="px-1.5 py-1 text-center text-slate-500 tabular-nums border-l border-slate-100 bg-slate-50/60">
                                        {cp ? fmtNum(cp.ts) : '—'}
                                      </td>
                                      <td className="px-1.5 py-1 text-center text-slate-500 tabular-nums bg-slate-50/60">
                                        {cp ? fmtNum(cp.ps) : '—'}
                                      </td>
                                      <td className="px-1.5 py-1 text-center text-slate-700 font-medium tabular-nums bg-slate-50/60">
                                        {cp ? fmtNum(cp.ws) : '—'}
                                      </td>
                                    </>
                                  );
                                })()}
                              </Fragment>
                            ),
                          )}
                          <td className="px-2 py-1 text-center text-slate-600 tabular-nums border-l border-slate-100" title="Initial Grade — before transmutation">
                            {fmtNum(igFor(stu.lrn))}
                          </td>
                          <td className="px-2 py-1 text-center font-semibold border-l border-slate-100" title="Final Grade — transmuted">
                            {g ?? entryFor(stu)?.letters?.[period as QuarterKey] ?? '—'}
                          </td>
                          <td className="px-2 py-1 text-center border-l border-slate-100">
                            <input
                              value={attRaw}
                              onChange={(e) => setAttitude(stu.lrn, e.target.value)}
                              disabled={readOnly}
                              title={attBad ? 'Attitude must be 75–99.' : ''}
                              className={`w-12 rounded border px-1 py-0.5 text-center disabled:bg-slate-100 disabled:text-slate-600 ${
                                attBad ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'
                              }`}
                            />
                          </td>
                          <td
                            className={`px-2 py-1 text-center font-medium ${attBad ? 'text-red-600' : ''}`}
                            title={attBad ? 'No descriptor: the Attitude scale is 75–99.' : band?.label ?? ''}
                          >
                            {attBad ? 'out of range' : band?.letter ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {roster.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-2 py-6 text-center text-slate-500">
                      No learners in this section yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// FINAL tab — Term summary per learner, sortable by ranking (default) or name.
// Same layout as the portal sheet's Final tab.
function FinalSummary({
  roster,
  periods,
  gradeForPeriod,
  sort,
  setSort,
  subjectName,
}: {
  roster: Student[];
  periods: { key: string; label: string }[];
  gradeForPeriod: (stu: Student, pk: string) => number | null;
  sort: 'rank' | 'name';
  setSort: (s: 'rank' | 'name') => void;
  subjectName: string;
}) {
  const rows = roster.map((stu) => {
    const terms = periods.map((p) => gradeForPeriod(stu, p.key));
    const present = terms.filter((v): v is number => typeof v === 'number');
    const final = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
    return { stu, terms, final };
  });
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'name') {
      return a.stu.lastName.localeCompare(b.stu.lastName) || a.stu.firstName.localeCompare(b.stu.firstName);
    }
    if (a.final == null && b.final == null) return 0;
    if (a.final == null) return 1;
    if (b.final == null) return -1;
    return b.final - a.final;
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-xs text-ink-muted">
          Final grades for {subjectName} — average of the terms below.
        </p>
        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-xs bg-panel">
          <button
            onClick={() => setSort('rank')}
            className={`px-3 py-1.5 ${sort === 'rank' ? 'bg-nps-red text-white' : 'text-ink-secondary hover:bg-panel-alt'}`}
          >
            By ranking
          </button>
          <button
            onClick={() => setSort('name')}
            className={`px-3 py-1.5 border-l border-slate-300 ${sort === 'name' ? 'bg-nps-red text-white' : 'text-ink-secondary hover:bg-panel-alt'}`}
          >
            Alphabetical
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
              <th className="px-3 py-2 text-left w-12">{sort === 'rank' ? 'Rank' : '#'}</th>
              <th className="px-3 py-2 text-left min-w-[200px]">Learner</th>
              {periods.map((p) => (
                <th key={p.key} className="px-2 py-2 text-center">{p.label}</th>
              ))}
              <th className="px-3 py-2 text-center">Final</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.stu.lrn} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-3 py-1.5 text-ink-primary">{formatLastFirstMiddle(r.stu)}</td>
                {r.terms.map((t, idx) => (
                  <td key={idx} className="px-2 py-1.5 text-center tabular-nums text-ink-secondary">{t ?? '—'}</td>
                ))}
                <td className="px-3 py-1.5 text-center font-semibold tabular-nums">{r.final ?? '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={periods.length + 3} className="px-3 py-6 text-center text-slate-500">
                  No learners in this section yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
