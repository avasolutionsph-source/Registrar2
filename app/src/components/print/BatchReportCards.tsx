import type { ClassRecord, Student, Subject } from '@/types';
import { ReportCardSF9 } from './ReportCardSF9';

interface Props {
  klass: ClassRecord;
  roster: Student[];
  subjects: Subject[];
}

// One SF 9 report card per learner, each starting on a fresh page.
export function BatchReportCards({ klass, roster, subjects }: Props) {
  const ordered = [...roster].sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (ordered.length === 0) {
    return <p className="text-center text-[12px] text-zinc-500">No learners in this class.</p>;
  }

  return (
    <div>
      {ordered.map((s, i) => (
        <div key={s.lrn} className={i < ordered.length - 1 ? 'break-after-page' : ''}>
          <ReportCardSF9 student={s} subjects={subjects} sy={klass.sy} />
        </div>
      ))}
    </div>
  );
}
