import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { listStudentsByClass, listClasses, listSubjects, getTeacher } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { periodsForSy } from '@/lib/forms';
import type { Student, ClassRecord, Subject, Teacher } from '@/types';

// Full-page, read-only view of one class × subject grade sheet, opened from a
// subject chip on the teacher profile. Grades are display-only here.
export default function TeacherClassGradesheet() {
  const { id, classId, subjectCode } = useParams<{ id: string; classId: string; subjectCode: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [cls, setCls] = useState<ClassRecord | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [roster, setRoster] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    (async () => {
      try {
        const [t, classes, subjects, r] = await Promise.all([
          id ? getTeacher(Number(id)) : Promise.resolve(null),
          listClasses(),
          listSubjects(),
          listStudentsByClass(classId),
        ]);
        if (cancelled) return;
        setTeacher(t);
        setCls(classes.find((c) => c.id === classId) ?? null);
        setSubject(subjects.find((s) => s.code.toUpperCase() === (subjectCode ?? '').toUpperCase()) ?? null);
        setRoster(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the grade sheet.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, classId, subjectCode]);

  const periods = useMemo(() => periodsForSy(cls?.sy), [cls?.sy]);
  const subjName = subject?.fullName ?? subjectCode ?? '';
  const teacherName = teacher ? `${teacher.title} ${teacher.familyName}, ${teacher.firstName}`.replace(/\s+/g, ' ').trim() : '';

  const cellOf = (g: { q1?: number; letters?: Record<string, string> } | undefined, key: string) => {
    const num = (g as Record<string, unknown> | undefined)?.[key];
    const letter = g?.letters?.[key];
    return typeof num === 'number' ? num : letter || '—';
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Teachers', to: '/teachers' },
          { label: teacherName || 'Teacher', to: `/teachers/${id ?? ''}` },
          { label: 'Grade Sheet' },
        ]}
      />

      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">{subjName}</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {cls ? `Grade ${cls.gradeLevel} · ${cls.sectionName} · SY ${cls.sy}` : ''}
            {teacherName && <> · {teacherName}</>}
          </p>
          <p className="text-[12px] text-ink-muted mt-0.5">Read-only view of the grade sheet.</p>
        </div>
        <button
          onClick={() => navigate(`/teachers/${id ?? ''}`)}
          className="h-9 rounded-md border border-border px-3 text-[13px] hover:bg-panel-alt"
        >
          ← Back to profile
        </button>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>
      ) : roster === null ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : roster.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">No learners in this section.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-panel">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3 pl-3 w-10 text-right">#</th>
                <th className="py-2 pr-3">Learner</th>
                {periods.map((p) => (
                  <th key={p.key} className="py-2 px-3 text-center">{p.label}</th>
                ))}
                <th className="py-2 px-3 text-center">Final</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s, i) => {
                const yearGrades = s.grades?.[(cls?.sy ?? '') as keyof typeof s.grades] ?? [];
                const g = yearGrades.find((x) => x.subjectCode.toUpperCase() === (subjectCode ?? '').toUpperCase());
                return (
                  <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                    <td className="py-1.5 pr-3 pl-3 text-right tabular-nums text-ink-muted">{i + 1}</td>
                    <td className="py-1.5 pr-3 text-ink-primary">{formatLastFirstMiddle(s)}</td>
                    {periods.map((p) => (
                      <td key={p.key} className="py-1.5 px-3 text-center tabular-nums">{cellOf(g, p.key)}</td>
                    ))}
                    <td className="py-1.5 px-3 text-center tabular-nums font-semibold">
                      {g?.final != null ? g.final : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
