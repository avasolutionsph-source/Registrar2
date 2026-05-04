import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { StudentForm } from '@/components/forms/StudentForm';
import { getStudentByLrn } from '@/lib/studentLookup';
import { formatLastFirstMiddle } from '@/lib/format';

export default function EditStudent() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const student = lrn ? getStudentByLrn(lrn) : undefined;

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
        <h1 className="text-xl font-bold text-ink-primary">Edit {student.firstName} {student.lastName}</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          LRN <span className="font-mono">{student.lrn}</span> · changes save to the student record.
        </p>
      </div>
      <StudentForm student={student} onSubmit={back} onCancel={back} submitLabel="Save changes" />
    </>
  );
}
