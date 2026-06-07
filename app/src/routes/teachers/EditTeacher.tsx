import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { TeacherForm } from '@/components/forms/TeacherForm';
import { getTeacher, saveTeacher } from '@/lib/db';
import type { Teacher } from '@/types';

export default function EditTeacher() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const numId = Number(id);
      if (!id || Number.isNaN(numId)) {
        setTeacher(null);
        return;
      }
      try {
        const t = await getTeacher(numId);
        if (!cancelled) setTeacher(t);
      } catch {
        if (!cancelled) setTeacher(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (teacher === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Teachers', to: '/teachers' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }

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
          Profile and account fields.
        </p>
      </div>
      <TeacherForm
        teacher={teacher}
        onSubmit={async (data) => {
          await saveTeacher(data, teacher.id);
          back();
        }}
        onCancel={back}
        submitLabel="Save changes"
      />
    </>
  );
}
