import type { Student, ClassRecord } from '@/types';
import { formatFullName } from '@/lib/format';
import { gradeLabel, formatSy, SCHOOL } from '@/lib/forms';

interface Props {
  student: Student;
  klass?: ClassRecord;
}

const NPS_RED = '#b01e2e';

// A cut-out ID card (~54×86mm portrait). Photo is a placeholder box — the
// system doesn't store learner photos yet.
export function StudentId({ student, klass }: Props) {
  const latest = [...(student.enrolmentHistory ?? [])].sort((a, b) => b.sy.localeCompare(a.sy))[0];
  const grade = gradeLabel(klass ? klass.gradeLevel : latest?.gradeLevel);
  const section = klass?.sectionName ?? latest?.sectionName ?? '';
  const sy = student.currentSY || latest?.sy || '';

  return (
    <div className="flex justify-center py-4">
      <div
        className="flex flex-col overflow-hidden border border-black bg-white text-black"
        style={{ width: '54mm', height: '86mm' }}
      >
        <div className="px-2 py-1.5 text-center text-white" style={{ background: NPS_RED }}>
          <div className="text-[8px] font-bold uppercase leading-tight tracking-wide">
            {SCHOOL.name}
          </div>
          <div className="text-[6px] uppercase tracking-wide opacity-90">{SCHOOL.address}</div>
        </div>

        <div className="text-center text-[7px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Student ID
        </div>

        <div className="mt-1 flex justify-center">
          <div className="grid h-[24mm] w-[24mm] place-items-center border border-zinc-400 text-[6px] uppercase text-zinc-400">
            1×1 Photo
          </div>
        </div>

        <div className="mt-1.5 px-2 text-center">
          <div className="text-[10px] font-bold leading-tight">{formatFullName(student)}</div>
          <div className="font-mono text-[7.5px] text-zinc-600">LRN {student.lrn}</div>
        </div>

        <div className="mt-1 px-3 text-[7.5px] leading-snug">
          <div className="flex justify-between border-b border-zinc-200 py-0.5">
            <span className="text-zinc-500">Grade</span>
            <span className="font-medium">{grade}</span>
          </div>
          {section && (
            <div className="flex justify-between border-b border-zinc-200 py-0.5">
              <span className="text-zinc-500">Section</span>
              <span className="font-medium">{section}</span>
            </div>
          )}
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">S.Y.</span>
            <span className="font-medium">{sy ? formatSy(sy) : '—'}</span>
          </div>
        </div>

        <div className="mt-auto px-3 pb-2 text-center">
          <div className="mt-3 border-t border-zinc-500 pt-0.5 text-[6px] uppercase text-zinc-500">
            Signature
          </div>
          <div className="mt-0.5 text-[5.5px] uppercase tracking-wide text-zinc-400">
            Not valid without school seal
          </div>
        </div>
      </div>
    </div>
  );
}
