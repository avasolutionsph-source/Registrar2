import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { FullSheet } from '@/components/gradesheet/FullSheet';
import { getTeacher } from '@/lib/db';
import type { Teacher } from '@/types';

// One class × subject grade sheet, opened from a subject chip on the teacher
// profile. The sheet itself (full portal format + gated registrar editing) is
// the shared FullSheet component — this page only adds the teacher context.
export default function TeacherClassGradesheet() {
  const { id, classId, subjectCode } = useParams<{ id: string; classId: string; subjectCode: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getTeacher(Number(id))
      .then((t) => { if (!cancelled) setTeacher(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const teacherName = teacher
    ? `${teacher.title} ${teacher.familyName}, ${teacher.firstName}`.replace(/\s+/g, ' ').trim()
    : '';

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Teachers', to: '/teachers' },
          { label: teacherName || 'Teacher', to: `/teachers/${id ?? ''}` },
          { label: 'Grade Sheet' },
        ]}
      />
      <FullSheet
        classId={classId ?? ''}
        subjectCode={subjectCode ?? ''}
        teacherName={teacherName}
        actions={
          <button
            onClick={() => navigate(`/teachers/${id ?? ''}`)}
            className="h-9 rounded-md border border-border px-3 text-[13px] hover:bg-panel-alt"
          >
            ← Back to profile
          </button>
        }
      />
    </>
  );
}
