import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { StudentForm } from '@/components/forms/StudentForm';
import { saveStudent } from '@/lib/db';

export default function AddStudent() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Add Student' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Add Student</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Enrolment and demographic record. <span className="text-pending-fg">*</span> = required.
        </p>
      </div>
      <StudentForm
        onSubmit={async (data) => {
          await saveStudent(data);
          navigate(`/students/${data.lrn}`);
        }}
        onCancel={() => navigate('/students')}
        submitLabel="Save Student"
      />
    </>
  );
}
