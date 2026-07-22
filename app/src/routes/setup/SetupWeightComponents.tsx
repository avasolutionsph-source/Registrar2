import { Fragment, useEffect, useMemo, useState } from 'react';
import { Save, AlertTriangle, CopyPlus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSchoolYears,
  listWeightComponents,
  saveWeightComponents,
  copyWeightsToSy,
  listAllClassSubjectTypes,
  listWeightAudit,
  setClassSubjectType,
  type WeightComponent,
  type ClassSubjectType,
  type WeightAuditRow,
} from '@/lib/db';
import type { SchoolYear } from '@/types';
import { gradeCardLabel, gradeLabel, gradeRank, levelOfGrade } from '@/lib/forms';

// Setup → Weight Components. The official WWs / PTs / EXs (QA in Grade 12) split
// per SUBJECT TYPE, per SCHOOL YEAR.
//
//   DepEd Order No. 15, s. 2026 — Nursery to Grade 10, and Grade 11
//   DepEd Order No.  8, s. 2015 — Grade 12 (still in force for SY 2026-2027)
//
// Editing is aimed at the NEXT school year: each year keeps its own copy, so a
// change here never moves a grade already computed in a past or current year.
// Correcting the CURRENT year is possible but deliberately behind a separate,
// confirmed action (see `unlockedSy`) because it re-computes that year's grades.

const sumOf = (r: WeightComponent) => r.ww + r.pt + r.ex;
const COMPONENTS = [
  { key: 'ww' as const, label: 'WWs' },
  { key: 'pt' as const, label: 'PTs' },
  { key: 'ex' as const, label: 'EXs / QA' },
];

// One heading per per-level table. Grade 12 labels its third component "QA";
// every other level uses "EXs" — same computation, label only.
const GROUP_LABEL: Record<string, string> = {
  nursery: 'Nursery 1-2',
  kinder: 'Kindergarten',
  'g1-3': 'Grades 1-3',
  'g4-10': 'Grades 4-10',
  g11: 'Grade 11',
  g12: 'Grade 12',
};
const componentsFor = (group: string | null) =>
  group === 'g12'
    ? [COMPONENTS[0], COMPONENTS[1], { key: 'ex' as const, label: 'QA' }]
    : [COMPONENTS[0], COMPONENTS[1], { key: 'ex' as const, label: 'EXs' }];

export default function SetupWeightComponents() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [rows, setRows] = useState<WeightComponent[]>([]);
  const [types, setTypes] = useState<ClassSubjectType[]>([]);
  const [onlyUnset, setOnlyUnset] = useState(false);
  const [audit, setAudit] = useState<WeightAuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The current/past year whose weights the registrar has explicitly unlocked to
  // fix a typo. Resets on every year switch — it is never the default.
  const [unlockedSy, setUnlockedSy] = useState('');
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const activeSy = useMemo(() => years.find((y) => y.isActive)?.code ?? '', [years]);
  // A year is editable freely once it is AFTER the active one: no grades exist
  // there yet, so changing the split cannot rewrite anything.
  const isFuture = !!sy && !!activeSy && sy > activeSy;
  const locked = !isFuture && unlockedSy !== sy;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ys = await listSchoolYears();
        if (cancelled) return;
        setYears(ys);
        setSy(ys.find((y) => y.isActive)?.code ?? ys[ys.length - 1]?.code ?? '');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load school years.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sy) return;
    let cancelled = false;
    setLoading(true);
    setUnlockedSy('');
    (async () => {
      try {
        const [w, t] = await Promise.all([listWeightComponents(sy), listAllClassSubjectTypes(sy)]);
        if (cancelled) return;
        setRows(w);
        setTypes(t);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the weights.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const setValue = (typeKey: string, comp: 'ww' | 'pt' | 'ex', value: number) => {
    setRows((rs) => rs.map((r) => (r.typeKey === typeKey ? { ...r, [comp]: value } : r)));
    setSaved(false);
  };

  const allValid = rows.length > 0 && rows.every((r) => sumOf(r) === 100);

  async function save() {
    if (!allValid || locked) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeightComponents(rows);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function startNextYear() {
    const next = years.find((y) => y.code > sy)?.code;
    if (!next) {
      setError('There is no later school year to copy into. Create it in Setup → School Years first.');
      return;
    }
    setError(null);
    try {
      await copyWeightsToSy(sy, next);
      setSy(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to copy the weights forward.');
    }
  }

  async function openAudit() {
    setShowAudit(true);
    try { setAudit(await listWeightAudit()); } catch { /* the table is registrar-only; empty is fine */ }
  }

  async function assignType(row: ClassSubjectType, typeKey: string) {
    const key = typeKey || null;
    const prev = types;
    // Optimistic: reflect the choice and its computed status immediately.
    setTypes((cur) =>
      cur.map((x) =>
        x.classId === row.classId && x.subjectCode === row.subjectCode
          ? { ...x, typeKey: key, configured: key != null }
          : x,
      ),
    );
    try {
      await setClassSubjectType(row.classId, row.subjectCode, typeKey);
    } catch (e) {
      setTypes(prev); // roll back on failure
      setError(e instanceof Error ? e.message : 'Failed to set the subject type.');
    }
  }

  // Assign one type to EVERY section of a grade for one subject (the N-G10
  // grade rows). Optimistic across the whole group, rolled back together on
  // failure so the sections never end up half-updated on screen.
  async function assignTypeToGrade(group: ClassSubjectType[], typeKey: string) {
    const key = typeKey || null;
    const prev = types;
    const members = new Set(group.map((g) => `${g.classId}|${g.subjectCode}`));
    setTypes((cur) =>
      cur.map((x) =>
        members.has(`${x.classId}|${x.subjectCode}`)
          ? { ...x, typeKey: key, configured: key != null }
          : x,
      ),
    );
    try {
      await Promise.all(group.map((g) => setClassSubjectType(g.classId, g.subjectCode, typeKey)));
    } catch (e) {
      setTypes(prev); // roll back on failure
      setError(e instanceof Error ? e.message : 'Failed to set the subject type.');
    }
  }

  const unsetCount = types.filter((t) => !t.configured).length;

  // Nursery-G10 sections share the grade catalog, so the same subject is the
  // same type in every section of a grade — one row per (grade x subject),
  // applied to all its sections at once. A group whose sections DISAGREE
  // (legacy data) is "mixed": its per-section rows stay visible under it until
  // one type is picked for the grade. SHS stays per section: strand curricula
  // differ, and the same subject can be a different type per grade/strand
  // (General Biology 1 is Academic Elective in G11 but Specialized in G12).
  const { gradeGroups, shsSections } = useMemo(() => {
    const byGrade = new Map<string, { gradeLevel: string; subjectCode: string; subjectName: string; rows: ClassSubjectType[] }>();
    const bySection = new Map<string, { classId: string; gradeLevel: string; sectionName: string; rows: ClassSubjectType[] }>();
    for (const t of types) {
      if (levelOfGrade(t.gradeLevel) === 'shs') {
        let g = bySection.get(t.classId);
        if (!g) { g = { classId: t.classId, gradeLevel: t.gradeLevel, sectionName: t.sectionName, rows: [] }; bySection.set(t.classId, g); }
        g.rows.push(t);
      } else {
        const k = `${t.gradeLevel}|${t.subjectCode}`;
        let g = byGrade.get(k);
        if (!g) { g = { gradeLevel: t.gradeLevel, subjectCode: t.subjectCode, subjectName: t.subjectName, rows: [] }; byGrade.set(k, g); }
        g.rows.push(t);
      }
    }
    const gradeGroups = [...byGrade.values()]
      .map((g) => {
        const first = g.rows[0]?.typeKey ?? null;
        const mixed = g.rows.some((r) => r.typeKey !== first);
        return { ...g, typeKey: mixed ? null : first, mixed, unset: g.rows.some((r) => !r.configured) };
      })
      .sort((a, b) => gradeRank(a.gradeLevel) - gradeRank(b.gradeLevel) || a.subjectName.localeCompare(b.subjectName));
    const shsSections = [...bySection.values()]
      .sort((a, b) => gradeRank(a.gradeLevel) - gradeRank(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName));
    return { gradeGroups, shsSections };
  }, [types]);

  const shownGradeGroups = onlyUnset ? gradeGroups.filter((g) => g.unset) : gradeGroups;
  const shownShsSections = shsSections
    .map((s) => ({ ...s, rows: onlyUnset ? s.rows.filter((r) => !r.configured) : s.rows }))
    .filter((s) => s.rows.length > 0);
  const shownCount =
    shownGradeGroups.reduce((n, g) => n + g.rows.length, 0) +
    shownShsSections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Weight Components' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Weight Components</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            The WWs / PTs / EXs split used to compute every grade, per subject type. Grade 12 shows
            the third component as <span className="font-semibold">QA</span> — the label differs, the
            computation does not. Each school year keeps its own copy, so changing a split here does
            not move grades already computed in another year.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sy}
            onChange={(e) => setSy(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
          >
            {years.map((y) => (
              <option key={y.code} value={y.code}>
                {y.code}{y.isActive ? ' (current)' : ''}
              </option>
            ))}
          </select>
          {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!allValid || saving || locked} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save weights'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Effectivity — always say plainly which year is being edited and when it applies. */}
      <div className={`mb-4 rounded-md border px-3 py-2.5 text-[12.5px] ${
        isFuture ? 'border-ok-fg/30 bg-ok-fg/5 text-ink-secondary' : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}>
        {isFuture ? (
          <>
            Editing <span className="font-semibold">SY {sy}</span>, which has not started. Changes
            take effect when that year begins and cannot affect any existing grade.
          </>
        ) : (
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="font-semibold">SY {sy}{sy === activeSy ? ' is the current year' : ' has already ended'}.</span>{' '}
              Weights are read-only here — the normal way to change a split is to set it for the next
              school year.
              {!locked && (
                <div className="mt-1 font-semibold text-nps-red">
                  Unlocked for correction. Saving will re-compute this year's grades.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={startNextYear} className="gap-1.5">
                <CopyPlus className="w-3.5 h-3.5" /> Set up next school year
              </Button>
              {locked && (
                <Button variant="outline" size="sm" onClick={() => setConfirmUnlock(true)} className="gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Correct a typo
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Escape hatch: separate, never the default, and states the consequence. */}
      {confirmUnlock && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-ink-primary">Correct SY {sy}'s weights?</h3>
            <p className="text-[13px] text-ink-secondary mt-2">
              This is for fixing a typo only. Any grade in SY {sy} that uses a split you change will
              be re-computed the next time it is opened — including grades already submitted to the
              Registrar. The change is recorded in the audit trail with your name.
            </p>
            <p className="text-[13px] text-ink-secondary mt-2">
              To change a split going forward instead, use{' '}
              <span className="font-semibold">Set up next school year</span>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmUnlock(false)}>Cancel</Button>
              <Button onClick={() => { setUnlockedSy(sy); setConfirmUnlock(false); }}>
                Unlock SY {sy}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: one table per level ────────────────────────────── */}
      <div className="mb-2">
        <h2 className="text-[15px] font-bold text-ink-primary">Weight Components</h2>
        <p className="text-[12.5px] text-ink-secondary mt-0.5 max-w-[660px]">
          How much each component counts toward a grade, per subject type, grouped by level. A
          learner's grade is the sum of each component's percentage score times its weight. Grade 12
          labels the third component QA; the computation is the same.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <SectionCard heading="No weights for this school year">
          <p className="text-[13px] text-ink-secondary">
            SY {sy} has no weight components yet. Open the year before it and use{' '}
            <span className="font-semibold">Set up next school year</span> to copy its splits forward.
          </p>
        </SectionCard>
      ) : (
        (() => {
          // Group the types into their per-level tables, preserving order.
          const groups: { key: string; rows: WeightComponent[] }[] = [];
          for (const r of rows) {
            const key = r.levelGroup ?? 'other';
            let g = groups.find((x) => x.key === key);
            if (!g) { g = { key, rows: [] }; groups.push(g); }
            g.rows.push(r);
          }
          return (
            <div className="space-y-5">
              {groups.map((g) => {
                const cols = componentsFor(g.key === 'other' ? null : g.key);
                return (
                  <div key={g.key}>
                    <h3 className="text-[13.5px] font-bold text-ink-primary mb-1.5">
                      {GROUP_LABEL[g.key] ?? 'Other'}
                    </h3>
                    <SectionCard heading={`${g.rows.length} subject type${g.rows.length === 1 ? '' : 's'}`}>
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                            <th className="py-2 pr-3">Subject type</th>
                            {cols.map((c) => (
                              <th key={c.key} className="py-2 px-2 w-[15%] text-center">{c.label}</th>
                            ))}
                            <th className="py-2 pl-2 w-[10%] text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r) => {
                            const total = sumOf(r);
                            return (
                              <tr key={r.typeKey} className="border-b border-border-soft last:border-0">
                                <td className="py-2 pr-3 text-ink-primary font-medium">{r.label}</td>
                                {cols.map((c) => (
                                  <td key={c.key} className="py-2 px-2">
                                    <Input
                                      type="number" min={0} max={100} disabled={locked}
                                      value={r[c.key]}
                                      onChange={(e) => setValue(r.typeKey, c.key, Number(e.target.value) || 0)}
                                      className="text-center tabular-nums disabled:opacity-60"
                                    />
                                  </td>
                                ))}
                                <td className={`py-2 pl-2 text-center font-semibold tabular-nums ${
                                  total === 100 ? 'text-ok-fg' : 'text-nps-red'
                                }`}>
                                  {total}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </SectionCard>
                  </div>
                );
              })}
              {!allValid && (
                <p className="px-1 text-[12.5px] text-nps-red">
                  Every subject type must total exactly 100% before you can save.
                </p>
              )}
            </div>
          );
        })()
      )}

      {/* Subject types — the split follows the TYPE. Nursery-G10 is one row per
          (grade x subject): sections of a grade share the grade catalog, so one
          choice covers all of them (a legacy "mixed" group expands until it is
          aligned). SHS stays per section because strand curricula differ. A row
          with no type (or a type with no weights this year) blocks its grade
          sheet and is highlighted. */}
      {types.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="mb-2 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[15px] font-bold text-ink-primary">Subject types</h2>
              <p className="text-[12.5px] text-ink-secondary mt-0.5 max-w-[660px]">
                Each subject's split comes from its type here. Nursery–Grade 10 is one row per grade
                — choosing a type applies it to every section of that grade. Senior High is per
                section, since strands carry different curricula. A row with no type cannot compute
                — its grade sheet is blocked until you choose one.
                {unsetCount > 0 && (
                  <span className="text-nps-red font-semibold"> {unsetCount} still need a type.</span>
                )}
              </p>
            </div>
            {unsetCount > 0 && (
              <label className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary shrink-0">
                <input type="checkbox" checked={onlyUnset} onChange={(e) => setOnlyUnset(e.target.checked)} />
                Show only unset
              </label>
            )}
          </div>
          <SectionCard heading={`${shownCount} of ${types.length} section subjects`}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                  <th className="py-2 pr-3">Grade / Section</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 w-[36%]">Subject type</th>
                </tr>
              </thead>
              <tbody>
                {/* Nursery-G10 — one row per grade x subject, applied to all sections. */}
                {shownGradeGroups.map((g) => (
                  <Fragment key={`${g.gradeLevel}|${g.subjectCode}`}>
                    <tr className={`border-b border-border-soft ${g.unset ? 'bg-nps-red/5' : ''}`}>
                      <td className="py-2 pr-3 text-ink-secondary">
                        {gradeCardLabel(g.gradeLevel)}
                        <span className="text-ink-muted"> · all {g.rows.length} section{g.rows.length === 1 ? '' : 's'}</span>
                      </td>
                      <td className="py-2 pr-3 text-ink-primary">{g.subjectName}</td>
                      <td className="py-2">
                        <select
                          value={g.mixed ? '__mixed' : g.typeKey ?? ''}
                          onChange={(e) => {
                            if (e.target.value !== '__mixed') assignTypeToGrade(g.rows, e.target.value);
                          }}
                          className={`h-8 w-full rounded-md border bg-surface px-2 text-[12.5px] ${
                            g.unset ? 'border-nps-red' : 'border-border'
                          }`}
                        >
                          {g.mixed && (
                            <option value="__mixed" disabled>
                              — mixed: sections differ (pick one to align them) —
                            </option>
                          )}
                          <option value="">— no type (blocked) —</option>
                          {rows.map((r) => (
                            <option key={r.typeKey} value={r.typeKey}>
                              {r.label} ({r.ww}/{r.pt}/{r.ex})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {/* Sections shown only while they disagree; picking a type
                        above (or matching them here) collapses the group. */}
                    {g.mixed &&
                      g.rows.map((t) => (
                        <tr
                          key={`${t.classId}-${t.subjectCode}`}
                          className={`border-b border-border-soft ${t.configured ? '' : 'bg-nps-red/5'}`}
                        >
                          <td className="py-2 pr-3 pl-6 text-ink-muted">↳ {t.sectionName}</td>
                          <td className="py-2 pr-3 text-ink-muted">{t.subjectName}</td>
                          <td className="py-2">
                            <select
                              value={t.typeKey ?? ''}
                              onChange={(e) => assignType(t, e.target.value)}
                              className={`h-8 w-full rounded-md border bg-surface px-2 text-[12.5px] ${
                                t.configured ? 'border-border' : 'border-nps-red'
                              }`}
                            >
                              <option value="">— no type (blocked) —</option>
                              {rows.map((r) => (
                                <option key={r.typeKey} value={r.typeKey}>
                                  {r.label} ({r.ww}/{r.pt}/{r.ex})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))}

                {/* Senior High — per section (strand curricula differ). */}
                {shownShsSections.map((s) => (
                  <Fragment key={s.classId}>
                    <tr className="border-b border-border-soft">
                      <td colSpan={3} className="pt-4 pb-1 text-[12px] font-bold uppercase tracking-[0.04em] text-ink-secondary">
                        {gradeLabel(s.gradeLevel)} — {s.sectionName}
                      </td>
                    </tr>
                    {s.rows.map((t) => (
                      <tr
                        key={`${t.classId}-${t.subjectCode}`}
                        className={`border-b border-border-soft ${t.configured ? '' : 'bg-nps-red/5'}`}
                      >
                        <td className="py-2 pr-3" />
                        <td className="py-2 pr-3 text-ink-primary">{t.subjectName}</td>
                        <td className="py-2">
                          <select
                            value={t.typeKey ?? ''}
                            onChange={(e) => assignType(t, e.target.value)}
                            className={`h-8 w-full rounded-md border bg-surface px-2 text-[12.5px] ${
                              t.configured ? 'border-border' : 'border-nps-red'
                            }`}
                          >
                            <option value="">— no type (blocked) —</option>
                            {rows.map((r) => (
                              <option key={r.typeKey} value={r.typeKey}>
                                {r.label} ({r.ww}/{r.pt}/{r.ex})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* Audit trail (who / when / old vs new). */}
      <div className="mt-4">
        {!showAudit ? (
          <Button variant="outline" size="sm" onClick={openAudit} className="gap-1.5">
            <History className="w-3.5 h-3.5" /> Show change history
          </Button>
        ) : (
          <SectionCard heading={`${audit.length} weight changes`}>
            {audit.length === 0 ? (
              <p className="text-[13px] text-ink-secondary">No weight changes recorded yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Who</th>
                    <th className="py-2 pr-3">SY · type</th>
                    <th className="py-2">Old → new</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-b border-border-soft last:border-0">
                      <td className="py-2 pr-3 text-ink-secondary whitespace-nowrap">
                        {new Date(a.changedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-ink-secondary">{a.changedBy}</td>
                      <td className="py-2 pr-3 text-ink-primary">{a.sy} · {a.typeKey}</td>
                      <td className="py-2 tabular-nums text-ink-primary">
                        {a.oldSplit ? `${a.oldSplit} → ${a.newSplit}` : `set to ${a.newSplit}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        )}
      </div>

    </>
  );
}
