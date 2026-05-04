import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { ClassForm } from '@/components/forms/ClassForm';

export default function AddClass() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: 'Add Class' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Add Class</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Create a new class section for the current school year.
        </p>
      </div>
      <ClassForm
        onSubmit={() => navigate('/classes')}
        onCancel={() => navigate('/classes')}
        submitLabel="Create Class"
      />
    </>
  );
}
