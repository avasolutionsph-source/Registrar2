import type { Student, ClassRecord } from '@/types';
import { formatFullName } from '@/lib/format';
import { gradeLabel, formatSy, SCHOOL } from '@/lib/forms';
import { Letterhead, SignatureBlock } from './parts';

interface Props {
  student: Student;
  klass?: ClassRecord;
}

export function CertEnrollment({ student, klass }: Props) {
  const fullName = formatFullName(student);
  const latest = [...(student.enrolmentHistory ?? [])].sort((a, b) => b.sy.localeCompare(a.sy))[0];
  const grade = gradeLabel(klass ? klass.gradeLevel : latest?.gradeLevel);
  const section = klass?.sectionName ?? latest?.sectionName ?? '';
  const sy = student.currentSY || latest?.sy || '';
  const honorific = student.gender === 'Female' ? 'Ms.' : 'Mr.';
  const poss = student.gender === 'Female' ? 'her' : 'his';

  return (
    <div className="font-serif">
      <Letterhead docTitle="Certificate of Enrollment" />

      <div className="mt-10 text-[12.5px] leading-7">
        <p className="font-semibold">TO WHOM IT MAY CONCERN:</p>

        <p className="mt-4 indent-10 text-justify">
          This is to certify that <span className="font-bold uppercase">{fullName}</span>, with Learner
          Reference Number <span className="font-semibold">{student.lrn}</span>, is a bona fide student
          officially enrolled in{' '}
          <span className="font-semibold">
            {grade}
            {section ? ` – ${section}` : ''}
          </span>{' '}
          at <span className="font-semibold">{SCHOOL.name}</span>
          {sy ? (
            <>
              {' '}
              for School Year <span className="font-semibold">{formatSy(sy)}</span>
            </>
          ) : null}
          .
        </p>

        <p className="mt-4 indent-10 text-justify">
          This certification is issued upon the request of {honorific} {student.lastName} for whatever
          legal purpose it may serve {poss} best interest.
        </p>
      </div>

      <SignatureBlock leftRole=" " rightRole="School Registrar" />
    </div>
  );
}
