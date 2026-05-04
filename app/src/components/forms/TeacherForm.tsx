import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import type { Teacher } from '@/types';

const TITLES = ['Mrs.', 'Mr.', 'Ms.', 'Dr.', 'Fr.', 'Sr.', 'Br.'];

interface Props {
  teacher?: Teacher;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export function TeacherForm({ teacher, onSubmit, onCancel, submitLabel }: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-2xl">
      <SectionCard heading="Identity">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Title" required>
            <Select defaultValue={teacher?.title ?? ''}>
              <option value="" disabled>
                Choose…
              </option>
              {TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="M.I." hint="Middle initial or full middle surname">
            <Input placeholder="e.g. P." defaultValue={teacher?.middleInitial} />
          </Field>
          <Field label="First Name" required>
            <Input placeholder="e.g. Juliet" defaultValue={teacher?.firstName} />
          </Field>
          <Field label="Family Name" required>
            <Input placeholder="e.g. De Vela" defaultValue={teacher?.familyName} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Account">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Email" required hint="@nps.edu.ph for new accounts" span={2}>
            <Input
              type="email"
              placeholder="firstinitiallastname@nps.edu.ph"
              defaultValue={teacher?.email}
            />
          </Field>
          <Field label="Year started" required>
            <Input
              type="number"
              min={2000}
              max={2100}
              defaultValue={teacher?.yearStarted ?? 2026}
            />
          </Field>
          <Field label="Curriculum">
            <Input defaultValue={teacher?.curriculum ?? 'Kto12-B'} />
          </Field>
        </div>
      </SectionCard>

      {!teacher && (
        <SectionCard heading="Initial password">
          <p className="text-[12px] text-ink-secondary px-1">
            A 12-character random password will be generated and shown once after save. The teacher
            must change it on first sign-in. Plaintext passwords are never stored.
          </p>
        </SectionCard>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
