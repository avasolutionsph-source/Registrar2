import { useEffect, useMemo, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
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
  preschool: 'Preschool (Nursery & Kinder)',
  g1_3: 'Grades 1-3',
  deportment: 'Deportment (encoded by the class adviser)',
  special_program: 'Special Program (encoded by the class adviser)',
};
// Academic descriptors top out at 100; the conduct scales at 99 (there is no
// 100 in either). The ceiling only affects the read-only Range column.
const SCALE_MAX: Record<string, number> = { deportment: 99, special_program: 99 };

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSy = useMemo(() => years.find((y) => y.isActive)?.code ?? '', [years]);
  const isPast = !!sy && !!activeSy && sy < activeSy;

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
    (async () => {
      try {
        const [b, l] = await Promise.all([listDescriptorScales(sy), listDescriptiveLevels(sy)]);
        if (cancelled) return;
        setBands(b);
        setLevels(l);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load descriptors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const scaleKeys = useMemo(
    () => [...new Set(bands.map((b) => b.scaleKey))],
    [bands],
  );
  const ranges = useMemo(() => {
    const m = new Map<string, ReturnType<typeof rangesFor>>();
    for (const k of scaleKeys) m.set(k, rangesFor(bands.filter((b) => b.scaleKey === k), SCALE_MAX[k] ?? 100));
    return m;
  }, [bands, scaleKeys]);

  const setBand = (scaleKey: string, letter: string, patch: Partial<DescriptorBand>) => {
    setBands((bs) => bs.map((b) => (b.scaleKey === scaleKey && b.letter === letter ? { ...b, ...patch } : b)));
    setSaved(false);
  };
  const addBand = (scaleKey: string) => {
    setBands((bs) => [...bs, { scaleKey, letter: '', label: '', min: 0, sortOrder: bs.length + 1 }]);
    setSaved(false);
  };
  const removeBand = (scaleKey: string, letter: string) => {
    setBands((bs) => bs.filter((b) => !(b.scaleKey === scaleKey && b.letter === letter)));
    setSaved(false);
  };
  const setLevel = (gradeLevel: string, patch: Partial<DescriptiveLevel>) => {
    setLevels((ls) => ls.map((l) => (l.gradeLevel === gradeLevel ? { ...l, ...patch } : l)));
    setSaved(false);
  };

  const bandsValid = bands.every((b) => b.letter.trim() && b.min >= 0 && b.min <= 100);
  const levelsValid = levels.every((l) => l.mode === 'numerical' || l.scaleKey);

  async function save() {
    if (!bandsValid || !levelsValid) return;
    setSaving(true);
    setError(null);
    try {
      await saveDescriptorScales(sy, bands);
      await saveDescriptiveLevels(sy, levels);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Report Card Descriptors' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Report Card Descriptors</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            How grades are shown on the report card — never how they are computed. Set the
            descriptor scales and pick which levels show a letter instead of a number. Each school
            year keeps its own copy.
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
          {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!bandsValid || !levelsValid || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {isPast && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
          SY {sy} has ended. Editing here re-labels its report cards — change the next school year
          instead unless you are fixing a mistake.
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
                <h2 className="text-[15px] font-bold text-ink-primary mb-1">
                  {SCALE_LABEL[key] ?? key} scale
                </h2>
                <SectionCard heading={`${scaleBands.length} bands`}>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                        <th className="py-2 pr-3 w-[14%]">Letter</th>
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 px-2 w-[16%] text-center">Minimum</th>
                        <th className="py-2 pl-2 w-[16%] text-center">Range</th>
                        <th className="py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {scaleBands.map((b) => (
                        <tr key={b.letter || Math.random()} className="border-b border-border-soft last:border-0">
                          <td className="py-2 pr-3">
                            <Input value={b.letter} placeholder="e.g. A"
                              onChange={(e) => setBand(key, b.letter, { letter: e.target.value })} />
                          </td>
                          <td className="py-2 pr-3">
                            <Input value={b.label} placeholder="e.g. Advancing"
                              onChange={(e) => setBand(key, b.letter, { label: e.target.value })} />
                          </td>
                          <td className="py-2 px-2">
                            <Input type="number" min={0} max={100} value={b.min}
                              className="text-center tabular-nums"
                              onChange={(e) => setBand(key, b.letter, { min: Number(e.target.value) || 0 })} />
                          </td>
                          <td className="py-2 pl-2 text-center tabular-nums text-ink-secondary">
                            {b.min}–{r.get(b) ?? 100}
                          </td>
                          <td className="py-2 text-right">
                            <button type="button" onClick={() => removeBand(key, b.letter)}
                              className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app" aria-label="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 px-1">
                    <Button variant="outline" size="sm" onClick={() => addBand(key)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add band
                    </Button>
                  </div>
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
                        <select value={l.mode}
                          onChange={(e) => setLevel(l.gradeLevel, { mode: e.target.value as DescriptiveLevel['mode'] })}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px]">
                          <option value="numerical">Numerical (a number)</option>
                          <option value="descriptive">Descriptive (a letter)</option>
                        </select>
                      </td>
                      <td className="py-2">
                        {l.mode === 'descriptive' ? (
                          <select value={l.scaleKey ?? ''}
                            onChange={(e) => setLevel(l.gradeLevel, { scaleKey: e.target.value })}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px]">
                            <option value="">Choose a scale…</option>
                            {scaleKeys.map((k) => (
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
    </>
  );
}
