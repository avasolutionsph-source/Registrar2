import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { TeacherForm } from '@/components/forms/TeacherForm';
import { saveTeacher } from '@/lib/db';

export default function AddTeacher() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: 'Add Teacher' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Add Teacher</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          New teacher record. Their sign-in account is provisioned separately in Supabase Auth.
        </p>
      </div>
      <TeacherForm
        onSubmit={async (data) => {
          await saveTeacher(data);
          navigate('/teachers');
        }}
        onCancel={() => navigate('/teachers')}
        submitLabel="Create Teacher"
      />
    </>
  );
}
