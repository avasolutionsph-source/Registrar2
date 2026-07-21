import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSchoolYears,
  getGradingPolicy,
  saveGradingPolicy,
  defaultGradingPolicy,
  type GradingPolicy,
} from '@/lib/db';
import type { SchoolYear } from '@/types';

// Setup → Promotion & Grading Rules. The grading constants that used to live
// only in code, now configurable per school year: the passing grade, how many
// failures still allow remediation, General-Average rounding, the descriptive→
// numerical grade-level cut, and the honor coverage/regime/tiers. Each field's
// default equals its old hardcoded value, so leaving a year untouched keeps the
// exact prior behaviour. Per school year, so changing next year never re-grades
// a past one.

const same = (a: GradingPolicy, b: GradingPolicy) =>
  (Object.keys(a) as (keyof GradingPolicy)[]).every((k) => a[k] === b[k]);

export default function SetupGradingPolicy() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [form, setForm] = useState<GradingPolicy>(defaultGradingPolicy());
  const [saved0, setSaved0] = useState<GradingPolicy>(defaultGradingPolicy());
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
        const p = await getGradingPolicy(sy);
        if (cancelled) return;
        setForm(p);
        setSaved0(p);
        setSaved(false);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the policy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const dirty = !same(form, saved0);
  const activeSy = useMemo(() => years.find((y) => y.isActive)?.code ?? '', [years]);

  const set = <K extends keyof GradingPolicy>(k: K, v: GradingPolicy[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const num = (k: keyof GradingPolicy) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (Number(e.target.value) || 0) as GradingPolicy[typeof k]);

  const valid =
    form.passingGrade >= 0 && form.passingGrade <= 100 &&
    form.remedialMaxFails >= 0 && form.remedialMaxFails <= 20 &&
    form.gaDecimals >= 0 && form.gaDecimals <= 4 &&
    form.tiebreakDecimals >= 0 && form.tiebreakDecimals <= 6 &&
    form.numericalFloor >= 1 && form.numericalFloor <= 12 &&
    form.honorMinGrade >= 1 && form.honorMinGrade <= 12 &&
    [form.tierWith, form.tierHigh, form.tierHighest].every((n) => n >= 0 && n <= 100);

  async function save() {
    if (!valid || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await saveGradingPolicy(sy, form);
      setSaved0(form);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  const numCls = 'text-center tabular-nums';

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Promotion & Grading Rules' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Promotion &amp; Grading Rules</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            The grading rules that used to be fixed in code — now set per school year. Each field
            defaults to the standard DepEd value; change it only when policy changes. A past year
            keeps its own rules.
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
          These rules drive Passed/Failed, promotion, averages and honors for the current year (SY {sy}).
          Change them carefully.
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <div className="space-y-4">
          <SectionCard heading="Promotion">
            <div className="grid sm:grid-cols-2 gap-5 max-w-[560px]">
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">Passing grade</div>
                <Input type="number" min={0} max={100} value={form.passingGrade}
                  className={numCls} onChange={num('passingGrade')} />
                <p className="text-[12px] text-ink-muted mt-1">A final grade at least this is “Passed”. (DepEd 75)</p>
              </label>
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">Failures allowed for remedial</div>
                <Input type="number" min={0} max={20} value={form.remedialMaxFails}
                  className={numCls} onChange={num('remedialMaxFails')} />
                <p className="text-[12px] text-ink-muted mt-1">Up to this many failed areas → Remedial; more → Retained. (2)</p>
              </label>
            </div>
          </SectionCard>

          <SectionCard heading="Averaging">
            <div className="grid sm:grid-cols-2 gap-5 max-w-[560px]">
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">General-Average decimals</div>
                <Input type="number" min={0} max={4} value={form.gaDecimals}
                  className={numCls} onChange={num('gaDecimals')} />
                <p className="text-[12px] text-ink-muted mt-1">Decimals on the reported GA. (0 = whole number)</p>
              </label>
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">Ranking tiebreak decimals</div>
                <Input type="number" min={0} max={6} value={form.tiebreakDecimals}
                  className={numCls} onChange={num('tiebreakDecimals')} />
                <p className="text-[12px] text-ink-muted mt-1">Decimals kept to break whole-number ties. (2)</p>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-[13px] cursor-pointer w-fit">
              <input type="checkbox" checked={form.roundIgBeforeTransmute}
                onChange={(e) => set('roundIgBeforeTransmute', e.target.checked)} />
              <span className="text-ink-primary">Round the Initial Grade before transmutation</span>
            </label>
            <p className="text-[12px] text-ink-muted mt-1">NPS rounds the Initial Grade to a whole number, then looks it up on the transmutation table. (on)</p>
          </SectionCard>

          <SectionCard heading="Grade-level coverage">
            <div className="grid sm:grid-cols-2 gap-5 max-w-[560px]">
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">First numerical grade level</div>
                <Input type="number" min={1} max={12} value={form.numericalFloor}
                  className={numCls} onChange={num('numericalFloor')} />
                <p className="text-[12px] text-ink-muted mt-1">This grade &amp; up use numerical marks; below it is descriptive (MATATAG). Kinder/Nursery stay descriptive.</p>
              </label>
              <label className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">Lowest honor-eligible grade</div>
                <Input type="number" min={1} max={12} value={form.honorMinGrade}
                  className={numCls} onChange={num('honorMinGrade')} />
                <p className="text-[12px] text-ink-muted mt-1">Only this grade &amp; up may receive the Academic Excellence Award.</p>
              </label>
            </div>
          </SectionCard>

          <SectionCard heading="Honor regime (older years)">
            <label className="text-[13px] block max-w-[280px]">
              <div className="font-medium text-ink-primary mb-1">Honor regime</div>
              <select value={form.honorRegime}
                onChange={(e) => set('honorRegime', e.target.value === 'tiered' ? 'tiered' : 'excellence')}
                className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[13px]">
                <option value="excellence">Academic Excellence Award (GA + floor, no ranking)</option>
                <option value="tiered">Tiered honors (With / High / Highest)</option>
              </select>
              <p className="text-[12px] text-ink-muted mt-1">SY 2026-2027 onward uses the flat Excellence Award. Tiers apply only under the older regime.</p>
            </label>
            {form.honorRegime === 'tiered' && (
              <div className="grid sm:grid-cols-3 gap-5 max-w-[560px] mt-4">
                <label className="text-[13px]">
                  <div className="font-medium text-ink-primary mb-1">With Honors GA</div>
                  <Input type="number" min={0} max={100} value={form.tierWith}
                    className={numCls} onChange={num('tierWith')} />
                </label>
                <label className="text-[13px]">
                  <div className="font-medium text-ink-primary mb-1">High Honors GA</div>
                  <Input type="number" min={0} max={100} value={form.tierHigh}
                    className={numCls} onChange={num('tierHigh')} />
                </label>
                <label className="text-[13px]">
                  <div className="font-medium text-ink-primary mb-1">Highest Honors GA</div>
                  <Input type="number" min={0} max={100} value={form.tierHighest}
                    className={numCls} onChange={num('tierHighest')} />
                </label>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}
