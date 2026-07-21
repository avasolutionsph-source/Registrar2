import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { listOfficials, saveOfficials, type Official } from '@/lib/db';

// Setup ▸ Admin. School officials / signatories printed on Form 137 / 138 / SF10.
// Free-text name per position so a signatory need not be in the teachers list.
const POSITIONS = [
  { key: 'registrar', label: 'Registrar' },
  { key: 'principal', label: 'Principal' },
  { key: 'director', label: 'Director' },
  { key: 'coord_elem', label: 'Coordinator — Elementary' },
  { key: 'coord_hs', label: 'Coordinator — Junior HS' },
  { key: 'coord_shs', label: 'Coordinator — Senior HS' },
  { key: 'coord_pre', label: 'Coordinator — Preschool' },
  { key: 'guidance', label: 'Guidance Coordinator' },
];

type Row = { name: string; title: string };

export default function SetupAdmin() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saved0, setSaved0] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const officials = await listOfficials();
        if (cancelled) return;
        const byKey = new Map(officials.map((o) => [o.positionKey, o]));
        const init: Record<string, Row> = {};
        for (const p of POSITIONS) {
          const o = byKey.get(p.key);
          init[p.key] = { name: o?.personName ?? '', title: o?.title ?? p.label };
        }
        setRows(init);
        setSaved0(init);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load officials.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = POSITIONS.some(
    (p) => rows[p.key]?.name !== saved0[p.key]?.name || rows[p.key]?.title !== saved0[p.key]?.title,
  );
  const set = (key: string, field: keyof Row, v: string) =>
    setRows((r) => ({ ...r, [key]: { ...r[key], [field]: v } }));

  async function save() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Official[] = POSITIONS.map((p) => ({
        positionKey: p.key,
        personName: rows[p.key]?.name ?? '',
        title: rows[p.key]?.title ?? p.label,
      }));
      await saveOfficials(payload);
      setSaved0(rows);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Admin' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Admin — Signatories</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[640px]">
            The people who sign official documents. The Registrar name auto-fills the signature on
            Form 137, SF10 and the Tracking Record. Leave a position blank if it is vacant.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && !dirty && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!dirty || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading="School Positions">
          <div className="grid gap-3 max-w-3xl">
            <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 px-1 text-[11px] uppercase tracking-wide text-ink-muted">
              <span>Position</span><span>Name (as signed)</span><span>Printed title</span>
            </div>
            {POSITIONS.map((p) => (
              <div key={p.key} className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 items-center px-1">
                <span className="text-[13px] text-ink-primary">{p.label}</span>
                <Input
                  value={rows[p.key]?.name ?? ''}
                  placeholder="— Vacant —"
                  onChange={(e) => set(p.key, 'name', e.target.value)}
                />
                <Input
                  value={rows[p.key]?.title ?? ''}
                  placeholder={p.label}
                  onChange={(e) => set(p.key, 'title', e.target.value)}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}
