import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getSchoolProfile, saveSchoolProfile, type SchoolProfile } from '@/lib/db';

// Setup ▸ School Profile. The school identity printed on every official form
// (Form 137 / 138 / SF9 / SF10). One record — not per school year.

const BLANK: SchoolProfile = {
  name: '', schoolId: '', address: '', district: '', division: '', region: '', type: 'Private',
};

const FIELDS: { key: keyof SchoolProfile; label: string; hint?: string }[] = [
  { key: 'name', label: 'School name' },
  { key: 'schoolId', label: 'School ID', hint: 'DepEd school ID (used on forms).' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'division', label: 'Division' },
  { key: 'region', label: 'Region' },
  { key: 'type', label: 'Type', hint: 'e.g. Private / Public.' },
];

export default function SetupSchoolProfile() {
  const [form, setForm] = useState<SchoolProfile>(BLANK);
  const [saved0, setSaved0] = useState<SchoolProfile>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = (await getSchoolProfile()) ?? BLANK;
        if (cancelled) return;
        setForm(p);
        setSaved0(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = (Object.keys(form) as (keyof SchoolProfile)[]).some((k) => form[k] !== saved0[k]);
  const valid = form.name.trim() !== '' && form.schoolId.trim() !== '';
  const set = (k: keyof SchoolProfile, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!valid || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await saveSchoolProfile(form);
      setSaved0(form);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'School Profile' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">School Profile</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[640px]">
            The school identity printed on every official form — Form 137/138, SF9, SF10.
            Verify the address, division and region against your DepEd registration.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && !dirty && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          <Button onClick={save} disabled={!valid || !dirty || saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading="Identity">
          <div className="grid sm:grid-cols-2 gap-5 max-w-[640px]">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-[13px]">
                <div className="font-medium text-ink-primary mb-1">{f.label}</div>
                <Input value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                {f.hint && <p className="text-[12px] text-ink-muted mt-1">{f.hint}</p>}
              </label>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-ink-secondary">
            Changes apply to newly printed forms. Reload the app to refresh already-open pages.
          </p>
        </SectionCard>
      )}
    </>
  );
}
