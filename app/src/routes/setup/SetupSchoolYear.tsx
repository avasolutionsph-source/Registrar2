import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSchoolYears,
  listTermStatus,
  setTermStatus,
  listTermDeadlines,
  setTermDeadline,
  updateSchoolYear,
} from '@/lib/db';
import type { SchoolYear } from '@/types';

const TERM_DEFS = [
  { key: 'q1', label: 'Term 1' },
  { key: 'q2', label: 'Term 2' },
  { key: 'q3', label: 'Term 3' },
];
const MONTHS = [
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dec' },
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Apr' },
  { key: 'may', label: 'May' },
];

export default function SetupSchoolYear() {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [termStatus, setTermStatusState] = useState<Record<string, boolean>>({});
  const [savingTerm, setSavingTerm] = useState<string | null>(null);

  // editable form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<Record<string, string>>({});
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = schoolYears.find((sy) => sy.isActive) ?? schoolYears[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSchoolYears();
        if (!cancelled) setSchoolYears(rows);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // (re)load the active SY's editable values + term open/close + deadlines.
  const loadForActive = useCallback(async () => {
    if (!active?.code) return;
    setStartDate(active.startDate ?? '');
    setEndDate(active.endDate ?? '');
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(active.schoolDays ?? {})) d[k] = String(v);
    setDays(d);
    setSaved(false);
    setError(null);
    try {
      const [status, dl] = await Promise.all([
        listTermStatus(active.code),
        listTermDeadlines(active.code),
      ]);
      setTermStatusState(status);
      setDeadlines(dl);
    } catch {
      /* ignore */
    }
  }, [active?.code, active?.startDate, active?.endDate, active?.schoolDays]);

  useEffect(() => {
    void loadForActive();
  }, [loadForActive]);

  async function toggleTerm(key: string) {
    if (!active) return;
    const next = !(termStatus[key] ?? true);
    setSavingTerm(key);
    try {
      await setTermStatus(active.code, key, next);
      setTermStatusState((s) => ({ ...s, [key]: next }));
    } catch {
      /* ignore — leave as-is for retry */
    } finally {
      setSavingTerm(null);
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const schoolDays: Record<string, number> = {};
      for (const { key } of MONTHS) {
        const n = parseInt(days[key] ?? '', 10);
        if (Number.isFinite(n) && n > 0) schoolDays[key] = n;
      }
      await updateSchoolYear(active.code, { startDate, endDate, schoolDays });
      for (const t of TERM_DEFS) {
        await setTermDeadline(active.code, t.key, deadlines[t.key] || null);
      }
      // reflect saved values locally + reload term status (deadlines may open terms)
      setSchoolYears((prev) =>
        prev.map((sy) =>
          sy.code === active.code ? { ...sy, startDate, endDate, schoolDays } : sy,
        ),
      );
      try {
        setTermStatusState(await listTermStatus(active.code));
      } catch {
        /* ignore */
      }
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error && /column .*does not exist|school_days|deadline/i.test(e.message)
          ? 'Run setup-school-year-config.sql in Supabase first, then try again.'
          : 'Could not save. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'School Year' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">School Year</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Configure SY date range, school days per month, and grade-encoding deadlines per term.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : !active ? (
        <p className="text-[13px] text-ink-secondary">No school years configured yet.</p>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {schoolYears.map((sy) => (
              <span
                key={sy.code}
                className={[
                  'px-3 py-1.5 rounded text-[12.5px] border',
                  sy.isActive
                    ? 'bg-accent text-white border-accent'
                    : 'bg-panel text-ink-secondary border-border',
                ].join(' ')}
              >
                {sy.label}
                {sy.isActive && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline-block ml-1.5 -translate-y-px" />
                )}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3.5 max-w-3xl">
            <SectionCard heading="Date range">
              <div className="grid grid-cols-2 gap-3 px-1">
                <label className="block">
                  <span className="text-[12px] text-ink-secondary block mb-1">Start date</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] text-ink-secondary block mb-1">End date</span>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
              </div>
            </SectionCard>

            <SectionCard heading="School days per month">
              <p className="text-[11.5px] text-ink-muted mb-2 px-1">
                Leave a month blank if there are no class days. Only the months you fill in appear
                on the report card, and their total is the encoded number of school days.
              </p>
              <div className="grid grid-cols-6 gap-2 px-1">
                {MONTHS.map((m) => (
                  <label key={m.key} className="block">
                    <span className="text-[11px] text-ink-secondary block mb-0.5">{m.label}</span>
                    <Input
                      type="number"
                      min={0}
                      max={31}
                      placeholder="—"
                      value={days[m.key] ?? ''}
                      onChange={(e) => setDays((d) => ({ ...d, [m.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard heading="Grade-encoding deadlines">
              <p className="text-[11.5px] text-ink-muted mb-2 px-1">
                Enter the last day of encoding for each term. Setting a deadline opens encoding for
                that entire term — teachers can start right away. Leave blank to keep a term closed.
              </p>
              <div className="grid grid-cols-2 gap-3 px-1">
                {TERM_DEFS.map((t) => (
                  <label key={t.key} className="block">
                    <span className="text-[12px] text-ink-secondary block mb-1">
                      {t.label} — encoding deadline
                    </span>
                    <Input
                      type="date"
                      value={deadlines[t.key] ?? ''}
                      onChange={(e) =>
                        setDeadlines((d) => ({ ...d, [t.key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard heading="Encoding status">
              <p className="text-[11.5px] text-ink-muted mb-2 px-1">
                Open or close grade encoding per term. When a term is closed, teachers can still
                view but cannot save grades — use this to finalize honors, then reopen for the next
                term. Terms are CLOSED by default; setting a deadline above opens that term, or
                open it here manually.
              </p>
              <div className="grid grid-cols-3 gap-3 px-1">
                {TERM_DEFS.map((t) => {
                  const open = termStatus[t.key] ?? false;
                  return (
                    <div
                      key={t.key}
                      className="flex items-center justify-between bg-app border border-border-soft rounded px-3 py-2"
                    >
                      <div>
                        <div className="text-[12.5px] font-medium text-ink-primary">{t.label}</div>
                        <div
                          className={`text-[11px] font-semibold ${open ? 'text-ok-fg' : 'text-nps-red'}`}
                        >
                          {open ? 'Open' : 'Closed'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingTerm === t.key}
                        onClick={() => toggleTerm(t.key)}
                      >
                        {savingTerm === t.key ? '…' : open ? 'Close' : 'Open'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <div className="flex items-center gap-3 justify-end">
              {error && <span className="text-[12px] text-nps-red">{error}</span>}
              {saved && !error && (
                <span className="text-[12px] text-ok-fg inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <Button variant="outline" onClick={() => void loadForActive()} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
