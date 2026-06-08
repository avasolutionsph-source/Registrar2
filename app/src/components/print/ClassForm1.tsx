import type { ClassRecord, Student } from '@/types';
import { formatLastFirstMiddle, formatBirthdate } from '@/lib/format';
import { ClassHeader, SignatureBlock } from './parts';

interface Props {
  klass: ClassRecord;
  roster: Student[];
}

function RosterBlock({ title, rows }: { title: string; rows: Student[] }) {
  return (
    <div className="mt-3 break-inside-avoid">
      <div className="bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        {title} · {rows.length}
      </div>
      <table className="w-full border-collapse text-[9.5px]">
        <thead>
          <tr className="text-[8px] uppercase tracking-wide">
            <th className="w-6 border border-zinc-400 px-1 py-0.5">No.</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">LRN</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Name (Last, First Middle)</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Date of Birth</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Father</th>
            <th className="border border-zinc-400 px-1 py-0.5 text-left">Mother (Maiden)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border border-zinc-400 px-1 py-1 text-center text-zinc-400" colSpan={6}>
                None
              </td>
            </tr>
          ) : (
            rows.map((s, i) => (
              <tr key={s.lrn}>
                <td className="border border-zinc-400 px-1 py-0.5 text-center">{i + 1}</td>
                <td className="border border-zinc-400 px-1 py-0.5 font-mono">{s.lrn}</td>
                <td className="border border-zinc-400 px-1 py-0.5">{formatLastFirstMiddle(s)}</td>
                <td className="border border-zinc-400 px-1 py-0.5">
                  {s.birthdate ? formatBirthdate(s.birthdate) : ''}
                </td>
                <td className="border border-zinc-400 px-1 py-0.5">{s.fatherName}</td>
                <td className="border border-zinc-400 px-1 py-0.5">{s.motherMaidenName}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ClassForm1({ klass, roster }: Props) {
  const byName = (a: Student, b: Student) => a.lastName.localeCompare(b.lastName);
  const males = roster.filter((s) => s.gender === 'Male').sort(byName);
  const females = roster.filter((s) => s.gender === 'Female').sort(byName);

  return (
    <div className="font-serif">
      <ClassHeader klass={klass} docTitle="School Register · SF 1" />
      <p className="mt-1 text-right text-[9px] text-zinc-500">
        Total enrolment: {roster.length} ({males.length} M / {females.length} F)
      </p>

      <RosterBlock title="Male" rows={males} />
      <RosterBlock title="Female" rows={females} />

      <SignatureBlock leftRole="Class Adviser" rightRole="School Registrar" />
    </div>
  );
}
