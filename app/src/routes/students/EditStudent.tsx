import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { StudentForm } from '@/components/forms/StudentForm';
import { getStudent, saveStudent } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import type { Student } from '@/types';

export default function EditStudent() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const s = await getStudent(lrn);
        if (!cancelled) setStudent(s);
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

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
  const back = () => navigate(`/students/${student.lrn}`);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Students', to: '/students' },
          { label: fullName, to: `/students/${student.lrn}` },
          { label: 'Edit' },
        ]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">
          Edit {student.firstName} {student.lastName}
        </h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          LRN <span className="font-mono">{student.lrn}</span> · changes save to the student record.
        </p>
      </div>
      <StudentForm
        student={student}
        onSubmit={async (data) => {
          // The form doesn't edit history/grades — carry them through unchanged.
          await saveStudent(
            {
              ...data,
              enrolmentHistory: student.enrolmentHistory,
              grades: student.grades,
              ncae: student.ncae,
              nat: student.nat,
            },
            student.lrn,
          );
          back();
        }}
        onCancel={back}
        submitLabel="Save changes"
      />
    </>
  );
}
