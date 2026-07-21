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
  listTeacherLoad,
  assignTeacherSubject,
} from '@/lib/db';
import { subjectFitsSection } from '@/lib/forms';
import { ALL_TIME_CODE, type Teacher, type ClassRecord, type SchoolYear, type Student, type Subject } from '@/types';

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
  // This teacher's teaching assignments (which subject in which section).
  const [myLoad, setMyLoad] = useState<{ classId: string; subjectCode: string }[]>([]);
  const [sectionText, setSectionText] = useState('');
  const [selSection, setSelSection] = useState(''); // classId
  const [subjectText, setSubjectText] = useState('');
  const [selSubject, setSelSubject] = useState(''); // subject code
  const [taBusy, setTaBusy] = useState(false);
  const [taErr, setTaErr] = useState<string | null>(null);


  const numId = Number(id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || Number.isNaN(numId)) {
        setTeacher(null);
        return;
      }
      try {
        const [t, classes, studs, subs, load] = await Promise.all([
          getTeacher(numId),
          listClasses(),
          listStudentsLite(),
          listSubjects(),
          listTeacherLoad(numId),
        ]);
        if (cancelled) return;
        setTeacher(t);
        setAllClasses(classes);
        setStudents(studs);
        setSubjects(subs);
        setMyLoad(load);
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

  // ── Teaching Assignments: choose a section → a subject → Assign ──
  const sectionLabel = (c: ClassRecord) => `Grade ${c.gradeLevel} · ${c.sectionName}`;
  const classById = useMemo(() => {
    const m = new Map<string, ClassRecord>();
    for (const c of allClasses) m.set(c.id, c);
    return m;
  }, [allClasses]);
  const subjectByCode = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of subjects) m.set(s.code.toUpperCase(), s);
    return m;
  }, [subjects]);
  const selSectionObj = selSection ? classById.get(selSection) : undefined;
  const subjOptions = useMemo(
    () => (selSectionObj ? subjects.filter((s) => subjectFitsSection(s.level, selSectionObj.gradeLevel)) : []),
    [subjects, selSectionObj],
  );
  const subjLabel = (s: Subject) => `${s.fullName} (${s.code})`;

  async function addAssignment() {
    if (!selSection || !selSubject) return;
    setTaBusy(true);
    setTaErr(null);
    try {
      await assignTeacherSubject(selSection, selSubject, numId);
      setMyLoad((prev) =>
        prev.some((x) => x.classId === selSection && x.subjectCode === selSubject)
          ? prev
          : [...prev, { classId: selSection, subjectCode: selSubject }],
      );
      setSelSubject('');
      setSubjectText('');
    } catch (e) {
      setTaErr(e instanceof Error ? e.message : 'Could not assign the subject.');
    } finally {
      setTaBusy(false);
    }
  }

  async function removeAssignment(classId: string, subjectCode: string) {
    setTaErr(null);
    try {
      await assignTeacherSubject(classId, subjectCode, null);
      setMyLoad((prev) => prev.filter((x) => !(x.classId === classId && x.subjectCode === subjectCode)));
    } catch (e) {
      setTaErr(e instanceof Error ? e.message : 'Could not remove the assignment.');
    }
  }

  // Assignments grouped by section for display.
  const loadBySection = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of myLoad) {
      if (!m.has(a.classId)) m.set(a.classId, []);
      m.get(a.classId)!.push(a.subjectCode);
    }
    return m;
  }, [myLoad]);

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

          <SectionCard id="subjects" heading="Teaching Assignments">
            <p className="text-[12px] text-ink-secondary px-1 mb-3">
              Choose a section, then a subject, then <span className="font-medium">Assign</span>. What
              you assign here is exactly what shows up in the teacher's Gradebook (subjects + the
              section's class list).
            </p>

            {/* Choose a section → a subject → Assign */}
            <div className="flex flex-wrap items-end gap-2 mb-2 px-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-ink-muted">Section</label>
                <input
                  list="ta-sections"
                  value={sectionText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSectionText(v);
                    const hit = allClasses.find((c) => c.sy === targetSy && sectionLabel(c) === v);
                    setSelSection(hit ? hit.id : '');
                    setSelSubject('');
                    setSubjectText('');
                  }}
                  placeholder="Search a section…"
                  className="w-[240px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                />
                <datalist id="ta-sections">
                  {allClasses
                    .filter((c) => c.sy === targetSy)
                    .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName))
                    .map((c) => (
                      <option key={c.id} value={sectionLabel(c)} />
                    ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-ink-muted">Subject</label>
                <input
                  list="ta-subjects"
                  value={subjectText}
                  disabled={!selSection}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSubjectText(v);
                    const hit = subjOptions.find((s) => subjLabel(s) === v);
                    setSelSubject(hit ? hit.code : '');
                  }}
                  placeholder={selSection ? 'Search a subject…' : 'Choose a section first'}
                  className="w-[260px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary disabled:opacity-50"
                />
                <datalist id="ta-subjects">
                  {subjOptions.map((s) => (
                    <option key={s.code} value={subjLabel(s)} />
                  ))}
                </datalist>
              </div>
              <Button size="sm" disabled={!selSection || !selSubject || taBusy} onClick={addAssignment} className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> {taBusy ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
            {taErr && <p className="mb-2 px-1 text-[12px] text-nps-red">{taErr}</p>}

            {/* Current assignments, grouped by section */}
            {myLoad.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary px-1">No teaching assignments yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5 mt-1">
                {[...loadBySection.entries()]
                  .sort((a, b) => {
                    const ca = classById.get(a[0]);
                    const cb = classById.get(b[0]);
                    return (ca && cb ? ca.gradeLevel.localeCompare(cb.gradeLevel) || ca.sectionName.localeCompare(cb.sectionName) : 0);
                  })
                  .map(([cid, codes]) => {
                    const cls = classById.get(cid);
                    return (
                      <div key={cid} className="rounded-lg border border-border-soft bg-app/40 px-3 py-2.5">
                        <div className="text-[12.5px] font-semibold text-ink-primary mb-2">
                          {cls ? `Grade ${cls.gradeLevel} · ${cls.sectionName}` : cid}
                          {cls && <span className="text-ink-muted font-normal"> · {cls.sy}</span>}
                          {cls && cls.adviser.id === numId && (
                            <span className="ml-1.5 inline-block rounded bg-panel border border-border-soft px-1.5 py-0.5 text-[10px] font-normal text-ink-muted align-middle">
                              Advisor
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {codes.map((code) => {
                            const s = subjectByCode.get(code.toUpperCase());
                            return (
                              <span
                                key={code}
                                className="inline-flex items-center rounded-full border border-border-soft bg-panel text-[12px] text-ink-primary overflow-hidden"
                              >
                                <button
                                  onClick={() => navigate(`/teachers/${id}/sheet/${cid}/${encodeURIComponent(code)}`)}
                                  className="pl-3 pr-2 py-1 hover:text-accent"
                                  title="Open this class's grade sheet"
                                >
                                  {s?.fullName ?? code}
                                </button>
                                <button
                                  onClick={() => removeAssignment(cid, code)}
                                  className="px-2 py-1 text-ink-muted hover:text-nps-red border-l border-border-soft"
                                  aria-label="Remove assignment"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </SectionCard>

          <SectionCard id="gradesheet" heading="Class Grade-Sheet">
            <p className="text-[12.5px] text-ink-secondary px-1">
              Click a subject in the Teaching Assignments above to open that class's full grade sheet
              (read-only) on its own page.
            </p>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
