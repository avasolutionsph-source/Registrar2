import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { Letterhead } from '@/components/print/parts';
import { listAllClassSubjects, listClasses, listTeachers, listSubjects } from '@/lib/db';
import { gradeLabel } from '@/lib/forms';
import { isAllTime } from '@/types';
import type { SchoolYear, ClassRecord, Teacher, Subject } from '@/types';

interface Assignment {
  classId: string;
  gradeLevel: string;
  sectionName: string;
  sy: string;
  subjectCode: string;
  subjectName: string;
  teacher: string; // '' when unassigned
}

export default function TeachingAssignments() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const code = currentSY?.code;
  const allTime = isAllTime(currentSY);

  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [links, classes, teachers, subjects] = await Promise.all([
          listAllClassSubjects(), listClasses(), listTeachers(), listSubjects(),
        ]);
        if (cancelled) return;
        const classById = new Map<string, ClassRecord>(classes.map((c) => [c.id, c]));
        const teacherById = new Map<number, Teacher>(teachers.map((t) => [t.id, t]));
        const subjectByCode = new Map<string, Subject>(subjects.map((s) => [s.code.toUpperCase(), s]));
        const built: Assignment[] = [];
        for (const l of links) {
          const c = classById.get(l.classId);
          if (!c) continue;
          const t = l.teacherId != null ? teacherById.get(l.teacherId) : undefined;
          built.push({
            classId: l.classId,
            gradeLevel: c.gradeLevel,
            sectionName: c.sectionName,
            sy: c.sy,
            subjectCode: l.subjectCode,
            subjectName: subjectByCode.get(l.subjectCode.toUpperCase())?.fullName ?? l.subjectCode,
            teacher: t ? `${t.title} ${t.familyName}, ${t.firstName}`.replace(/\s+/g, ' ').trim() : '',
          });
        }
        setRows(built);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load assignments.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter to the selected SY (unless All years), then by search + gaps toggle.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => allTime || r.sy === code)
      .filter((r) => !onlyGaps || r.teacher === '')
      .filter((r) =>
        !needle ||
        r.teacher.toLowerCase().includes(needle) ||
        r.subjectName.toLowerCase().includes(needle) ||
        r.subjectCode.toLowerCase().includes(needle) ||
        r.sectionName.toLowerCase().includes(needle) ||
        gradeLabel(r.gradeLevel).toLowerCase().includes(needle),
      );
  }, [rows, code, allTime, q, onlyGaps]);

  // Group by section, ordered by grade then section; subjects sorted by name.
  const groups = useMemo(() => {
    const byClass = new Map<string, Assignment[]>();
    for (const r of filtered) {
      const arr = byClass.get(r.classId) ?? [];
      arr.push(r);
      byClass.set(r.classId, arr);
    }
    return [...byClass.values()]
      .map((list) => ({
        gradeLevel: list[0].gradeLevel,
        sectionName: list[0].sectionName,
        sy: list[0].sy,
        subjects: list.slice().sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
      }))
      .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName));
  }, [filtered]);

  const gaps = filtered.filter((r) => r.teacher === '').length;

  const table = (
    <table className="w-full text-[12.5px] border-collapse text-black">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.03em] bg-zinc-100">
          <th className="border border-zinc-400 px-2 py-1.5 text-left w-[22%]">Grade &amp; Section</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Subject</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Teacher</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) =>
          g.subjects.map((r, i) => (
            <tr key={`${r.classId}-${r.subjectCode}`}>
              {i === 0 && (
                <td className="border border-zinc-400 px-2 py-1 align-top font-medium" rowSpan={g.subjects.length}>
                  {gradeLabel(g.gradeLevel)} · {g.sectionName}
                </td>
              )}
              <td className="border border-zinc-400 px-2 py-1">{r.subjectName}</td>
              <td className={`border border-zinc-400 px-2 py-1 ${r.teacher ? '' : 'text-red-600 font-medium'}`}>
                {r.teacher || '— unassigned —'}
              </td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Teaching Assignments' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Teaching Assignments</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-2xl">
            Every subject × section and the teacher assigned by the Academic Coordinators.
            Verify the whole load here; <span className="text-red-600 font-medium">unassigned</span>{' '}
            subjects are flagged.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={filtered.length === 0} onClick={() => setPrinting(true)}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <ExportCsvButton
            rows={filtered.slice().sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName) || a.subjectName.localeCompare(b.subjectName))}
            columns={[
              { header: 'Grade', value: (r) => gradeLabel(r.gradeLevel) },
              { header: 'Section', value: (r) => r.sectionName },
              { header: 'Subject', value: (r) => r.subjectName },
              { header: 'Subject Code', value: (r) => r.subjectCode },
              { header: 'Teacher', value: (r) => r.teacher || 'UNASSIGNED' },
            ]}
            filename={`teaching-assignments-${code ?? 'all'}`}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 print:hidden">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search teacher, subject or section…"
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} />
          Show only unassigned
        </label>
        <span className="text-[12px] text-ink-muted">
          {filtered.length} assignment{filtered.length === 1 ? '' : 's'}
          {gaps > 0 && <span className="text-red-600"> · {gaps} unassigned</span>}
        </span>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>
      ) : loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : groups.length === 0 ? (
        <SectionCard heading="No assignments">
          <p className="text-[12.5px] text-ink-secondary px-1 py-2">
            No teaching assignments match. Academic Coordinators assign subjects in the teacher portal;
            they appear here once set.
          </p>
        </SectionCard>
      ) : (
        <div className="overflow-x-auto">{table}</div>
      )}

      <PrintHost
        open={printing}
        docTitle={`Teaching Assignments · SY ${code ?? ''}`}
        onClose={() => setPrinting(false)}
      >
        <Letterhead docTitle="Teaching Assignments" docSubtitle={`School Year ${code ?? ''}`} />
        <div className="mt-3">{table}</div>
      </PrintHost>
    </>
  );
}
