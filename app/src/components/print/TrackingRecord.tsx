import { SCHOOL } from '@/lib/forms';

// Registrar's-office destination tracking records (official NPS templates):
//   • Transferred-Out Students Destination Tracking Record
//   • School Leavers Tracking Record
//   • Graduates / Completer Destination Record
// Rows are pre-filled with No./Name/LRN/Grade-Section; the receiving-school,
// reason and remarks cells are left blank for the registrar to complete by hand
// (the legends below list the standard options), matching the paper forms.

export type TrackingKind = 'transfer' | 'leavers' | 'graduates';

export interface TrackingRow {
  name: string;
  lrn: string;
  gradeSection: string;
}

interface KindConfig {
  title: string;
  gradeHeader: string;
  hasDate: boolean;
  reasonHeader: string;
  reasons: string[];
  remarks: string[];
}

const CONFIG: Record<TrackingKind, KindConfig> = {
  transfer: {
    title: 'Transferred-Out Students Destination Tracking Record',
    gradeHeader: 'Grade/Section',
    hasDate: true,
    reasonHeader: 'Reason for Transfer',
    reasons: [
      'Financial Difficulties',
      'Relocation/Migration',
      'Distance & Transportation',
      'Academic Reasons',
      'Change of Residence',
      'Document Pending',
      'Personal Preference',
    ],
    remarks: ['Pending SF10 Request', 'SF10 Transmitted on ____', 'Awaiting School Request'],
  },
  leavers: {
    title: 'School Leavers Tracking Record',
    gradeHeader: 'Grade/Section Completed',
    hasDate: false,
    reasonHeader: 'Reason',
    reasons: [
      'Financial Difficulties',
      'Academic Problem',
      'Change of Residence/Migration',
      'Personal Preference',
    ],
    remarks: [
      'Verified through SF10 Request',
      'Released SF10',
      'Pending Request',
      'Confirmed Enrollment',
      'Through Parents Interview/Information',
      'Verified through Receiving School',
      'For Follow-up',
    ],
  },
  graduates: {
    title: 'Graduates / Completer Destination Record',
    gradeHeader: 'Grade/Section Completed',
    hasDate: false,
    reasonHeader: 'Reason',
    reasons: [
      'Completed Terminal Grade (12)',
      'Financial Difficulties',
      'Change of Residence/Migration',
      'Personal Preference',
    ],
    remarks: [
      'Grade 12 Graduate',
      'Enrolled in another School',
      'Released SF10',
      'Awaiting School Request',
      'Pending Request',
    ],
  },
};

const th = 'border border-zinc-500 px-1.5 py-1 text-center';
const td = 'border border-zinc-500 px-1.5 py-1';

interface Props {
  kind: TrackingKind;
  rows: TrackingRow[];
  syLabel?: string;
}

export function TrackingRecord({ kind, rows, syLabel }: Props) {
  const cfg = CONFIG[kind];
  const blanks = Math.max(0, 8 - rows.length);
  const colCount = cfg.hasDate ? 9 : 8;

  return (
    <div className="font-serif text-[10px]">
      <header className="text-center leading-tight">
        <div className="text-[12px] font-bold uppercase">{SCHOOL.name}</div>
        <div className="text-[9.5px] uppercase tracking-wide text-zinc-600">Registrar's Office</div>
        <h1 className="mt-2 text-[12.5px] font-bold uppercase tracking-wide">{cfg.title}</h1>
        {syLabel && <div className="text-[10px] text-zinc-600">School Year Completed: {syLabel}</div>}
      </header>

      <table className="mt-3 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-zinc-100 uppercase">
            <th className={`${th} w-7`}>No.</th>
            <th className={th}>Student Name</th>
            <th className={`${th} w-24`}>LRN</th>
            <th className={th}>{cfg.gradeHeader}</th>
            {cfg.hasDate && <th className={th}>Date Transferred Out</th>}
            <th className={th}>Receiving School</th>
            <th className={th}>School Address</th>
            <th className={th}>{cfg.reasonHeader}</th>
            <th className={th}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lrn || i}>
              <td className={`${td} text-center`}>{i + 1}</td>
              <td className={td}>{r.name}</td>
              <td className={`${td} font-mono`}>{r.lrn}</td>
              <td className={`${td} text-center`}>{r.gradeSection}</td>
              {cfg.hasDate && <td className={td} />}
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
            </tr>
          ))}
          {Array.from({ length: blanks }).map((_, i) => (
            <tr key={`b-${i}`}>
              <td className={`${td} text-center`}>{rows.length + i + 1}</td>
              {Array.from({ length: colCount - 1 }).map((__, j) => (
                <td key={j} className={td}>
                  &nbsp;
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-6 text-[8.5px]">
        <div>
          <div className="font-semibold uppercase">{cfg.reasonHeader} (legend)</div>
          <ul className="mt-0.5 list-disc pl-4 text-zinc-700">
            {cfg.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold uppercase">Remarks (legend)</div>
          <ul className="mt-0.5 list-disc pl-4 text-zinc-700">
            {cfg.remarks.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 text-[9px]">
        <div className="font-semibold uppercase">Summary by Receiving School</div>
        <table className="mt-1 w-1/2 border-collapse">
          <thead>
            <tr className="bg-zinc-100 uppercase">
              <th className={th}>Receiving School</th>
              <th className={`${th} w-16`}>Private</th>
              <th className={`${th} w-16`}>Public</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                <td className={td}>&nbsp;</td>
                <td className={td} />
                <td className={td} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-[10px]">
        <div className="inline-block text-center">
          <div className="font-bold uppercase">Marites C. Ramos</div>
          <div className="text-zinc-600">Registrar</div>
        </div>
      </div>
    </div>
  );
}
