import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  AREA_GROUPS,
  AREA_GROUP_LABEL,
  DEPED_DEFAULT_WEIGHTS,
  type AreaGroup,
  type Weights,
} from '@/lib/grading';
import { listWeightConfig, saveWeightConfig, type WeightConfig } from '@/lib/db';

type Component = keyof Weights; // 'ww' | 'pt' | 'st'
const COMPONENTS: { key: Component; label: string }[] = [
  { key: 'ww', label: 'Written Works' },
  { key: 'pt', label: 'Performance Tasks' },
  { key: 'st', label: 'Quarterly / Summative Exam' },
];

const sumOf = (w: Weights) => w.ww + w.pt + w.st;

export default function SetupWeights() {
  const [config, setConfig] = useState<WeightConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await listWeightConfig();
        if (!cancelled) setConfig(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the weights.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[620px]">
            The WW / PT / Exam split used to compute every grade. Pre-filled with the DepEd
            defaults — change a group only if your school uses a different split. Each group must
            total <span className="font-semibold">100%</span>.
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

      {loading || !config ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading={`${AREA_GROUPS.length} learning-area groups`}>
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
                return (
                  <tr key={g} className="border-b border-border-soft last:border-0">
                    <td className="py-2 pr-3 text-ink-primary">{AREA_GROUP_LABEL[g]}</td>
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
    </>
  );
}
