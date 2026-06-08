// Shared building blocks for the printable forms: school letterhead, the
// learner-identity grid, and a signature row. Styled for paper (black on white).

import type { Student, ClassRecord } from '@/types';
import { formatBirthdate } from '@/lib/format';
import { SCHOOL, gradeLabel, formatSy } from '@/lib/forms';

export function Letterhead({ docTitle, docSubtitle }: { docTitle: string; docSubtitle?: string }) {
  return (
    <header className="text-center leading-tight">
      <div className="text-[10px] uppercase tracking-wide text-zinc-600">
        Republic of the Philippines · Department of Education
      </div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-600">
        {SCHOOL.region} · Division of {SCHOOL.division}
      </div>
      <h1 className="mt-1 text-[17px] font-bold uppercase tracking-wide">{SCHOOL.name}</h1>
      <div className="text-[10.5px] text-zinc-700">
        {SCHOOL.address} · School ID {SCHOOL.id} · {SCHOOL.type}
      </div>
      <h2 className="mt-2.5 text-[13px] font-bold uppercase tracking-[0.12em]">{docTitle}</h2>
      {docSubtitle && <div className="text-[10.5px] text-zinc-600">{docSubtitle}</div>}
    </header>
  );
}

function Field({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 flex-1 border-b border-zinc-400 px-1 text-[11px] font-medium">
        {value || ' '}
      </span>
    </div>
  );
}

export function LearnerInfo({ student }: { student: Student }) {
  const sex = student.gender === 'Female' ? 'F' : 'M';
  return (
    <section className="mt-3 grid grid-cols-12 gap-x-4 gap-y-1.5">
      <Field className="col-span-5" label="Last Name" value={student.lastName} />
      <Field className="col-span-4" label="First Name" value={student.firstName} />
      <Field className="col-span-3" label="Name Ext." value={student.extension} />
      <Field className="col-span-5" label="Middle Name" value={student.middleName} />
      <Field className="col-span-4" label="LRN" value={student.lrn} />
      <Field className="col-span-3" label="Sex" value={sex} />
      <Field
        className="col-span-5"
        label="Date of Birth"
        value={student.birthdate ? formatBirthdate(student.birthdate) : ''}
      />
      <Field className="col-span-7" label="Student No." value={student.studentNo} />
    </section>
  );
}

// Class-level document header (letterhead + grade/section/SY/adviser line).
export function ClassHeader({ klass, docTitle }: { klass: ClassRecord; docTitle: string }) {
  const adviser = `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`
    .replace(/\s+/g, ' ')
    .trim();
  return (
    <>
      <Letterhead docTitle={docTitle} />
      <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-0.5 text-[10.5px]">
        <span>
          <span className="text-zinc-500">Grade &amp; Section: </span>
          <span className="font-semibold">
            {gradeLabel(klass.gradeLevel)} – {klass.sectionName}
          </span>
        </span>
        <span>
          <span className="text-zinc-500">S.Y.: </span>
          <span className="font-semibold">{formatSy(klass.sy)}</span>
        </span>
        <span>
          <span className="text-zinc-500">Adviser: </span>
          <span className="font-semibold">{adviser}</span>
        </span>
      </div>
    </>
  );
}

export function SignatureBlock({ leftRole, rightRole }: { leftRole: string; rightRole: string }) {
  const today = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <section className="mt-8 grid grid-cols-2 gap-12 text-[10.5px]">
      {[leftRole, rightRole].map((role, i) => (
        <div key={i} className="text-center">
          <div className="h-7" />
          <div className="border-t border-zinc-500 pt-1 font-semibold">&nbsp;</div>
          <div className="text-zinc-600">{role}</div>
          {i === 1 && <div className="mt-3 text-[9.5px] text-zinc-500">Date issued: {today}</div>}
        </div>
      ))}
    </section>
  );
}
