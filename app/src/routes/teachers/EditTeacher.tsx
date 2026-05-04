import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { TeacherForm } from '@/components/forms/TeacherForm';
import { teachers } from '@/mocks';

export default function EditTeacher() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const teacher = teachers.find((t) => String(t.id) === id);

  if (!teacher) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No teacher with id {id}.</p>
      </div>
    );
  }

  const back = () => navigate(`/teachers/${teacher.id}`);
  const fullName = `${teacher.title} ${teacher.familyName}, ${teacher.firstName} ${teacher.middleInitial}`;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Teachers', to: '/teachers' },
          { label: fullName, to: `/teachers/${teacher.id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">
          Edit {teacher.firstName} {teacher.familyName}
        </h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Profile and account fields. Password reset is a separate action on the teacher detail page.
        </p>
      </div>
      <TeacherForm teacher={teacher} onSubmit={back} onCancel={back} submitLabel="Save changes" />
    </>
  );
}
