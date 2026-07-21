import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSchoolYears, getHonorCriteria, saveHonorCriteria } from '@/lib/db';
import type { SchoolYear } from '@/types';

// Setup → Honor Criteria. The Academic Excellence Award thresholds — the
// minimum General Average, and the per-subject floor no learning-area grade may
// fall below. Per school year, so changing next year never re-judges a past
// award. Award tiers and coverage stay in code.

export default function SetupHonorCriteria() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [gaMin, setGaMin] = useState(90);
  const [floor, setFloor] = useState(80);
  const [savedVal, setSavedVal] = useState({ gaMin: 90, floor: 80 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    (async () => {
      try {
        const c = await getHonorCriteria(sy);
        if (cancelled) return;
        setGaMin(c.gaMin);
        setFloor(c.floor);
        setSavedVal(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the criteria.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const dirty = gaMin !== savedVal.gaMin || floor !== savedVal.floor;
  const valid = gaMin >= 0 && gaMin <= 100 && floor >= 0 && floor <= 100;

  async function save() {
    if (!valid || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await saveHonorCriteria(sy, gaMin, floor);
      setSavedVal({ gaMin, floor });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  const activeSy = useMemo(() => years.find((y) => y.isActive)?.code ?? '', [years]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Honor Criteria' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Honor Criteria</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[660px]">
            Who qualifies for the Academic Excellence Award: a General Average of at least the
            minimum, with no learning-area grade below the floor. Awardees are listed
            alphabetically. Each school year keeps its own criteria.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={sy} onChange={(e) => setSy(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]">
            {years.map((y) => (
              <option key={y.code} value={y.code}>{y.code}{y.isActive ? ' (current)' : ''}</option>
            ))}
          </select>
          {saved && !dirty && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!valid || !dirty || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}
      {sy && sy === activeSy && dirty && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
          Changing the current year re-decides who qualifies for SY {sy}.
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading={`Academic Excellence Award · SY ${sy}`}>
          <div className="grid sm:grid-cols-2 gap-5 max-w-[560px]">
            <label className="text-[13px]">
              <div className="font-medium text-ink-primary mb-1">Minimum General Average</div>
              <Input type="number" min={0} max={100} value={gaMin}
                className="text-center tabular-nums"
                onChange={(e) => setGaMin(Number(e.target.value) || 0)} />
              <p className="text-[12px] text-ink-muted mt-1">GA must reach this to qualify.</p>
            </label>
            <label className="text-[13px]">
              <div className="font-medium text-ink-primary mb-1">Grade floor</div>
              <Input type="number" min={0} max={100} value={floor}
                className="text-center tabular-nums"
                onChange={(e) => setFloor(Number(e.target.value) || 0)} />
              <p className="text-[12px] text-ink-muted mt-1">No learning-area grade may fall below this.</p>
            </label>
          </div>
          <p className="mt-4 text-[12.5px] text-ink-secondary">
            A learner qualifies when their General Average is at least{' '}
            <span className="font-semibold tabular-nums">{gaMin}</span> and every learning-area grade
            is at least <span className="font-semibold tabular-nums">{floor}</span>.
          </p>
        </SectionCard>
      )}
    </>
  );
}
