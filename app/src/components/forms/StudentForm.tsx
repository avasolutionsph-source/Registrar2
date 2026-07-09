import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { SectionCard } from '@/components/entity/SectionCard';
import { listClasses, getActiveSchoolYear, type StudentInput } from '@/lib/db';
import type { Student, ClassRecord, Gender, CredentialStatus } from '@/types';

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
  { key: 'f137', label: 'Form 137 / SF 10 (F137)', gradeNote: 'Transferees only' },
  { key: 'rc', label: 'Report Card (SF 9 / RC)', gradeNote: 'Grades N–VI' },
  { key: 'certEligibility', label: 'Certification of Eligibility' },
  { key: 'gmc', label: 'Good Moral Certificate (GMC)', gradeNote: 'Grades II–VI' },
  { key: 'esc', label: 'ESC Certificate / Voucher' },
  { key: 'diploma', label: 'Diploma' },
  { key: 'affidavit', label: 'Affidavit of Undertaking' },
  { key: 'confirmation', label: 'Confirmation Certificate' },
  { key: 'others', label: 'Others (specify below)' },
];

interface Props {
  student?: Student;
  onSubmit: (data: StudentInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function StudentForm({ student, onSubmit, onCancel, submitLabel }: Props) {
  const [credentials, setCredentials] = useState<Record<string, boolean>>(() =>
    student
      ? Object.fromEntries(Object.entries(student.credentials).map(([k, v]) => [k, v === 'on-file']))
      : {},
  );
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [activeSyCode, setActiveSyCode] = useState<string>('');
  const [classId, setClassId] = useState<string>(student?.currentClassId ?? '');
  const [syCode, setSyCode] = useState<string>(student?.currentSY ?? '');
  const [syLabel, setSyLabel] = useState<string>('Active school year');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reference data for the dropdowns (classes) and the active SY.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cls, sy] = await Promise.all([listClasses(), getActiveSchoolYear()]);
        if (cancelled) return;
        setClasses(cls);
        if (sy) {
          setSyLabel(sy.label);
          setActiveSyCode(sy.code);
          if (!student) setSyCode(sy.code);
        }
      } catch {
        /* dropdown stays empty — saving still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  function toggleCred(key: string) {
    setCredentials((c) => ({ ...c, [key]: !c[key] }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const creds = Object.fromEntries(
      CRED_FIELDS.map((c) => [c.key, credentials[c.key] ? 'on-file' : 'na']),
    ) as unknown as CredentialStatus;
    creds.othersText = get('othersText');

    const input: StudentInput = {
      lrn: get('lrn'),
      studentNo: get('studentNo'),
      firstName: get('firstName'),
      middleName: get('middleName'),
      lastName: get('lastName'),
      extension: get('extension'),
      gender: (get('gender') || 'Male') as Gender,
      birthdate: get('birthdate'),
      religion: get('religion') || 'Roman Catholic',
      address: get('address'),
      contactNumber: get('contactNumber'),
      fatherName: get('fatherName'),
      motherMaidenName: get('motherMaidenName'),
      guardianRelation: (get('guardianRelation') || 'Father') as Student['guardianRelation'],
      currentSY: syCode,
      currentClassId: classId,
      curriculum: get('curriculum') || 'Kto12-B',
      status: student?.status ?? 'Active',
      elemSchoolGraduatedFrom: get('elemSchoolGraduatedFrom'),
      schoolType: get('schoolType') as Student['schoolType'],
      credentials: creds,
    };

    // LRN is optional — Nursery/Kinder learners have none until enrolled in the DepEd
    // LIS, and some transferees/SNED arrive without one. If provided, it must be valid;
    // if blank, confirm the registrar really means to save without an LRN.
    if (input.lrn) {
      if (!/^\d{12}$/.test(input.lrn)) {
        setError('LRN must be exactly 12 digits (or leave it blank if none yet).');
        return;
      }
    } else if (!window.confirm('This learner has no LRN. Save without one?\n\nYou can add it later (e.g. once Kinder is enrolled in the DepEd LIS).')) {
      return;
    }
    if (!input.firstName || !input.lastName) {
      setError('First name and last name are required.');
      return;
    }
    if (!input.motherMaidenName) {
      setError("Mother's maiden name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the student.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-3xl">
      <SectionCard heading="Identity">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="LRN" hint="12 digits. Leave blank if none yet (Nursery/Kinder).">
            <Input name="lrn" maxLength={12} placeholder="403875240042 (or blank)" defaultValue={student?.lrn} />
          </Field>
          <Field label="Student No.">
            <Input
              name="studentNo"
              defaultValue={student?.studentNo}
              placeholder={student ? '' : 'Optional'}
              disabled={!student}
            />
          </Field>
          <Field label="First Name" required>
            <Input name="firstName" placeholder="e.g. Maria Clara" defaultValue={student?.firstName} required />
          </Field>
          <Field label="Middle Name (Mother's Maiden Surname)">
            <Input name="middleName" placeholder="e.g. Reyes" defaultValue={student?.middleName} />
          </Field>
          <Field label="Last Name" required>
            <Input name="lastName" placeholder="e.g. Dela Cruz" defaultValue={student?.lastName} required />
          </Field>
          <Field label="Extension">
            <Input name="extension" placeholder="Jr., II, III (optional)" defaultValue={student?.extension} />
          </Field>
          <Field label="Gender" required>
            <Select name="gender" defaultValue={student?.gender ?? ''} required>
              <option value="" disabled>
                Choose…
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </Field>
          <Field label="Birthdate" required>
            <Input name="birthdate" type="date" defaultValue={student?.birthdate} required />
          </Field>
          <Field label="Religion">
            <Select name="religion" defaultValue={student?.religion ?? 'Roman Catholic'}>
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
              name="address"
              placeholder="Barangay, City/Municipality, Province"
              defaultValue={student?.address}
              required
            />
          </Field>
          <Field label="Contact Number" required>
            <Input name="contactNumber" placeholder="0917 xxx xxxx" defaultValue={student?.contactNumber} required />
          </Field>
        </div>
      </SectionCard>

      <SectionCard heading="Family">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Father's Name">
            <Input name="fatherName" placeholder="Full name" defaultValue={student?.fatherName} />
          </Field>
          <Field label="Mother's Maiden Name" required>
            <Input
              name="motherMaidenName"
              placeholder="Full name (maiden)"
              defaultValue={student?.motherMaidenName}
              required
            />
          </Field>
          <Field label="Guardian">
            <Select name="guardianRelation" defaultValue={student?.guardianRelation ?? 'Father'}>
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
            <Input value={syLabel} disabled />
          </Field>
          <Field label="Curriculum">
            <Input name="curriculum" defaultValue={student?.curriculum ?? 'Kto12-B'} />
          </Field>
          <Field label="Class (Grade & Section)" span={2}>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— None / unassigned —</option>
              {classes
                .filter((c) => !activeSyCode || c.sy === activeSyCode || c.id === classId)
                .map((c) => (
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
          Fill in for ALL transferees — the school last attended (elementary, JHS, or
          where Grade 10 was completed for incoming Grade 11). Leave blank only if this is
          the learner's first year at NPS with no prior school.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <Field label="Previous School Attended">
            <Input
              name="elemSchoolGraduatedFrom"
              placeholder="School name (or leave blank)"
              defaultValue={student?.elemSchoolGraduatedFrom}
            />
          </Field>
          <Field label="School Type">
            <Select name="schoolType" defaultValue={student?.schoolType ?? ''}>
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
        <div className="px-1 mt-1">
          <Field label="Others — specify">
            <Input
              name="othersText"
              placeholder="e.g. Confirmation Certificate, special requirement…"
              defaultValue={student?.credentials?.othersText ?? ''}
            />
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
