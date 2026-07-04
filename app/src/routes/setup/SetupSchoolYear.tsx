import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSchoolYears, listTermStatus, setTermStatus } from '@/lib/db';
import type { SchoolYear } from '@/types';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const TERM_DEFS = [
  { key: 'q1', label: 'Term 1' },
  { key: 'q2', label: 'Term 2' },
  { key: 'q3', label: 'Term 3' },
];
const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

export default function SetupSchoolYear() {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelected] = useState('');
  const [termStatus, setTermStatusState] = useState<Record<string, boolean>>({});
  const [savingTerm, setSavingTerm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSchoolYears();
        if (cancelled) return;
        setSchoolYears(rows);
        const a = rows.find((sy) => sy.isActive) ?? rows[0];
        if (a) setSelected(a.code);
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

  const active = schoolYears.find((sy) => sy.isActive) ?? schoolYears[0];

  useEffect(() => {
    if (!active?.code) return;
    let cancelled = false;
    listTermStatus(active.code)
      .then((m) => {
        if (!cancelled) setTermStatusState(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active?.code]);

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

  return (
    <>
      <Breadcrumb
        items={[{ label: 'Setup', to: '/setup' }, { label: 'School Year' }]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">School Year</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Configure SY date range, school days per month, and grade-encoding deadlines per quarter.
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
          <button
            key={sy.code}
            onClick={() => setSelected(sy.code)}
            className={[
              'px-3 py-1.5 rounded text-[12.5px] border',
              sy.isActive
                ? 'bg-accent text-white border-accent'
                : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
            ].join(' ')}
          >
            {sy.label}
            {sy.isActive && <CheckCircle2 className="w-3.5 h-3.5 inline-block ml-1.5 -translate-y-px" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 max-w-3xl">
        <SectionCard heading="Date range">
          <div className="grid grid-cols-2 gap-3 px-1">
            <label className="block">
              <span className="text-[12px] text-ink-secondary block mb-1">Start date</span>
              <Input type="date" defaultValue={active.startDate} />
            </label>
            <label className="block">
              <span className="text-[12px] text-ink-secondary block mb-1">End date</span>
              <Input type="date" defaultValue={active.endDate} />
            </label>
          </div>
        </SectionCard>

        <SectionCard heading="School days per month">
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Leave a month blank if there are no class days. Only the months you
            fill in appear on the report card, and their total is the encoded
            number of school days.
          </p>
          <div className="grid grid-cols-6 gap-2 px-1">
            {MONTHS.map((m) => (
              <label key={m} className="block">
                <span className="text-[11px] text-ink-secondary block mb-0.5">{m}</span>
                <Input type="number" min={0} max={31} placeholder="—" />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard heading="Grade-encoding deadlines">
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Enter the last day of encoding for each term. Setting a deadline
            opens encoding for that entire term — teachers can start right away.
            Leave blank to keep a term closed.
          </p>
          <div className="grid grid-cols-2 gap-3 px-1">
            {TERMS.map((t) => (
              <label key={t} className="block">
                <span className="text-[12px] text-ink-secondary block mb-1">{t} — encoding deadline</span>
                <Input type="date" />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard heading="Encoding status">
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Open or close grade encoding per term. When a term is closed, teachers can still
            view but cannot save grades — use this to finalize honors, then reopen for the next
            term. Terms are open by default.
          </p>
          <div className="grid grid-cols-3 gap-3 px-1">
            {TERM_DEFS.map((t) => {
              const open = termStatus[t.key] ?? true;
              return (
                <div
                  key={t.key}
                  className="flex items-center justify-between bg-app border border-border-soft rounded px-3 py-2"
                >
                  <div>
                    <div className="text-[12.5px] font-medium text-ink-primary">{t.label}</div>
                    <div className={`text-[11px] font-semibold ${open ? 'text-ok-fg' : 'text-nps-red'}`}>
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

        <div className="flex gap-2 justify-end">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </div>
      </>
      )}
    </>
  );
}
