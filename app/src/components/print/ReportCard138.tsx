import { useState } from 'react';
import type { Student, Subject } from '@/types';
import {
  buildSubjectRows,
  subjectIndex,
  generalAverage,
  gradeLabel,
  formatSy,
  latestGradedSy,
  gradesForSy,
  conductForSy,
  periodsForSy,
  MONTHS,
} from '@/lib/forms';

// NPS Form 138 (Report Card) — reproduces the exact on-screen NPS card layout for
// Grades 2–10 (see docs/templates/report-card-grades-2-6.md and -7-10.md): parchment
// sheet, academics + summary on the left, Special Programs / Deportment / Attendance on
// the right, certification + cancellation block, and the "Valid for transfer" toggle
// that hides the red "Not valid for transfer." line. "Print / Save as PDF" = TO PDF.

const PRINCIPAL_NAME = 'MRS. ROSARIO OLALIA';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function ordOf(code?: string): number {
  const base = (code ?? '').split('-')[0];
  const i = ROMAN.indexOf(base);
  return i >= 0 ? i + 1 : 0;
}
// "Grade VII" for the grade a Grade-6 learner is promoted to, etc.
function nextGradeRoman(code?: string): string {
  const o = ordOf(code);
  return o > 0 && o < 12 ? `Grade ${ROMAN[o]}` : '';
}

const ORD_LABEL = ['1st', '2nd', '3rd', '4th'];
const num = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');
// trim to <=3 decimals without trailing zeros (Average final cell shows e.g. 81.375, 89)
const dec = (v: number) => String(Math.round(v * 1000) / 1000);

// Deportment / Core Values rubric (card legend).
function deportmentLetter(v?: number): string {
  if (v == null) return '';
  if (v >= 91) return 'AO';
  if (v >= 86) return 'SO';
  if (v >= 80) return 'RO';
  if (v >= 75) return 'NO';
  return '';
}
// Special-program rubric (07-grading-rubrics.md).
function programLetter(v?: number): string {
  if (v == null) return '';
  if (v >= 95) return 'MO';
  if (v >= 90) return 'O';
  if (v >= 85) return 'VS';
  if (v >= 80) return 'S';
  if (v >= 75) return 'FS';
  return 'DM';
}

const CORE_VALUES: { key: string; label: string }[] = [
  { key: 'faith', label: 'Faith' },
  { key: 'integrity', label: 'Integrity' },
  { key: 'respect', label: 'Respect' },
  { key: 'excellence', label: 'Excellence' },
  { key: 'socialResponsibility', label: 'Social Responsibility' },
];

// Special-program rows shown per grade band (matches the samples).
function programRowsFor(ord: number): { key: string; label: string }[] {
  if (ord >= 7) {
    return [
      { key: 'foreign', label: 'Foreign Language' },
      { key: 'homeroom', label: 'Homeroom Guidance' },
      { key: 'sap', label: 'SAP' },
    ];
  }
  if (ord >= 4) {
    return [
      { key: 'homeroom', label: 'Homeroom Guidance' },
      { key: 'sap', label: 'SAP' },
      { key: 'scouting', label: 'Scouting' },
    ];
  }
  // Grades 2–3
  const base = [
    { key: 'computer', label: 'Computer' },
    { key: 'homeroom', label: 'Homeroom Guidance' },
    { key: 'sap', label: 'SAP' },
  ];
  return ord === 3 ? [...base, { key: 'scouting', label: 'Scouting' }] : base;
}

interface Props {
  student: Student;
  subjects: Subject[];
  sy?: string;
}

export function ReportCard138({ student, subjects, sy }: Props) {
  const [validForTransfer, setValidForTransfer] = useState(false);

  const year = sy ?? latestGradedSy(student) ?? student.currentSY;
  const periods = periodsForSy(year);
  const pcols = periods.map((p) => p.short); // '1'..'4' — data keys for conduct
  const rows = buildSubjectRows(gradesForSy(student, year), subjectIndex(subjects));
  const ga = generalAverage(rows);
  const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === year);
  const gradeCode = entry?.gradeLevel;
  const ord = ordOf(gradeCode);
  const conduct = conductForSy(student, year);
  const att = conduct.attendance;
  const values = conduct.values?.q;
  const programs = conduct.programs?.q;
  const programRows = programRowsFor(ord);

  const academic = rows.filter((r) => !r.isMapehComponent);
  // per-period class average (rounded), and the decimal final average
  const periodAvg = (key: 'q1' | 'q2' | 'q3' | 'q4'): string => {
    const vals = academic.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
    return vals.length ? num(vals.reduce((a, b) => a + b, 0) / vals.length) : '';
  };
  const finals = academic.map((r) => r.final).filter((v): v is number => typeof v === 'number');
  const finalAvg = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;

  const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ' ' + student.middleName : ''}`;
  const nextGrade = nextGradeRoman(gradeCode);
  const adviser = entry?.adviserName || '';

  const cell = 'border border-zinc-500 px-1 py-[2px] text-center';
  const hcell = 'border border-zinc-500 px-1 py-[2px] text-center font-semibold';

  return (
    <div
      className="font-sans text-[10px] leading-tight text-black bg-[#f3e9cf] [-webkit-print-color-adjust:exact] [print-color-adjust:exact] p-4"
    >
      {/* control bar — never printed */}
      <label className="no-print mb-3 flex items-center gap-2 text-[12px] font-sans">
        <input
          type="checkbox"
          checked={validForTransfer}
          onChange={(e) => setValidForTransfer(e.target.checked)}
        />
        Valid for transfer. <span className="text-zinc-600">(Use “Print / Save as PDF” above for TO PDF)</span>
      </label>

      {/* identity header */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        <div className="pt-6">
          <div className="text-[11px] font-bold uppercase">{fullName}</div>
          <div className="text-[10px]">
            GRADE/SECTION: {gradeLabel(gradeCode)}
            {entry?.sectionName ? ` - ${entry.sectionName}` : ''}
          </div>
        </div>
        <div className="text-[10px]">
          <div>School ID: 403875</div>
          <div>Student No: {student.studentNo || ''}</div>
          <div>LRN: {student.lrn}</div>
          <div>School Year: {formatSy(year)}</div>
        </div>
      </div>

      {/* two columns */}
      <div className="grid grid-cols-2 gap-3 items-start">
        {/* LEFT — academics */}
        <div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${hcell} text-left`}>SUBJECTS</th>
                {periods.map((p, i) => (
                  <th key={p.key} className={`${hcell} w-7`}>
                    {ORD_LABEL[i]}
                  </th>
                ))}
                <th className={`${hcell} w-10`}>Final</th>
                <th className={`${hcell} w-16`}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subjectCode}>
                  <td
                    className={`border border-zinc-500 px-1 py-[2px] ${r.isMapehComponent ? 'pl-3 italic' : ''} ${r.isMapehParent ? 'font-semibold' : ''}`}
                  >
                    {r.name}
                  </td>
                  {periods.map((p) => (
                    <td key={p.key} className={cell}>
                      {num(r[p.key])}
                    </td>
                  ))}
                  <td className={`${cell} font-semibold`}>{num(r.final)}</td>
                  <td className="border border-zinc-500 px-1 py-[2px]">
                    {r.isMapehComponent ? '' : r.remark}
                  </td>
                </tr>
              ))}
              {/* Average */}
              <tr>
                <td className="border border-zinc-500 px-1 py-[2px] font-semibold">Average</td>
                {periods.map((p) => (
                  <td key={p.key} className={cell}>
                    {periodAvg(p.key)}
                  </td>
                ))}
                <td className={`${cell} font-semibold`}>{finalAvg != null ? dec(finalAvg) : ''}</td>
                <td className="border border-zinc-500" />
              </tr>
              {/* Conduct */}
              <tr>
                <td className="border border-zinc-500 px-1 py-[2px] font-semibold">Conduct</td>
                {periods.map((p) => (
                  <td key={p.key} className={cell} />
                ))}
                <td className="border border-zinc-500" />
                <td className="border border-zinc-500" />
              </tr>
            </tbody>
          </table>

          <div className="mt-1 flex justify-between text-[10px]">
            <span>Promoted to {nextGrade}</span>
            <span className="font-semibold">General Average: {ga ?? ''}</span>
          </div>

          {/* academic legend */}
          <table className="mt-3 w-full border-collapse text-[8px]">
            <thead>
              <tr className="uppercase">
                <th className="text-left font-bold">ACADEMIC · Descriptors</th>
                <th className="text-left font-bold">Grading Scale</th>
                <th className="text-left font-bold">Remark</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Outstanding', '90-100', 'Passed'],
                ['Very Satisfactory', '85-89', 'Passed'],
                ['Satisfactory', '80-84', 'Passed'],
                ['Fairly Satisfactory', '75-79', 'Passed'],
                ['Did not meet expectations', 'Below 75', 'Failed'],
              ].map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT — special programs / deportment / attendance / certification */}
        <div className="flex flex-col gap-2">
          {/* SPECIAL PROGRAMS */}
          <div>
            <div className="text-center text-[10px] font-bold uppercase">Special Programs</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`}>SUBJECTS</th>
                  {periods.map((_, i) => (
                    <th key={i} className={`${hcell} w-7`}>
                      {ORD_LABEL[i]}
                    </th>
                  ))}
                  <th className={`${hcell} w-10`}>FINAL</th>
                </tr>
              </thead>
              <tbody>
                {programRows.map((pr) => {
                  const vals = pcols
                    .map((q) => programs?.[q]?.[pr.key])
                    .filter((v): v is number => typeof v === 'number');
                  const fin = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
                  return (
                    <tr key={pr.key}>
                      <td className="border border-zinc-500 px-1 py-[2px]">{pr.label}</td>
                      {pcols.map((q) => (
                        <td key={q} className={cell}>
                          {programLetter(programs?.[q]?.[pr.key])}
                        </td>
                      ))}
                      <td className={cell}>{programLetter(fin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DEPORTMENT */}
          <div>
            <div className="text-center text-[10px] font-bold uppercase">Deportment</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`}>CORE VALUES</th>
                  {periods.map((_, i) => (
                    <th key={i} className={`${hcell} w-7`}>
                      {ORD_LABEL[i]}
                    </th>
                  ))}
                  <th className={`${hcell} w-10`}>FINAL</th>
                </tr>
              </thead>
              <tbody>
                {CORE_VALUES.map((cv) => {
                  const vals = pcols
                    .map((q) => values?.[q]?.[cv.key])
                    .filter((v): v is number => typeof v === 'number');
                  const fin = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
                  return (
                    <tr key={cv.key}>
                      <td className="border border-zinc-500 px-1 py-[2px]">{cv.label}</td>
                      {pcols.map((q) => (
                        <td key={q} className={cell}>
                          {deportmentLetter(values?.[q]?.[cv.key])}
                        </td>
                      ))}
                      <td className={cell}>{deportmentLetter(fin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[7.5px] leading-tight">
              AO - Always Observed (91-100) &nbsp; SO - Sometimes Observed (86-90) &nbsp; RO - Rarely
              Observed (80-85) &nbsp; NO - Not Observed (75-79)
            </div>
          </div>

          {/* ATTENDANCE */}
          <div>
            <div className="text-center text-[10px] font-bold uppercase">Attendance Report</div>
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr>
                  <th className="border border-zinc-500 px-1 py-[2px] text-left"> </th>
                  {MONTHS.map((m) => (
                    <th key={m.key} className="border border-zinc-500 px-0.5 py-[2px]">
                      {m.label}
                    </th>
                  ))}
                  <th className="border border-zinc-500 px-0.5 py-[2px]">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-500 px-1 py-[2px]">School Days</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-500 px-0.5 py-[2px] text-center" />
                  ))}
                  <td className="border border-zinc-500 px-0.5 py-[2px]" />
                </tr>
                <tr>
                  <td className="border border-zinc-500 px-1 py-[2px]">Days Present</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-500 px-0.5 py-[2px] text-center">
                      {att?.present?.[m.key] ?? ''}
                    </td>
                  ))}
                  <td className="border border-zinc-500 px-0.5 py-[2px] text-center font-semibold">
                    {att?.totalPresent ?? ''}
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-500 px-1 py-[2px]">Days Absent</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-500 px-0.5 py-[2px] text-center" />
                  ))}
                  <td className="border border-zinc-500 px-0.5 py-[2px]" />
                </tr>
                <tr>
                  <td className="border border-zinc-500 px-1 py-[2px]">Times Tardy</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-500 px-0.5 py-[2px] text-center">
                      {att?.tardy?.[m.key] ?? ''}
                    </td>
                  ))}
                  <td className="border border-zinc-500 px-0.5 py-[2px] text-center font-semibold">
                    {att?.totalTardy ?? ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CERTIFICATION */}
          <div className="mt-1 text-[9px]">
            <div className="text-center font-bold uppercase">Certification</div>
            <p className="mt-0.5 text-justify indent-4">
              This is to certify that {fullName} is eligible for transfer and admission to {nextGrade}.
            </p>
            <div className="mt-4 flex justify-between text-center text-[9px]">
              <div>
                <div className="font-semibold uppercase">{adviser || ' '}</div>
                <div className="border-t border-zinc-600 pt-0.5">Class Adviser</div>
              </div>
              <div>
                <div className="font-semibold uppercase">{PRINCIPAL_NAME}</div>
                <div className="border-t border-zinc-600 pt-0.5">Principal</div>
              </div>
            </div>
          </div>

          {/* CANCELLATION OF TRANSFER ELIGIBILITY */}
          <div className="mt-2 text-[9px]">
            <div className="text-center font-bold uppercase">Cancellation of Transfer Eligibility</div>
            <div className="mt-1">Admitted in ______________________________</div>
            <div>Date: ____________________</div>
            <div className="mt-3 text-right">______________________ Principal</div>
          </div>

          {!validForTransfer && (
            <div className="mt-1 text-[10px] font-bold italic text-red-600">Not valid for transfer.</div>
          )}
        </div>
      </div>
    </div>
  );
}
