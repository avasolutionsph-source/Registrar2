import { useEffect, useMemo, useState } from 'react';
import { Save, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSchoolYears,
  listDescriptorScales,
  listDescriptiveLevels,
  saveDescriptorScales,
  saveDescriptiveLevels,
  type DescriptorBand,
  type DescriptiveLevel,
} from '@/lib/db';
import type { SchoolYear } from '@/types';

// Setup → Report Card Descriptors. How grades are DISPLAYED — never how they are
// computed. Two things, per school year:
//   1. the descriptor scales (Preschool C/D/B, Grades 1-3 A/B/C/D/E), and
//   2. which levels render descriptive vs numerical, and with which scale.
//
// Editing targets the NEXT school year; each year keeps its own copy, so a
// change never re-labels a report card already issued.

const SCALE_LABEL: Record<string, string> = {
  preschool: 'Performance Descriptors — Pre School',
  g1_3: 'Performance Descriptors — Grades 1-3',
  attitude: 'Attitude (Grades 1-12)',
  deportment: 'Deportment (Grades 1-12)',
  special_program: 'Special Program',
};
// Who encodes each scale, shown under the section heading.
const SCALE_NOTE: Record<string, string> = {
  preschool: 'Nursery 1, Nursery 2, Kindergarten',
  attitude: 'encoded by the Subject Teacher',
  deportment: 'encoded by the Class Adviser',
  special_program: 'Homeroom Guidance, Student Activity Program, Computer, Scouting — encoded by the Class Adviser',
};
// The order the sections appear. Preschool and Grades 1-3 are kept adjacent but
// clearly separate — the same letters (B, C) mean different things in each.
const SCALE_ORDER = ['preschool', 'g1_3', 'attitude', 'deportment', 'special_program'];
// Academic descriptors top out at 100; the conduct/attitude scales at 99 (there
// is no 100 in any). The ceiling only affects the read-only Range column.
const SCALE_MAX: Record<string, number> = { attitude: 99, deportment: 99, special_program: 99 };

// A band runs from its own minimum up to one below the next band's; the top
// band's ceiling is the scale's max. Read-only display.
function rangesFor(bands: DescriptorBand[], max: number) {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return new Map(sorted.map((b, i) => [b, i === 0 ? max : sorted[i - 1].min - 1] as const));
}

export default function SetupDescriptors() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [bands, setBands] = useState<DescriptorBand[]>([]);
  const [levels, setLevels] = useState<DescriptiveLevel[]>([]);
  // Last-saved snapshots, for dirty-tracking and Cancel.
  const [savedBands, setSavedBands] = useState<DescriptorBand[]>([]);
  const [savedLevels, setSavedLevels] = useState<DescriptiveLevel[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setEditing(false);
    (async () => {
      try {
        const [b, l] = await Promise.all([listDescriptorScales(sy), listDescriptiveLevels(sy)]);
        if (cancelled) return;
        setBands(b);
        setLevels(l);
        setSavedBands(b.map((x) => ({ ...x })));
        setSavedLevels(l.map((x) => ({ ...x })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load descriptors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const dirty = useMemo(
    () => JSON.stringify(bands) !== JSON.stringify(savedBands) ||
          JSON.stringify(levels) !== JSON.stringify(savedLevels),
    [bands, levels, savedBands, savedLevels],
  );

  // Warn before the browser discards unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const scaleKeys = useMemo(() => {
    const present = [...new Set(bands.map((b) => b.scaleKey))];
    return present.sort((a, b) => {
      const ia = SCALE_ORDER.indexOf(a), ib = SCALE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [bands]);
  const ranges = useMemo(() => {
    const m = new Map<string, ReturnType<typeof rangesFor>>();
    for (const k of scaleKeys) m.set(k, rangesFor(bands.filter((b) => b.scaleKey === k), SCALE_MAX[k] ?? 100));
    return m;
  }, [bands, scaleKeys]);

  const setBand = (scaleKey: string, letter: string, patch: Partial<DescriptorBand>) =>
    setBands((bs) => bs.map((b) => (b.scaleKey === scaleKey && b.letter === letter ? { ...b, ...patch } : b)));
  const addBand = (scaleKey: string) =>
    setBands((bs) => [...bs, { scaleKey, letter: '', label: '', min: 0, sortOrder: bs.length + 1 }]);
  const removeBand = (scaleKey: string, letter: string) =>
    setBands((bs) => bs.filter((b) => !(b.scaleKey === scaleKey && b.letter === letter)));
  const setLevel = (gradeLevel: string, patch: Partial<DescriptiveLevel>) =>
    setLevels((ls) => ls.map((l) => (l.gradeLevel === gradeLevel ? { ...l, ...patch } : l)));

  const bandsValid = bands.every((b) => b.letter.trim() && b.min >= 0 && b.min <= 100);
  const levelsValid = levels.every((l) => l.mode === 'numerical' || l.scaleKey);

  // Per-scale problems: a duplicate minimum is an overlap. A single band that
  // starts at 0 is the valid open-ended lowest band ("Below 75"), never a gap.
  // Ordering by descending min with distinct minimums leaves no hole, so
  // duplicate minimum is the only structural fault to block on.
  const scaleProblems = useMemo(() => {
    const out: string[] = [];
    for (const k of scaleKeys) {
      const mins = bands.filter((b) => b.scaleKey === k).map((b) => b.min);
      if (new Set(mins).size !== mins.length)
        out.push(`${SCALE_LABEL[k] ?? k}: two bands share the same minimum.`);
    }
    return out;
  }, [bands, scaleKeys]);
  const canSave = bandsValid && levelsValid && scaleProblems.length === 0;

  function cancel() {
    if (dirty && !window.confirm('Discard your changes to the descriptors?')) return;
    setBands(savedBands.map((x) => ({ ...x })));
    setLevels(savedLevels.map((x) => ({ ...x })));
    setEditing(false);
    setError(null);
  }

  async function commit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await saveDescriptorScales(sy, bands);
      await saveDescriptiveLevels(sy, levels);
      setSavedBands(bands.map((x) => ({ ...x })));
      setSavedLevels(levels.map((x) => ({ ...x })));
      setEditing(false);
      setConfirm(false);
      setNotice('Saved. Report cards for this school year now use the updated scales.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save. Your changes are still here.');
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Descriptors and Range' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Descriptors and Range</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            The letter scales shown on report cards and grade sheets — performance descriptors,
            attitude, deportment, and special program — and which levels show a letter instead of a
            number. This is display only; it never changes a computed grade. Each school year keeps
            its own copy.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sy}
            onChange={(e) => setSy(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
          >
            {years.map((y) => (
              <option key={y.code} value={y.code}>{y.code}{y.isActive ? ' (current)' : ''}</option>
            ))}
          </select>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={cancel} className="gap-2"><X className="w-3.5 h-3.5" /> Cancel</Button>
              <Button onClick={() => setConfirm(true)} disabled={!dirty || !canSave || saving} className="gap-2">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 text-[13px] text-ok-fg bg-ok-fg/10 border border-ok-fg/20 rounded-md px-3 py-2">{notice}</p>
      )}
      {editing && scaleProblems.length > 0 && (
        <div className="mb-4 rounded-md border border-nps-red/30 bg-nps-red/5 px-3 py-2.5 text-[12.5px] text-nps-red">
          {scaleProblems.map((p) => <div key={p}>{p}</div>)}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <>
          {/* Section 1 — the scales */}
          {scaleKeys.map((key) => {
            const scaleBands = bands.filter((b) => b.scaleKey === key);
            const r = ranges.get(key)!;
            return (
              <div key={key} className="mb-5">
                <h2 className="text-[15px] font-bold text-ink-primary">
                  {SCALE_LABEL[key] ?? key}
                </h2>
                {SCALE_NOTE[key] && (
                  <p className="text-[12px] text-ink-muted mb-1.5">{SCALE_NOTE[key]}</p>
                )}
                <SectionCard heading={`${scaleBands.length} bands`}>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                        <th className="py-2 pr-3 w-[14%]">Letter</th>
                        <th className="py-2 pr-3">Descriptive grade</th>
                        {editing && <th className="py-2 px-2 w-[16%] text-center">Minimum</th>}
                        <th className="py-2 pl-2 w-[18%] text-center">Numeric grade range</th>
                        {editing && <th className="py-2 w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {scaleBands.map((b) => (
                        <tr key={b.letter || Math.random()} className="border-b border-border-soft last:border-0">
                          <td className="py-2 pr-3">
                            {editing ? (
                              <Input value={b.letter} placeholder="e.g. A"
                                onChange={(e) => setBand(key, b.letter, { letter: e.target.value })} />
                            ) : <span className="font-medium tabular-nums">{b.letter}</span>}
                          </td>
                          <td className="py-2 pr-3">
                            {editing ? (
                              <Input value={b.label} placeholder="e.g. Advancing"
                                onChange={(e) => setBand(key, b.letter, { label: e.target.value })} />
                            ) : <span>{b.label}</span>}
                          </td>
                          {editing && (
                            <td className="py-2 px-2">
                              <Input type="number" min={0} max={100} value={b.min}
                                className="text-center tabular-nums"
                                onChange={(e) => setBand(key, b.letter, { min: Number(e.target.value) || 0 })} />
                            </td>
                          )}
                          <td className="py-2 pl-2 text-center tabular-nums text-ink-secondary">
                            {b.min === 0 && key === 'special_program'
                              ? `Below ${(r.get(b) ?? 0) + 1}`
                              : `${b.min}–${r.get(b) ?? 100}`}
                          </td>
                          {editing && (
                            <td className="py-2 text-right">
                              <button type="button" onClick={() => removeBand(key, b.letter)}
                                className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app" aria-label="Remove">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {editing && (
                    <div className="mt-3 px-1">
                      <Button variant="outline" size="sm" onClick={() => addBand(key)} className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add band
                      </Button>
                    </div>
                  )}
                </SectionCard>
              </div>
            );
          })}

          {/* Section 2 — which levels are descriptive */}
          <div className="mt-6 pt-6 border-t border-border">
            <h2 className="text-[15px] font-bold text-ink-primary mb-1">Descriptive vs numerical</h2>
            <p className="text-[12.5px] text-ink-secondary mb-2 max-w-[660px]">
              Choose how each level's report card reads. Descriptive levels use the scale you pick;
              Nursery and Kinder take the Preschool scale, Grade 1-3 the Grades 1-3 scale.
            </p>
            <SectionCard heading={`${levels.length} levels`}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-2 pr-3 w-[20%]">Level</th>
                    <th className="py-2 pr-3 w-[24%]">Report card shows</th>
                    <th className="py-2">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((l) => (
                    <tr key={l.gradeLevel} className="border-b border-border-soft last:border-0">
                      <td className="py-2 pr-3 text-ink-primary font-medium">{l.gradeLevel}</td>
                      <td className="py-2 pr-3">
                        <select value={l.mode} disabled={!editing}
                          onChange={(e) => setLevel(l.gradeLevel, { mode: e.target.value as DescriptiveLevel['mode'] })}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] disabled:opacity-70">
                          <option value="numerical">Numerical (a number)</option>
                          <option value="descriptive">Descriptive (a letter)</option>
                        </select>
                      </td>
                      <td className="py-2">
                        {l.mode === 'descriptive' ? (
                          <select value={l.scaleKey ?? ''} disabled={!editing}
                            onChange={(e) => setLevel(l.gradeLevel, { scaleKey: e.target.value })}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] disabled:opacity-70">
                            <option value="">Choose a scale…</option>
                            {/* Academic report-card scales only — not the conduct scales. */}
                            {['preschool', 'g1_3'].filter((k) => scaleKeys.includes(k)).map((k) => (
                              <option key={k} value={k}>{SCALE_LABEL[k] ?? k}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-ink-muted text-[12.5px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        </>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-ink-primary">Save the descriptors for SY {sy}?</h3>
            <p className="text-[13px] text-ink-secondary mt-2">
              These are labels only — no computed grade changes. But because a scale is not snapshotted
              per report card, an already-issued report card in SY {sy} will show the updated letters
              if it is printed again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button onClick={commit} disabled={saving}>{saving ? 'Saving…' : 'Save descriptors'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
