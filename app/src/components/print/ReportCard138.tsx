import npsLogo from '@/assets/nps-logo.png';
import type { Student, Subject } from '@/types';
import {
  buildSubjectRows,
  subjectIndex,
  generalAverage,
  formatSy,
  latestGradedSy,
  gradesForSy,
  conductForSy,
  periodsForSy,
  MONTHS,
} from '@/lib/forms';
import { isDescriptiveLevel } from '@/lib/grading';
import { ageOnDate } from '@/lib/format';

// NPS Report Card — School Form 9 "Learner's Performance Report" (SY 2026-2027).
// Exact reproduction of the official NPS SF9 (see docs/templates/report-card-sf9-official.md):
// full-page portrait, header with seals, two columns. Grade 1 shows descriptive letters.

const PRINCIPAL = 'MRS. ROSARIO B. OLALIA';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ordOf = (code?: string) => {
  const i = ROMAN.indexOf((code ?? '').split('-')[0]);
  return i >= 0 ? i + 1 : 0;
};
const nextRoman = (code?: string) => {
  const o = ordOf(code);
  return o > 0 && o < 12 ? ROMAN[o] : '';
};

const num = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');

// numeric → program letter (MO/O/VS/S/FS/DM) and → deportment letter (AO/SO/RO/NO)
function programLetter(v?: number): string {
  if (v == null) return '';
  if (v >= 95) return 'MO';
  if (v >= 90) return 'O';
  if (v >= 85) return 'VS';
  if (v >= 80) return 'S';
  if (v >= 75) return 'FS';
  return 'DM';
}
function deportmentLetter(v?: number): string {
  if (v == null) return '';
  if (v >= 91) return 'AO';
  if (v >= 86) return 'SO';
  if (v >= 80) return 'RO';
  if (v >= 75) return 'NO';
  return '';
}
// most-frequent non-empty value across the terms (for the FINAL letter columns)
function modal(vals: (string | undefined)[]): string {
  const c: Record<string, number> = {};
  let best = '';
  let bestN = 0;
  for (const v of vals) {
    if (!v) continue;
    c[v] = (c[v] ?? 0) + 1;
    if (c[v] > bestN) {
      bestN = c[v];
      best = v;
    }
  }
  return best;
}
const letterRemark = (l?: string) => (!l ? '' : 'ABC'.includes(l) ? 'Passed' : 'Failed');

const CORE_VALUES: { key: string; label: string }[] = [
  { key: 'faith', label: 'Faith' },
  { key: 'integrity', label: 'Integrity' },
  { key: 'respect', label: 'Respect' },
  { key: 'excellence', label: 'Excellence' },
  { key: 'socialResponsibility', label: 'Social Responsibility' },
];
function programRowsFor(ord: number): { key: string; label: string }[] {
  if (ord >= 7) return [
    { key: 'foreign', label: 'Foreign Language' },
    { key: 'homeroom', label: 'Homeroom Guidance' },
    { key: 'sap', label: 'SAP' },
  ];
  if (ord >= 4) return [
    { key: 'homeroom', label: 'Homeroom Guidance' },
    { key: 'sap', label: 'SAP' },
    { key: 'scouting', label: 'Scouting' },
  ];
  return [
    { key: 'computer', label: 'Computer' },
    { key: 'homeroom', label: 'Homeroom Guidance' },
    { key: 'sap', label: 'SAP' },
  ];
}

const DESCRIPTORS: [string, string, string][] = [
  ['90-100', 'Advancing', 'Passed'],
  ['80-89', 'Benchmarking', 'Passed'],
  ['75-79', 'Connecting', 'Passed'],
  ['65-74', 'Developing', 'Failed'],
  ['0-64', 'Emerging', 'Failed'],
];

interface Props {
  student: Student;
  subjects: Subject[];
  sy?: string;
}

export function ReportCard138({ student, subjects, sy }: Props) {
  const year = sy ?? latestGradedSy(student) ?? student.currentSY;
  const periods = periodsForSy(year);
  const pcols = periods.map((p) => p.key); // 'q1'..
  const short = periods.map((p) => p.short); // '1'..
  const rows = buildSubjectRows(gradesForSy(student, year), subjectIndex(subjects));
  const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === year);
  const gradeCode = entry?.gradeLevel;
  const ord = ordOf(gradeCode);
  const descriptive = isDescriptiveLevel(gradeCode, year);
  const conduct = conductForSy(student, year);
  const att = conduct.attendance;
  const values = conduct.values?.q;
  const programs = conduct.programs?.q;
  const programRows = programRowsFor(ord);

  const academic = rows.filter((r) => !r.isMapehComponent);
  const gaNum = generalAverage(rows);
  const gaLetter = modal(academic.map((r) => modal(pcols.map((q) => r.letters?.[q]))));

  const periodAvgNum = (q: 'q1' | 'q2' | 'q3' | 'q4') => {
    const vals = academic.map((r) => r[q]).filter((v): v is number => typeof v === 'number');
    return vals.length ? num(vals.reduce((a, b) => a + b, 0) / vals.length) : '';
  };
  const periodAvgLetter = (q: 'q1' | 'q2' | 'q3' | 'q4') =>
    modal(academic.map((r) => r.letters?.[q]));

  const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ' ' + student.middleName : ''}`;
  const adviser = entry?.adviserName || '';
  const age = student.birthdate ? ageOnDate(student.birthdate, `${year.slice(0, 4)}-06-01`) : null;
  const promoted = descriptive ? (gaLetter && gaLetter !== 'E' && gaLetter !== 'D') : gaNum != null && gaNum >= 75;

  const bd = 'border border-black';
  const cell = `${bd} px-1 py-[1px] text-center align-middle`;
  const hcell = `${cell} font-bold`;

  // one FINAL letter for a deportment/program row from its 3 term marks
  const finalLetterFor = (get: (q: string) => number | undefined, toLetter: (v?: number) => string) =>
    modal(pcols.map((q) => toLetter(get(q))));

  return (
    <div className="mx-auto w-[8in] font-serif text-[8.5px] leading-[1.15] text-black bg-white p-3 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <style>{`@media print { @page { size: 8.5in 13in; margin: 0.3in; } }`}</style>

      <div className="text-[7px]">School Form 9</div>

      {/* header */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <div className="w-14 h-14 rounded-full border border-zinc-300 grid place-items-center text-[6px] text-zinc-400">
          DepEd
        </div>
        <div className="text-center leading-tight">
          <div>REPUBLIC OF THE PHILIPPINES</div>
          <div className="font-semibold">DEPARTMENT OF EDUCATION</div>
          <div>REGION V</div>
          <div>SCHOOLS DIVISIONS OFFICE OF NAGA CITY</div>
          <div>Naga North District</div>
          <div className="text-[12px] font-bold text-red-700 mt-0.5">NAGA PAROCHIAL SCHOOL</div>
          <div>Corner Bagumbayan Sur and Ateneo Avenue, Naga City</div>
          <div className="text-[7.5px]">GR. No. 002 S. 2009 &nbsp; GR. No. J-004 S. 2017</div>
        </div>
        <img src={npsLogo} alt="" className="w-14 h-14 object-contain" />
      </div>

      {/* two columns */}
      <div className="mt-1 grid grid-cols-2 gap-3 items-start">
        {/* LEFT */}
        <div>
          <div className="text-center font-bold">LEARNER&rsquo;S PERFORMANCE REPORT</div>
          <div className="text-center">School Year {formatSy(year)}</div>

          <div className="mt-1">
            <div><b>Name:</b> {fullName} &nbsp; <b>Age:</b> {age ?? ''} &nbsp; <b>Gender:</b> {student.gender}</div>
            <div><b>LRN:</b> {student.lrn} &nbsp; <b>Grade:</b> {gradeCode ?? ''} &nbsp; <b>Section:</b> {entry?.sectionName ?? ''}</div>
            <div><b>Student Number:</b> {student.studentNo || ''} &nbsp; <b>TRACK (SHS only):</b> ____________</div>
          </div>

          <p className="mt-1 text-justify">
            <b>Dear Parents,</b> The Performance Report shows the ability and progress your child has
            made in the different learning areas as well as his/her core values. The school welcomes
            you should you desire to know more about your child&rsquo;s progress.
          </p>

          <div className="mt-1 text-center font-bold">LEARNING PROGRESS AND ACHIEVEMENT</div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${hcell} text-left`} rowSpan={2}>LEARNING AREAS</th>
                <th className={hcell} colSpan={periods.length}>TERM</th>
                <th className={hcell} rowSpan={2}>Final Grade</th>
                <th className={hcell} rowSpan={2}>Remarks</th>
              </tr>
              <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-6`}>{s}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subjectCode}>
                  <td className={`${bd} px-1 py-[1px] ${r.isMapehComponent ? 'pl-3 italic' : ''} ${r.isMapehParent ? 'font-semibold' : ''}`}>
                    {r.name}
                  </td>
                  {pcols.map((q) => (
                    <td key={q} className={cell}>
                      {descriptive ? (r.letters?.[q] ?? '') : num(r[q])}
                    </td>
                  ))}
                  {/* MAPEH components show term grades only (no Final/Remarks) */}
                  <td className={cell}>
                    {r.isMapehComponent ? '' : descriptive ? modal(pcols.map((q) => r.letters?.[q])) : num(r.final)}
                  </td>
                  <td className={cell}>
                    {r.isMapehComponent ? '' : descriptive ? letterRemark(modal(pcols.map((q) => r.letters?.[q]))) : r.remark}
                  </td>
                </tr>
              ))}
              <tr>
                <td className={`${bd} px-1 py-[1px] font-semibold`}>Average</td>
                {pcols.map((q) => (
                  <td key={q} className={cell}>{descriptive ? periodAvgLetter(q) : periodAvgNum(q)}</td>
                ))}
                <td className={bd} colSpan={2} />
              </tr>
              <tr>
                <td className={`${bd} px-1 py-[1px] font-semibold`}>Conduct</td>
                {pcols.map((q) => <td key={q} className={cell} />)}
                <td className={bd} colSpan={2} />
              </tr>
              <tr>
                <td className={`${bd} px-1 py-[1px] text-right font-bold`} colSpan={periods.length + 1}>
                  General Average
                </td>
                <td className={`${cell} font-bold`}>{descriptive ? gaLetter : (gaNum ?? '')}</td>
                <td className={cell}>{promoted ? 'Promoted' : ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-2 font-bold">PERFORMANCE DESCRIPTORS</div>
          <table className="border-collapse text-[7.5px]">
            <thead>
              <tr>
                <th className="pr-3 text-left font-bold">Grading Scale</th>
                <th className="pr-3 text-left font-bold">Descriptions</th>
                <th className="text-left font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {DESCRIPTORS.map((d) => (
                <tr key={d[0]}>
                  <td className="pr-3">{d[0]}</td>
                  <td className="pr-3">{d[1]}</td>
                  <td>{d[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-1.5">
          {/* SPECIAL PROGRAMS */}
          <div>
            <div className="text-center font-bold">SPECIAL PROGRAMS</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`} rowSpan={2}>LEARNER&rsquo;S SUPPORT PROGRAM</th>
                  <th className={hcell} colSpan={periods.length}>TERM</th>
                  <th className={hcell} rowSpan={2}>FINAL GRADE</th>
                </tr>
                <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-6`}>{s}</th>)}</tr>
              </thead>
              <tbody>
                {programRows.map((pr) => (
                  <tr key={pr.key}>
                    <td className={`${bd} px-1 py-[1px]`}>{pr.label}</td>
                    {pcols.map((q) => (
                      <td key={q} className={cell}>{programLetter(programs?.[q]?.[pr.key])}</td>
                    ))}
                    <td className={cell}>{finalLetterFor((q) => programs?.[q]?.[pr.key], programLetter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[6.5px]">MO-Most Outstanding O-Outstanding VS-Very Satisfactory S-Satisfactory FS-Fairly Satisfactory</div>
          </div>

          {/* DEPORTMENT */}
          <div>
            <div className="text-center font-bold">DEPORTMENT</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`} rowSpan={2}>CORE VALUES</th>
                  <th className={hcell} colSpan={periods.length}>TERM</th>
                  <th className={hcell} rowSpan={2}>FINAL GRADE</th>
                </tr>
                <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-6`}>{s}</th>)}</tr>
              </thead>
              <tbody>
                {CORE_VALUES.map((cv) => (
                  <tr key={cv.key}>
                    <td className={`${bd} px-1 py-[1px]`}>{cv.label}</td>
                    {pcols.map((q) => (
                      <td key={q} className={cell}>{deportmentLetter(values?.[q]?.[cv.key])}</td>
                    ))}
                    <td className={cell}>{finalLetterFor((q) => values?.[q]?.[cv.key], deportmentLetter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[6.5px]">AO-Always Observed SO-Sometimes Observed RO-Rarely Observed NO-Not Observed</div>
          </div>

          {/* ATTENDANCE */}
          <div>
            <div className="text-center font-bold">ATTENDANCE REPORT</div>
            <table className="w-full border-collapse text-[7px]">
              <thead>
                <tr>
                  <th className={`${bd} px-0.5`}> </th>
                  {MONTHS.map((m) => <th key={m.key} className={`${bd} px-0.5`}>{m.label}</th>)}
                  <th className={`${bd} px-0.5`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['School Days', undefined],
                  ['Days Present', att?.present],
                  ['Days Absent', undefined],
                  ['Times Tardy', att?.tardy],
                ] as const).map(([label, data], i) => {
                  const total =
                    label === 'Days Present' ? att?.totalPresent : label === 'Times Tardy' ? att?.totalTardy : undefined;
                  return (
                    <tr key={i}>
                      <td className={`${bd} px-0.5`}>{label}</td>
                      {MONTHS.map((m) => (
                        <td key={m.key} className={`${bd} px-0.5 text-center`}>{data?.[m.key] ?? ''}</td>
                      ))}
                      <td className={`${bd} px-0.5 text-center font-semibold`}>{total ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CERTIFICATE OF TRANSFER */}
          <div className="mt-0.5">
            <div className="text-center font-bold">CERTIFICATE OF TRANSFER</div>
            <p className="text-justify">
              This is to certify that the above-named learner has satisfactorily completed the
              requirements for the grade level indicated.
            </p>
            <div className="mt-0.5">Admitted to Grade: {gradeCode ?? ''}</div>
            <div>Eligible for Admission to Grade: {nextRoman(gradeCode)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="text-left pt-3"><i>Approved:</i></div>
              <div>
                <div className="font-semibold uppercase">{adviser || ' '}</div>
                <div className="border-t border-black">Class Adviser</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-semibold uppercase">{PRINCIPAL}</div>
              <div>School Principal</div>
            </div>
          </div>

          {/* CANCELLATION */}
          <div className="mt-1">
            <div className="text-center font-bold">CANCELLATION OF ELIGIBILITY TO TRANSFER</div>
            <div className="mt-1">Admitted in: ____________________ Date: __________</div>
            <div className="mt-3 text-center">
              <div className="inline-block border-t border-black px-8">School Principal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
