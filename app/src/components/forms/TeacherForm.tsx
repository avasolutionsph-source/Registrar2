import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import { type TeacherInput } from '@/lib/db';
import type { Teacher } from '@/types';

const TITLES = ['Mrs.', 'Mr.', 'Ms.', 'Dr.', 'Fr.', 'Sr.', 'Br.'];

interface Props {
  teacher?: Teacher;
  onSubmit: (data: TeacherInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function TeacherForm({ teacher, onSubmit, onCancel, submitLabel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const input: TeacherInput = {
      title: get('title'),
      middleInitial: get('middleInitial'),
      firstName: get('firstName'),
      familyName: get('familyName'),
      email: get('email'),
      yearStarted: Number(get('yearStarted')) || new Date().getFullYear(),
      // 0 = still active. Only editable when editing an existing teacher.
      yearEnded: teacher ? Number(get('yearEnded')) || 0 : 0,
      isAdviser: teacher?.isAdviser ?? false,
      curriculum: get('curriculum') || 'Kto12-B',
    };

    if (!input.title) {
      setError('Title is required.');
      return;
    }
    if (!input.firstName || !input.familyName) {
      setError('First name and family name are required.');
      return;
    }
    if (!input.email) {
      setError('Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the teacher.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-2xl">
      <SectionCard heading="Identity">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Title" required>
            <Select name="title" defaultValue={teacher?.title ?? ''} required>
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
            <Input name="middleInitial" placeholder="e.g. P." defaultValue={teacher?.middleInitial} />
          </Field>
          <Field label="First Name" required>
            <Input name="firstName" placeholder="e.g. Juliet" defaultValue={teacher?.firstName} required />
          </Field>
          <Field label="Family Name" required>
            <Input name="familyName" placeholder="e.g. De Vela" defaultValue={teacher?.familyName} required />
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Account">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Email" required hint="@nps.edu.ph for new accounts" span={2}>
            <Input
              name="email"
              type="email"
              placeholder="firstinitiallastname@nps.edu.ph"
              defaultValue={teacher?.email}
              required
            />
          </Field>
          <Field label="Year started" required>
            <Input
              name="yearStarted"
              type="number"
              min={1970}
              max={2100}
              defaultValue={teacher?.yearStarted ?? 2026}
              required
            />
          </Field>
          <Field label="Curriculum">
            <Input name="curriculum" defaultValue={teacher?.curriculum ?? 'Kto12-B'} />
          </Field>
          {teacher && (
            <Field label="Year ended" hint="Leave blank (or 0) if still active">
              <Input
                name="yearEnded"
                type="number"
                min={2000}
                max={2100}
                placeholder="—"
                defaultValue={teacher.yearEnded ? teacher.yearEnded : ''}
              />
            </Field>
          )}
        </div>
      </SectionCard>

      {!teacher && (
        <SectionCard heading="Account note">
          <p className="text-[12px] text-ink-secondary px-1">
            This creates the teacher's registrar record. Their sign-in account (email + password) is
            provisioned separately in Supabase Auth.
          </p>
        </SectionCard>
      )}

      {error && (
        <p className="text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
