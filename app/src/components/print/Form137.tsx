import type { Student, Subject } from '@/types';
import {
  buildAcademicRecord,
  periodsForSy,
  formatSy,
  gradeLabel,
  SCHOOL,
  signatoryName,
  signatoryTitle,
  type YearRecord,
} from '@/lib/forms';
import { formatBirthdate } from '@/lib/format';
import { Letterhead } from './parts';

// Official NPS permanent-record templates:
//   • Elementary Pupil's Permanent Record  (Grades 1–6)
//   • Junior High School Permanent Record  (Grades 7–10)
// The grade band is auto-detected from the learner's latest enrolment; other
// levels (Kinder / SHS) fall back to a generic all-years scholastic record.

const fmtQ = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');
const ACTION_LABEL: Record<string, string> = {
  promoted: 'PROMOTED',
  retained: 'RETAINED',
  irregular: 'IRREGULAR',
};

// gradeLevel code → block (internal code + Arabic grade No. + "Promoted to" label)
interface Band {
  code: string;
  no: number;
  promotedTo: string;
}
const ELEM_BAND: Band[] = [
  { code: 'I', no: 1, promotedTo: 'Grade II' },
  { code: 'II', no: 2, promotedTo: 'Grade III' },
  { code: 'III', no: 3, promotedTo: 'Grade IV' },
  { code: 'IV', no: 4, promotedTo: 'Grade V' },
  { code: 'V', no: 5, promotedTo: 'Grade VI' },
  { code: 'VI', no: 6, promotedTo: 'Grade VII' },
];
const JHS_BAND: Band[] = [
  { code: 'VII', no: 7, promotedTo: 'Grade VIII' },
  { code: 'VIII', no: 8, promotedTo: 'Grade IX' },
  { code: 'IX', no: 9, promotedTo: 'Grade X' },
  { code: 'X', no: 10, promotedTo: 'Grade XI' },
];
const ELEM_CODES = new Set(ELEM_BAND.map((b) => b.code));
const JHS_CODES = new Set(JHS_BAND.map((b) => b.code));

function recordFor(records: YearRecord[], code: string): YearRecord | null {
  const m = records.filter((r) => r.gradeLevel === code);
  return m.length ? m[m.length - 1] : null;
}

function fullName(s: Student): string {
  return [s.lastName, [s.firstName, s.middleName, s.extension].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

// ── shared bits ─────────────────────────────────────────────────────────────
function HField({ label, value, className = '' }: { label: string; value?: string; className?: string }) {
  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span className="shrink-0 text-[9.5px] text-zinc-600">{label}</span>
      <span className="min-w-0 flex-1 border-b border-zinc-400 px-1 text-[10.5px] font-medium">
        {value || ' '}
      </span>
    </div>
  );
}

function GradeBlock({ band, rec }: { band: Band; rec: YearRecord | null }) {
  const periods = periodsForSy(rec?.sy);
  const rows = rec?.rows ?? [];
  const pad = Math.max(0, 9 - rows.length);
  return (
    <div className="break-inside-avoid">
      <div className="text-[9.5px] leading-tight">
        <span className="font-semibold">{gradeLabel(band.code)}/Section:</span>{' '}
        {rec?.sectionName || ''}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600">
        <span>School: {rec?.schoolName || SCHOOL.name}</span>
        <span>School Year: {rec ? formatSy(rec.sy) : ''}</span>
      </div>
      <table className="mt-0.5 w-full border-collapse text-[9.5px]">
        <thead>
          <tr className="bg-zinc-100 text-[8.5px] uppercase">
            <th className="border border-zinc-500 px-1 py-0.5 text-left">Subjects</th>
            {periods.map((p) => (
              <th key={p.key} className="w-6 border border-zinc-500 px-0.5 py-0.5">
                {p.short}
              </th>
            ))}
            <th className="w-9 border border-zinc-500 px-0.5 py-0.5">Final</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectCode} className={r.isMapehParent ? 'font-semibold' : undefined}>
              <td className={`border border-zinc-500 px-1 py-0.5 ${r.isMapehComponent ? 'pl-3 italic text-zinc-600' : ''}`}>
                {r.name}
              </td>
              {periods.map((p) => (
                <td key={p.key} className="border border-zinc-500 px-0.5 py-0.5 text-center">
                  {fmtQ(r[p.key])}
                </td>
              ))}
              <td className="border border-zinc-500 px-0.5 py-0.5 text-center font-semibold">
                {fmtQ(r.final)}
              </td>
            </tr>
          ))}
          {Array.from({ length: pad }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td className="border border-zinc-500 px-1 py-0.5">&nbsp;</td>
              {periods.map((p) => (
                <td key={p.key} className="border border-zinc-500" />
              ))}
              <td className="border border-zinc-500" />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between text-[9px]">
        <span>Promoted to: {band.promotedTo}</span>
        <span>General Average: {rec?.generalAverage ?? ''}</span>
      </div>
    </div>
  );
}

function AttendanceReport({ records, bands }: { records: YearRecord[]; bands: Band[] }) {
  return (
    <div className="mt-3">
      <h4 className="text-[9.5px] font-bold">Attendance Report</h4>
      <table className="mt-0.5 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-zinc-100 text-[8.5px] uppercase">
            <th className="border border-zinc-500 px-1 py-0.5">School Year</th>
            <th className="border border-zinc-500 px-1 py-0.5">Grade Level</th>
            <th className="border border-zinc-500 px-1 py-0.5">Number of School Days</th>
            <th className="border border-zinc-500 px-1 py-0.5">Number of Days Present</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => {
            const rec = recordFor(records, b.code);
            return (
              <tr key={b.code}>
                <td className="border border-zinc-500 px-1 py-0.5 text-center">
                  {rec ? formatSy(rec.sy) : ''}
                </td>
                <td className="border border-zinc-500 px-1 py-0.5 text-center">{b.no}</td>
                <td className="border border-zinc-500 px-1 py-0.5 text-center" />
                <td className="border border-zinc-500 px-1 py-0.5 text-center">
                  {rec?.daysPresent ?? ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// SF 10 carries District + Region on the form face (Form 137 did not). Shown
// only for the SF 10 variant.
function SF10Meta() {
  return (
    <section className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
      <HField label="District:" value={SCHOOL.district} />
      <HField label="Division:" value={SCHOOL.division} />
      <HField label="Region:" value={SCHOOL.region} />
      <HField label="School ID:" value={SCHOOL.id} />
    </section>
  );
}

function Certification({
  name,
  eligibleFor,
  variant = 'form137',
}: {
  name: string;
  eligibleFor: string;
  variant?: 'form137' | 'sf10';
}) {
  return (
    <div className="mt-4 break-inside-avoid">
      <h4 className="text-center text-[10px] font-bold uppercase tracking-wide">Certification</h4>
      <p className="mt-1 text-[9.5px] leading-snug">
        I CERTIFY that this is a true record of <span className="font-semibold">{name}</span>. This
        pupil is eligible for admission to <span className="font-semibold">{eligibleFor}</span>. Copy
        of this record is sent to the principal of __________________________ on ________________.
      </p>
      {variant === 'sf10' ? (
        // SF 10 carries a class-adviser/teacher signature alongside the registrar.
        // NPS teachers sign; for an SF 10 received from another school, the teacher's
        // name is typed in and the signature is left blank.
        <div className="mt-8 grid grid-cols-2 gap-12 text-[10px]">
          <div className="text-center">
            <div className="h-6" />
            <div className="border-t border-zinc-500 pt-1">&nbsp;</div>
            <div className="text-zinc-600">Class Adviser / Teacher</div>
          </div>
          <div className="text-center">
            <div className="h-6" />
            <div className="border-t border-zinc-500 pt-1 font-bold uppercase">{signatoryName('registrar')}</div>
            <div className="text-zinc-600">{signatoryTitle('registrar', 'School Registrar')}</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center text-[10px]">
          <div className="font-bold uppercase">{signatoryName('registrar')}</div>
          <div className="text-zinc-600">{signatoryTitle('registrar', 'Registrar')}</div>
        </div>
      )}
    </div>
  );
}

// ── Elementary Pupil's Permanent Record (Grades 1–6) ─────────────────────────
function ElementaryRecord({ student, records, title, variant = 'form137' }: { student: Student; records: YearRecord[]; title: string; variant?: 'form137' | 'sf10' }) {
  return (
    <div className="font-serif">
      <Letterhead docTitle={title} docSubtitle="Elementary Pupil's Permanent Record" />
      {variant === 'sf10' && <SF10Meta />}

      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <HField className="col-span-2" label="Name:" value={fullName(student)} />
        <HField label="Date of Birth:" value={student.birthdate ? formatBirthdate(student.birthdate) : ''} />
        <HField label="Gender:" value={student.gender} />
        <HField label="Place of Birth:" />
        <HField label="Nationality:" value="Filipino" />
        <HField label="Father's Name:" value={student.fatherName} />
        <HField label="Occupation:" />
        <HField label="Mother's Name:" value={student.motherMaidenName} />
        <HField label="Occupation:" />
        <HField label="Address:" value={student.address} />
        <HField label="LRN:" value={student.lrn} />
      </section>

      <EnrolmentHistory records={records} />

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {ELEM_BAND.map((b) => (
          <GradeBlock key={b.code} band={b} rec={recordFor(records, b.code)} />
        ))}
      </div>

      <AttendanceReport records={records} bands={ELEM_BAND.filter((b) => b.no >= 4)} />
      <Certification name={fullName(student)} eligibleFor="Grade VII" variant={variant} />
    </div>
  );
}

// ── Junior High School Permanent Record (Grades 7–10) ────────────────────────
function JhsRecord({ student, records, title, variant = 'form137' }: { student: Student; records: YearRecord[]; title: string; variant?: 'form137' | 'sf10' }) {
  return (
    <div className="font-serif">
      <Letterhead docTitle={title} docSubtitle="Junior High School Permanent Record" />
      {variant === 'sf10' && <SF10Meta />}

      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <HField className="col-span-2" label="Name:" value={fullName(student)} />
        <HField label="Date of Birth:" value={student.birthdate ? formatBirthdate(student.birthdate) : ''} />
        <HField label="Gender:" value={student.gender} />
        <HField label="Place of Birth:" />
        <HField label="Nationality:" value="Filipino" />
        <HField label="Father's Name:" value={student.fatherName} />
        <HField label="Occupation:" />
        <HField label="Mother's Name:" value={student.motherMaidenName} />
        <HField label="Occupation:" />
        <HField className="col-span-2" label="Address:" value={student.address} />
        <HField label="Elementary Course Completed:" value={student.elemSchoolGraduatedFrom} />
        <HField label="LRN:" value={student.lrn} />
      </section>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {JHS_BAND.map((b) => (
          <GradeBlock key={b.code} band={b} rec={recordFor(records, b.code)} />
        ))}
      </div>

      <AttendanceReport records={records} bands={JHS_BAND} />
      <Certification name={fullName(student)} eligibleFor="Grade XI" variant={variant} />
    </div>
  );
}

// Decorated enrolment-history grid (Elementary form only).
function EnrolmentHistory({ records }: { records: YearRecord[] }) {
  if (records.length === 0) return null;
  return (
    <table className="mt-2 w-full border-collapse text-[8.5px]">
      <thead>
        <tr className="bg-zinc-100 uppercase">
          <th className="border border-zinc-500 px-1 py-0.5">School Year</th>
          <th className="border border-zinc-500 px-1 py-0.5">School Attended</th>
          <th className="border border-zinc-500 px-1 py-0.5">Grade</th>
          <th className="border border-zinc-500 px-1 py-0.5">Days Present</th>
          <th className="border border-zinc-500 px-1 py-0.5">Final Rating</th>
          <th className="border border-zinc-500 px-1 py-0.5">Action Taken</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.sy}>
            <td className="border border-zinc-500 px-1 py-0.5 text-center">{formatSy(r.sy)}</td>
            <td className="border border-zinc-500 px-1 py-0.5">{r.schoolName || SCHOOL.name}</td>
            <td className="border border-zinc-500 px-1 py-0.5 text-center">{r.gradeName}</td>
            <td className="border border-zinc-500 px-1 py-0.5 text-center">{r.daysPresent ?? ''}</td>
            <td className="border border-zinc-500 px-1 py-0.5 text-center">{r.generalAverage ?? ''}</td>
            <td className="border border-zinc-500 px-1 py-0.5 text-center">
              {r.action ? ACTION_LABEL[r.action] ?? '' : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── generic fallback (Kinder / SHS / mixed) ──────────────────────────────────
function GenericRecord({ student, records, title, variant = 'form137' }: { student: Student; records: YearRecord[]; title: string; variant?: 'form137' | 'sf10' }) {
  return (
    <div className="font-serif">
      <Letterhead docTitle={title} docSubtitle="Permanent Scholastic Record — All Years" />
      {variant === 'sf10' && <SF10Meta />}
      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <HField className="col-span-2" label="Name:" value={fullName(student)} />
        <HField label="LRN:" value={student.lrn} />
        <HField label="Date of Birth:" value={student.birthdate ? formatBirthdate(student.birthdate) : ''} />
      </section>
      {records.length === 0 ? (
        <p className="mt-6 text-center text-[11px] text-zinc-500">No grades on record for this learner.</p>
      ) : (
        records.map((rec) => {
          const band: Band = {
            code: rec.gradeLevel ?? '',
            no: 0,
            promotedTo: rec.action ? ACTION_LABEL[rec.action] ?? '' : '',
          };
          return (
            <div key={rec.sy} className="mt-3">
              <GradeBlock band={band} rec={rec} />
            </div>
          );
        })
      )}
      <Certification name={fullName(student)} eligibleFor="the next grade level" variant={variant} />
    </div>
  );
}

interface Props {
  student: Student;
  subjects: Subject[];
  variant?: 'form137' | 'sf10';
}

export function Form137({ student, subjects, variant = 'form137' }: Props) {
  const records = buildAcademicRecord(student, subjects);
  const suffix = variant === 'sf10' ? 'SF 10' : 'Form 137';

  // Detect the grade band from the latest enrolment (fall back to current).
  const hist = student.enrolmentHistory ?? [];
  const latest = hist[hist.length - 1];
  const currentCode = latest?.gradeLevel ?? records[records.length - 1]?.gradeLevel ?? '';

  if (JHS_CODES.has(currentCode)) {
    return <JhsRecord student={student} records={records} title={`Junior High School Permanent Record · ${suffix}`} variant={variant} />;
  }
  if (ELEM_CODES.has(currentCode)) {
    return <ElementaryRecord student={student} records={records} title={`Elementary Pupil's Permanent Record · ${suffix}`} variant={variant} />;
  }
  return <GenericRecord student={student} records={records} title={`Permanent Academic Record · ${suffix}`} variant={variant} />;
}
