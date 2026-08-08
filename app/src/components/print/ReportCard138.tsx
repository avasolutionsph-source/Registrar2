import { useEffect, useState } from 'react';
import npsLogo from '@/assets/nps-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import {
  listGradeSubjects,
  listSchoolYears,
  listClassSubjects,
  getDescriptorConfig,
  type DescriptorConfig,
} from '@/lib/db';
import type { QuarterKey, SchoolYear, Student, Subject } from '@/types';
import {
  buildSubjectRows,
  subjectIndex,
  formatSy,
  latestGradedSy,
  gradesForSy,
  conductForSy,
  periodsForSy,
  monthsForSy,
  getPassingGrade,
  remark as remarkOf,
  adviserFirstNameFirst,
  MAPEH_COMPONENT_CODES,
  FALLBACK_SUBJECT_NAMES,
  type SubjectRow,
} from '@/lib/forms';
import {
  isDescriptiveLevel,
  descriptiveScaleFor,
  attitudeLetter,
  DEFAULT_ATTITUDE_SCALE,
  type AttitudeBand,
  type LetterDescriptor,
} from '@/lib/grading';
import { displayLrn } from '@/lib/lrn';
import { ageOnDate } from '@/lib/format';

// NPS Report Card — School Form 9 "Learner's Performance Report" (SY 2026-2027).
// Exact reproduction of the official NPS SF9: FULL short bond portrait
// (8.5 × 11in), header with seals, two columns.
//
// The card is printed PER TERM and grows as the year progresses (`upto`):
//   Term 1 card → term-1 grades only; Final Grade / Remarks / GA left blank.
//   Term 2 card → terms 1–2; Term 3 (complete) card → everything.
// SHS only: subjects list is limited to what the section takes in the shown
// terms (reg_class_subjects.term via classTerms/classId) — a Term-2-only
// subject does not appear on the Term 1 card.

const PRINCIPAL = 'MRS. ROSARIO B. OLALIA';

// The report cards' paper colour — gold, but a hair off white. Shared by both
// cards (ReportCardPreschool imports it) so the two never drift apart.
export const SHEET_GOLD = '#FFFDF8';

// Paints the WHOLE sheet, on screen and on paper. Two targets are needed:
//   html   — its background propagates to the page canvas, which is the only
//            thing that reaches into the printed page MARGINS.
//   #print-root — the preview sheet, whose own white padding would otherwise
//            frame the card on screen.
// Injected by both cards; identical text, so a batch of N cards is harmless.
export const sheetStyle = `
  #print-root { background: ${SHEET_GOLD} !important; }
  @media print {
    @page { size: 8.5in 11in; margin: 0.4in; }
    html, body {
      background: ${SHEET_GOLD} !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
`;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ordOf = (code?: string) => {
  const i = ROMAN.indexOf((code ?? '').split('-')[0]);
  return i >= 0 ? i + 1 : 0;
};
const nextRoman = (code?: string) => {
  const o = ordOf(code);
  if (o === 12) return 'College'; // Grade XII completers move on to College
  return o > 0 && o < 12 ? ROMAN[o] : '';
};
// roman portion only (SHS codes look like "XI-STEM-ENG" → "XI")
const romanPart = (code?: string) => (code ?? '').split('-')[0];
// SHS strand/track from the grade code suffix (e.g. "XI-STEM-ENG" → "STEM - ENGINEERING")
function trackLabel(code?: string): string {
  const rest = (code ?? '').split('-').slice(1).join('-').toUpperCase();
  if (!rest) return '';
  const map: Record<string, string> = {
    ASSH: 'ASSH',
    'STEM-ENG': 'STEM - ENGINEERING',
    'STEM-HA': 'STEM - HEALTH ALLIED',
    HUMSS: 'HUMSS',
    ABM: 'ABM',
    GAS: 'GAS',
  };
  return map[rest] ?? rest.replace(/-/g, ' - ');
}

const num = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');
const isNum = (v: unknown): v is number => typeof v === 'number';
const meanRound = (ns: number[]): number | undefined =>
  ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : undefined;
// attendance figures allow half days — keep 2 decimals, no float dust
const r2 = (n: number) => Math.round(n * 100) / 100;

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
// Passed/Failed for a descriptive letter. Derived from the REGISTRAR's saved
// scale (Setup ▸ Descriptors and Range): a letter passes when its band starts
// at or above the passing grade. Falls back to the classic A/B/C rule only for
// a scale that carries no minimums.
function letterRemarkWith(scale: LetterDescriptor[], passing: number) {
  const minOf = new Map(scale.filter((d) => d.min != null).map((d) => [d.letter, d.min as number]));
  return (l?: string): string => {
    if (!l) return '';
    const min = minOf.get(l);
    if (min == null) return 'ABC'.includes(l) ? 'Passed' : 'Failed';
    return min >= passing ? 'Passed' : 'Failed';
  };
}

const CORE_VALUES: { key: string; label: string }[] = [
  { key: 'faith', label: 'Faith' },
  { key: 'integrity', label: 'Integrity' },
  { key: 'respect', label: 'Respect' },
  { key: 'excellence', label: 'Excellence' },
  { key: 'socialResponsibility', label: 'Social Responsibility' },
];
function programRowsFor(ord: number): { key: string; label: string }[] {
  // Grade 1-3: Computer; Grade 4-6: Scouting; Grade 7-10: neither. All keep
  // Homeroom Guidance + SAP. Senior High (>=11) & pre-school: none.
  if (ord >= 11 || ord < 1) return [];
  const rows: { key: string; label: string }[] = [];
  if (ord <= 3) rows.push({ key: 'computer', label: 'Computer' });
  else if (ord <= 6) rows.push({ key: 'scouting', label: 'Scouting' });
  rows.push({ key: 'homeroom', label: 'Homeroom Guidance' });
  rows.push({ key: 'sap', label: 'SAP' });
  return rows;
}

// Numeric PERFORMANCE DESCRIPTORS legend (Grades 2-12).
const DESCRIPTORS: [string, string, string][] = [
  ['90-100', 'Advancing', 'Passed'],
  ['80-89', 'Benchmarking', 'Passed'],
  ['75-79', 'Connecting', 'Passed'],
  ['65-74', 'Developing', 'Failed'],
  ['0-64', 'Emerging', 'Failed'],
];

// The same legend for a DESCRIPTIVE level (Grade 1 this SY): the registrar's
// saved letters, their descriptive grade, and the numeric range each covers —
// a band runs from its own minimum up to one below the next band's.
function descriptorRows(
  scale: LetterDescriptor[],
  remarkOfLetter: (l?: string) => string,
): [string, string, string][] {
  const sorted = [...scale].sort((a, b) => (b.min ?? 0) - (a.min ?? 0));
  return sorted.map((d, i) => {
    const scaleLabel =
      d.min == null ? d.letter : `${d.letter}  (${d.min}-${i === 0 ? 100 : (sorted[i - 1].min ?? 100) - 1})`;
    return [scaleLabel, d.label, remarkOfLetter(d.letter)];
  });
}

interface Props {
  student: Student;
  subjects: Subject[];
  sy?: string;
  // How many grading periods this card covers (1-based; default = all → the
  // complete end-of-year card). Term 1 card = 1, Term 2 card = 2, …
  upto?: number;
  attitudeScale?: AttitudeBand[];
  // SHS subject↔term coverage for the learner's section. Pass the map directly
  // (code UPPER → comma-joined period keys | null) when the caller already has
  // it, or just the classId and the card fetches it once. Absent = no filter.
  classTerms?: Record<string, string | null>;
  classId?: string;
  // The LIVE class record's identity — grade/strand, section and the adviser
  // as currently assigned. When given it overrides the enrolment-history
  // snapshot, which goes stale when a learner moves section/strand or the
  // section's adviser changes after enrolment. Callers pass it whenever the
  // card's SY is the class's own SY; past years keep the snapshot.
  liveClass?: { gradeLevel: string; sectionName: string; adviserName: string };
}

export function ReportCard138({
  student,
  subjects,
  sy,
  upto: uptoProp,
  attitudeScale = DEFAULT_ATTITUDE_SCALE,
  classTerms,
  classId,
  liveClass,
}: Props) {
  const year = sy ?? latestGradedSy(student) ?? student.currentSY;
  const periods = periodsForSy(year);
  const pcols = periods.map((p) => p.key); // 'q1'..
  const short = periods.map((p) => p.short); // '1'..
  const upto = Math.min(Math.max(uptoProp ?? periods.length, 1), periods.length);
  const complete = upto === periods.length; // end-of-year card
  const shown = (i: number) => i < upto;
  const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === year);
  // Live class wins over the enrolment snapshot (see the liveClass prop note).
  const gradeCode = liveClass?.gradeLevel ?? entry?.gradeLevel;
  const sectionName = liveClass?.sectionName ?? entry?.sectionName ?? '';

  // Registrar-curated subject order for this grade/strand (Setup ▸ Subjects).
  const [orderCodes, setOrderCodes] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = gradeCode ? await listGradeSubjects(gradeCode).catch(() => []) : [];
      if (!cancelled) setOrderCodes(next);
    })();
    return () => { cancelled = true; };
  }, [gradeCode]);

  // Registrar-configured descriptor rules for this SY (Setup ▸ Report Card
  // Descriptors). Falls back to the code rule until it loads / if unseeded.
  const [descCfg, setDescCfg] = useState<DescriptorConfig | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDescriptorConfig(year).then((c) => { if (!cancelled) setDescCfg(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [year]);

  // The SY row (Setup ▸ School Year) — its start/end dates decide WHICH months
  // the attendance report lists, and its school-days-per-month fills the
  // School Days row (Days Absent is then derived per month).
  const [syRow, setSyRow] = useState<SchoolYear | null>(null);
  useEffect(() => {
    let cancelled = false;
    listSchoolYears()
      .then((rs) => { if (!cancelled) setSyRow(rs.find((r) => r.code === year) ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [year]);

  // SHS subject↔term coverage: fetched only when the caller gave a classId
  // without the ready-made map (single-student print from Students).
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

  const ord = ordOf(gradeCode);
  const isSHS = ord >= 11;
  const gradeRoman = romanPart(gradeCode);
  const track = trackLabel(gradeCode);
  // Descriptive vs numerical, and WHICH letters — both from the registrar's
  // saved setup (Setup ▸ Descriptors and Range) for this SY, with the code
  // defaults standing in until it loads / for an unseeded year.
  const descriptive = descCfg ? descCfg.isDescriptive(gradeCode, year) : isDescriptiveLevel(gradeCode, year);
  const letterScale = descCfg ? descCfg.scaleFor(gradeCode) : descriptiveScaleFor(gradeCode);
  const letterRemark = letterRemarkWith(letterScale, getPassingGrade());
  const conduct = conductForSy(student, year);
  const att = conduct.attendance;
  const values = conduct.values?.q;
  const programs = conduct.programs?.q;
  const programRows = programRowsFor(ord);
  // Deportment/programs maps are keyed 'q1'.. by the adviser portal but '1'..
  // on legacy imported years — accept both so old cards still fill in.
  const perQ = (
    m: Record<string, Record<string, number>> | undefined,
    q: QuarterKey,
  ): Record<string, number> | undefined => m?.[q] ?? m?.[q.slice(1)];

  // Every level: list every subject the SECTION offers — including ones with
  // nothing encoded yet (blank row), exactly like the printed card. The class
  // list is available whenever this is a current-SY card (classTerms/classId).
  const baseEntries = gradesForSy(student, year);
  let entries = baseEntries;
  if (termsMap) {
    const have = new Set(baseEntries.map((g) => g.subjectCode.toUpperCase()));
    const extras = Object.keys(termsMap)
      .filter((c) => !have.has(c))
      .map((c) => ({ subjectCode: c }));
    if (extras.length) entries = [...baseEntries, ...extras];
  }
  // Does this subject run in any of the terms this card shows? Codes outside
  // the class list (transferee/custom subjects) and all-year rows always show.
  const shownKeys = new Set(pcols.slice(0, upto));
  const runsInShownTerms = (code: string): boolean => {
    if (!isSHS || !termsMap) return true;
    const t = termsMap[code.toUpperCase()];
    if (t == null || !String(t).trim()) return true;
    return String(t)
      .split(',')
      .map((s) => s.trim())
      .some((k) => shownKeys.has(k as QuarterKey));
  };
  let rows = buildSubjectRows(entries, subjectIndex(subjects), orderCodes).filter((r) =>
    runsInShownTerms(r.subjectCode),
  );
  // Blank MAPEH block: when the merged MUA/PDA components carry no scores yet,
  // withDerivedMapeh drops them (nothing to derive from) and MAPEH would fall
  // off a not-yet-graded card — put the blank parent + components back.
  if (
    termsMap &&
    !isSHS &&
    !rows.some((r) => r.isMapehParent || ['MAPEH', 'MAP'].includes(r.subjectCode.toUpperCase()))
  ) {
    const rank = new Map(orderCodes.map((c, i) => [c.toUpperCase(), i] as const));
    const idx = subjectIndex(subjects);
    const compCodes = Object.keys(termsMap)
      .filter((c) => MAPEH_COMPONENT_CODES.has(c))
      .sort((a, b) => (rank.get(a) ?? 9998) - (rank.get(b) ?? 9998));
    if (compCodes.length) {
      const baseOrder = rank.get(compCodes[0]) ?? 9998;
      rows = [
        ...rows,
        { subjectCode: 'MAPEH', name: 'MAPEH', category: 'Core', order: baseOrder, remark: '', isMapehParent: true },
        ...compCodes.map((c, i) => ({
          subjectCode: c,
          name: idx.get(c)?.fullName ?? FALLBACK_SUBJECT_NAMES[c] ?? c,
          category: 'Core',
          order: baseOrder + 0.01 * (i + 1),
          remark: '',
          isMapehComponent: true,
        })),
      ].sort((a, b) => a.order - b.order);
    }
  }

  const academic = rows.filter((r) => !r.isMapehComponent);
  // Final grade per subject: the stored final, else the mean of its encoded
  // term grades — a Term-1-only SHS subject's final IS its Term 1 grade.
  const finalOf = (r: SubjectRow): number | undefined =>
    isNum(r.final) ? Math.round(r.final) : meanRound(pcols.map((q) => r[q]).filter(isNum));
  const gaNum = meanRound(academic.map((r) => finalOf(r)).filter(isNum)) ?? null;
  const gaLetter = modal(academic.map((r) => modal(pcols.map((q) => r.letters?.[q]))));

  const periodAvgNum = (q: QuarterKey) => {
    const vals = academic.map((r) => r[q]).filter(isNum);
    return vals.length ? num(vals.reduce((a, b) => a + b, 0) / vals.length) : '';
  };
  const periodAvgLetter = (q: QuarterKey) => modal(academic.map((r) => r.letters?.[q]));

  // Conduct row: the teacher-encoded attitude ratings averaged across subjects
  // per term, shown as a letter from the registrar's attitude scale.
  const conductLetter = (q: QuarterKey): string => {
    const nums = baseEntries
      .map((e) => e.attitude?.[q])
      .filter((v): v is number => typeof v === 'number');
    const mean = meanRound(nums);
    return mean == null ? '' : attitudeLetter(mean, attitudeScale)?.letter ?? '';
  };

  const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ' ' + student.middleName : ''}`;
  // first-name-first, even when the value is an old "Last, First" snapshot
  const adviser = liveClass?.adviserName || adviserFirstNameFirst(entry?.adviserName);
  const age = student.birthdate ? ageOnDate(student.birthdate, `${year.slice(0, 4)}-06-01`) : null;
  const promoted = descriptive
    ? letterRemark(gaLetter) === 'Passed'
    : gaNum != null && gaNum >= getPassingGrade();

  // ── attendance (months + School Days from Setup ▸ School Year) ────────────
  const months = monthsForSy(syRow?.startDate, syRow?.endDate);
  const schoolDays = syRow?.schoolDays ?? {};
  const attCell = (v: number | undefined) => (v == null ? '' : String(v));
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
  const attRows: { label: string; get: (k: string) => number | undefined; total: number | undefined }[] = [
    { label: 'School Days', get: sdOf, total: sumOf(sdOf) },
    { label: 'Days Present', get: prOf, total: att?.totalPresent ?? sumOf(prOf) },
    { label: 'Days Absent', get: absOf, total: sumOf(absOf) },
    { label: 'Times Tardy', get: tdOf, total: att?.totalTardy ?? sumOf(tdOf) },
  ];

  // ONE PAGE, always. Budget at 0.4in margins = 10.2in, less ~0.17in of sheet
  // padding; the letterhead takes ~1.4in, so a 7.6in grid floor still fills
  // the paper while leaving ~1in of headroom. A long subject list eats that
  // slack first, then the type steps down — a 16-subject Grade XII and even an
  // outsized curriculum still land on a single sheet.
  const bodyType =
    rows.length > 20 ? 'text-[8px] leading-[1.25]'
    : rows.length > 14 ? 'text-[9px] leading-[1.3]'
    : 'text-[10.5px] leading-[1.45]';
  const dense = rows.length > 14;
  const bd = 'border border-black';
  const cell = `${bd} px-1.5 py-[3px] text-center align-middle`;
  const hcell = `${cell} font-bold`;

  // one FINAL letter for a deportment/program row from its 3 term marks
  const finalLetterFor = (get: (q: QuarterKey) => number | undefined, toLetter: (v?: number) => string) =>
    complete ? modal(pcols.map((q) => toLetter(get(q)))) : '';

  // print:min-h-0 — the gold comes from the PAGE CANVAS now, so the card no
  // longer has to stretch to the full sheet to be coloured. Forcing it to 10in
  // left no rounding room inside the 10.2in printable box and could emit a
  // blank second page; its natural height plus the grid floor is enough.
  return (
    <div
      className={`relative isolate mx-auto w-full min-h-[10in] print:min-h-0 flex flex-col ${bodyType} text-black p-2 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]`}
      style={{
        fontFamily: "'Canva Sans', 'Quicksand', ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
        background: SHEET_GOLD,
      }}
    >
      {/* FULL short bond portrait (8.5 × 11in) for every level. Canva Sans (a
          rounded, highly legible sans) is used for readability; falls back to
          a similar sans when it isn't installed. */}
      {/* A real 0.4in page margin. Do NOT set this to 0 to hide the browser's
          URL/page-number footer: with "Headers and footers" enabled Chrome
          still reserves room for them, so the zero margin only ADDS our own
          padding on top and pushes the card onto a second sheet. Suppressing
          that footer is a browser setting, not a page-CSS one.

          The gold ground is painted on the ROOT ELEMENT, whose background CSS
          propagates to the page canvas — that is what covers the WHOLE sheet,
          margins included. Painting it on the card itself would stop at the
          card's own box and leave a white frame. Costs no layout height, so
          the one-page fit is untouched. */}
      <style>{sheetStyle}</style>

      {/* School seal watermark. `isolate` on the sheet makes it the stacking
          context, so z-[-1] paints ABOVE the white background but BELOW every
          row of the card — the tables stay fully readable. */}
      <img
        src={npsLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-1/2 z-[-1] w-[5.6in] max-w-[85%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <div className="text-[8.5px]">School Form 9</div>

      {/* header — the seals hug the centered text block (not the paper edges),
          with the NPS seal drawn larger */}
      <div className="flex items-center justify-center gap-5">
        <img src={depedLogo} alt="" className="w-14 h-14 object-contain shrink-0" />
        <div className="text-center leading-[1.3]">
          <div>REPUBLIC OF THE PHILIPPINES</div>
          <div className="font-semibold">DEPARTMENT OF EDUCATION</div>
          <div>REGION V &middot; SCHOOLS DIVISIONS OFFICE OF NAGA CITY &middot; Naga North District</div>
          <div className="text-[17px] font-bold text-red-700 leading-tight">NAGA PAROCHIAL SCHOOL</div>
          <div>Corner Bagumbayan Sur and Ateneo Avenue, Naga City</div>
          <div className="text-[9px]">GR. No. 002 S. 2009 &nbsp; GR. No. J-004 S. 2017</div>
        </div>
        <img src={npsLogo} alt="" className="w-20 h-20 object-contain shrink-0" />
      </div>

      {/* two columns — stretch to fill the page; the right column spreads its
          blocks over the full height so the card never bunches up at the top,
          and the left column parks the descriptors at the bottom (they slide
          down out of the way when the subject list grows). */}
      <div className={`mt-4 grid grid-cols-2 gap-6 flex-1 items-stretch ${dense ? 'min-h-[7.4in]' : 'min-h-[7.6in]'}`}>
        {/* LEFT */}
        <div className="flex flex-col">
          <div className="text-center font-bold text-[12px]">LEARNER&rsquo;S PERFORMANCE REPORT</div>
          <div className="text-center">School Year {formatSy(year)}</div>

          <div className="mt-3 space-y-1">
            <div><b>Name:</b> {fullName} &nbsp; <b>Age:</b> {age ?? ''} &nbsp; <b>Gender:</b> {student.gender}</div>
            <div><b>LRN:</b> {displayLrn(student.lrn)} &nbsp; <b>Grade:</b> {gradeRoman || (gradeCode ?? '')} &nbsp; <b>Section:</b> {sectionName}</div>
            <div><b>Student Number:</b> {student.studentNo || ''} &nbsp; <b>TRACK (SHS only):</b> {isSHS ? track : '____________'}</div>
          </div>

          <p className="mt-3 text-justify leading-[1.55]">
            <b>Dear Parents,</b> The Performance Report shows the ability and progress your child has
            made in the different learning areas as well as his/her core values. The school welcomes
            you should you desire to know more about your child&rsquo;s progress.
          </p>

          <div className="mt-4 mb-1 text-center font-bold text-[11px]">LEARNING PROGRESS AND ACHIEVEMENT</div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${hcell} text-left`} rowSpan={2}>{isSHS ? 'SUBJECTS' : 'LEARNING AREAS'}</th>
                <th className={hcell} colSpan={periods.length}>TERM</th>
                <th className={hcell} rowSpan={2}>Final Grade</th>
                <th className={hcell} rowSpan={2}>Remarks</th>
              </tr>
              <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-9`}>{s}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const vFinal = finalOf(r);
                const rLetterFinal = modal(pcols.map((q) => r.letters?.[q]));
                return (
                  <tr key={r.subjectCode}>
                    <td className={`${bd} px-1.5 py-[3px] ${r.isMapehComponent ? 'pl-4 italic' : ''} ${r.isMapehParent ? 'font-semibold' : ''}`}>
                      {r.name}
                    </td>
                    {pcols.map((q, i) => (
                      <td key={q} className={cell}>
                        {shown(i) ? (descriptive ? (r.letters?.[q] ?? '') : num(r[q])) : ''}
                      </td>
                    ))}
                    {/* MAPEH components show term grades only (no Final/Remarks);
                        Final Grade + Remarks appear only on the complete card */}
                    <td className={cell}>
                      {!complete || r.isMapehComponent ? '' : descriptive ? rLetterFinal : num(vFinal)}
                    </td>
                    <td className={cell}>
                      {!complete || r.isMapehComponent
                        ? ''
                        : descriptive
                          ? letterRemark(rLetterFinal)
                          : vFinal == null
                            ? ''
                            : remarkOf(vFinal)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className={`${bd} px-1.5 py-[3px] font-semibold`}>Average</td>
                {pcols.map((q, i) => (
                  <td key={q} className={cell}>
                    {shown(i) ? (descriptive ? periodAvgLetter(q) : periodAvgNum(q)) : ''}
                  </td>
                ))}
                <td className={bd} colSpan={2} />
              </tr>
              <tr>
                <td className={`${bd} px-1.5 py-[3px] font-semibold`}>Conduct</td>
                {pcols.map((q, i) => (
                  <td key={q} className={cell}>{shown(i) ? conductLetter(q) : ''}</td>
                ))}
                <td className={bd} colSpan={2} />
              </tr>
              <tr>
                <td className={`${bd} px-1.5 py-[3px] text-right font-bold`} colSpan={periods.length + 1}>
                  General Average
                </td>
                <td className={`${cell} font-bold`}>
                  {complete ? (descriptive ? gaLetter : (gaNum ?? '')) : ''}
                </td>
                <td className={cell}>{complete && promoted ? 'Promoted' : ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-auto pt-5 break-inside-avoid">
            <div className="font-bold text-[10.5px]">PERFORMANCE DESCRIPTORS</div>
            <table className="mt-1 border-collapse text-[10px] leading-[1.6]">
              <thead>
                <tr>
                  <th className="pr-6 text-left font-bold">Grading Scale</th>
                  <th className="pr-6 text-left font-bold">Descriptions</th>
                  <th className="text-left font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(descriptive ? descriptorRows(letterScale, letterRemark) : DESCRIPTORS).map((d) => (
                  <tr key={d[0]}>
                    <td className="pr-6">{d[0]}</td>
                    <td className="pr-6">{d[1]}</td>
                    <td>{d[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — blocks share the leftover height evenly */}
        <div className="flex flex-col justify-between gap-4">
          {/* SPECIAL PROGRAMS — not shown for Senior High (Grade 11-12) */}
          {!isSHS && (
          <div className="break-inside-avoid">
            <div className="mb-1 text-center font-bold text-[11px]">SPECIAL PROGRAMS</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`} rowSpan={2}>LEARNER&rsquo;S SUPPORT PROGRAM</th>
                  <th className={hcell} colSpan={periods.length}>TERM</th>
                  <th className={hcell} rowSpan={2}>FINAL GRADE</th>
                </tr>
                <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-9`}>{s}</th>)}</tr>
              </thead>
              <tbody>
                {programRows.map((pr) => (
                  <tr key={pr.key}>
                    <td className={`${bd} px-1.5 py-[3px]`}>{pr.label}</td>
                    {pcols.map((q, i) => (
                      <td key={q} className={cell}>
                        {shown(i) ? programLetter(perQ(programs, q)?.[pr.key]) : ''}
                      </td>
                    ))}
                    <td className={cell}>{finalLetterFor((q) => perQ(programs, q)?.[pr.key], programLetter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-0.5 text-[8.5px]">MO-Most Outstanding O-Outstanding VS-Very Satisfactory S-Satisfactory FS-Fairly Satisfactory</div>
          </div>
          )}

          {/* DEPORTMENT */}
          <div className="break-inside-avoid">
            <div className="mb-1 text-center font-bold text-[11px]">DEPORTMENT</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${hcell} text-left`} rowSpan={2}>CORE VALUES</th>
                  <th className={hcell} colSpan={periods.length}>TERM</th>
                  <th className={hcell} rowSpan={2}>FINAL GRADE</th>
                </tr>
                <tr>{short.map((s, i) => <th key={i} className={`${hcell} w-9`}>{s}</th>)}</tr>
              </thead>
              <tbody>
                {CORE_VALUES.map((cv) => (
                  <tr key={cv.key}>
                    <td className={`${bd} px-1.5 py-[3px]`}>{cv.label}</td>
                    {pcols.map((q, i) => (
                      <td key={q} className={cell}>
                        {shown(i) ? deportmentLetter(perQ(values, q)?.[cv.key]) : ''}
                      </td>
                    ))}
                    <td className={cell}>{finalLetterFor((q) => perQ(values, q)?.[cv.key], deportmentLetter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-0.5 text-[8.5px]">AO-Always Observed SO-Sometimes Observed RO-Rarely Observed NO-Not Observed</div>
          </div>

          {/* ATTENDANCE */}
          <div className="break-inside-avoid">
            <div className="mb-1 text-center font-bold text-[11px]">ATTENDANCE REPORT</div>
            {/* table-fixed: 13 columns must never outgrow the half-page column */}
            <table className="w-full table-fixed border-collapse text-[8.5px] leading-[1.25]">
              <thead>
                <tr>
                  <th className={`${bd} w-[58px] px-0.5 py-[2px]`}> </th>
                  {months.map((m) => <th key={m.key} className={`${bd} px-0.5 py-[2px]`}>{m.label}</th>)}
                  <th className={`${bd} w-[30px] px-0.5 py-[2px]`}>Total</th>
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

          {/* CERTIFICATE OF TRANSFER */}
          <div className="break-inside-avoid">
            <div className="mb-1 text-center font-bold text-[11px]">CERTIFICATE OF TRANSFER</div>
            <p className="text-justify leading-[1.55]">
              This is to certify that the above-named learner has satisfactorily completed the
              requirements for the grade level indicated.
            </p>
            <div className="mt-2">Admitted to Grade: {gradeRoman || (gradeCode ?? '')}</div>
            <div className="mt-0.5">Eligible for Admission to Grade: {complete ? nextRoman(gradeCode) : ''}</div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div className="text-left pt-3"><i>Approved:</i></div>
              <div>
                <div className="font-semibold uppercase">{adviser || ' '}</div>
                <div className="border-t border-black pt-0.5">Class Adviser</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="font-semibold uppercase">{PRINCIPAL}</div>
              <div>School Principal</div>
            </div>
          </div>

          {/* CANCELLATION */}
          <div className="break-inside-avoid">
            <div className="mb-1 text-center font-bold text-[11px]">CANCELLATION OF ELIGIBILITY TO TRANSFER</div>
            <div className="mt-2">Admitted in: ____________________ Date: __________</div>
            <div className="mt-4 text-center">
              <div className="inline-block border-t border-black px-10 pt-0.5">School Principal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
