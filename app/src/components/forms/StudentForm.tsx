import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import { classes } from '@/mocks';
import type { Student } from '@/types';

const RELIGIONS = [
  'Roman Catholic',
  'Born Again Christian',
  'Iglesia ni Cristo',
  'Seventh-Day Adventist',
  'Islam',
  'Buddhist',
  'Other',
];

const CRED_FIELDS: { key: keyof Student['credentials']; label: string; gradeNote?: string }[] = [
  { key: 'bc', label: 'Photocopy of Birth Certificate (BC)' },
  { key: 'bp', label: 'Photocopy of Baptismal Certificate (BP)' },
  { key: 'hc', label: 'Health Certificate (HC)' },
  { key: 'pix', label: '1 Recent 1×1 ID Picture (Pix)' },
  { key: 'rf', label: 'Recommendation Form (RF)' },
  { key: 'f137', label: 'Form 137 / Form 10 (F137)', gradeNote: 'Transferees only' },
  { key: 'rc', label: 'Certification / Report Card (RC)', gradeNote: 'Grades N–VI' },
  { key: 'gmc', label: 'Good Moral Certificate (GMC)', gradeNote: 'Grades II–VI' },
];

interface Props {
  student?: Student;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export function StudentForm({ student, onSubmit, onCancel, submitLabel }: Props) {
  const [credentials, setCredentials] = useState<Record<string, boolean>>(() =>
    student
      ? Object.fromEntries(Object.entries(student.credentials).map(([k, v]) => [k, v === 'on-file']))
      : {},
  );

  function toggleCred(key: string) {
    setCredentials((c) => ({ ...c, [key]: !c[key] }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-3xl">
      <SectionCard heading="Identity">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="LRN" hint="12 digits. First 6 = origin school ID." required>
            <Input maxLength={12} placeholder="403875240042" defaultValue={student?.lrn} />
          </Field>
          <Field label="Student No.">
            <Input
              defaultValue={student?.studentNo}
              placeholder={student ? '' : 'Auto-generated on save'}
              disabled={!student}
            />
          </Field>
          <Field label="First Name" required>
            <Input placeholder="e.g. Maria Clara" defaultValue={student?.firstName} />
          </Field>
          <Field label="Middle Name (Mother's Maiden Surname)">
            <Input placeholder="e.g. Reyes" defaultValue={student?.middleName} />
          </Field>
          <Field label="Last Name" required>
            <Input placeholder="e.g. Dela Cruz" defaultValue={student?.lastName} />
          </Field>
          <Field label="Extension">
            <Input placeholder="Jr., II, III (optional)" defaultValue={student?.extension} />
          </Field>
          <Field label="Gender" required>
            <Select defaultValue={student?.gender ?? ''}>
              <option value="" disabled>
                Choose…
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </Field>
          <Field label="Birthdate" required>
            <Input type="date" defaultValue={student?.birthdate} />
          </Field>
          <Field label="Religion">
            <Select defaultValue={student?.religion ?? 'Roman Catholic'}>
              {RELIGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Contact">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Address" required span={2}>
            <Input
              placeholder="Barangay, City/Municipality, Province"
              defaultValue={student?.address}
            />
          </Field>
          <Field label="Contact Number" required>
            <Input placeholder="0917 xxx xxxx" defaultValue={student?.contactNumber} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Family">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Father's Name">
            <Input placeholder="Full name" defaultValue={student?.fatherName} />
          </Field>
          <Field label="Mother's Maiden Name" required>
            <Input placeholder="Full name (maiden)" defaultValue={student?.motherMaidenName} />
          </Field>
          <Field label="Guardian">
            <Select defaultValue={student?.guardianRelation ?? 'Father'}>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="School Context">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="School Year" required>
            <Input value="SY 2025–2026" disabled />
          </Field>
          <Field label="Curriculum">
            <Input defaultValue={student?.curriculum ?? 'Kto12-B'} />
          </Field>
          <Field label="Class (Grade & Section)" required span={2}>
            <Select defaultValue={student?.currentClassId ?? ''}>
              <option value="" disabled>
                Choose a class…
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Grade {c.gradeLevel} · {c.sectionName} · {c.adviser.title} {c.adviser.familyName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Origin (for transferees)">
        <p className="text-[11.5px] text-ink-muted mb-2 px-1">
          Leave blank if this is the student's first year at NPS.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Elementary School Graduated From">
            <Input
              placeholder="School name (or leave blank)"
              defaultValue={student?.elemSchoolGraduatedFrom}
            />
          </Field>
          <Field label="School Type">
            <Select defaultValue={student?.schoolType ?? ''}>
              <option value="">—</option>
              <option value="Public">Public</option>
              <option value="Private">Private</option>
              <option value="SUC">SUC</option>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Credentials submitted">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
          {CRED_FIELDS.map((c) => (
            <label
              key={c.key}
              className="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-app rounded -mx-1 px-1"
            >
              <input
                type="checkbox"
                checked={!!credentials[c.key]}
                onChange={() => toggleCred(c.key)}
                className="mt-0.5 accent-accent"
              />
              <div>
                <div className="text-[12.5px] text-ink-primary">{c.label}</div>
                {c.gradeNote && <div className="text-[11px] text-ink-muted">{c.gradeNote}</div>}
              </div>
            </label>
          ))}
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
