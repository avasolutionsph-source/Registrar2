import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent, listClasses, getActiveSchoolYear, enrollStudentForSy } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import type { Student, ClassRecord, SchoolYear } from '@/types';

type Action = 'promoted' | 'retained' | 'irregular';
const ACTIONS: { value: Action; label: string }[] = [
  { value: 'promoted', label: 'Promoted — moving up from the previous grade' },
  { value: 'retained', label: 'Retained — repeating the grade' },
  { value: 'irregular', label: 'Irregular' },
];

const fieldCls =
  'w-full rounded border border-border bg-panel px-2.5 py-1.5 text-[13px] text-ink-primary focus:outline-none focus:border-ring';

export default function EnrollStudent() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [activeSY, setActiveSY] = useState<SchoolYear | null>(null);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState('');
  const [action, setAction] = useState<Action>('promoted');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const [s, sy, cls] = await Promise.all([getStudent(lrn), getActiveSchoolYear(), listClasses()]);
        if (cancelled) return;
        setStudent(s);
        setActiveSY(sy);
        setClasses(sy ? cls.filter((c) => c.sy === sy.code) : []);
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

  // Sort the active-year sections by grade then name for the picker.
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.sectionName.localeCompare(b.sectionName)),
    [classes],
  );
  const chosen = sortedClasses.find((c) => c.id === classId);

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
  const alreadyEnrolled = !!activeSY && student.currentSY === activeSY.code;

  async function save() {
    if (!student || !activeSY || !chosen) return;
    setSaving(true);
    setError(null);
    try {
      const adviserName = `${chosen.adviser.title} ${chosen.adviser.familyName}, ${chosen.adviser.firstName} ${chosen.adviser.middleInitial}`
        .replace(/\s+/g, ' ')
        .trim();
      await enrollStudentForSy(student.lrn, {
        sy: activeSY.code,
        classId: chosen.id,
        gradeLevel: chosen.gradeLevel,
        sectionName: chosen.sectionName,
        adviserName,
        action,
      });
      navigate(`/students/${student.lrn}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enroll the learner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[560px]">
      <Breadcrumb
        items={[
          { label: 'Students', to: '/students' },
          { label: fullName, to: `/students/${student.lrn}` },
          { label: 'Enroll' },
        ]}
      />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-ink-primary">Enroll Learner</h1>
          <p className="text-[12.5px] text-ink-secondary">
            {fullName} · LRN <span className="font-mono">{student.lrn}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/students/${student.lrn}`)} className="gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
      </div>

      <SectionCard heading={activeSY ? `Enrolling for SY ${activeSY.label.replace(/^SY\s*/, '')}` : 'Enrolment'}>
        {!activeSY ? (
          <p className="text-[12.5px] text-nps-red px-1">
            No active school year is set. Set one in Setup → School Year first.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5 px-1">
            {alreadyEnrolled && (
              <p className="text-[12px] text-ink-secondary bg-panel-alt border border-border rounded px-2.5 py-1.5">
                This learner is already enrolled for {activeSY.label}. Saving will update their section for this year.
              </p>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">Grade &amp; Section</span>
              <select className={fieldCls} value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select a section…</option>
                {sortedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Grade {c.gradeLevel} · {c.sectionName}
                    {c.adviser.familyName && c.adviser.familyName !== '—'
                      ? ` — ${c.adviser.title} ${c.adviser.familyName}`
                      : ''}
                  </option>
                ))}
              </select>
              {sortedClasses.length === 0 && (
                <span className="text-[11.5px] text-nps-red">
                  No sections exist for {activeSY.label}. Add classes in the Classes page first.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-ink-secondary">Enrolment type</span>
              <select className={fieldCls} value={action} onChange={(e) => setAction(e.target.value as Action)}>
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            {error && <p className="text-[12px] text-nps-red">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={save} disabled={saving || !chosen} className="gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                {saving ? 'Enrolling…' : `Enroll for ${activeSY.label.replace(/^SY\s*/, '')}`}
              </Button>
              <span className="text-[11.5px] text-ink-muted">Marks the learner Active for this school year.</span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
