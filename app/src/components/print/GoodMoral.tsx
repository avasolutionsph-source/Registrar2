import type { Student } from '@/types';
import { formatFullName } from '@/lib/format';
import { gradeLabel, formatSy, overallValuesAverage, valuesDescriptor, SCHOOL } from '@/lib/forms';
import { Letterhead, SignatureBlock } from './parts';

interface Props {
  student: Student;
}

export function GoodMoral({ student }: Props) {
  const fullName = formatFullName(student);
  const subjectPron = student.gender === 'Female' ? 'she' : 'he';
  const possPron = student.gender === 'Female' ? 'her' : 'his';
  const honorific = student.gender === 'Female' ? 'Ms.' : 'Mr.';

  // most recent enrolment year (last grade attended)
  const history = [...(student.enrolmentHistory ?? [])].sort((a, b) => b.sy.localeCompare(a.sy));
  const last = history[0];
  const valuesAvg = overallValuesAverage(student);

  return (
    <div className="font-serif">
      <Letterhead docTitle="Certificate of Good Moral Character" />

      <div className="mt-10 text-[12.5px] leading-7">
        <p className="font-semibold">TO WHOM IT MAY CONCERN:</p>

        <p className="mt-4 indent-10 text-justify">
          This is to certify that <span className="font-bold uppercase">{fullName}</span> is a bona
          fide {last ? '' : ''}student of <span className="font-semibold">{SCHOOL.name}</span>
          {last ? (
            <>
              , whose latest recorded enrolment was in{' '}
              <span className="font-semibold">{gradeLabel(last.gradeLevel)}</span> during School Year{' '}
              <span className="font-semibold">{formatSy(last.sy)}</span>
            </>
          ) : null}
          .
        </p>

        <p className="mt-4 indent-10 text-justify">
          This further certifies that, based on the records on file in this office, {subjectPron} has
          not been subjected to any disciplinary action and is known to be of{' '}
          <span className="font-semibold">good moral character</span>
          {valuesAvg != null ? (
            <>
              , with an overall observed-values rating of{' '}
              <span className="font-semibold">
                {valuesAvg} ({valuesDescriptor(valuesAvg)})
              </span>
            </>
          ) : null}
          .
        </p>

        <p className="mt-4 indent-10 text-justify">
          This certification is issued upon the request of {honorific} {student.lastName} for whatever
          legal purpose it may serve {possPron} best interest.
        </p>
      </div>

      <SignatureBlock leftRole=" " rightRole="School Registrar" />
    </div>
  );
}
