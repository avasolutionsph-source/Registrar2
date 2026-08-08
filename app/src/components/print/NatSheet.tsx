import { Fragment } from 'react';
import { Letterhead } from '@/components/print/parts';
import { formatLastFirstMiddle } from '@/lib/format';
import { groupRosterBySex } from '@/lib/roster';
import { schoolIdFromLrn, displayLrn } from '@/lib/lrn';
import { NAT_SUBJECTS, type NatRow } from '@/lib/db';
import type { ClassRecord, Student } from '@/types';

// The NAT (National Achievement Test) list for ONE Grade 6 section, in the
// column order NPS submits: Name, LRN, FIL, ENG, MAT, SCI, APN, School ID.
//
// School ID is LRN[0:6] — the school that FIRST enrolled the learner in the
// DepEd system, which is where DepEd aggregates their NAT result. One section
// routinely holds learners from several originating schools, so this is a
// per-learner value, not NPS's own ID (which the letterhead already carries).
//
// Male then Female, each with its own numbering — the same split every other
// class list in the system uses.

const bd = 'border border-zinc-500';
const th = `${bd} px-1 py-1 text-left text-[8px] font-bold uppercase leading-tight`;
const td = `${bd} px-1 py-[3px]`;

interface Props {
  klass: ClassRecord;
  roster: Student[];
  scores: Record<string, NatRow>;
  // Mean Percentage Score per subject across the learners who have one.
  mps: Partial<Record<(typeof NAT_SUBJECTS)[number]['key'], number>>;
}

export function NatSheet({ klass, roster, scores, mps }: Props) {
  const groups = groupRosterBySex(roster);
  const colCount = 3 + NAT_SUBJECTS.length + 1; // #, Name, LRN, subjects, School ID

  return (
    <div className="font-serif text-black">
      <Letterhead
        docTitle="National Achievement Test (NAT) — Grade 6"
        docSubtitle={`${klass.sectionName} · School Year ${klass.sy}`}
      />

      <table className="mt-3 w-full border-collapse text-[8.5px]">
        <thead>
          <tr className="bg-zinc-100">
            <th className={`${th} w-[4%] text-center`}>&nbsp;</th>
            <th className={th}>Name</th>
            <th className={`${th} w-[13%]`}>LRN</th>
            {NAT_SUBJECTS.map((s) => (
              <th key={s.key} className={`${th} w-[7%] text-center`} title={s.full}>
                {s.label}
              </th>
            ))}
            <th className={`${th} w-[10%]`}>School ID</th>
          </tr>
        </thead>
        <tbody>
          {roster.length === 0 ? (
            <tr>
              <td className={`${td} text-center`} colSpan={colCount}>
                No learners to list.
              </td>
            </tr>
          ) : (
            groups.map((grp) => (
              <Fragment key={grp.key}>
                <tr>
                  <td
                    colSpan={colCount}
                    className={`${bd} bg-zinc-100 px-1 py-[3px] text-[8px] font-bold uppercase tracking-wider`}
                  >
                    {grp.label} · {grp.students.length}
                  </td>
                </tr>
                {grp.students.map((s, i) => (
                  <tr key={s.lrn}>
                    <td className={`${td} text-center tabular-nums`}>{i + 1}.</td>
                    <td className={td}>{formatLastFirstMiddle(s)}</td>
                    <td className={`${td} font-mono`}>{displayLrn(s.lrn)}</td>
                    {NAT_SUBJECTS.map((sub) => (
                      <td key={sub.key} className={`${td} text-center tabular-nums`}>
                        {scores[s.lrn]?.[sub.key] ?? ''}
                      </td>
                    ))}
                    <td className={`${td} font-mono`}>{schoolIdFromLrn(s.lrn)}</td>
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>
        {roster.length > 0 && (
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td className={td} colSpan={3}>
                Mean Percentage Score (MPS)
              </td>
              {NAT_SUBJECTS.map((s) => (
                <td key={s.key} className={`${td} text-center tabular-nums`}>
                  {mps[s.key] ?? '—'}
                </td>
              ))}
              <td className={td} />
            </tr>
          </tfoot>
        )}
      </table>

      <div className="mt-1.5 text-[8.5px] text-zinc-600">
        Total: {roster.length} learner{roster.length === 1 ? '' : 's'} ·{' '}
        {groups.find((g) => g.key === 'Male')?.students.length ?? 0} male ·{' '}
        {groups.find((g) => g.key === 'Female')?.students.length ?? 0} female
      </div>
    </div>
  );
}
