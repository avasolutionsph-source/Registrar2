import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent, listSubjects, listSchoolYears, saveStudentGrades, listWeightConfig } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { subjectIndex, formatSy, gradeLabel, periodsForSy, FALLBACK_SUBJECT_NAMES } from '@/lib/forms';
import {
  AREA_GROUPS,
  AREA_GROUP_LABEL,
  AREA_WEIGHTS,
  classifyArea,
  computeGrade,
  descriptiveScaleFor,
  isAreaGroup,
  isDescriptiveLevel,
  type AreaGroup,
  type Component,
} from '@/lib/grading';
import type { Student, Subject, QuarterGrade, QuarterComponents, QuarterKey } from '@/types';

const COMPONENTS: { key: Component; label: string }[] = [
  { key: 'ww', label: 'WWs — Written & Oral Works' },
  { key: 'pt', label: 'PTs — Performance Tasks' },
  { key: 'st', label: 'EXs — Summative Tests & Term Exam' },
];

type Row = {
  subjectCode: string;
  customName?: string; // registrar-typed name override for this learner (else catalog name)
  legacy: Partial<Record<QuarterKey, number>>; // directly-typed quarter grades (also fallback for migrated data)
  legacyFinal?: number; // directly-typed Final Rating (overrides the computed average, e.g. transferee SF10)
  raw: Partial<Record<QuarterKey, QuarterComponents>>;
  areaGroup?: string;
  letters: Partial<Record<QuarterKey, string>>;
};

// Standard learning areas in DepEd/report-card order. Used to prefill an editable
// template so encoding (especially a transferee's prior-school SF10) is fast. The
// `band` phases Mother Tongue (Grades 1–3) vs EPP/TLE (Grades 4–12); `code` is the
// fallback subject code when the catalog has no matching subject.
const GRADE_ORDINAL: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};
function gradeBand(gradeLevel?: string): 'lower' | 'upper' | 'unknown' {
  const o = GRADE_ORDINAL[(gradeLevel ?? '').split('-')[0]] ?? 0;
  if (!o) return (gradeLevel ?? '').startsWith('X') ? 'upper' : 'unknown';
  return o <= 3 ? 'lower' : 'upper';
}
const DEFAULT_AREAS: { label: string; code: string; kw: string[]; band: 'lower' | 'upper' | 'all' }[] = [
  // Always the plain/generic learning area — NEVER a school's SHS specialization
  // like "General Mathematics" or "Earth and Life Science". kw is empty so the
  // prefill uses the canonical code + name; a school's own subject can still be
  // added from the catalog afterwards, and any row's name is editable.
  { label: 'Mother Tongue', code: 'MT', kw: [], band: 'lower' },
  { label: 'Filipino', code: 'FIL', kw: [], band: 'all' },
  { label: 'English', code: 'ENG', kw: [], band: 'all' },
  { label: 'Mathematics', code: 'MATH', kw: [], band: 'all' },
  { label: 'Science', code: 'SCI', kw: [], band: 'all' },
  { label: 'Araling Panlipunan', code: 'AP', kw: [], band: 'all' },
  { label: 'EPP / TLE', code: 'EPP', kw: [], band: 'upper' },
  // MAPEH shown as its four components (like the SF10); each row is deletable and the
  // MAPEH line is derived from them.
  { label: 'Music', code: 'MUS', kw: [], band: 'all' },
  { label: 'Arts', code: 'ART', kw: [], band: 'all' },
  { label: 'Physical Education', code: 'PED', kw: [], band: 'all' },
  { label: 'Health', code: 'HEA', kw: [], band: 'all' },
  // Default to Edukasyon sa Pagpapakatao (transferees come from EsP schools), NOT CLE.
  { label: 'Edukasyon sa Pagpapakatao', code: 'ESP', kw: [], band: 'all' },
];
const MAPEH_CODE_SET = new Set(['MUA', 'PEH', 'MUS', 'ART', 'PED', 'HEA']);

const numIn =
  'w-12 rounded border border-border bg-panel px-1 py-1 text-center text-[12px] text-ink-primary tabular-nums focus:outline-none focus:border-ring';

const toNum = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

export default function EncodeGrades() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weights, setWeights] = useState(AREA_WEIGHTS); // registrar-configured WW/PT/ST, DepEd defaults until loaded
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
        const [s, subs, sys, w] = await Promise.all([
          getStudent(lrn),
          listSubjects(),
          listSchoolYears(),
          listWeightConfig(),
        ]);
        if (cancelled) return;
        setStudent(s);
        setSubjects(subs);
        setWeights(w);
        const fromGrades = s ? Object.keys(s.grades ?? {}) : [];
        // Include the learner's prior-school years (from enrolment history) so a
        // transferee's SY is selectable even before any grade is encoded.
        const fromHist = s ? (s.enrolmentHistory ?? []).map((e) => String(e.sy)) : [];
        const wanted = params.get('sy') ?? undefined; // deep-link from "Encode grades" per SY
        const all = Array.from(
          new Set([...sys.map((y) => String(y.code)), ...fromGrades, ...fromHist, ...(wanted ? [wanted] : [])]),
        ).sort();
        setYears(all);
        const active = sys.find((y) => y.isActive)?.code as string | undefined;
        setSy(
          (wanted && all.includes(wanted) ? wanted : undefined) ??
            active ??
            fromGrades.sort().pop() ??
            all[all.length - 1] ??
            '',
        );
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
        customName: e.customName,
        legacy: { q1: e.q1, q2: e.q2, q3: e.q3, q4: e.q4 },
        legacyFinal: e.final,
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
  const ks1 = isDescriptiveLevel(gradeLevel, sy);
  const scale = descriptiveScaleFor(gradeLevel);

  const used = new Set(rows.map((r) => r.subjectCode.toUpperCase()));
  const available = subjects.filter((s) => !used.has(s.code.toUpperCase()));

  const groupOf = (row: Row): AreaGroup =>
    isAreaGroup(row.areaGroup) ? row.areaGroup : classifyArea(index.get(row.subjectCode.toUpperCase()) ?? { code: row.subjectCode });

  // Displayed/saved quarter grade: from raw scores when encoded, else the legacy number.
  const quarterValue = (row: Row, q: QuarterKey): number | undefined => {
    const r = row.raw[q];
    if (r && (r.ww || r.pt || r.st)) return computeGrade(r, groupOf(row), weights) ?? undefined;
    return row.legacy[q];
  };
  // Average of the encoded period grades (the auto-computed Final).
  const avgOf = (row: Row): number | undefined => {
    const qs = QKEYS.map((q) => quarterValue(row, q)).filter((v): v is number => typeof v === 'number');
    return qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : undefined;
  };
  // The Final Rating: a directly-typed value wins (transferee SF10 may differ from the
  // plain average); otherwise it is the computed average.
  const finalOf = (row: Row): number | undefined =>
    typeof row.legacyFinal === 'number' ? row.legacyFinal : avgOf(row);

  // Derived MAPEH parent line (numeric levels): the per-period average of the
  // encoded Music/Arts/PE/Health components. Read-only — shown above its components.
  const mapehComps = rows.filter((r) => MAPEH_CODE_SET.has(r.subjectCode.toUpperCase()));
  const mapehPeriod = (q: QuarterKey): number | undefined => {
    const vals = mapehComps.map((r) => quarterValue(r, q)).filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : undefined;
  };
  const mapehFinal = (): number | undefined => {
    const vals = QKEYS.map((q) => mapehPeriod(q)).filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : undefined;
  };
  const firstMapehIndex = rows.findIndex((r) => MAPEH_CODE_SET.has(r.subjectCode.toUpperCase()));

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

  // Direct entry of a whole period grade (no raw breakdown) — for registrar encoding
  // of transferees' prior-school grades and legacy records.
  const setLegacyCell = (code: string, q: QuarterKey, value: string) => {
    const n = toNum(value);
    setRows((rs) => rs.map((r) => (r.subjectCode === code ? { ...r, legacy: { ...r.legacy, [q]: n } } : r)));
    dirty();
  };
  const setLegacyFinal = (code: string, value: string) => {
    const n = toNum(value);
    setRows((rs) => rs.map((r) => (r.subjectCode === code ? { ...r, legacyFinal: n } : r)));
    dirty();
  };

  // Prefill the standard learning areas (in report-card order) for this grade level,
  // skipping any already present. Rows stay fully editable (add/remove/type grades).
  const fillTemplate = () => {
    const band = gradeBand(gradeLevel);
    const existing = new Set(rows.map((r) => r.subjectCode.toUpperCase()));
    // Don't mix MAPEH component sets — if any component is already present, skip adding
    // the template's four (e.g. a learner already encoded with MUA/PEH).
    const hasMapeh = [...existing].some((c) => MAPEH_CODE_SET.has(c));
    const additions: Row[] = [];
    for (const a of DEFAULT_AREAS) {
      if (a.band === 'lower' && band === 'upper') continue;
      if (a.band === 'upper' && band === 'lower') continue;
      if (MAPEH_CODE_SET.has(a.code) && hasMapeh) continue;
      const match = subjects.find((s) => {
        const t = `${s.code} ${s.fullName}`.toLowerCase();
        return a.kw.some((k) => t.includes(k));
      });
      const code = match?.code ?? a.code;
      if (existing.has(code.toUpperCase())) continue;
      existing.add(code.toUpperCase());
      additions.push({ subjectCode: code, legacy: {}, raw: {}, letters: {} });
    }
    if (additions.length) {
      setRows((rs) => [...rs, ...additions]);
      dirty();
    }
  };

  // Rename the subject on THIS learner's record only (catalog untouched). Empty
  // clears the override so it falls back to the catalog name.
  const setCustomName = (code: string, value: string) => {
    setRows((rs) =>
      rs.map((r) => (r.subjectCode === code ? { ...r, customName: value.trimStart() || undefined } : r)),
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
          const cn = r.customName?.trim();
          if (cn) entry.customName = cn;
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
              {!ks1 && <th className="w-20 font-medium text-left pl-2">Remarks</th>}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={ks1 ? periods.length + 2 : periods.length + 4} className="py-3 text-center text-ink-secondary">
                  No subjects yet for {formatSy(sy)}. Use “Fill standard subjects” below, or add one.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const subj = index.get(r.subjectCode.toUpperCase());
                const fin = finalOf(r);
                const isComp = MAPEH_CODE_SET.has(r.subjectCode.toUpperCase());
                const mFin = mapehFinal();
                return (
                  <Fragment key={r.subjectCode}>
                    {!ks1 && idx === firstMapehIndex && (
                      <tr className="border-b border-border-soft bg-app/40">
                        <td className="py-1.5 pr-3 pl-2 font-semibold text-ink-primary">MAPEH</td>
                        {QKEYS.map((q) => (
                          <td key={q} className="text-center tabular-nums font-medium">
                            {mapehPeriod(q) ?? '—'}
                          </td>
                        ))}
                        <td className="text-center font-semibold tabular-nums">{mFin ?? '—'}</td>
                        <td className="pl-2 text-[11.5px]">
                          {mFin == null ? (
                            <span className="text-ink-secondary">—</span>
                          ) : mFin >= 75 ? (
                            <span className="text-ok-fg font-medium">Passed</span>
                          ) : (
                            <span className="text-nps-red font-medium">Failed</span>
                          )}
                        </td>
                        <td />
                      </tr>
                    )}
                    <tr className="border-b border-border-soft">
                      <td className={`py-1.5 pr-3 text-ink-primary ${isComp ? 'pl-6' : ''}`}>
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={r.customName ?? subj?.fullName ?? FALLBACK_SUBJECT_NAMES[r.subjectCode.toUpperCase()] ?? ''}
                          onChange={(e) => setCustomName(r.subjectCode, e.target.value)}
                          placeholder={r.subjectCode}
                          title="Subject name on this learner's record — edit to match their SF10; the catalog is not changed"
                          className="min-w-[9rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] text-ink-primary hover:border-border focus:border-ring focus:bg-panel focus:outline-none"
                        />
                        <span className="text-[11px] text-ink-muted">({r.subjectCode})</span>
                      </span>
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
                          const rawq = r.raw[q];
                          const fromRaw = !!(rawq && (rawq.ww || rawq.pt || rawq.st));
                          return (
                            <td key={q} className="text-center tabular-nums">
                              {fromRaw ? (
                                <span
                                  className="text-ink-primary font-medium"
                                  title="Computed from raw scores — edit via the sliders"
                                >
                                  {quarterValue(r, q) ?? '—'}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={r.legacy[q] ?? ''}
                                  onChange={(e) => setLegacyCell(r.subjectCode, q, e.target.value)}
                                  placeholder="—"
                                  className={numIn}
                                />
                              )}
                            </td>
                          );
                        })}
                    {!ks1 && (
                      <td className="text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.legacyFinal ?? ''}
                          onChange={(e) => setLegacyFinal(r.subjectCode, e.target.value)}
                          placeholder={avgOf(r) != null ? String(avgOf(r)) : '—'}
                          title="Final Rating — leave blank to use the average of the terms"
                          className={`${numIn} font-semibold`}
                        />
                      </td>
                    )}
                    {!ks1 && (
                      <td className="pl-2 text-[11.5px]">
                        {fin == null ? (
                          <span className="text-ink-secondary">—</span>
                        ) : fin >= 75 ? (
                          <span className="text-ok-fg font-medium">Passed</span>
                        ) : (
                          <span className="text-nps-red font-medium">Failed</span>
                        )}
                      </td>
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
                  </Fragment>
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
                      {AREA_GROUP_LABEL[g]} ({weights[g].ww}/{weights[g].pt}/{weights[g].st})
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
              ({weights[groupOf(editingRow)].ww}/{weights[groupOf(editingRow)].pt}/
              {weights[groupOf(editingRow)].st}) transmuted with the SY 2026-2027 table.
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
          <span className="mx-1 text-ink-muted">·</span>
          <Button variant="outline" size="sm" onClick={fillTemplate} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Fill standard subjects
            {gradeLevel ? ` (${gradeBand(gradeLevel) === 'lower' ? 'w/ Mother Tongue' : 'w/ EPP-TLE'})` : ''}
          </Button>
        </div>

        <p className="mt-3 px-1 text-[11px] text-ink-muted">
          {ks1
            ? 'Kinder–Grade 3 use descriptive letters per DepEd guidelines; pick a letter per period.'
            : `Type each period grade directly (for transferees / prior-school records), or open the sliders icon to encode raw WW/PT/EX scores (teacher workflow — a computed period grade then can't be typed over). The Final defaults to the average of the ${periods.length} ${periods.length === 3 ? 'terms' : 'quarters'} — type a value to override it (e.g. a transferee's SF10 Final Rating). MAPEH is graded through Music & Arts and Physical Education & Health; its line is computed automatically.`}
        </p>
      </SectionCard>
    </div>
  );
}
