import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save, X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSchoolYears, listTransmutation, saveTransmutation, type TransmuteRow } from '@/lib/db';
import type { SchoolYear } from '@/types';

// Setup → Transmutation Table. The Initial Grade → transmuted grade lookup
// (DepEd DO 15 s.2026). EVERY computed grade passes through this, so the page is
// read-only by default, validates hard, and confirms before saving. Each school
// year keeps its own copy, so editing next year never re-grades a past one.

const sortByMin = (rs: TransmuteRow[]) => [...rs].sort((a, b) => b.min - a.min);

export default function SetupTransmutation() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [sy, setSy] = useState('');
  const [saved, setSaved] = useState<TransmuteRow[]>([]);
  const [draft, setDraft] = useState<TransmuteRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const activeSy = useMemo(() => years.find((y) => y.isActive)?.code ?? '', [years]);

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
        const t = await listTransmutation(sy);
        if (cancelled) return;
        setSaved(t);
        setDraft(t.map((r) => ({ ...r })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the table.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sy]);

  const dirty = useMemo(
    () => JSON.stringify(sortByMin(draft)) !== JSON.stringify(sortByMin(saved)),
    [draft, saved],
  );

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  // Same checks the save enforces, surfaced live so the registrar sees why Save
  // is disabled.
  const problems = useMemo(() => {
    const p: string[] = [];
    if (!draft.length) p.push('The table cannot be empty.');
    const mins = draft.map((r) => r.min);
    if (new Set(mins).size !== mins.length) p.push('Two bands share the same minimum score.');
    if (!draft.some((r) => r.min === 0)) p.push('A band must start at 0 so every score is covered.');
    if (draft.some((r) => r.min < 0 || r.min > 100)) p.push('Every minimum must be 0–100.');
    if (draft.some((r) => r.grade < 0 || r.grade > 100)) p.push('Every transmuted grade must be 0–100.');
    return p;
  }, [draft]);
  const valid = problems.length === 0;

  const rows = sortByMin(draft);
  // Boundary step between adjacent bands: whole-number tables run in steps of
  // 1; the official DepEd decimal table (99.50-100.00 -> 100, ...) runs in
  // steps of 0.01. Derived from the data so both table styles display right.
  const step = rows.some((r) => r.min > 0 && !Number.isInteger(r.min)) ? 0.01 : 1;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const upToOf = (i: number) => round2(rows[i - 1].min - step);
  const setRow = (min: number, patch: Partial<TransmuteRow>) =>
    setDraft((rs) => rs.map((r) => (r.min === min ? { ...r, ...patch } : r)));
  // -1 = new, registrar sets it. One unset row at a time: rows are keyed by
  // their minimum, so two rows both at -1 would edit (and render) as one.
  const addRow = () =>
    setDraft((rs) => (rs.some((r) => r.min === -1) ? rs : [...rs, { min: -1, grade: 60 }]));
  const removeRow = (min: number) => setDraft((rs) => rs.filter((r) => r.min !== min));

  function cancel() {
    if (dirty && !window.confirm('Discard your changes to the transmutation table?')) return;
    setDraft(saved.map((r) => ({ ...r })));
    setEditing(false);
    setError(null);
  }

  async function commit() {
    setSaving(true);
    setError(null);
    try {
      await saveTransmutation(sy, draft, `Edited for SY ${sy}`);
      const fresh = await listTransmutation(sy);
      setSaved(fresh);
      setDraft(fresh.map((r) => ({ ...r })));
      setEditing(false);
      setConfirm(false);
      setNotice('Saved. Grades in this school year will use the new table.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save. Your changes are still here.');
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Transmutation Table' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Transmutation Table</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            The Initial Grade → transmuted grade lookup (DepEd DO 15, s.2026). Every computed grade
            passes through it. A band runs from its minimum up to one below the next band's, matched
            highest first. Each school year keeps its own copy.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={sy} onChange={(e) => setSy(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]">
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
              <Button onClick={() => setConfirm(true)} disabled={!dirty || !valid || saving} className="gap-2">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}
      {notice && <p className="mb-3 text-[13px] text-ok-fg bg-ok-fg/10 border border-ok-fg/20 rounded-md px-3 py-2">{notice}</p>}

      {editing && sy === activeSy && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You are editing the <span className="font-semibold">current</span> school year. Saving
            re-grades every learner in SY {sy} the next time their sheet is opened.</span>
        </div>
      )}
      {editing && problems.length > 0 && (
        <div className="mb-4 rounded-md border border-nps-red/30 bg-nps-red/5 px-3 py-2.5 text-[12.5px] text-nps-red">
          {problems.map((p) => <div key={p}>{p}</div>)}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading={`${rows.length} bands · SY ${sy}`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3 w-[24%]">Initial grade from</th>
                <th className="py-2 pr-3 w-[24%]">up to</th>
                <th className="py-2 pr-3">Transmuted grade</th>
                {editing && <th className="py-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.min} className="border-b border-border-soft last:border-0">
                  <td className="py-1.5 pr-3">
                    {editing ? (
                      <Input type="number" min={0} max={100} step="any" value={r.min < 0 ? '' : r.min}
                        className="w-24 text-center tabular-nums"
                        onChange={(e) => setRow(r.min, { min: round2(Number(e.target.value) || 0) })} />
                    ) : (
                      <span className="tabular-nums">{r.min}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink-secondary">
                    {/* "Up to" and the NEXT band's minimum are the same boundary,
                        so editing this moves that band's minimum with it — the
                        table can never end up with a gap or an overlap. The top
                        band always ends at the scale ceiling (100). */}
                    {editing && i > 0 ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={rows[i - 1].min < 0 ? '' : upToOf(i)}
                        title="Editing this also moves the band above — they share this boundary."
                        className="w-24 text-center tabular-nums"
                        onChange={(e) => setRow(rows[i - 1].min, { min: round2((Number(e.target.value) || 0) + step) })}
                      />
                    ) : i === 0 ? (
                      100
                    ) : (
                      upToOf(i)
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {editing ? (
                      <Input type="number" min={0} max={100} value={r.grade}
                        className="w-24 text-center tabular-nums"
                        onChange={(e) => setRow(r.min, { grade: Number(e.target.value) || 0 })} />
                    ) : (
                      <span className="tabular-nums font-medium">{r.grade}</span>
                    )}
                  </td>
                  {editing && (
                    <td className="py-1.5 text-right">
                      <button type="button" onClick={() => removeRow(r.min)}
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
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add band
              </Button>
            </div>
          )}
        </SectionCard>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-ink-primary">Replace SY {sy}'s transmutation table?</h3>
            <p className="text-[13px] text-ink-secondary mt-2">
              This is the lookup behind <span className="font-semibold">every</span> grade in SY {sy}.
              Saving re-grades each learner the next time their sheet is opened. Past school years are
              not affected. The change is recorded with your name and the time.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button onClick={commit} disabled={saving}>{saving ? 'Saving…' : 'Replace table'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
