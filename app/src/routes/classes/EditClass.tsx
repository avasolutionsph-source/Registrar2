import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { ClassForm } from '@/components/forms/ClassForm';
import { getClassById } from '@/lib/studentLookup';

export default function EditClass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const klass = id ? getClassById(id) : undefined;

  if (!klass) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No class with id {id}.</p>
      </div>
    );
  }

  const back = () => navigate(`/classes/${klass.id}`);
  const label = `Grade ${klass.gradeLevel} · ${klass.sectionName}`;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Classes', to: '/classes' },
          { label, to: `/classes/${klass.id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Edit {label}</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Adviser, curriculum, and section name. Roster is managed from the class detail page.
        </p>
      </div>
      <ClassForm klass={klass} onSubmit={back} onCancel={back} submitLabel="Save changes" />
    </>
  );
}
