import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent, listSubjects, listSchoolYears, saveStudentGrades } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { subjectIndex, formatSy, gradeLabel, periodsForSy } from '@/lib/forms';
import {
  AREA_GROUPS,
  AREA_GROUP_LABEL,
  AREA_WEIGHTS,
  classifyArea,
  computeGrade,
  descriptorFor,
  descriptiveScaleFor,
  isAreaGroup,
  isDescriptiveLevel,
  type AreaGroup,
  type Component,
} from '@/lib/grading';
import type { Student, Subject, QuarterGrade, QuarterComponents, QuarterKey } from '@/types';

const COMPONENTS: { key: Component; label: string }[] = [
  { key: 'ww', label: 'Written / Oral Works' },
  { key: 'pt', label: 'Performance Tasks' },
  { key: 'st', label: 'Summative Tests + Exam' },
];

type Row = {
  subjectCode: string;
  legacy: Partial<Record<QuarterKey, number>>; // migrated quarter grades (fallback when no raw)
  raw: Partial<Record<QuarterKey, QuarterComponents>>;
  areaGroup?: string;
  letters: Partial<Record<QuarterKey, string>>;
};

const numIn =
  'w-12 rounded border border-border bg-panel px-1 py-1 text-center text-[12px] text-ink-primary tabular-nums focus:outline-none focus:border-ring';

const toNum = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

export default function EncodeGrades() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [sy, setSy] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [addCode, setAddCode] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // subjectCode being raw-edited
  const [loadedKey, setLoadedKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const [s, subs, sys] = await Promise.all([getStudent(lrn), listSubjects(), listSchoolYears()]);
        if (cancelled) return;
        setStudent(s);
        setSubjects(subs);
        const fromGrades = s ? Object.keys(s.grades ?? {}) : [];
        const all = Array.from(new Set([...sys.map((y) => String(y.code)), ...fromGrades])).sort();
        setYears(all);
        const active = sys.find((y) => y.isActive)?.code as string | undefined;
        setSy(active ?? fromGrades.sort().pop() ?? all[all.length - 1] ?? '');
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

  // Reset the editable rows when the student or SY changes — render-phase reset
  // (React's "adjusting state when a prop changes" pattern, no effect needed).
  const loadKey = student && sy ? `${student.lrn}:${sy}` : '';
  if (loadKey && loadKey !== loadedKey) {
    setLoadedKey(loadKey);
    const g = (student!.grades ?? {}) as Record<string, QuarterGrade[]>;
    setRows(
      (g[sy] ?? []).map((e) => ({
        subjectCode: e.subjectCode,
        legacy: { q1: e.q1, q2: e.q2, q3: e.q3, q4: e.q4 },
        raw: e.raw ?? {},
        areaGroup: e.areaGroup,
        letters: e.letters ?? {},
      })),
    );
    setEditing(null);
    setSaved(false);
  }

  const index = useMemo(() => subjectIndex(subjects), [subjects]);

  // Grading periods for the selected SY: 3 terms (SY 2026-2027 onward) or the
  // legacy 4 quarters. Storage keys stay q1..q4 — a 3-term year uses q1..q3.
  const periods = useMemo(() => periodsForSy(sy), [sy]);
  const QKEYS = useMemo(() => periods.map((p) => p.key), [periods]);

  // Grade level for the selected SY → decides numeric (KS2–4) vs descriptive (KS1).
  const gradeLevel = useMemo(
    () => (student?.enrolmentHistory ?? []).find((h) => h.sy === sy)?.gradeLevel,
    [student, sy],
  );
  const ks1 = isDescriptiveLevel(gradeLevel);
  const scale = descriptiveScaleFor(gradeLevel);

  const used = new Set(rows.map((r) => r.subjectCode.toUpperCase()));
  const available = subjects.filter((s) => !used.has(s.code.toUpperCase()));

  const groupOf = (row: Row): AreaGroup =>
    isAreaGroup(row.areaGroup) ? row.areaGroup : classifyArea(index.get(row.subjectCode.toUpperCase()) ?? { code: row.subjectCode });

  // Displayed/saved quarter grade: from raw scores when encoded, else the legacy number.
  const quarterValue = (row: Row, q: QuarterKey): number | undefined => {
    const r = row.raw[q];
    if (r && (r.ww || r.pt || r.st)) return computeGrade(r, groupOf(row)) ?? undefined;
    return row.legacy[q];
  };
  const finalOf = (row: Row): number | undefined => {
    const qs = QKEYS.map((q) => quarterValue(row, q)).filter((v): v is number => typeof v === 'number');
    return qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : undefined;
  };

  const dirty = () => setSaved(false);

  const setRawCell = (code: string, q: QuarterKey, comp: Component, field: 'earned' | 'total', value: string) => {
    const n = toNum(value);
    setRows((rs) =>
      rs.map((r) => {
        if (r.subjectCode !== code) return r;
        const qc: QuarterComponents = { ...(r.raw[q] ?? {}) };
        const cur = { ...(qc[comp] ?? { earned: 0, total: 0 }) };
        cur[field] = n ?? 0;
        qc[comp] = cur;
        return { ...r, raw: { ...r.raw, [q]: qc } };
      }),
    );
    dirty();
  };

  const setAreaGroup = (code: string, group: string) => {
    setRows((rs) => rs.map((r) => (r.subjectCode === code ? { ...r, areaGroup: group } : r)));
    dirty();
  };

  const setLetter = (code: string, q: QuarterKey, letter: string) => {
    setRows((rs) =>
      rs.map((r) => (r.subjectCode === code ? { ...r, letters: { ...r.letters, [q]: letter || undefined } } : r)),
    );
    dirty();
  };

  const addRow = () => {
    if (!addCode) return;
    setRows((rs) => [...rs, { subjectCode: addCode, legacy: {}, raw: {}, letters: {} }]);
    setAddCode('');
    dirty();
  };
  const removeRow = (code: string) => {
    setRows((rs) => rs.filter((r) => r.subjectCode !== code));
    if (editing === code) setEditing(null);
    dirty();
  };

  async function save() {
    if (!student || !sy) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleaned: QuarterGrade[] = rows
        .filter((r) => r.subjectCode)
        .map((r) => {
          const entry: QuarterGrade = { subjectCode: r.subjectCode.toUpperCase() };
          if (ks1) {
            const letters: Partial<Record<QuarterKey, string>> = {};
            QKEYS.forEach((q) => {
              if (r.letters[q]) letters[q] = r.letters[q];
            });
            if (Object.keys(letters).length) entry.letters = letters;
          } else {
            QKEYS.forEach((q) => {
              const v = quarterValue(r, q);
              if (v != null) entry[q] = v;
            });
            const f = finalOf(r);
            if (f != null) entry.final = f;
            const raw: Partial<Record<QuarterKey, QuarterComponents>> = {};
            QKEYS.forEach((q) => {
              if (r.raw[q]) raw[q] = r.raw[q];
            });
            if (Object.keys(raw).length) entry.raw = raw;
            if (isAreaGroup(r.areaGroup)) entry.areaGroup = r.areaGroup;
          }
          return entry;
        });
      const grades = { ...(student.grades ?? {}), [sy]: cleaned } as Student['grades'];
      await saveStudentGrades(student.lrn, grades);
      setStudent({ ...student, grades });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grades.');
    } finally {
      setSaving(false);
    }
  }

  if (student === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }
  if (!student) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No student with LRN {lrn}.</p>
      </div>
    );
  }

  const fullName = formatLastFirstMiddle(student);
  const editingRow = rows.find((r) => r.subjectCode === editing);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Students', to: '/students' },
          { label: fullName, to: `/students/${student.lrn}` },
          { label: 'Encode grades' },
        ]}
      />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-ink-primary">Encode Grades</h1>
          <p className="text-[12.5px] text-ink-secondary">
            {fullName} · LRN <span className="font-mono">{student.lrn}</span>
            {gradeLevel ? ` · ${gradeLabel(gradeLevel)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/students/${student.lrn}`)} className="gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save grades'}
          </Button>
        </div>
      </div>

      <SectionCard heading="Grades">
        <div className="mb-3 flex items-center gap-3 px-1">
          <label className="text-[12px] text-ink-secondary">School Year</label>
          <select
            value={sy}
            onChange={(e) => setSy(e.target.value)}
            className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {formatSy(y)}
              </option>
            ))}
          </select>
          <span className="text-[11.5px] text-ink-muted">
            {ks1 ? 'Descriptive grading (Kinder–Grade 3)' : 'DepEd SY 2026-2027 · raw scores → transmuted grade'}
          </span>
          {saved && <span className="text-[12px] text-ok-fg ml-auto">✓ Saved</span>}
          {error && <span className="text-[12px] text-destructive ml-auto">{error}</span>}
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-muted text-[11px] uppercase border-b border-border">
              <th className="text-left font-medium py-1.5 pr-3">Subject</th>
              {periods.map((p) => (
                <th key={p.key} className="w-12 font-medium">
                  {p.label}
                </th>
              ))}
              {!ks1 && <th className="w-12 font-medium">Final</th>}
              {!ks1 && <th className="w-28 font-medium text-left pl-2">Descriptor</th>}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={ks1 ? periods.length + 2 : periods.length + 4} className="py-3 text-center text-ink-secondary">
                  No subjects yet for {formatSy(sy)}. Add one below.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const subj = index.get(r.subjectCode.toUpperCase());
                const fin = finalOf(r);
                const desc = descriptorFor(fin ?? null);
                return (
                  <tr key={r.subjectCode} className="border-b border-border-soft">
                    <td className="py-1.5 pr-3 text-ink-primary">
                      {subj?.fullName || r.subjectCode}
                      <span className="ml-1 text-[11px] text-ink-muted">({r.subjectCode})</span>
                    </td>
                    {ks1
                      ? QKEYS.map((q) => (
                          <td key={q} className="text-center">
                            <select
                              value={r.letters[q] ?? ''}
                              onChange={(e) => setLetter(r.subjectCode, q, e.target.value)}
                              className="rounded border border-border bg-panel px-1 py-1 text-[12px] text-ink-primary"
                            >
                              <option value="">—</option>
                              {scale.map((d) => (
                                <option key={d.letter} value={d.letter}>
                                  {d.letter}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))
                      : QKEYS.map((q) => {
                          const v = quarterValue(r, q);
                          const fromRaw = !!r.raw[q];
                          return (
                            <td key={q} className="text-center tabular-nums">
                              <span className={fromRaw ? 'text-ink-primary font-medium' : 'text-ink-secondary'}>
                                {v ?? '—'}
                              </span>
                            </td>
                          );
                        })}
                    {!ks1 && (
                      <td className="text-center font-semibold text-ink-primary tabular-nums">{fin ?? '—'}</td>
                    )}
                    {!ks1 && (
                      <td className="pl-2 text-[11.5px] text-ink-secondary">{desc ? desc.label : '—'}</td>
                    )}
                    <td className="text-center">
                      <div className="flex items-center justify-end gap-1">
                        {!ks1 && (
                          <button
                            onClick={() => setEditing(editing === r.subjectCode ? null : r.subjectCode)}
                            className={`p-1 rounded hover:bg-app ${editing === r.subjectCode ? 'text-accent' : 'text-ink-muted hover:text-ink-primary'}`}
                            aria-label="Edit raw scores"
                            title="Edit raw scores"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeRow(r.subjectCode)}
                          className="p-1 rounded text-ink-muted hover:text-destructive hover:bg-app"
                          aria-label="Remove subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Raw-score editor for the selected subject (KS2–4 only) */}
        {!ks1 && editingRow && (
          <div className="mt-3 rounded-md border border-border bg-app/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-semibold text-ink-primary">
                Raw scores — {index.get(editingRow.subjectCode.toUpperCase())?.fullName || editingRow.subjectCode}
              </div>
              <label className="flex items-center gap-2 text-[11.5px] text-ink-secondary">
                Weights
                <select
                  value={groupOf(editingRow)}
                  onChange={(e) => setAreaGroup(editingRow.subjectCode, e.target.value)}
                  className="rounded border border-border bg-panel px-1.5 py-1 text-[11.5px] text-ink-primary max-w-[230px]"
                >
                  {AREA_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {AREA_GROUP_LABEL[g]} ({AREA_WEIGHTS[g].ww}/{AREA_WEIGHTS[g].pt}/{AREA_WEIGHTS[g].st})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-ink-muted text-[10.5px] uppercase">
                  <th className="text-left font-medium py-1">Component</th>
                  {periods.map((p) => (
                    <th key={p.key} className="font-medium">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPONENTS.map((c) => (
                  <tr key={c.key} className="border-t border-border-soft">
                    <td className="py-1 text-ink-secondary">{c.label}</td>
                    {QKEYS.map((q) => {
                      const cell = editingRow.raw[q]?.[c.key];
                      return (
                        <td key={q} className="text-center py-1">
                          <span className="inline-flex items-center gap-0.5">
                            <input
                              type="number"
                              min={0}
                              placeholder="earned"
                              value={cell?.earned ?? ''}
                              onChange={(e) => setRawCell(editingRow.subjectCode, q, c.key, 'earned', e.target.value)}
                              className={numIn}
                            />
                            <span className="text-ink-muted">/</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="total"
                              value={cell?.total ?? ''}
                              onChange={(e) => setRawCell(editingRow.subjectCode, q, c.key, 'total', e.target.value)}
                              className={numIn}
                            />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold">
                  <td className="py-1 text-right text-ink-secondary text-[10.5px] uppercase pr-2">Period grade</td>
                  {QKEYS.map((q) => (
                    <td key={q} className="text-center text-ink-primary tabular-nums">
                      {quarterValue(editingRow, q) ?? '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-muted">
              Enter points earned over the highest possible per component. The grade is the weighted score
              ({AREA_WEIGHTS[groupOf(editingRow)].ww}/{AREA_WEIGHTS[groupOf(editingRow)].pt}/
              {AREA_WEIGHTS[groupOf(editingRow)].st}) transmuted with the SY 2026-2027 table.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 px-1">
          <select
            value={addCode}
            onChange={(e) => setAddCode(e.target.value)}
            className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary max-w-[280px]"
          >
            <option value="">Add subject…</option>
            {available.map((s) => (
              <option key={s.code} value={s.code}>
                {s.fullName} ({s.code})
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={addRow} disabled={!addCode} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <p className="mt-3 px-1 text-[11px] text-ink-muted">
          {ks1
            ? 'Kinder–Grade 3 use descriptive letters per DepEd guidelines; pick a letter per period.'
            : `Open the sliders icon on a subject to encode/correct its raw scores. The Final grade is the average of the ${periods.length} ${periods.length === 3 ? 'terms' : 'quarters'}. MAPEH is graded through Music & Arts and Physical Education & Health; its line is computed automatically.`}
        </p>
      </SectionCard>
    </div>
  );
}
