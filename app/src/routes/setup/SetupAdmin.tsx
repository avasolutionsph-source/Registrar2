import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { teachers, subjects } from '@/mocks';

const POSITIONS = [
  { key: 'registrar', label: 'Registrar' },
  { key: 'principal', label: 'Principal' },
  { key: 'coord_elem', label: 'Coordinator — Elementary' },
  { key: 'coord_hs', label: 'Coordinator — Junior HS' },
  { key: 'coord_shs', label: 'Coordinator — Senior HS' },
  { key: 'guidance', label: 'Guidance Coordinator' },
  { key: 'director', label: 'Director' },
  { key: 'finance', label: 'Finance' },
];

export default function SetupAdmin() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Admin' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Admin</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Assign teachers to school positions and Subject Area Coordinators. Drives auto-populated signatures on Form 137 / Form 138.
        </p>
      </div>

      <div className="flex flex-col gap-3.5 max-w-3xl">
        <SectionCard heading="School Positions">
          <p className="text-[11.5px] text-ink-muted mb-3 px-1">
            Each role can be vacant or assigned to one teacher.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
            {POSITIONS.map((p) => (
              <Field key={p.key} label={p.label}>
                <Select defaultValue="">
                  <option value="">— Vacant —</option>
                  {teachers
                    .filter((t) => t.yearEnded === 0)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} {t.familyName}, {t.firstName}
                      </option>
                    ))}
                </Select>
              </Field>
            ))}
          </div>
        </SectionCard>

        <SectionCard heading="Subject Area Coordinators">
          <p className="text-[11.5px] text-ink-muted mb-3 px-1">
            Coordinator per subject. Used for Form 137 signatory matrix.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
            {subjects.slice(0, 8).map((s) => (
              <Field key={s.code} label={`${s.code} · ${s.fullName}`}>
                <Select defaultValue="">
                  <option value="">— Vacant —</option>
                  {teachers
                    .filter((t) => t.yearEnded === 0)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} {t.familyName}, {t.firstName}
                      </option>
                    ))}
                </Select>
              </Field>
            ))}
          </div>
        </SectionCard>

        <div className="flex gap-2 justify-end">
          <Button variant="outline">Cancel</Button>
          <Button>Save assignments</Button>
        </div>
      </div>
    </>
  );
}
