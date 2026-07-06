import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, KeyRound, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { KeyValueGrid } from '@/components/entity/KeyValueGrid';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { getTeacher, listClasses, listStudentsLite } from '@/lib/db';
import type { Teacher, ClassRecord } from '@/types';

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null | undefined>(undefined); // undefined = loading
  const [advisedClasses, setAdvisedClasses] = useState<ClassRecord[]>([]);
  const [rosterByClass, setRosterByClass] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const numId = Number(id);
      if (!id || Number.isNaN(numId)) {
        setTeacher(null);
        return;
      }
      try {
        const [t, classes, students] = await Promise.all([
          getTeacher(numId),
          listClasses(),
          listStudentsLite(),
        ]);
        if (cancelled) return;
        setTeacher(t);
        // Latest school year first (current SY on top), then by grade level.
        const advised = classes
          .filter((c) => c.adviser.id === numId)
          .sort((a, b) => b.sy.localeCompare(a.sy) || a.gradeLevel.localeCompare(b.gradeLevel));
        setAdvisedClasses(advised);
        const counts = new Map<string, number>();
        for (const c of advised) {
          counts.set(c.id, students.filter((s) => s.currentClassId === c.id).length);
        }
        setRosterByClass(counts);
      } catch {
        if (!cancelled) setTeacher(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
