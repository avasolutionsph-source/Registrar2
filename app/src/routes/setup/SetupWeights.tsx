import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  AREA_GROUPS,
  AREA_GROUP_LABEL,
  DEPED_DEFAULT_WEIGHTS,
  DEFAULT_ATTITUDE_SCALE,
  classifyArea,
  type AreaGroup,
  type Weights,
  type AttitudeBand,
} from '@/lib/grading';
import {
  listWeightConfig,
  saveWeightConfig,
  listAttitudeScale,
  saveAttitudeScale,
  listSubjects,
  type WeightConfig,
} from '@/lib/db';
import type { Subject } from '@/types';

type Component = keyof Weights; // 'ww' | 'pt' | 'st'
const COMPONENTS: { key: Component; label: string }[] = [
  { key: 'ww', label: 'WWs' }, // Written & Oral Works
  { key: 'pt', label: 'PTs' }, // Performance Tasks
  { key: 'st', label: 'EXs' }, // Summative Tests & Term Examination
];

const sumOf = (w: Weights) => w.ww + w.pt + w.st;

export default function SetupWeights() {
  const [config, setConfig] = useState<WeightConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attitude, setAttitude] = useState<AttitudeBand[]>([]);
  const [attSaving, setAttSaving] = useState(false);
  const [attSaved, setAttSaved] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Group the real subject catalog under each weight group (detailed, read-only
  // breakdown — the WW/PT/Exam split is still shared per group).
  const subjectsByGroup = useMemo(() => {
    const map = {} as Record<AreaGroup, string[]>;
    for (const g of AREA_GROUPS) map[g] = [];
    for (const s of subjects) {
      const g = classifyArea({ code: s.code, fullName: s.fullName, category: s.category });
      const name = s.fullName || s.code;
      if (!map[g].includes(name)) map[g].push(name);
    }
    return map;
  }, [subjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, att, subs] = await Promise.all([
          listWeightConfig(),
          listAttitudeScale(),
          listSubjects(),
        ]);
        if (cancelled) return;
        setConfig(c);
        setAttitude(att);
        setSubjects(subs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the configuration.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setValue = (group: AreaGroup, comp: Component, value: number) => {
    setConfig((c) => (c ? { ...c, [group]: { ...c[group], [comp]: value } } : c));
    setSaved(false);
  };

  const restoreDefaults = () => {
    setConfig({ ...DEPED_DEFAULT_WEIGHTS });
    setSaved(false);
  };

  const allValid = config != null && AREA_GROUPS.every((g) => sumOf(config[g]) === 100);

  async function save() {
    if (!config || !allValid) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeightConfig(config);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the weights.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Grade Weights' }]} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Grade Weights</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[640px]">
            The WW / PT / Exam split used to compute every grade. Pre-filled with the DepEd
            defaults — change a group only if your school uses a different split. Each group must
            total <span className="font-semibold">100%</span>. The subjects under each group are
            listed for reference; the split is shared by every subject in the group. To add a
            subject, use{' '}
            <Link to="/setup/subjects" className="text-accent underline">
              Setup → Subjects
            </Link>{' '}
            — it appears here under its group automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button variant="outline" onClick={restoreDefaults} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> DepEd defaults
          </Button>
          <Button onClick={save} disabled={!allValid || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save weights'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
        <span className="font-semibold">The grade split has moved.</span> Grades are now computed
        from the WWs / PTs / EXs-QA split per SUBJECT TYPE, per school year — edit it in{' '}
        <Link to="/setup/weight-components" className="underline font-semibold">
          Setup → Weight Components
        </Link>
        . The learning-area groups below no longer drive any computation and are kept only for
        reference; the attitude scale further down is still live.
      </div>

      {loading || !config ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading={`${AREA_GROUPS.length} learning-area groups (reference only)`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3">Learning-area group</th>
                {COMPONENTS.map((c) => (
                  <th key={c.key} className="py-2 px-2 w-[16%] text-center">
                    {c.label}
                  </th>
                ))}
                <th className="py-2 pl-2 w-[10%] text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {AREA_GROUPS.map((g) => {
                const total = sumOf(config[g]);
                const ok = total === 100;
                const members = subjectsByGroup[g] ?? [];
                return (
                  <tr key={g} className="border-b border-border-soft last:border-0 align-top">
                    <td className="py-2 pr-3 text-ink-primary">
                      <div className="font-medium">{AREA_GROUP_LABEL[g]}</div>
                      {members.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {members.map((name) => (
                            <span
                              key={name}
                              className="inline-block rounded bg-app border border-border-soft px-1.5 py-0.5 text-[11px] text-ink-secondary"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-ink-muted italic">
                          No subjects in this group yet.
                        </div>
                      )}
                    </td>
                    {COMPONENTS.map((c) => (
                      <td key={c.key} className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={config[g][c.key]}
                          onChange={(e) => setValue(g, c.key, Number(e.target.value) || 0)}
                          className="text-center tabular-nums"
                        />
                      </td>
                    ))}
                    <td
                      className={`py-2 pl-2 text-center font-semibold tabular-nums ${
                        ok ? 'text-ok-fg' : 'text-nps-red'
                      }`}
                    >
                      {total}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!allValid && (
            <p className="mt-3 px-1 text-[12.5px] text-nps-red">
              Each group must total exactly 100% before you can save.
            </p>
          )}
        </SectionCard>
      )}

      {!loading && config && (
        <div className="mt-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-ink-primary">Attitude → Letter</h2>
              <p className="text-[12.5px] text-ink-secondary mt-0.5 max-w-[620px]">
                The attitude column on the grade sheet is encoded as a number, then shown as a
                letter using this scale. A score matches the highest band whose minimum it reaches.
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
                  <th className="py-2 pr-3 w-[16%]">Letter</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 px-2 w-[20%] text-center">Minimum score</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {attitude.map((b, i) => (
                  <tr key={i} className="border-b border-border-soft last:border-0">
                    <td className="py-2 pr-3">
                      <Input
                        value={b.letter}
                        placeholder="e.g. O"
                        onChange={(e) => setBand(i, { letter: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={b.label}
                        placeholder="e.g. Outstanding"
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
      )}
    </>
  );
}
