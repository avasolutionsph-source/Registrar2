import { Fragment, useEffect, useState } from 'react';
import npsLogo from '@/assets/nps-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import { listGradeSubjects, listSchoolYears, listClassSubjects } from '@/lib/db';
import { SHEET_GOLD, sheetStyle, WATERMARK_CLASS } from './ReportCard138';
import type { QuarterKey, SchoolYear, Student, Subject } from '@/types';
import {
  subjectIndex,
  formatSy,
  latestGradedSy,
  gradesForSy,
  conductForSy,
  periodsForSy,
  monthsForSy,
  adviserFirstNameFirst,
} from '@/lib/forms';
import { displayLrn } from '@/lib/lrn';

// NPS Nursery & Kindergarten Progress Report (SY 2026-2027) — the preschool
// report card (N1 / N2 / K). Faithful to the official form: SCHOLARSHIP with
// B/D/C descriptors + ACTION TAKEN, per-statement DEPORTMENT (AO/SO/RO/NO),
// ATTENDANCE RECORD, promotion lines and signatures. One short bond portrait.
//
// Same printing model as the SF9 card: printed PER TERM (`upto`) — Over-All
// columns and the eligibility line appear only on the complete (Term 3) card.

const PRINCIPAL = 'MRS. ROSARIO B. OLALIA';

// Level line under NAME ("KINDERGARTEN: ___") and the level a completer moves to.
const LEVEL_LINE: Record<string, string> = {
  N1: 'NURSERY I',
  N2: 'NURSERY II',
  K: 'KINDERGARTEN',
  P: 'PREPARATORY',
};
const NEXT_LEVEL: Record<string, string> = {
  N1: 'Nursery II',
  N2: 'Kindergarten',
  K: 'Grade I',
};

// Official learning areas, used when the section has no subject load set up
// yet so the printed card is never an empty table.
const FALLBACK_AREAS = [
  'GMRC- Christian Living Education',
  'Language',
  'Reading and Literacy',
  'Mathematics',
  'MAKABANSA-Filipino',
];

// DEPORTMENT: the five core values with the official "I ..." statements.
// `k` is the storage key the ADVISER PORTAL writes into conduct.preDeportment
// (Adviser ▸ Deportment Marks) — the two lists must never drift apart. The
// band row additionally shows the encoded core-value rating when it exists.
const DEPORTMENT_GROUPS: { key: string; label: string; items: { k: string; label: string }[] }[] = [
  {
    key: 'faith',
    label: 'FAITH',
    items: [
      { k: 'faith1', label: 'I pray with proper posture and reverence.' },
      { k: 'faith2', label: 'I make the sign of the Cross correctly.' },
      { k: 'faith3', label: 'I recite familiar prayers with confidence.' },
    ],
  },
  {
    key: 'integrity',
    label: 'INTEGRITY',
    items: [
      { k: 'integrity1', label: 'I complete my work honestly and independently.' },
      { k: 'integrity2', label: 'I accept responsibility for my actions.' },
      { k: 'integrity3', label: 'I make good choices in school.' },
    ],
  },
  {
    key: 'respect',
    label: 'RESPECT',
    items: [
      { k: 'respect1', label: 'I greet my teachers and school personnel politely.' },
      { k: 'respect2', label: 'I use respectful words such as “po” and “opo”.' },
      { k: 'respect3', label: 'I raise my hand and wait for my turn to speak.' },
      { k: 'respect4', label: 'I follow my teacher’s directions promptly.' },
    ],
  },
  {
    key: 'excellence',
    label: 'EXCELLENCE',
    items: [
      { k: 'excellence1', label: 'I come to class prepared with needed materials.' },
      { k: 'excellence2', label: 'I complete my assigned homework and class tasks.' },
      { k: 'excellence3', label: 'I participate actively in class discussion and activities.' },
      { k: 'excellence4', label: 'I try to complete tasks independently before asking for help.' },
    ],
  },
  {
    key: 'socialResponsibility',
    label: 'SOCIAL RESPONSIBILITY',
    items: [
      { k: 'socialResponsibility1', label: 'I participate actively during morning routines and school activities.' },
      { k: 'socialResponsibility2', label: 'I show kindness and consideration toward others.' },
      { k: 'socialResponsibility3', label: 'I come to school wearing the proper uniform and with a neat appearance.' },
      { k: 'socialResponsibility4', label: 'I keep my personal belongings organized and ready for class.' },
      { k: 'socialResponsibility5', label: 'I help keep classroom clean and orderly.' },
    ],
  },
];

function deportmentLetter(v?: number): string {
  if (v == null) return '';
  if (v >= 91) return 'AO';
  if (v >= 86) return 'SO';
  if (v >= 80) return 'RO';
  if (v >= 75) return 'NO';
  return '';
}
// most-frequent non-empty value across the terms (Over-All columns)
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
const r2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  student: Student;
  subjects: Subject[];
  sy?: string;
  upto?: number;
  classTerms?: Record<string, string | null>;
  classId?: string;
  liveClass?: { gradeLevel: string; sectionName: string; adviserName: string };
}

export function ReportCardPreschool({
  student,
  subjects,
  sy,
  upto: uptoProp,
  classTerms,
  classId,
  liveClass,
}: Props) {
  const year = sy ?? latestGradedSy(student) ?? student.currentSY;
  const periods = periodsForSy(year);
  const pcols = periods.map((p) => p.key);
  const upto = Math.min(Math.max(uptoProp ?? periods.length, 1), periods.length);
  const complete = upto === periods.length;
  const shown = (i: number) => i < upto;
  const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === year);
  const gradeCode = liveClass?.gradeLevel ?? entry?.gradeLevel ?? '';
  const sectionName = liveClass?.sectionName ?? entry?.sectionName ?? '';
  // first-name-first, even when the value is an old "Last, First" snapshot
  const adviser = liveClass?.adviserName || adviserFirstNameFirst(entry?.adviserName);

  // Registrar-curated subject order for this level (Setup ▸ Subjects).
  const [orderCodes, setOrderCodes] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = gradeCode ? await listGradeSubjects(gradeCode).catch(() => []) : [];
      if (!cancelled) setOrderCodes(next);
    })();
    return () => { cancelled = true; };
  }, [gradeCode]);

  // SY row — attendance months + School Days (Setup ▸ School Year).
  const [syRow, setSyRow] = useState<SchoolYear | null>(null);
  useEffect(() => {
    let cancelled = false;
    listSchoolYears()
      .then((rs) => { if (!cancelled) setSyRow(rs.find((r) => r.code === year) ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [year]);

  // Section subject list (fetched when only classId was given).
  const [fetchedTerms, setFetchedTerms] = useState<Record<string, string | null> | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next =
        classTerms === undefined && classId
          ? await listClassSubjects(classId)
              .then((rows) =>
                Object.fromEntries(rows.map((r) => [r.subjectCode.toUpperCase(), r.term ?? null])),
              )
              .catch(() => null)
          : null;
      if (!cancelled) setFetchedTerms(next);
    })();
    return () => { cancelled = true; };
  }, [classId, classTerms]);
  const termsMap = classTerms ?? fetchedTerms;

  // ── SCHOLARSHIP rows: the section's subject load (blank rows when nothing
  // is encoded yet), else the official fixed learning areas. The B/D/C letter
  // per term comes from the ADVISER's Progress Report sheet (conduct
  // .preScholarship), with any letters on the grade entry as fallback.
  const conductPre = conductForSy(student, year);
  const preSch = conductPre.preScholarship ?? {};
  const preDep = conductPre.preDeportment ?? {};
  const baseEntries = gradesForSy(student, year);
  const index = subjectIndex(subjects);
  const rank = new Map(orderCodes.map((c, i) => [c.toUpperCase(), i] as const));
  const byCode = new Map(baseEntries.map((g) => [g.subjectCode.toUpperCase(), g]));
  const codes = new Set<string>([
    ...byCode.keys(),
    ...Object.keys(termsMap ?? {}),
    ...Object.keys(preSch).map((c) => c.toUpperCase()),
  ]);
  const ALL_Q: QuarterKey[] = ['q1', 'q2', 'q3', 'q4'];
  let areas = [...codes]
    .map((c) => {
      const g = byCode.get(c);
      const letters: Partial<Record<QuarterKey, string>> = { ...(g?.letters ?? {}) };
      for (const q of ALL_Q) {
        const v = preSch[c]?.[q];
        if (v) letters[q] = v; // adviser-encoded letter wins
      }
      return {
        code: c,
        name: g?.customName?.trim() || index.get(c)?.fullName || c,
        letters,
        order: rank.get(c) ?? 9999,
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  if (areas.length === 0) {
    areas = FALLBACK_AREAS.map((name, i) => ({ code: name, name, letters: {}, order: i }));
  }
  const overAllOf = (letters: Partial<Record<QuarterKey, string>>) =>
    complete ? modal(pcols.map((q) => letters[q])) : '';
  const termProgress = (q: QuarterKey) => modal(areas.map((a) => a.letters[q]));
  const overAllProgress = complete ? modal(areas.map((a) => overAllOf(a.letters))) : '';

  const conduct = conductForSy(student, year);
  const att = conduct.attendance;
  const values = conduct.values?.q;
  // adviser portal writes 'q1'..; legacy imports used '1'.. — accept both
  const perQ = (q: QuarterKey): Record<string, number> | undefined =>
    values?.[q] ?? values?.[q.slice(1)];

  // ── attendance (same engine as the SF9 card) ──────────────────────────────
  const months = monthsForSy(syRow?.startDate, syRow?.endDate);
  const schoolDays = syRow?.schoolDays ?? {};
  const numOr = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  const sdOf = (k: string): number | undefined => numOr(schoolDays[k]);
  const prOf = (k: string): number | undefined => numOr(att?.present?.[k]);
  const absOf = (k: string): number | undefined => {
    const sd = sdOf(k);
    const pr = prOf(k);
    return sd != null && pr != null ? r2(sd - pr) : undefined;
  };
  const tdOf = (k: string): number | undefined => numOr(att?.tardy?.[k]);
  const sumOf = (get: (k: string) => number | undefined): number | undefined => {
    const vals = months.map((m) => get(m.key)).filter((v): v is number => v != null);
    return vals.length ? r2(vals.reduce((a, b) => a + b, 0)) : undefined;
  };
  const attCell = (v: number | undefined) => (v == null ? '' : String(v));
  const attRows: { label: string; get: (k: string) => number | undefined; total: number | undefined }[] = [
    { label: 'Days of School', get: sdOf, total: sumOf(sdOf) },
    { label: 'Days Present', get: prOf, total: att?.totalPresent ?? sumOf(prOf) },
    { label: 'Days Absent', get: absOf, total: sumOf(absOf) },
    { label: 'Times Tardy', get: tdOf, total: att?.totalTardy ?? sumOf(tdOf) },
  ];

  const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ' ' + student.middleName : ''}`;
  const levelLine = LEVEL_LINE[gradeCode] ?? gradeCode;
  const nextLevel = NEXT_LEVEL[gradeCode] ?? '';

  const bd = 'border border-black';
  const cell = `${bd} px-1.5 py-[2px] text-center align-middle`;
  const hcell = `${cell} font-bold`;
  const blank = (label: string, value: string, w = 'flex-1') => (
    <div className="flex items-end gap-2">
      <span className="font-bold whitespace-nowrap">{label}</span>
      <span className={`${w} border-b border-black px-1 leading-tight`}>{value || ' '}</span>
    </div>
  );

  return (
    <div
      className="relative isolate mx-auto w-full flex flex-col text-[10px] leading-[1.35] text-black p-2 print:p-[0.35in] [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
      style={{
        fontFamily: "'Canva Sans', 'Quicksand', ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
        background: SHEET_GOLD,
      }}
    >
      {/* Real 0.4in page margin, and the gold ground on the root element so it
          covers the WHOLE sheet including the margins — see ReportCard138. */}
      <style>{sheetStyle}</style>

      {/* School seal watermark — see ReportCard138: `isolate` + z-[-1] keeps it
          above the white sheet but behind every row. */}
      <img
        src={npsLogo}
        alt=""
        aria-hidden="true"
        className={WATERMARK_CLASS}
      />

      <div className="text-[8.5px]">School Form 9</div>
      <div className="text-[8.5px]">
        Student No.: {student.studentNo || '__________'} &nbsp; LRN: {displayLrn(student.lrn)}
      </div>

      {/* FULL-WIDTH letterhead, same as the SF9 card: school name centered with
          a seal on each side, spanning the whole sheet instead of being squeezed
          into the left column. */}
      <div className="mt-1.5 flex items-center justify-center gap-5">
        <img src={depedLogo} alt="" className="w-12 h-12 object-contain shrink-0" />
        <div className="text-center leading-[1.3]">
          <div>REPUBLIC OF THE PHILIPPINES</div>
          <div className="font-semibold">DEPARTMENT OF EDUCATION</div>
          <div>REGION V</div>
          <div className="text-[15px] font-bold text-red-700 leading-tight">NAGA PAROCHIAL SCHOOL</div>
          <div>Cor. Ateneo Avenue and Bagumbayan Sur, Naga City</div>
          <div className="text-[9px]">Government Recognition No. 002 S. 2009</div>
        </div>
        <img src={npsLogo} alt="" className="w-16 h-16 object-contain shrink-0" />
      </div>

      {/* Page budget at 0.4in margins is ~10.2in, less ~0.17in root padding and
          ~1.3in of letterhead. The floor only STRETCHES the columns — the
          28-row deportment table is what actually sets the height, so its row
          padding is kept tight and the floor stays under budget with headroom.
          Raising either one spills onto sheet 2. */}
      <div className="mt-4 grid grid-cols-2 gap-6 flex-1 items-stretch min-h-[7.9in]">
        {/* LEFT — identity, scholarship, attendance, signatures */}
        <div className="flex flex-col">
          <div className="text-center font-bold text-[12.5px]">NURSERY AND KINDERGARTEN PROGRESS REPORT</div>
          <div className="text-center font-semibold">SCHOOL YEAR {formatSy(year)}</div>

          <div className="mt-4 space-y-2">
            {blank('NAME:', fullName)}
            {blank(`${levelLine}:`, sectionName)}
            {blank('TEACHER:', adviser)}
          </div>

          {/* SCHOLARSHIP */}
          <table className="mt-4 w-full border-collapse break-inside-avoid">
            <thead>
              <tr>
                <th className={hcell} colSpan={periods.length + 3}>SCHOLARSHIP</th>
              </tr>
              <tr>
                <th className={`${hcell} text-left`} rowSpan={2}>LEARNING AREAS</th>
                <th className={hcell} colSpan={periods.length + 1}>REPORTING PERIOD</th>
                <th className={hcell} rowSpan={2}>ACTION TAKEN</th>
              </tr>
              <tr>
                {periods.map((p) => (
                  <th key={p.key} className={`${hcell} w-11`}>{p.label.toUpperCase()}</th>
                ))}
                <th className={`${hcell} w-11`}>Over-All</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.code}>
                  <td className={`${bd} px-1.5 py-[2px]`}>{a.name}</td>
                  {pcols.map((q, i) => (
                    <td key={q} className={cell}>{shown(i) ? (a.letters[q] ?? '') : ''}</td>
                  ))}
                  <td className={cell}>{overAllOf(a.letters)}</td>
                  <td className={cell} />
                </tr>
              ))}
              <tr>
                <td className={`${bd} px-1.5 py-[2px] font-semibold`}>Over-All Progress</td>
                {pcols.map((q, i) => (
                  <td key={q} className={cell}>{shown(i) ? termProgress(q) : ''}</td>
                ))}
                <td className={cell}>{overAllProgress}</td>
                <td className={cell} />
              </tr>
            </tbody>
          </table>
          <div className="mt-1.5 text-[9.5px]">
            <b>Performance Descriptors</b> &nbsp; B- Beginning &nbsp; D- Developing &nbsp; C- Consistent
          </div>

          {/* ATTENDANCE RECORD — table-fixed so 13 columns can NEVER grow past
              the half-page column and bleed into the deportment side */}
          <div className="mt-5 break-inside-avoid">
            <div className="mb-1 font-bold text-[11.5px]">ATTENDANCE RECORD</div>
            <table className="w-full table-fixed border-collapse text-[8.5px] leading-[1.3]">
              <thead>
                <tr>
                  <th className={`${bd} w-[58px] px-0.5 py-[2px] text-left`}>ATTENDANCE</th>
                  {months.map((m) => (
                    // short labels (Jun, Jul, …) so a month NEVER wraps to two lines
                    <th key={m.key} className={`${bd} px-0.5 py-[2px] whitespace-nowrap`}>{m.label}</th>
                  ))}
                  <th className={`${bd} w-[30px] px-0.5 py-[2px]`}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {attRows.map((row) => (
                  <tr key={row.label}>
                    <td className={`${bd} px-0.5 py-[2px]`}>{row.label}</td>
                    {months.map((m) => (
                      <td key={m.key} className={`${bd} px-0.5 py-[2px] text-center`}>{attCell(row.get(m.key))}</td>
                    ))}
                    <td className={`${bd} px-0.5 py-[2px] text-center font-semibold`}>{attCell(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* promotion + signatures + cancellation */}
          <div className="mt-auto pt-5 break-inside-avoid space-y-2">
            {blank('Promoted to/Retained in', '')}
            {blank('Eligible for Transfer & Admission to', complete ? nextLevel : '')}

            <div className="pt-6 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-semibold uppercase">{adviser || ' '}</div>
                <div className="border-t border-black pt-0.5">Class Adviser</div>
              </div>
              <div>
                <div className="font-semibold uppercase">{PRINCIPAL}</div>
                <div className="border-t border-black pt-0.5">Principal</div>
              </div>
            </div>

            <div className="pt-4 space-y-1.5">
              <div className="font-bold">Cancellation of Eligibility to Transfer</div>
              {blank('Has been admitted in', '')}
              {blank('Date', '', 'w-40')}
              <div className="mt-6 text-center">
                <div className="inline-block border-t border-black px-10 pt-0.5">Principal</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — DEPORTMENT. 28 rows, most wrapping to two lines: THIS COLUMN,
            not the grid floor, is what sets the card's height. Measured budget:
            10.2in printable, less 0.7in padding, 0.3in of form/LRN lines, 0.9in
            letterhead and 0.1in gap leaves 8.2in for the grid. At 9.5px/py-3px
            this column runs ~7.1in, so it reads at full size AND fits. Measure
            here first before touching anything else. */}
        <div className="flex flex-col text-[9.5px] leading-[1.3]">
          <div className="mb-1 text-center font-bold text-[12px]">DEPORTMENT</div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${bd} px-1.5 py-[2px]`}> </th>
                {periods.map((p) => (
                  <th key={p.key} className={`${hcell} w-11 font-normal`}>{p.label}</th>
                ))}
                <th className={`${hcell} w-11 font-normal`}>Over-All</th>
              </tr>
            </thead>
            <tbody>
              {DEPORTMENT_GROUPS.map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <td className={`${bd} px-1.5 py-[2px] bg-[#FAF7EF] text-center font-bold`}>{g.label}</td>
                    {pcols.map((q, i) => (
                      <td key={q} className={cell}>
                        {shown(i) ? deportmentLetter(perQ(q)?.[g.key]) : ''}
                      </td>
                    ))}
                    <td className={cell}>
                      {complete ? modal(pcols.map((q) => deportmentLetter(perQ(q)?.[g.key]))) : ''}
                    </td>
                  </tr>
                  {g.items.map((it) => (
                    <tr key={it.k}>
                      <td className={`${bd} px-1.5 py-[2px]`}>{it.label}</td>
                      {pcols.map((q, i) => (
                        <td key={q} className={cell}>
                          {shown(i) ? preDep[it.k]?.[q] ?? '' : ''}
                        </td>
                      ))}
                      <td className={cell}>
                        {complete ? modal(pcols.map((q) => preDep[it.k]?.[q])) : ''}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="mt-1.5 text-[9px]">
            <div className="font-bold">DEPORTMENT MARKING CODE</div>
            <div>AO-Always Observed &nbsp; SO- Sometimes Observed &nbsp; RO-Rarely Observed &nbsp; NO-Not Observed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
