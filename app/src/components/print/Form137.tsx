import type { Student, Subject } from '@/types';
import { buildAcademicRecord, formatSy, type YearRecord } from '@/lib/forms';
import { Letterhead, LearnerInfo, SignatureBlock } from './parts';

const fmtQ = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');
const ACTION_LABEL: Record<string, string> = {
  promoted: 'PROMOTED',
  retained: 'RETAINED',
  irregular: 'IRREGULAR',
};

function YearBlock({ rec }: { rec: YearRecord }) {
  return (
    <div className="mt-4 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-2 border-black pb-0.5">
        <div className="text-[12px] font-bold uppercase tracking-wide">
          {rec.gradeName}
          <span className="ml-2 font-normal normal-case text-zinc-600">
            S.Y. {formatSy(rec.sy)}
          </span>
        </div>
        <div className="text-[10px] text-zinc-600">
          {rec.sectionName && <>Section: {rec.sectionName}</>}
          {rec.schoolName && <> · {rec.schoolName}</>}
        </div>
      </div>

      <table className="mt-1 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-zinc-100 text-[8.5px] uppercase tracking-wide">
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Learning Area</th>
            <th className="w-7 border border-zinc-400 px-0.5 py-0.5">1</th>
            <th className="w-7 border border-zinc-400 px-0.5 py-0.5">2</th>
            <th className="w-7 border border-zinc-400 px-0.5 py-0.5">3</th>
            <th className="w-7 border border-zinc-400 px-0.5 py-0.5">4</th>
            <th className="w-9 border border-zinc-400 px-0.5 py-0.5">Final</th>
            <th className="w-16 border border-zinc-400 px-1 py-0.5">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rec.rows.map((r) => (
            <tr key={r.subjectCode}>
              <td className="border border-zinc-400 px-1 py-0.5">{r.name}</td>
              <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{fmtQ(r.q1)}</td>
              <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{fmtQ(r.q2)}</td>
              <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{fmtQ(r.q3)}</td>
              <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{fmtQ(r.q4)}</td>
              <td className="border border-zinc-400 px-0.5 py-0.5 text-center font-semibold">
                {fmtQ(r.final)}
              </td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">{r.remark}</td>
            </tr>
          ))}
          <tr className="bg-zinc-50 font-semibold">
            <td className="border border-zinc-400 px-1 py-0.5 text-right uppercase text-[9px]">
              General Average
            </td>
            <td className="border border-zinc-400" colSpan={4} />
            <td className="border border-zinc-400 px-0.5 py-0.5 text-center">
              {rec.generalAverage ?? ''}
            </td>
            <td className="border border-zinc-400 px-1 py-0.5 text-center">
              {rec.action ? ACTION_LABEL[rec.action] ?? '' : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-0.5 flex justify-between text-[9px] text-zinc-600">
        <span>{rec.adviserName ? `Adviser: ${rec.adviserName}` : ''}</span>
        <span>{rec.daysPresent != null ? `No. of school days present: ${rec.daysPresent}` : ''}</span>
      </div>
    </div>
  );
}

interface Props {
  student: Student;
  subjects: Subject[];
  variant?: 'form137' | 'sf10';
}

export function Form137({ student, subjects, variant = 'form137' }: Props) {
  const record = buildAcademicRecord(student, subjects);
  const title =
    variant === 'sf10'
      ? "Learner's Permanent Academic Record · SF 10"
      : 'Permanent Academic Record · Form 137';

  return (
    <div className="font-serif">
      <Letterhead docTitle={title} docSubtitle="Scholastic Record — All Years" />
      <LearnerInfo student={student} />

      {record.length === 0 ? (
        <p className="mt-6 text-center text-[11px] text-zinc-500">
          No grades on record for this learner.
        </p>
      ) : (
        record.map((rec) => <YearBlock key={rec.sy} rec={rec} />)
      )}

      <p className="mt-5 text-[9px] leading-snug text-zinc-500">
        I certify that this is a true record of <span className="font-semibold">
          {student.firstName} {student.middleName} {student.lastName}
        </span>{' '}
        as appearing in the permanent records of this school.
      </p>
      <SignatureBlock leftRole="Class Adviser / Records-in-Charge" rightRole="School Registrar" />
    </div>
  );
}
