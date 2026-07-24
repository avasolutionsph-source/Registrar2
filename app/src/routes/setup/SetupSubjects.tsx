import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Save, Plus, GripVertical, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSubjects, addSubject, updateSubject, listGradeSubjects, saveGradeSubjects } from '@/lib/db';
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
  // Combination subject (EPP-ICT, TLE-ICT): the checkbox reveals per-term
  // content boxes; the labels ride the FormData like the other fields.
  const [isCombo, setIsCombo] = useState(false);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCode, setOverCode] = useState<string | null>(null);

  // Subject Catalog editor: search + one row in inline-edit at a time. The
  // CODE stays fixed (it is the PK every load and grade entry points at).
  const [catSearch, setCatSearch] = useState('');
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '', abbreviation: '', level: '', category: '',
    combo: false, t1: '', t2: '', t3: '',
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(s: Subject) {
    setEditCode(s.code);
    setEditError(null);
    setEditForm({
      fullName: s.fullName,
      abbreviation: s.abbreviation,
      level: s.level ?? '',
      category: s.category ?? '',
      combo: !!s.termLabels,
      t1: s.termLabels?.q1 ?? '',
      t2: s.termLabels?.q2 ?? '',
      t3: s.termLabels?.q3 ?? '',
    });
  }

  async function saveEdit() {
    if (!editCode) return;
    if (!editForm.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }
    if (editForm.combo && (!editForm.t1.trim() || !editForm.t2.trim() || !editForm.t3.trim())) {
      setEditError('Fill in what is taught in each term (e.g. EPP / EPP / ICT).');
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateSubject(editCode, {
        fullName: editForm.fullName.trim(),
        abbreviation: editForm.abbreviation.trim() || editCode,
        category: (editForm.category as SubjectCategory) || null,
        level: editForm.level || null,
        termLabels: editForm.combo
          ? { q1: editForm.t1.trim(), q2: editForm.t2.trim(), q3: editForm.t3.trim() }
          : null,
      });
      setCatalog(await listSubjects());
      setEditCode(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save the subject.');
    } finally {
      setEditBusy(false);
    }
  }

  const catalogShown = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    const rows = q
      ? catalog.filter((s) => `${s.code} ${s.fullName} ${s.abbreviation}`.toLowerCase().includes(q))
      : catalog;
    // Group by level in the LEVELS order, uncategorized last.
    const order = new Map<string, number>(LEVELS.map((l, i) => [l.key, i]));
    return [...rows].sort(
      (a, b) =>
        (order.get(a.level ?? '') ?? 99) - (order.get(b.level ?? '') ?? 99) ||
        a.fullName.localeCompare(b.fullName),
    );
  }, [catalog, catSearch]);

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
    // Combination subject: build the per-term label map ({ q1: 'EPP', ... }).
    // Every term must be filled — a half-labeled combination has no meaning.
    let termLabels: Record<string, string> | null = null;
    if (isCombo) {
      const labels = [get('termLabel1'), get('termLabel2'), get('termLabel3')];
      if (labels.some((l) => !l)) {
        setAddError('Fill in what is taught in each term (e.g. EPP / EPP / ICT).');
        return;
      }
      termLabels = { q1: labels[0], q2: labels[1], q3: labels[2] };
    }
    setAdding(true);
    try {
      await addSubject({
        code,
        fullName,
        abbreviation: get('abbreviation') || code,
        category: (get('category') as SubjectCategory) || undefined,
        level: (get('level') as SubjectLevel) || null,
        termLabels,
      });
      setCatalog(await listSubjects());
      form.reset();
      setIsCombo(false);
    } catch (err) {
      // 23505 = unique violation: someone else added the code since our load.
      if ((err as { code?: string })?.code === '23505') {
        setAddError(`A subject with code "${code}" already exists.`);
      } else {
        setAddError(err instanceof Error ? err.message : 'Failed to add the subject.');
      }
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
          <form onSubmit={handleAdd} className="px-1">
            {/* Row 1 — the subject's identity. */}
            <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-start">
              <div className="col-span-2">
                <Field label="Code">
                  <Input name="code" placeholder="e.g. SCI7" required />
                </Field>
              </div>
              <div className="col-span-4">
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
            </div>

            {/* Row 2 — combination subject (EPP-ICT / TLE-ICT): different
                content per term. Checking reveals the per-term boxes;
                coordinators later assign a TEACHER per term for these. */}
            <label className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isCombo}
                onChange={(e) => setIsCombo(e.target.checked)}
                className="h-3.5 w-3.5 accent-nps-red"
              />
              Combination subject — iba ang itinuturo bawat term (hal. EPP-ICT, TLE-ICT)
            </label>
            {isCombo && (
              <div className="mt-2 grid grid-cols-12 gap-x-3 rounded-md border border-border-soft bg-panel-alt p-3">
                <div className="col-span-4">
                  <Field label="Term 1 — ano ang laman">
                    <Input name="termLabel1" placeholder="e.g. EPP" />
                  </Field>
                </div>
                <div className="col-span-4">
                  <Field label="Term 2 — ano ang laman">
                    <Input name="termLabel2" placeholder="e.g. EPP" />
                  </Field>
                </div>
                <div className="col-span-4">
                  <Field label="Term 3 — ano ang laman">
                    <Input name="termLabel3" placeholder="e.g. ICT" />
                  </Field>
                </div>
              </div>
            )}

            {/* The action sits on its own row, so nothing squeezes it. */}
            <div className="mt-3 flex justify-end">
              <Button type="submit" disabled={adding} className="gap-1 px-4">
                <Plus className="w-3.5 h-3.5" /> {adding ? 'Adding…' : 'Add subject'}
              </Button>
            </div>
          </form>
          {addError && <p className="mt-2 px-1 text-[12.5px] text-nps-red">{addError}</p>}
          <p className="mt-2 px-1 text-[11.5px] text-ink-muted">
            New subjects join the catalog; add them to a grade above to place them in its order.
          </p>
        </SectionCard>
      </div>

      {/* ── Subject Catalog — the WHOLE list, viewable and editable. One row
          edits at a time; the CODE never changes (every load, order, and grade
          entry points at it). ── */}
      <div className="mt-3.5">
        <SectionCard heading={`Subject Catalog — ${catalog.length} subject${catalog.length === 1 ? '' : 's'}`}>
          <div className="px-1 mb-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11.5px] text-ink-muted max-w-[560px]">
              Every subject in the system. Edit the name, abbreviation, level, category, or the
              combination labels — the code is permanent. Removing a subject from a grade is done
              in the order list above, not here.
            </p>
            <Input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search code or name…"
              className="max-w-[240px]"
            />
          </div>
          {editError && <p className="mb-2 px-1 text-[12.5px] text-nps-red">{editError}</p>}
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[8%]">Code</th>
                <th className="py-1.5 pr-3">Full name</th>
                <th className="py-1.5 pr-3 w-[10%]">Abbrev.</th>
                <th className="py-1.5 pr-3 w-[15%]">Level</th>
                <th className="py-1.5 pr-3 w-[12%]">Category</th>
                <th className="py-1.5 pr-3 w-[22%]">Combination (per term)</th>
                <th className="py-1.5 w-[8%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              {catalogShown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-secondary">
                    {catSearch ? 'No subject matches the search.' : 'The catalog is empty.'}
                  </td>
                </tr>
              ) : (
                catalogShown.map((s) =>
                  editCode === s.code ? (
                    <tr key={s.code} className="border-b border-border-soft bg-panel-alt">
                      <td className="py-2 pr-3 font-mono text-ink-secondary align-top pt-3.5">{s.code}</td>
                      <td className="py-2 pr-3 align-top">
                        <Input
                          value={editForm.fullName}
                          onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                        />
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <Input
                          value={editForm.abbreviation}
                          onChange={(e) => setEditForm((f) => ({ ...f, abbreviation: e.target.value }))}
                        />
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <Select
                          value={editForm.level}
                          onChange={(e) => setEditForm((f) => ({ ...f, level: e.target.value }))}
                        >
                          <option value="">— Uncategorized</option>
                          {LEVELS.map((l) => (
                            <option key={l.key} value={l.key}>{l.label}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <Select
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                        >
                          <option value="">— None</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <label className="flex items-center gap-1.5 text-[12px] text-ink-secondary cursor-pointer mb-1.5">
                          <input
                            type="checkbox"
                            checked={editForm.combo}
                            onChange={(e) => setEditForm((f) => ({ ...f, combo: e.target.checked }))}
                            className="h-3.5 w-3.5 accent-nps-red"
                          />
                          Combination
                        </label>
                        {editForm.combo && (
                          <div className="flex gap-1.5">
                            <Input
                              value={editForm.t1}
                              onChange={(e) => setEditForm((f) => ({ ...f, t1: e.target.value }))}
                              placeholder="T1"
                              className="w-full"
                            />
                            <Input
                              value={editForm.t2}
                              onChange={(e) => setEditForm((f) => ({ ...f, t2: e.target.value }))}
                              placeholder="T2"
                              className="w-full"
                            />
                            <Input
                              value={editForm.t3}
                              onChange={(e) => setEditForm((f) => ({ ...f, t3: e.target.value }))}
                              placeholder="T3"
                              className="w-full"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right align-top">
                        <div className="inline-flex gap-1.5">
                          <Button variant="outline" size="sm" disabled={editBusy} onClick={() => setEditCode(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" disabled={editBusy} onClick={() => void saveEdit()}>
                            {editBusy ? '…' : 'Save'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.code} className="border-b border-border-soft last:border-0 hover:bg-app">
                      <td className="py-1.5 pr-3 font-mono">{s.code}</td>
                      <td className="py-1.5 pr-3 text-ink-primary">{s.fullName}</td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{s.abbreviation}</td>
                      <td className="py-1.5 pr-3 text-ink-secondary">
                        {LEVELS.find((l) => l.key === s.level)?.label ?? '—'}
                      </td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{s.category ?? '—'}</td>
                      <td className="py-1.5 pr-3">
                        {s.termLabels ? (
                          <span className="inline-flex flex-wrap gap-1">
                            {['q1', 'q2', 'q3'].map((k, i) => (
                              <span
                                key={k}
                                className="rounded-full bg-nps-red/10 text-nps-red text-[11px] font-semibold px-2 py-0.5"
                              >
                                T{i + 1}: {s.termLabels?.[k] ?? '—'}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="inline-flex items-center gap-1 text-[12px] text-ink-secondary hover:text-nps-red"
                          title={`Edit ${s.fullName}`}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
}
