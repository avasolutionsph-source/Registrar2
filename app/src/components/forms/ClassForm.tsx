import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import { listTeachers, getActiveSchoolYear, type ClassInput } from '@/lib/db';
import type { ClassRecord, Teacher } from '@/types';

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
  // New strands (added; legacy GAS/HUMSS/STEM/ABM kept so prior-year sections stay intact)
  { value: 'XI-ASSH', label: 'Grade XI — ASSH' },
  { value: 'XI-STEM-ENG', label: 'Grade XI — STEM (Engineering)' },
  { value: 'XI-STEM-HA', label: 'Grade XI — STEM (Health Allied)' },
  { value: 'XII-ASSH', label: 'Grade XII — ASSH' },
  { value: 'XII-STEM-ENG', label: 'Grade XII — STEM (Engineering)' },
  { value: 'XII-STEM-HA', label: 'Grade XII — STEM (Health Allied)' },
  { value: 'S', label: 'SNED' },
];

interface Props {
  klass?: ClassRecord;
  onSubmit: (data: ClassInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function ClassForm({ klass, onSubmit, onCancel, submitLabel }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [adviserId, setAdviserId] = useState<string>(klass?.adviser.id ? String(klass.adviser.id) : '');
  const [syCode, setSyCode] = useState<string>(klass?.sy ?? '');
  const [syLabel, setSyLabel] = useState<string>('Active school year');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, sy] = await Promise.all([listTeachers(), getActiveSchoolYear()]);
        if (cancelled) return;
        setTeachers(t.filter((x) => x.yearEnded === 0));
        if (sy) {
          setSyLabel(sy.label);
          if (!klass) setSyCode(sy.code);
        }
      } catch {
        /* dropdown stays empty — saving still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [klass]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const input: ClassInput = {
      sy: syCode,
      gradeLevel: get('gradeLevel'),
      sectionName: get('sectionName'),
      adviserId: adviserId ? Number(adviserId) : null,
      curriculum: get('curriculum') || 'Kto12-B',
    };

    if (!input.gradeLevel) {
      setError('Grade level is required.');
      return;
    }
    if (!input.sectionName) {
      setError('Section name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the class.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-2xl">
      <SectionCard heading="Class">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="School Year" required>
            <Input value={syLabel} disabled />
          </Field>
          <Field label="Curriculum">
            <Input name="curriculum" defaultValue={klass?.curriculum ?? 'Kto12-B'} />
          </Field>
          <Field label="Grade Level" required>
            <Select name="gradeLevel" defaultValue={klass?.gradeLevel ?? ''} required>
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
            <Input name="sectionName" placeholder="Section name" defaultValue={klass?.sectionName} required />
          </Field>
          <Field label="Adviser" span={2} hint="Optional until teachers are added.">
            <Select value={adviserId} onChange={(e) => setAdviserId(e.target.value)}>
              <option value="">— None / unassigned —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.familyName}, {t.firstName} {t.middleInitial}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </SectionCard>

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
