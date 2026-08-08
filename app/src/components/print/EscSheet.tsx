import { Fragment } from 'react';
import { Letterhead } from '@/components/print/parts';
import { formatBirthdateMdy } from '@/lib/format';
import { groupRosterBySex } from '@/lib/roster';
import { escSchoolHeader, hasFullLrn, priorSchool } from '@/lib/esc';
import type { ClassRecord, Student } from '@/types';

// The ESC (Educational Service Contracting) learner list for ONE section, laid
// out the way the submitted form reads: "School Year" / "Grade/Year" over the
// learner's name parts, birthdate, gender, prior school and LRN.
//
// Male then Female, each with its own numbering — the same split every other
// class list in the system uses.

const bd = 'border border-zinc-500';
const th = `${bd} px-1 py-1 text-left text-[7.5px] font-bold uppercase leading-tight`;
const td = `${bd} px-1 py-[3px] align-top`;

interface Props {
  klass: ClassRecord;
  roster: Student[];
  // Set when the list is filtered to grantees, so the sheet says so instead of
  // silently printing a short roster.
  granteesOnly?: boolean;
}

export function EscSheet({ klass, roster, granteesOnly }: Props) {
  const groups = groupRosterBySex(roster);
  const schoolHeader = escSchoolHeader(klass.gradeLevel);

  return (
    <div className="font-serif text-black">
      <Letterhead
        docTitle="Educational Service Contracting (ESC) List"
        docSubtitle={granteesOnly ? 'ESC grantees only' : undefined}
      />

      <div className="mt-3 text-[10px] leading-tight">
        <div>
          <span className="text-zinc-600">School Year: </span>
          <span className="font-bold">{klass.sy}</span>
        </div>
        <div>
          <span className="text-zinc-600">Grade/Year: </span>
          <span className="font-bold">
            Grade {klass.gradeLevel} - {klass.sectionName}
          </span>
        </div>
      </div>

      <table className="mt-1.5 w-full border-collapse text-[8px]">
        <thead>
          <tr className="bg-zinc-100">
            <th className={`${th} w-[3.5%] text-center`}>&nbsp;</th>
            <th className={th}>First Name</th>
            <th className={th}>Middle Name</th>
            <th className={th}>Last Name</th>
            <th className={`${th} w-[4%]`}>Ext</th>
            <th className={`${th} w-[10%]`}>Birthdate</th>
            <th className={`${th} w-[7%]`}>Gender</th>
            <th className={`${th} w-[16%]`}>{schoolHeader}</th>
            <th className={`${th} w-[8%]`}>School Type</th>
            <th className={`${th} w-[12%]`}>LRN</th>
          </tr>
        </thead>
        <tbody>
          {roster.length === 0 ? (
            <tr>
              <td className={`${td} text-center`} colSpan={10}>
                No learners to list.
              </td>
            </tr>
          ) : (
            groups.map((grp) => (
              <Fragment key={grp.key}>
                <tr>
                  <td
                    colSpan={10}
                    className={`${bd} bg-zinc-100 px-1 py-[3px] text-[7.5px] font-bold uppercase tracking-wider`}
                  >
                    {grp.label} · {grp.students.length}
                  </td>
                </tr>
                {grp.students.map((s, i) => {
                  const p = priorSchool(s, klass.sy);
                  return (
                    <tr key={s.lrn}>
                      <td className={`${td} text-center tabular-nums`}>{i + 1}.</td>
                      <td className={`${td} uppercase`}>{s.firstName}</td>
                      <td className={`${td} uppercase`}>{s.middleName}</td>
                      <td className={`${td} font-medium uppercase`}>{s.lastName}</td>
                      <td className={`${td} uppercase`}>{s.extension}</td>
                      <td className={`${td} tabular-nums`}>{formatBirthdateMdy(s.birthdate)}</td>
                      <td className={`${td} uppercase`}>{s.gender}</td>
                      <td className={td}>{p.school}</td>
                      <td className={td}>{p.schoolType}</td>
                      <td className={`${td} font-mono`}>{hasFullLrn(s.lrn) ? s.lrn : ''}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-1.5 text-[8.5px] text-zinc-600">
        Total: {roster.length} learner{roster.length === 1 ? '' : 's'} ·{' '}
        {groups.find((g) => g.key === 'Male')?.students.length ?? 0} male ·{' '}
        {groups.find((g) => g.key === 'Female')?.students.length ?? 0} female
      </div>
    </div>
  );
}
