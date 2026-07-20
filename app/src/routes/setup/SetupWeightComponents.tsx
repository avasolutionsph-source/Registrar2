import { useEffect, useMemo, useState } from 'react';
import { Save, AlertTriangle, CopyPlus, History, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSchoolYears,
  listWeightComponents,
  saveWeightComponents,
  copyWeightsToSy,
  listUntypedClassSubjects,
  listWeightAudit,
  setClassSubjectType,
  listAttitudeScale,
  saveAttitudeScale,
  type WeightComponent,
  type UntypedClassSubject,
  type WeightAuditRow,
} from '@/lib/db';
import { DEFAULT_ATTITUDE_SCALE, type AttitudeBand } from '@/lib/grading';
import type { SchoolYear } from '@/types';

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

export default function SetupWeightComponents() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [rows, setRows] = useState<WeightComponent[]>([]);
  const [untyped, setUntyped] = useState<UntypedClassSubject[]>([]);
  const [audit, setAudit] = useState<WeightAuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  // Attitude scale — moved here from its own page so the whole grading
  // configuration lives behind one door. Same data, same rules, same table
  // (reg_attitude_scale); only the location changed.
  const [attitude, setAttitude] = useState<AttitudeBand[]>([]);
  const [attSaving, setAttSaving] = useState(false);
  const [attSaved, setAttSaved] = useState(false);

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
        const [ys, att] = await Promise.all([listSchoolYears(), listAttitudeScale()]);
        if (cancelled) return;
        setYears(ys);
        setSy(ys.find((y) => y.isActive)?.code ?? ys[ys.length - 1]?.code ?? '');
        setAttitude(att);
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
        const [w, u] = await Promise.all([listWeightComponents(sy), listUntypedClassSubjects()]);
        if (cancelled) return;
        setRows(w);
        setUntyped(u.filter((x) => x.sy === sy));
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

  // ── Attitude scale handlers (unchanged behaviour, moved page) ──
  const setBand = (i: number, patch: Partial<AttitudeBand>) => {
    setAttitude((bands) => bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
    setAttSaved(false);
  };
  const addBand = () => {
    setAttitude((bands) => [...bands, { min: 0, letter: '', label: '' }]);
    setAttSaved(false);
  };
  const removeBand = (i: number) => {
    setAttitude((bands) => bands.filter((_, j) => j !== i));
    setAttSaved(false);
  };
  const restoreAttitude = () => {
    setAttitude(DEFAULT_ATTITUDE_SCALE.map((b) => ({ ...b })));
    setAttSaved(false);
  };
  const attValid =
    attitude.length > 0 && attitude.every((b) => b.letter.trim() && b.min >= 0 && b.min <= 100);

  // Bands are matched high → low, so a band runs from its own minimum up to one
  // below the next band's. The top band's ceiling is the scale's highest score
  // (99 for Attitude — there is no 100). Display only; the stored value is `min`.
  const attRanges = useMemo(() => {
    const sorted = [...attitude].sort((a, b) => b.min - a.min);
    return new Map(
      sorted.map((b, i) => [b, i === 0 ? 99 : sorted[i - 1].min - 1] as const),
    );
  }, [attitude]);

  async function saveAtt() {
    if (!attValid) return;
    setAttSaving(true);
    setError(null);
    try {
      await saveAttitudeScale(attitude);
      setAttSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the attitude scale.');
    } finally {
      setAttSaving(false);
    }
  }

  async function assignType(u: UntypedClassSubject, typeKey: string) {
    if (!typeKey) return;
    try {
      await setClassSubjectType(u.classId, u.subjectCode, typeKey);
      setUntyped((cur) => cur.filter((x) => !(x.classId === u.classId && x.subjectCode === u.subjectCode)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign the subject type.');
    }
  }

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

      {/* ── Section 1 ─────────────────────────────────────────────────── */}
      <div className="mb-2">
        <h2 className="text-[15px] font-bold text-ink-primary">Weight Components</h2>
        <p className="text-[12.5px] text-ink-secondary mt-0.5 max-w-[660px]">
          How much each component counts toward a grade, per subject type. A learner's grade is the
          sum of each component's percentage score times its weight.
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
        <SectionCard heading={`${rows.length} subject types · SY ${sy}`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3">Subject type</th>
                {COMPONENTS.map((c) => (
                  <th key={c.key} className="py-2 px-2 w-[15%] text-center">{c.label}</th>
                ))}
                <th className="py-2 pl-2 w-[10%] text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const total = sumOf(r);
                return (
                  <tr key={r.typeKey} className="border-b border-border-soft last:border-0">
                    <td className="py-2 pr-3 text-ink-primary font-medium">{r.label}</td>
                    {COMPONENTS.map((c) => (
                      <td key={c.key} className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          disabled={locked}
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
          {!allValid && (
            <p className="mt-3 px-1 text-[12.5px] text-nps-red">
              Every subject type must total exactly 100% before you can save.
            </p>
          )}
        </SectionCard>
      )}

      {/* Missing configuration — flagged, never guessed. */}
      {untyped.length > 0 && (
        <div className="mt-4">
          <SectionCard heading={`${untyped.length} subjects cannot compute yet`}>
            <p className="text-[12.5px] text-ink-secondary mb-3">
              These have no subject type, so the system does not know their split. Their grade sheets
              are blocked until a type is chosen — nothing is assumed on their behalf.
            </p>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                  <th className="py-2 pr-3">Section</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 w-[34%]">Subject type</th>
                </tr>
              </thead>
              <tbody>
                {untyped.map((u) => (
                  <tr key={`${u.classId}-${u.subjectCode}`} className="border-b border-border-soft last:border-0">
                    <td className="py-2 pr-3 text-ink-secondary">{u.gradeLevel} — {u.sectionName}</td>
                    <td className="py-2 pr-3 text-ink-primary">{u.subjectName}</td>
                    <td className="py-2">
                      <select
                        defaultValue=""
                        onChange={(e) => assignType(u, e.target.value)}
                        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-[12.5px]"
                      >
                        <option value="">Choose a type…</option>
                        {rows.map((r) => (
                          <option key={r.typeKey} value={r.typeKey}>
                            {r.label} ({r.ww}/{r.pt}/{r.ex})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
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

      {/* ── Section 2 ─────────────────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="mb-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[15px] font-bold text-ink-primary">Attitude Scale</h2>
            <p className="text-[12.5px] text-ink-secondary mt-0.5 max-w-[660px]">
              The Attitude column on the grade sheet is encoded as a number, then shown as a letter
              using these bands. A score matches the highest band whose minimum it reaches, so the
              bands run from each minimum up to one below the next. Scores outside the scale are
              rejected at encoding rather than stored without a descriptor.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {attSaved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
            <Button variant="outline" onClick={restoreAttitude} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Defaults
            </Button>
            <Button onClick={saveAtt} disabled={!attValid || attSaving} className="gap-2">
              <Save className="w-3.5 h-3.5" /> {attSaving ? 'Saving…' : 'Save attitude'}
            </Button>
          </div>
        </div>

        <SectionCard heading={`${attitude.length} bands`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3 w-[14%]">Letter</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 px-2 w-[18%] text-center">Minimum score</th>
                <th className="py-2 pl-2 w-[16%] text-center">Range</th>
                <th className="py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {attitude.map((b, i) => (
                <tr key={i} className="border-b border-border-soft last:border-0">
                  <td className="py-2 pr-3">
                    <Input
                      value={b.letter}
                      placeholder="e.g. MO"
                      onChange={(e) => setBand(i, { letter: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      value={b.label}
                      placeholder="e.g. Most Outstanding"
                      onChange={(e) => setBand(i, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={b.min}
                      onChange={(e) => setBand(i, { min: Number(e.target.value) || 0 })}
                      className="text-center tabular-nums"
                    />
                  </td>
                  <td className="py-2 pl-2 text-center tabular-nums text-ink-secondary">
                    {b.min}–{attRanges.get(b) ?? 99}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeBand(i)}
                      className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app"
                      aria-label="Remove band"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between px-1">
            <Button variant="outline" size="sm" onClick={addBand} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add band
            </Button>
            {!attValid && (
              <span className="text-[12px] text-nps-red">
                Every band needs a letter and a minimum score (0–100).
              </span>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
