import type { ClassRecord, Student, Subject } from '@/types';
import type { AttitudeBand } from '@/lib/grading';
import { adviserDisplayName, isPreschoolCardLevel } from '@/lib/forms';
import { ReportCard138 } from './ReportCard138';
import { ReportCardPreschool } from './ReportCardPreschool';

interface Props {
  klass: ClassRecord;
  roster: Student[];
  subjects: Subject[];
  attitudeScale?: AttitudeBand[];
  // How many grading periods the cards cover (Term 1 card = 1, …).
  upto?: number;
  // SHS subject↔term coverage of this section (code UPPER → term string|null),
  // fetched once by the caller so N cards don't fetch it N times.
  classTerms?: Record<string, string | null>;
}

// One official SF 9 report card per learner, each starting on a fresh page.
export function BatchReportCards({ klass, roster, subjects, attitudeScale, upto, classTerms }: Props) {
  const ordered = [...roster].sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (ordered.length === 0) {
    return <p className="text-center text-[12px] text-zinc-500">No learners in this class.</p>;
  }

  // The class record IS the live source for grade/section/adviser — never the
  // per-learner enrolment snapshot, which goes stale on adviser/section moves.
  const liveClass = {
    gradeLevel: klass.gradeLevel,
    sectionName: klass.sectionName,
    adviserName: adviserDisplayName(klass.adviser),
  };

  // Nursery/Kinder sections print the Progress Report; everyone else the SF9.
  const preschool = isPreschoolCardLevel(klass.gradeLevel);

  return (
    <div>
      {ordered.map((s, i) => (
        <div key={s.lrn} className={i < ordered.length - 1 ? 'break-after-page' : ''}>
          {preschool ? (
            <ReportCardPreschool
              student={s}
              subjects={subjects}
              sy={klass.sy}
              upto={upto}
              classTerms={classTerms}
              liveClass={liveClass}
            />
          ) : (
            <ReportCard138
              student={s}
              subjects={subjects}
              sy={klass.sy}
              upto={upto}
              attitudeScale={attitudeScale}
              classTerms={classTerms}
              liveClass={liveClass}
            />
          )}
        </div>
      ))}
    </div>
  );
}
