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
      {/* Ten columns is a lot of paper — the type drops to 8px and the sheet is
          meant to be printed LANDSCAPE. Every column here is one the school's
          Form 1 asks for; nothing extra rides along. */}
      <table className="w-full table-fixed border-collapse text-[8px]">
        <thead>
          <tr className="text-[7px] uppercase tracking-wide">
            <th className="w-[3%] border border-zinc-400 px-0.5 py-0.5">No.</th>
            <th className="w-[9%] border border-zinc-400 px-0.5 py-0.5 text-left">LRN</th>
            <th className="w-[15%] border border-zinc-400 px-0.5 py-0.5 text-left">Name (Last, First Middle)</th>
            <th className="w-[4%] border border-zinc-400 px-0.5 py-0.5 text-left">Sex</th>
            <th className="w-[8%] border border-zinc-400 px-0.5 py-0.5 text-left">Date of Birth</th>
            <th className="w-[12%] border border-zinc-400 px-0.5 py-0.5 text-left">Father&apos;s Name</th>
            <th className="w-[12%] border border-zinc-400 px-0.5 py-0.5 text-left">Mother&apos;s Maiden Name</th>
            <th className="w-[17%] border border-zinc-400 px-0.5 py-0.5 text-left">Address</th>
            <th className="w-[8%] border border-zinc-400 px-0.5 py-0.5 text-left">Contact</th>
            <th className="w-[7%] border border-zinc-400 px-0.5 py-0.5 text-left">Email</th>
            <th className="w-[5%] border border-zinc-400 px-0.5 py-0.5 text-left">Messenger</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border border-zinc-400 px-1 py-1 text-center text-zinc-400" colSpan={11}>
                None
              </td>
            </tr>
          ) : (
            rows.map((s, i) => (
              <tr key={s.lrn}>
                <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{i + 1}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5 font-mono">{s.lrn}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5">{formatLastFirstMiddle(s)}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5 text-center">{s.gender?.charAt(0) ?? ''}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5">
                  {s.birthdate ? formatBirthdate(s.birthdate) : ''}
                </td>
                <td className="border border-zinc-400 px-0.5 py-0.5">{s.fatherName}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5">{s.motherMaidenName}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5">{s.address}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5">{s.contactNumber}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5 break-all">{s.email ?? ''}</td>
                <td className="border border-zinc-400 px-0.5 py-0.5 break-all">{s.messenger ?? ''}</td>
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
