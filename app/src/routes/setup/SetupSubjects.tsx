import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Save, Plus, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSubjects, addSubject, listGradeSubjects, saveGradeSubjects } from '@/lib/db';
import type { SubjectCategory, SubjectLevel, Subject } from '@/types';

const CATEGORIES: SubjectCategory[] = ['Core', 'Specialized', 'Applied', 'Elective'];
const LEVELS: { key: SubjectLevel; label: string }[] = [
  { key: 'preschool', label: 'Pre-School' },
  { key: 'elem', label: 'Elementary' },
  { key: 'jhs', label: 'Junior High School' },
  { key: 'shs', label: 'Senior High School' },
];

// Every grade level / SHS strand the registrar can order subjects for, grouped
// for the picker. SHS strands are separate because each has its own subject set
// and order (per the SF9 report cards).
const GRADE_GROUPS: { label: string; items: { v: string; l: string }[] }[] = [
  { label: 'Pre-School', items: [
    { v: 'N1', l: 'Nursery 1' }, { v: 'N2', l: 'Nursery 2' }, { v: 'K', l: 'Kinder' },
  ] },
  { label: 'Elementary', items: [
    { v: 'I', l: 'Grade 1' }, { v: 'II', l: 'Grade 2' }, { v: 'III', l: 'Grade 3' },
    { v: 'IV', l: 'Grade 4' }, { v: 'V', l: 'Grade 5' }, { v: 'VI', l: 'Grade 6' },
    { v: 'S', l: 'SNED' },
  ] },
  { label: 'Junior High School', items: [
    { v: 'VII', l: 'Grade 7' }, { v: 'VIII', l: 'Grade 8' }, { v: 'IX', l: 'Grade 9' }, { v: 'X', l: 'Grade 10' },
  ] },
  { label: 'Senior High — Grade 11', items: [
    { v: 'XI-STEM', l: 'Grade 11 — STEM' },
    { v: 'XI-STEM-ENG', l: 'Grade 11 — STEM (Engineering)' },
    { v: 'XI-STEM-HA', l: 'Grade 11 — STEM (Health Allied)' },
    { v: 'XI-ABM', l: 'Grade 11 — ABM' },
    { v: 'XI-HUMSS', l: 'Grade 11 — HUMSS' },
    { v: 'XI-ASSH', l: 'Grade 11 — ASSH' },
    { v: 'XI-GAS', l: 'Grade 11 — GAS' },
  ] },
  { label: 'Senior High — Grade 12', items: [
    { v: 'XII-STEM', l: 'Grade 12 — STEM' },
    { v: 'XII-STEM-ENG', l: 'Grade 12 — STEM (Engineering)' },
    { v: 'XII-STEM-HA', l: 'Grade 12 — STEM (Health Allied)' },
    { v: 'XII-ABM', l: 'Grade 12 — ABM' },
    { v: 'XII-HUMSS', l: 'Grade 12 — HUMSS' },
    { v: 'XII-ASSH', l: 'Grade 12 — ASSH' },
    { v: 'XII-GAS', l: 'Grade 12 — GAS' },
  ] },
];

export default function SetupSubjects() {
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [gradeLevel, setGradeLevel] = useState<string>('VII');
  const [codes, setCodes] = useState<string[]>([]); // ordered subject codes for the grade
  const [loading, setLoading] = useState(true);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addCode, setAddCode] = useState('');

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCode, setOverCode] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of catalog) m.set(s.code.toUpperCase(), s);
    return m;
  }, [catalog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const subs = await listSubjects();
        if (!cancelled) setCatalog(subs);
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

  // Load the selected grade's ordered subjects.
  useEffect(() => {
    let cancelled = false;
    setLoadingGrade(true);
    setDirty(false);
    setSaved(false);
    (async () => {
      try {
        const c = await listGradeSubjects(gradeLevel);
        if (!cancelled) setCodes(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the grade subjects.');
      } finally {
        if (!cancelled) setLoadingGrade(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel]);

  const gradeLabel = useMemo(() => {
    for (const g of GRADE_GROUPS) {
      const hit = g.items.find((i) => i.v === gradeLevel);
      if (hit) return hit.l;
    }
    return gradeLevel;
  }, [gradeLevel]);

  const inGrade = new Set(codes.map((c) => c.toUpperCase()));
  const available = catalog.filter((s) => !inGrade.has(s.code.toUpperCase()));

  const reorder = (fromCode: string, toCode: string) => {
    if (fromCode === toCode) return;
    setCodes((cur) => {
      const from = cur.indexOf(fromCode);
      const to = cur.indexOf(toCode);
      if (from < 0 || to < 0) return cur;
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  const addToGrade = () => {
    if (!addCode || inGrade.has(addCode.toUpperCase())) return;
    setCodes((cur) => [...cur, addCode]);
    setAddCode('');
    setDirty(true);
    setSaved(false);
  };
  const removeFromGrade = (code: string) => {
    setCodes((cur) => cur.filter((c) => c !== code));
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveGradeSubjects(gradeLevel, codes);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the order.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const code = get('code');
    const fullName = get('fullName');
    if (!code || !fullName) {
      setAddError('Code and full name are required.');
      return;
    }
    if (catalog.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
      setAddError(`A subject with code "${code}" already exists.`);
      return;
    }
    setAdding(true);
    try {
      await addSubject({
        code,
        fullName,
        abbreviation: get('abbreviation') || code,
        category: (get('category') as SubjectCategory) || undefined,
        level: (get('level') as SubjectLevel) || null,
      });
      setCatalog(await listSubjects());
      form.reset();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add the subject.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Subjects' }]} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Subjects — Order per Grade</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[620px]">
            Pick a grade level (for Senior High, pick the strand — each has its own subjects and
            order). The subjects appear in order; drag a row by its handle to reorder, or add / remove
            subjects. This exact order is followed on the Report Card (SF9) and grade encoding.
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

      <SectionCard heading="Grade level / strand">
        <div className="flex flex-wrap items-center gap-3 px-1">
          <Select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-[320px] text-[13px]"
          >
            {GRADE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((i) => (
                  <option key={i.v} value={i.v}>
                    {i.l}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <span className="text-[12px] text-ink-muted">
            {loadingGrade ? 'Loading…' : `${codes.length} subject${codes.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </SectionCard>

      <div className="mt-3.5">
        <SectionCard heading={`${gradeLabel} — subjects in order`}>
          {loading || loadingGrade ? (
            <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
          ) : codes.length === 0 ? (
            <p className="text-[12.5px] text-ink-secondary px-1">
              No subjects yet for {gradeLabel}. Add them below.
            </p>
          ) : (
            <ul className="flex flex-col">
              {codes.map((code, i) => {
                const s = byCode.get(code.toUpperCase());
                return (
                  <li
                    key={code}
                    onDragOver={(e) => {
                      if (dragCode === null) return;
                      e.preventDefault();
                      setOverCode(code);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragCode) reorder(dragCode, code);
                      setDragCode(null);
                      setOverCode(null);
                    }}
                    className={[
                      'flex items-center gap-3 border-b border-border-soft last:border-0 py-1.5 px-1',
                      dragCode === code ? 'opacity-40' : '',
                      overCode === code && dragCode && dragCode !== code ? 'bg-app' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragCode(code)}
                      onDragEnd={() => {
                        setDragCode(null);
                        setOverCode(null);
                      }}
                      aria-label="Drag to reorder"
                      className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-ink-muted hover:text-ink-primary"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <span className="w-7 text-right text-[11.5px] tabular-nums text-ink-muted">{i + 1}</span>
                    <span className="font-mono text-[12px] text-ink-secondary w-16">{code}</span>
                    <span className="flex-1 text-[13px] text-ink-primary truncate">
                      {s?.fullName ?? <span className="text-nps-red">{code} — not in catalog</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromGrade(code)}
                      className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app"
                      aria-label="Remove from this grade"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-2 px-1">
            <Select
              value={addCode}
              onChange={(e) => setAddCode(e.target.value)}
              className="max-w-[320px] text-[12.5px]"
            >
              <option value="">Add subject to {gradeLabel}…</option>
              {available.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.fullName} ({s.code})
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={addToGrade} disabled={!addCode} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="mt-3.5">
        <SectionCard heading="Add a new subject to the catalog">
          <form onSubmit={handleAdd} className="grid grid-cols-12 gap-x-3 gap-y-2 px-1 items-end">
            <div className="col-span-2">
              <Field label="Code">
                <Input name="code" placeholder="e.g. SCI7" required />
              </Field>
            </div>
            <div className="col-span-3">
              <Field label="Full name">
                <Input name="fullName" placeholder="e.g. Science 7" required />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Abbrev.">
                <Input name="abbreviation" placeholder="e.g. Sci" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Level">
                <Select name="level" defaultValue="">
                  <option value="">— Uncategorized</option>
                  {LEVELS.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Category" hint="SHS only">
                <Select name="category" defaultValue="">
                  <option value="">— None</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="col-span-1">
              <Button type="submit" disabled={adding} className="gap-1 w-full px-2">
                <Plus className="w-3.5 h-3.5" /> {adding ? '…' : 'Add'}
              </Button>
            </div>
          </form>
          {addError && <p className="mt-2 px-1 text-[12.5px] text-nps-red">{addError}</p>}
          <p className="mt-2 px-1 text-[11.5px] text-ink-muted">
            New subjects join the catalog; add them to a grade above to place them in its order.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
