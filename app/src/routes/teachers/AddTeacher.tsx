import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { TeacherForm } from '@/components/forms/TeacherForm';

export default function AddTeacher() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: 'Add Teacher' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Add Teacher</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          New teacher record. The teacher will receive a temporary password they'll be required to
          change on first sign-in.
        </p>
      </div>
      <TeacherForm
        onSubmit={() => navigate('/teachers')}
        onCancel={() => navigate('/teachers')}
        submitLabel="Create Teacher"
      />
    </>
  );
}
