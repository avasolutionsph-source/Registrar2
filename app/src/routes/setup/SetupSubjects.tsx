import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { listSubjects, saveSubjectOrder } from '@/lib/db';
import type { SubjectCategory, Subject } from '@/types';

const toneFor = (cat: SubjectCategory): 'ok' | 'pending' | 'na' =>
  cat === 'Core' ? 'ok' : cat === 'Specialized' ? 'pending' : 'na';

export default function SetupSubjects() {
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSubjects();
        if (!cancelled) setList(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load subjects.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    setList((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveSubjectOrder(list.map((s) => s.code));
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Subjects' }]} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Subjects — Order</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[560px]">
            This order is followed everywhere subjects are listed — the grade sheet, Report Card (SF 9),
            and Form 137. Use the arrows to arrange them, then Save.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!dirty || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save order'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <SectionCard heading={loading ? 'Loading…' : `${list.length} subjects`}>
        {loading ? (
          <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
        ) : (
          <ul className="flex flex-col">
            {list.map((s, i) => (
              <li
                key={s.code}
                className="flex items-center gap-3 border-b border-border-soft last:border-0 py-1.5 px-1"
              >
                <span className="w-7 text-right text-[11.5px] tabular-nums text-ink-muted">{i + 1}</span>
                <span className="font-mono text-[12px] text-ink-secondary w-16">{s.code}</span>
                <span className="flex-1 text-[13px] text-ink-primary truncate">{s.fullName}</span>
                <StatusBadge tone={toneFor(s.category)}>{s.category}</StatusBadge>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-app disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === list.length - 1}
                    aria-label="Move down"
                    className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-app disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
