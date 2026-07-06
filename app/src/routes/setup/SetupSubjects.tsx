import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Save, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listSubjects, saveSubjects, addSubject } from '@/lib/db';
import type { SubjectCategory, SubjectLevel, Subject } from '@/types';

const CATEGORIES: SubjectCategory[] = ['Core', 'Specialized', 'Applied', 'Elective'];

// Education-level groups, in display order. 'uncategorized' catches anything untagged.
const LEVELS: { key: SubjectLevel; label: string }[] = [
  { key: 'preschool', label: 'Pre-School' },
  { key: 'elem', label: 'Elementary' },
  { key: 'jhs', label: 'Junior High School' },
  { key: 'shs', label: 'Senior High School' },
];
const GROUP_ORDER: (SubjectLevel | 'uncategorized')[] = ['preschool', 'elem', 'jhs', 'shs', 'uncategorized'];
const GROUP_LABEL: Record<string, string> = {
  preschool: 'Pre-School',
  elem: 'Elementary',
  jhs: 'Junior High School',
  shs: 'Senior High School',
  uncategorized: 'Uncategorized',
};

// Best-effort starting level from the subject name (SHS is the most distinctive);
// the registrar can re-assign with the dropdown. Only used when a subject is untagged.
function inferLevel(s: Subject): SubjectLevel | 'uncategorized' {
  const t = `${s.code} ${s.fullName}`.toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (
    has(
      '21st century', 'contemporary phil', 'disaster', 'earth and life', 'philosophy of the human',
      'media and information', 'oral communication', 'personal development', 'pagbasa at pagsuri',
      'komunikasyon at pananaliksik', 'general math', 'statistics and prob', 'pre-calculus',
      'basic calculus', 'general physics', 'general chemistry', 'general biology', 'physical science',
      'understanding culture', 'politics and governance', 'trends, networks', 'entrepreneur',
      'practical research', 'inquiries', 'piling larangan', 'work immersion', 'empowerment technolog',
      'introduction to the philosophy',
    )
  )
    return 'shs';
  if (has('tle', 'technology and livelihood')) return 'jhs';
  return 'uncategorized';
}

const effectiveLevel = (s: Subject): SubjectLevel | 'uncategorized' => s.level ?? inferLevel(s);

export default function SetupSubjects() {
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCode, setOverCode] = useState<string | null>(null);

  async function reload() {
    setList(await listSubjects());
  }

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

  // Group subjects (preserving the global order within each group).
  const groups = useMemo(() => {
    const by: Record<string, Subject[]> = {};
    for (const g of GROUP_ORDER) by[g] = [];
    for (const s of list) by[effectiveLevel(s)].push(s);
    return by;
  }, [list]);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const code = get('code');
    const fullName = get('fullName');
    if (!code || !fullName) {
      setAddError('Code and full name are required.');
      return;
    }
    if (list.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
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
      await reload();
      e.currentTarget.reset();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add the subject.');
    } finally {
      setAdding(false);
    }
  }

  const setLevel = (code: string, level: SubjectLevel | '') => {
    setList((cur) => cur.map((s) => (s.code === code ? { ...s, level: level || undefined } : s)));
    setDirty(true);
    setSaved(false);
  };

  // Drag to reorder — only within the same group (drop onto a row of another level
  // is ignored; use the level dropdown to move a subject between levels).
  const reorder = (fromCode: string, toCode: string) => {
    if (fromCode === toCode) return;
    setList((cur) => {
      const from = cur.findIndex((s) => s.code === fromCode);
      const to = cur.findIndex((s) => s.code === toCode);
      if (from < 0 || to < 0) return cur;
      if (effectiveLevel(cur[from]) !== effectiveLevel(cur[to])) return cur; // different group
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Flatten in group order so the saved sort_order matches the grouped view.
      const ordered = GROUP_ORDER.flatMap((g) =>
        groups[g].map((s) => ({ code: s.code, level: g === 'uncategorized' ? null : g })),
      );
      await saveSubjects(ordered);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error && /column .*level|level.*does not exist/i.test(e.message)
          ? 'Run setup-subject-level.sql in Supabase first, then try again.'
          : e instanceof Error
            ? e.message
            : 'Failed to save.',
      );
    } finally {
      setSaving(false);
    }
  }

  let counter = 0; // running row number across groups

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Subjects' }]} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Subjects — Order</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[560px]">
            Grouped by level (Pre-School / Elementary / JHS / SHS). Drag a row by its handle to
            reorder within a group, or use the level dropdown to move it. This order is followed on
            the grade sheet, Report Card, and Form 137.
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

      <SectionCard heading="Add a subject">
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
      </SectionCard>

      {loading ? (
        <SectionCard heading="Loading…">
          <p className="text-[12.5px] text-ink-secondary px-1">Loading…</p>
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-3.5">
          {GROUP_ORDER.map((g) => {
            const items = groups[g];
            if (items.length === 0) return null;
            return (
              <SectionCard key={g} heading={`${GROUP_LABEL[g]} · ${items.length}`}>
                <ul className="flex flex-col">
                  {items.map((s) => {
                    counter += 1;
                    return (
                      <li
                        key={s.code}
                        onDragOver={(e) => {
                          if (dragCode === null) return;
                          e.preventDefault();
                          setOverCode(s.code);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragCode) reorder(dragCode, s.code);
                          setDragCode(null);
                          setOverCode(null);
                        }}
                        className={[
                          'flex items-center gap-3 border-b border-border-soft last:border-0 py-1.5 px-1',
                          dragCode === s.code ? 'opacity-40' : '',
                          overCode === s.code && dragCode && dragCode !== s.code ? 'bg-app' : '',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDragCode(s.code)}
                          onDragEnd={() => {
                            setDragCode(null);
                            setOverCode(null);
                          }}
                          aria-label="Drag to reorder"
                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-ink-muted hover:text-ink-primary"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <span className="w-7 text-right text-[11.5px] tabular-nums text-ink-muted">
                          {counter}
                        </span>
                        <span className="font-mono text-[12px] text-ink-secondary w-16">{s.code}</span>
                        <span className="flex-1 text-[13px] text-ink-primary truncate">{s.fullName}</span>
                        <Select
                          value={s.level ?? ''}
                          onChange={(e) => setLevel(s.code, e.target.value as SubjectLevel | '')}
                          className="w-[150px] text-[12px]"
                        >
                          <option value="">— Uncategorized</option>
                          {LEVELS.map((l) => (
                            <option key={l.key} value={l.key}>
                              {l.label}
                            </option>
                          ))}
                        </Select>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}
