import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import { teachers } from '@/mocks';
import type { ClassRecord } from '@/types';

const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: 'N1', label: 'Nursery 1' },
  { value: 'N2', label: 'Nursery 2' },
  { value: 'K', label: 'Kinder' },
  { value: 'I', label: 'Grade I' },
  { value: 'II', label: 'Grade II' },
  { value: 'III', label: 'Grade III' },
  { value: 'IV', label: 'Grade IV' },
  { value: 'V', label: 'Grade V' },
  { value: 'VI', label: 'Grade VI' },
  { value: 'VII', label: 'Grade VII' },
  { value: 'VIII', label: 'Grade VIII' },
  { value: 'IX', label: 'Grade IX' },
  { value: 'X', label: 'Grade X' },
  { value: 'XI-GAS', label: 'Grade XI — GAS' },
  { value: 'XI-HUMSS', label: 'Grade XI — HUMSS' },
  { value: 'XI-STEM', label: 'Grade XI — STEM' },
  { value: 'XI-ABM', label: 'Grade XI — ABM' },
  { value: 'XII-GAS', label: 'Grade XII — GAS' },
  { value: 'XII-HUMSS', label: 'Grade XII — HUMSS' },
  { value: 'XII-STEM', label: 'Grade XII — STEM' },
  { value: 'XII-ABM', label: 'Grade XII — ABM' },
  { value: 'S', label: 'SPED' },
];

interface Props {
  klass?: ClassRecord;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export function ClassForm({ klass, onSubmit, onCancel, submitLabel }: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-2xl">
      <SectionCard heading="Class">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="School Year" required>
            <Input value="SY 2025–2026" disabled />
          </Field>
          <Field label="Curriculum">
            <Input defaultValue={klass?.curriculum ?? 'Kto12-B'} />
          </Field>
          <Field label="Grade Level" required>
            <Select defaultValue={klass?.gradeLevel ?? ''}>
              <option value="" disabled>
                Choose…
              </option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section Name" required hint="Saint or province name (e.g. St. John Vianney)">
            <Input placeholder="Section name" defaultValue={klass?.sectionName} />
          </Field>
          <Field label="Adviser" required span={2}>
            <Select defaultValue={klass?.adviser.id ?? ''}>
              <option value="" disabled>
                Choose a teacher…
              </option>
              {teachers
                .filter((t) => t.yearEnded === 0)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.familyName}, {t.firstName} {t.middleInitial}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </SectionCard>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
