import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent, listSubjects, listSchoolYears, saveStudentGrades } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { subjectIndex, formatSy } from '@/lib/forms';
import type { Student, Subject, QuarterGrade } from '@/types';

type Row = { subjectCode: string; q1?: number; q2?: number; q3?: number; q4?: number };
type Q = 'q1' | 'q2' | 'q3' | 'q4';

const finalOf = (r: Row): number | undefined => {
  const qs = [r.q1, r.q2, r.q3, r.q4].filter((v): v is number => typeof v === 'number');
  return qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : undefined;
};

const numInput =
  'w-14 rounded border border-border bg-panel px-1.5 py-1 text-center text-[12.5px] text-ink-primary tabular-nums focus:outline-none focus:border-ring';

export default function EncodeGrades() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [sy, setSy] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [addCode, setAddCode] = useState('');
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

  // load the selected SY's rows whenever the student or SY changes
  useEffect(() => {
    if (!student || !sy) return;
    const g = (student.grades ?? {}) as Record<string, QuarterGrade[]>;
    setRows((g[sy] ?? []).map((e) => ({ subjectCode: e.subjectCode, q1: e.q1, q2: e.q2, q3: e.q3, q4: e.q4 })));
    setSaved(false);
  }, [student, sy]);

  const index = useMemo(() => subjectIndex(subjects), [subjects]);
  const used = new Set(rows.map((r) => r.subjectCode.toUpperCase()));
  const available = subjects.filter((s) => !used.has(s.code.toUpperCase()));

  const setCell = (i: number, q: Q, raw: string) => {
    const n = raw.trim() === '' ? undefined : Number(raw);
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [q]: Number.isFinite(n as number) ? n : undefined } : r)));
    setSaved(false);
  };
  const addRow = () => {
    if (!addCode) return;
    setRows((rs) => [...rs, { subjectCode: addCode }]);
    setAddCode('');
    setSaved(false);
  };
  const removeRow = (i: number) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setSaved(false);
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
          (['q1', 'q2', 'q3', 'q4'] as Q[]).forEach((q) => {
            if (r[q] != null) entry[q] = r[q];
          });
          const f = finalOf(r);
          if (f != null) entry.final = f;
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
          {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
          {error && <span className="text-[12px] text-destructive">{error}</span>}
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-muted text-[11px] uppercase border-b border-border">
              <th className="text-left font-medium py-1.5 pr-3">Subject</th>
              <th className="w-16 font-medium">Q1</th>
              <th className="w-16 font-medium">Q2</th>
              <th className="w-16 font-medium">Q3</th>
              <th className="w-16 font-medium">Q4</th>
              <th className="w-14 font-medium">Final</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-3 text-center text-ink-secondary">
                  No subjects yet for {formatSy(sy)}. Add one below.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const subj = index.get(r.subjectCode.toUpperCase());
                const fin = finalOf(r);
                return (
                  <tr key={r.subjectCode} className="border-b border-border-soft">
                    <td className="py-1.5 pr-3 text-ink-primary">
                      {subj?.fullName || r.subjectCode}
                      <span className="ml-1 text-[11px] text-ink-muted">({r.subjectCode})</span>
                    </td>
                    {(['q1', 'q2', 'q3', 'q4'] as Q[]).map((q) => (
                      <td key={q} className="text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r[q] ?? ''}
                          onChange={(e) => setCell(i, q, e.target.value)}
                          className={numInput}
                        />
                      </td>
                    ))}
                    <td className="text-center font-semibold text-ink-primary tabular-nums">{fin ?? '—'}</td>
                    <td className="text-center">
                      <button
                        onClick={() => removeRow(i)}
                        className="p-1 rounded text-ink-muted hover:text-destructive hover:bg-app"
                        aria-label="Remove subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
          Final grade is the rounded average of the encoded quarters. Leave a quarter blank if not yet
          graded.
        </p>
      </SectionCard>
    </div>
  );
}
