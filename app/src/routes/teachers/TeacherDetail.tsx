import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Pencil, KeyRound, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { KeyValueGrid } from '@/components/entity/KeyValueGrid';
import { StatusBadge } from '@/components/entity/StatusBadge';
import {
  getTeacher,
  listClasses,
  listStudentsLite,
  setClassAdviser,
  listSubjects,
  listClassSubjects,
  assignTeacherSubject,
} from '@/lib/db';
import { ALL_TIME_CODE, type Teacher, type ClassRecord, type SchoolYear, type Student, type Subject } from '@/types';

// Which subject education-level applies to a section's grade.
function levelOfGrade(g: string): 'preschool' | 'elem' | 'jhs' | 'shs' {
  const base = g.split('-')[0]; // "XII-STEM" → "XII"
  if (base === 'XI' || base === 'XII') return 'shs';
  if (['VII', 'VIII', 'IX', 'X'].includes(base)) return 'jhs';
  if (['I', 'II', 'III', 'IV', 'V', 'VI'].includes(base)) return 'elem';
  return 'preschool'; // N1, N2, K, S
}

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [teacher, setTeacher] = useState<Teacher | null | undefined>(undefined); // undefined = loading
  const [allClasses, setAllClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignId, setAssignId] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  // classId → (subjectCode → teacherId|null): who teaches each offered subject.
  const [classLoads, setClassLoads] = useState<Record<string, Record<string, number | null>>>({});
  const [subjBusy, setSubjBusy] = useState<string | null>(null); // "classId:subjectCode"
  const [subjErr, setSubjErr] = useState<string | null>(null);

  const numId = Number(id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || Number.isNaN(numId)) {
        setTeacher(null);
        return;
      }
      try {
        const [t, classes, studs, subs] = await Promise.all([
          getTeacher(numId),
          listClasses(),
          listStudentsLite(),
          listSubjects(),
        ]);
        if (cancelled) return;
        setTeacher(t);
        setAllClasses(classes);
        setStudents(studs);
        setSubjects(subs);
      } catch {
        if (!cancelled) setTeacher(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, numId]);

  // Sections this teacher advises — latest SY first, then grade level.
  const advisedClasses = useMemo(
    () =>
      allClasses
        .filter((c) => c.adviser.id === numId)
        .sort((a, b) => b.sy.localeCompare(a.sy) || a.gradeLevel.localeCompare(b.gradeLevel)),
    [allClasses, numId],
  );
  const rosterByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of advisedClasses) m.set(c.id, students.filter((s) => s.currentClassId === c.id).length);
    return m;
  }, [advisedClasses, students]);

  // Load each advised section's teaching load (which teacher teaches each subject)
  // so the checkboxes reflect the current state and we can toggle non-destructively.
  const advisedIds = advisedClasses.map((c) => c.id).join(',');
  useEffect(() => {
    let cancelled = false;
    const ids = advisedIds ? advisedIds.split(',') : [];
    if (ids.length === 0) {
      setClassLoads({});
      return;
    }
    (async () => {
      try {
        const entries = await Promise.all(
          ids.map(async (cid) => {
            const rows = await listClassSubjects(cid);
            const map: Record<string, number | null> = {};
            for (const r of rows) map[r.subjectCode] = r.teacherId;
            return [cid, map] as const;
          }),
        );
        if (!cancelled) setClassLoads(Object.fromEntries(entries));
      } catch {
        /* leave loads empty; toggles will still create rows */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [advisedIds]);

  async function toggleSubject(cls: ClassRecord, subjectCode: string, teach: boolean) {
    const key = `${cls.id}:${subjectCode}`;
    setSubjBusy(key);
    setSubjErr(null);
    try {
      await assignTeacherSubject(cls.id, subjectCode, teach ? numId : null);
      setClassLoads((prev) => ({
        ...prev,
        [cls.id]: { ...(prev[cls.id] ?? {}), [subjectCode]: teach ? numId : null },
      }));
    } catch (e) {
      setSubjErr(e instanceof Error ? e.message : 'Could not save the subject.');
    } finally {
      setSubjBusy(null);
    }
  }

  // Sections available to assign: the current SY's sections this teacher doesn't already advise.
  const targetSy =
    currentSY && currentSY.code !== ALL_TIME_CODE
      ? currentSY.code
      : [...allClasses].map((c) => c.sy).sort().pop();
  const assignable = useMemo(
    () =>
      allClasses
        .filter((c) => c.sy === targetSy && c.adviser.id !== numId)
        .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName)),
    [allClasses, targetSy, numId],
  );

  async function assignAdvisory() {
    const cls = allClasses.find((c) => c.id === assignId);
    if (!cls || !teacher) return;
    setAssignBusy(true);
    setAssignErr(null);
    try {
      await setClassAdviser(cls.id, numId);
      setAllClasses((cur) => cur.map((c) => (c.id === cls.id ? { ...c, adviser: teacher } : c)));
      setAssignId('');
    } catch (e) {
      setAssignErr(e instanceof Error ? e.message : 'Could not assign advisory.');
    } finally {
      setAssignBusy(false);
    }
  }

  if (teacher === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No teacher with id {id}.</p>
      </div>
    );
  }

  const isActive = teacher.yearEnded === 0;
  const fullName = `${teacher.title} ${teacher.familyName}, ${teacher.firstName} ${teacher.middleInitial}`;
  const initials = (teacher.firstName.charAt(0) + teacher.familyName.charAt(0)) || '?';

  return (
    <>
      <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: fullName }]} />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted font-bold text-[28px]">
              {initials}
            </div>
          }
          name={`${teacher.firstName} ${teacher.familyName}`}
          subtitle={teacher.title.replace('.', '') + (isActive ? ' · Active' : ' · Ended')}
          ids={[
            { label: 'ID', value: <span className="font-mono">#{teacher.id}</span> },
            { label: 'Email', value: <span className="font-mono text-[10.5px]">{teacher.email}</span> },
            { label: 'Status', value: <StatusBadge tone={isActive ? 'ok' : 'na'}>{isActive ? 'Active' : 'Ended'}</StatusBadge> },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit profile
              </Button>
              <Button variant="outline" className="justify-start gap-2 w-full">
                <KeyRound className="w-3.5 h-3.5" /> Reset password
              </Button>
              <Button variant="outline" className="justify-start gap-2 w-full">
                <FileText className="w-3.5 h-3.5" /> Sign roster
              </Button>
            </>
          }
          anchors={[
            { id: 'profile', label: 'Profile' },
            { id: 'advisory', label: 'Advisory' },
            { id: 'subjects', label: 'Subjects' },
            { id: 'gradesheet', label: 'Grade-Sheet' },
          ]}
          activeAnchor="profile"
        />
        <div className="flex flex-col gap-3.5 flex-1 min-w-0">
          <SectionCard id="profile" heading="Profile">
            <KeyValueGrid
              rows={[
                { label: 'Title', value: teacher.title },
                { label: 'Family Name', value: teacher.familyName },
                { label: 'First Name', value: teacher.firstName },
                { label: 'M.I.', value: teacher.middleInitial || '—' },
                { label: 'Year started', value: `${teacher.yearStarted}` },
                { label: 'Year ended', value: isActive ? '— (still active)' : `${teacher.yearEnded}` },
                { label: 'Curriculum', value: teacher.curriculum || '—' },
                { label: 'Email', value: teacher.email },
              ]}
            />
          </SectionCard>

          <SectionCard id="advisory" heading="Advisory">
            {/* Assign this teacher as adviser of a section for the current SY. */}
            <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
              <span className="text-[11.5px] text-ink-muted">Assign advisory{targetSy ? ` (SY ${targetSy})` : ''}:</span>
              <select
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                className="flex-1 min-w-[220px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
              >
                <option value="">Choose a section…</option>
                {assignable.map((c) => (
                  <option key={c.id} value={c.id}>
                    Grade {c.gradeLevel} · {c.sectionName}
                    {c.adviser.id !== 0 ? ` — now: ${c.adviser.familyName}` : ''}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={!assignId || assignBusy} onClick={assignAdvisory} className="gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> {assignBusy ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
            {assignErr && <p className="mb-2 px-1 text-[12px] text-nps-red">{assignErr}</p>}
            {assignable.length === 0 && (
              <p className="mb-2 px-1 text-[11.5px] text-ink-muted">
                No other sections for {targetSy ?? 'this SY'} to assign.
              </p>
            )}

            {advisedClasses.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary px-1">Not assigned to any class this SY.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {advisedClasses.map((c) => {
                  const count = rosterByClass.get(c.id) ?? 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/classes/${c.id}`)}
                      className="flex items-center justify-between bg-app border border-border-soft rounded p-3 hover:bg-panel-alt text-left"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-4 h-4 text-ink-muted" />
                        <div>
                          <div className="text-[13px] text-ink-primary font-semibold">
                            Grade {c.gradeLevel} · {c.sectionName}
                          </div>
                          <div className="text-[11.5px] text-ink-muted">
                            {c.curriculum} · {c.sy}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11.5px] text-ink-secondary">{count} learners →</span>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard id="subjects" heading="Subjects Taught">
            <p className="text-[12px] text-ink-secondary px-1 mb-3">
              Tick the subjects this teacher handles in each advised section. What you tick here is
              exactly what shows up in the teacher's Gradebook. (For subjects in sections this teacher
              does <span className="font-medium">not</span> advise, use the section's own{' '}
              <span className="font-medium">Load</span> tab.)
            </p>
            {subjErr && <p className="mb-2 px-1 text-[12px] text-nps-red">{subjErr}</p>}
            {advisedClasses.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary px-1">
                Assign an advisory section above first, then tick the subjects here.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {advisedClasses.map((cls) => {
                  const level = levelOfGrade(cls.gradeLevel);
                  const applicable = subjects.filter((s) => !s.level || s.level === level);
                  const load = classLoads[cls.id] ?? {};
                  return (
                    <div key={cls.id}>
                      <div className="text-[12.5px] font-semibold text-ink-primary mb-1.5 px-1">
                        Grade {cls.gradeLevel} · {cls.sectionName}{' '}
                        <span className="text-ink-muted font-normal">· {cls.sy}</span>
                      </div>
                      {applicable.length === 0 ? (
                        <p className="px-1 text-[11.5px] text-ink-muted italic">
                          No subjects set up for this level yet (Setup → Subjects).
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {applicable.map((s) => {
                            const holder = load[s.code];
                            const mine = holder === numId;
                            const takenByOther = holder != null && holder !== numId;
                            const key = `${cls.id}:${s.code}`;
                            return (
                              <label
                                key={s.code}
                                className="flex items-center gap-2 text-[12.5px] text-ink-primary px-1 py-0.5 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={mine}
                                  disabled={subjBusy === key}
                                  onChange={(e) => toggleSubject(cls, s.code, e.target.checked)}
                                  className="accent-nps-red"
                                />
                                <span className="truncate">{s.fullName}</span>
                                {takenByOther && (
                                  <span className="text-[10.5px] text-ink-muted shrink-0">· taken</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard id="gradesheet" heading="Class Grade-Sheet">
            <p className="text-[12.5px] text-ink-secondary px-1">
              Grade encoding workflow is deferred to a later phase. Click an advisory class above to view the roster.
            </p>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
