import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { ClassForm } from '@/components/forms/ClassForm';
import { getClass, saveClass } from '@/lib/db';
import type { ClassRecord } from '@/types';

export default function EditClass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [klass, setKlass] = useState<ClassRecord | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setKlass(null);
        return;
      }
      try {
        const c = await getClass(id);
        if (!cancelled) setKlass(c);
      } catch {
        if (!cancelled) setKlass(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (klass === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }

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
          Adviser, curriculum, and section name. Roster is managed from each student's record.
        </p>
      </div>
      <ClassForm
        klass={klass}
        onSubmit={async (data) => {
          await saveClass(data, klass.id);
          back();
        }}
        onCancel={back}
        submitLabel="Save changes"
      />
    </>
  );
}
