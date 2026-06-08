import type { ClassRecord, Student, Subject } from '@/types';
import { formatLastFirstMiddle } from '@/lib/format';
import { subjectIndex, buildSubjectRows, generalAverage, gradesForSy } from '@/lib/forms';
import { ClassHeader, SignatureBlock } from './parts';

interface Props {
  klass: ClassRecord;
  roster: Student[];
  subjects: Subject[];
}

type Action = 'promoted' | 'retained' | 'irregular';
const ACTION_LABEL: Record<Action, string> = {
  promoted: 'PROMOTED',
  retained: 'RETAINED',
  irregular: 'IRREGULAR',
};

interface Row {
  student: Student;
  ga: number | null;
  action: Action | null;
}

export function ClassForm5({ klass, roster, subjects }: Props) {
  const index = subjectIndex(subjects);
  const byName = (a: Student, b: Student) => a.lastName.localeCompare(b.lastName);

  const rows: Row[] = [...roster].sort(byName).map((student) => {
    const ga = generalAverage(buildSubjectRows(gradesForSy(student, klass.sy), index));
    const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === klass.sy);
    let action = (entry?.action as Action | undefined) ?? null;
    if (!action && ga != null) action = ga >= 75 ? 'promoted' : 'retained';
    return { student, ga, action };
  });

  const tally = (sex: 'Male' | 'Female', act: Action) =>
    rows.filter((r) => r.student.gender === sex && r.action === act).length;
  const summary: { label: string; key: Action }[] = [
    { label: 'Promoted', key: 'promoted' },
    { label: 'Retained', key: 'retained' },
    { label: 'Irregular', key: 'irregular' },
  ];

  return (
    <div className="font-serif">
      <ClassHeader klass={klass} docTitle="Report on Promotion · SF 5" />

      <table className="mt-3 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-zinc-100 text-[8.5px] uppercase tracking-wide">
            <th className="w-6 border border-zinc-400 px-1 py-0.5">No.</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">LRN</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Learner&rsquo;s Name</th>
            <th className="w-16 border border-zinc-400 px-1 py-0.5">General Average</th>
            <th className="w-24 border border-zinc-400 px-1 py-0.5">Action Taken</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.student.lrn}>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">{i + 1}</td>
              <td className="border border-zinc-400 px-1 py-0.5 font-mono">{r.student.lrn}</td>
              <td className="border border-zinc-400 px-1 py-0.5">{formatLastFirstMiddle(r.student)}</td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">{r.ga ?? '—'}</td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">
                {r.action ? ACTION_LABEL[r.action] : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 w-64 break-inside-avoid">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-zinc-100 uppercase">
              <th className="border border-zinc-400 px-1.5 py-0.5 text-left">Summary</th>
              <th className="w-9 border border-zinc-400 px-1 py-0.5">M</th>
              <th className="w-9 border border-zinc-400 px-1 py-0.5">F</th>
              <th className="w-12 border border-zinc-400 px-1 py-0.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => {
              const m = tally('Male', s.key);
              const f = tally('Female', s.key);
              return (
                <tr key={s.key}>
                  <td className="border border-zinc-400 px-1.5 py-0.5">{s.label}</td>
                  <td className="border border-zinc-400 px-1 py-0.5 text-center">{m}</td>
                  <td className="border border-zinc-400 px-1 py-0.5 text-center">{f}</td>
                  <td className="border border-zinc-400 px-1 py-0.5 text-center font-semibold">{m + f}</td>
                </tr>
              );
            })}
            <tr className="bg-zinc-50 font-semibold">
              <td className="border border-zinc-400 px-1.5 py-0.5">Total Enrolment</td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">
                {rows.filter((r) => r.student.gender === 'Male').length}
              </td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">
                {rows.filter((r) => r.student.gender === 'Female').length}
              </td>
              <td className="border border-zinc-400 px-1 py-0.5 text-center">{rows.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SignatureBlock leftRole="Class Adviser" rightRole="School Principal" />
    </div>
  );
}
