// Shared logic for the printable DepEd forms (Form 137 / SF 10 / SF 9).
// Turns a Student's `grades` JSONB + `enrolmentHistory` into per-year academic
// records, resolving subject codes to names and computing general averages.

import type {
  Student,
  Subject,
  QuarterGrade,
  QuarterKey,
  EnrolmentEntry,
  SchoolYearCode,
  ConductYear,
} from '@/types';

// ── Issuing school identity ────────────────────────────────────────────────
// Name + DepEd School ID are real (ID 403875 encodes the LRN prefix). Verify
// the address / division / region against the school's DepEd registration
// before relying on a printout for an official transmittal.
export const SCHOOL = {
  name: 'Naga Parochial School',
  id: '403875',
  address: 'Caceres St., Naga City',
  district: 'Naga City',
  division: 'Naga City',
  region: 'Region V (Bicol)',
  type: 'Private',
} as const;

// ── Grade-level code → DepEd label ─────────────────────────────────────────
const GRADE_LABELS: Record<string, string> = {
  N1: 'Nursery 1',
  N2: 'Nursery 2',
  K: 'Kinder',
  P: 'Preparatory',
  S: 'SNED',
  I: 'Grade 1',
  II: 'Grade 2',
  III: 'Grade 3',
  IV: 'Grade 4',
  V: 'Grade 5',
  VI: 'Grade 6',
  VII: 'Grade 7',
  VIII: 'Grade 8',
  IX: 'Grade 9',
  X: 'Grade 10',
  'XI-GAS': 'Grade 11 · GAS',
  'XI-HUMSS': 'Grade 11 · HUMSS',
  'XI-STEM': 'Grade 11 · STEM',
  'XI-ABM': 'Grade 11 · ABM',
  'XII-GAS': 'Grade 12 · GAS',
  'XII-HUMSS': 'Grade 12 · HUMSS',
  'XII-STEM': 'Grade 12 · STEM',
  'XII-ABM': 'Grade 12 · ABM',
};

export function gradeLabel(code?: string): string {
  if (!code) return '—';
  return GRADE_LABELS[code] ?? code;
}

// ── F137 → SF 10 effectivity (DepEd Order #58, s. 2017) ────────────────────
// SF-10 replaced Form 137 on a staggered, per-grade basis. This maps a grade
// code to the FIRST school-year start (e.g. 2022 = "SY 2022-2023") it used
// SF-10; earlier years for that grade used Form 137. Kinder/SPED/unknown grades
// default to the modern SF 10.
const SF10_FIRST_YEAR: Record<string, number> = {
  I: 2017, VII: 2017, XI: 2017, XII: 2017,
  II: 2018, VIII: 2018,
  III: 2019, IX: 2019,
  IV: 2020, X: 2020,
  V: 2021,
  VI: 2022,
};

// The correct permanent-record template for a grade level in a given SY.
export function formVariantFor(gradeCode?: string, sy?: string): 'form137' | 'sf10' {
  const base = (gradeCode ?? '').split('-')[0]; // "XII-STEM" → "XII"
  const first = SF10_FIRST_YEAR[base];
  if (first == null) return 'sf10';
  const startYear = parseInt(String(sy ?? '').slice(0, 4), 10);
  if (!Number.isFinite(startYear)) return 'sf10';
  return startYear >= first ? 'sf10' : 'form137';
}

// Recommended template for a learner based on their LATEST enrolment year.
export function recommendedFormVariant(student: Student): 'form137' | 'sf10' {
  const hist = student.enrolmentHistory ?? [];
  const latest = hist[hist.length - 1];
  return formVariantFor(latest?.gradeLevel ?? '', latest?.sy ?? student.currentSY);
}

// ── Subjects ───────────────────────────────────────────────────────────────
export function subjectIndex(subjects: Subject[]): Map<string, Subject> {
  return new Map(subjects.map((s) => [s.code.toUpperCase(), s]));
}

const CATEGORY_RANK: Record<string, number> = {
  Core: 0,
  Applied: 1,
  Specialized: 2,
  Elective: 3,
};

const PASSING = 75;

export function remark(final?: number): string {
  if (final == null) return '—';
  return final >= PASSING ? 'Passed' : 'Failed';
}

export interface SubjectRow extends QuarterGrade {
  name: string;
  category: string;
  order: number;
  remark: string;
  // MAPEH is not graded directly: teachers grade its components ("Music & Arts"
  // and "Physical Education & Health") and the system derives the MAPEH line as
  // their per-period average. These flags drive the report-card/Form 137 layout
  // (parent in bold, components indented) and keep the General Average counting
  // MAPEH once — never its components.
  isMapehParent?: boolean;
  isMapehComponent?: boolean;
}

// Resolve + sort one school year's subject grades by the registrar-defined
// subject order (falling back to Core-first, then name for anything unordered).
// Also injects the derived MAPEH learning-area row when its components exist.
export function buildSubjectRows(
  list: QuarterGrade[],
  index: Map<string, Subject>,
): SubjectRow[] {
  const rows = list
    .map((g) => {
      const subj = index.get(g.subjectCode.toUpperCase());
      return {
        ...g,
        name: subj?.fullName || g.subjectCode,
        category: subj?.category || 'Core',
        order: subj?.order ?? 9999,
        remark: remark(g.final),
      } as SubjectRow;
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const ra = CATEGORY_RANK[a.category] ?? 9;
      const rb = CATEGORY_RANK[b.category] ?? 9;
      return ra - rb || a.name.localeCompare(b.name);
    });
  return withDerivedMapeh(rows);
}

// ── MAPEH (derived learning area) ──────────────────────────────────────────
// The gradeable subjects are MAPEH's components. NPS uses two grouped
// components this year — "Music & Arts" (MUA) and "Physical Education & Health"
// (PEH); legacy data may carry the four classic ones (MUS/ART/PED/HEA). When
// any are present we compute a MAPEH line = the per-period average of the
// components, and the overall MAPEH final = the mean of those period grades.
const MAPEH_COMPONENT_CODES = new Set(['MUA', 'PEH', 'MUS', 'ART', 'PED', 'HEA']);
const ALL_PERIOD_KEYS: QuarterKey[] = ['q1', 'q2', 'q3', 'q4'];

const meanRound = (ns: number[]): number | undefined =>
  ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : undefined;

export function withDerivedMapeh(rows: SubjectRow[]): SubjectRow[] {
  const comps = rows.filter((r) => MAPEH_COMPONENT_CODES.has(r.subjectCode.toUpperCase()));
  if (comps.length === 0) return rows;

  const baseOrder = Math.min(...comps.map((c) => c.order));
  const mapeh: SubjectRow = {
    subjectCode: 'MAPEH',
    name: 'MAPEH',
    category: 'Core',
    order: baseOrder,
    remark: '',
    isMapehParent: true,
  };
  const periodGrades: number[] = [];
  for (const q of ALL_PERIOD_KEYS) {
    const vals = comps
      .map((c) => c[q])
      .filter((v): v is number => typeof v === 'number');
    const m = meanRound(vals);
    if (m != null) {
      mapeh[q] = m;
      periodGrades.push(m);
    }
  }
  mapeh.final = meanRound(periodGrades);
  mapeh.remark = remark(mapeh.final);

  // Drop any directly-encoded MAPEH/MAP line (now derived); flag + reorder the
  // components so they trail the parent.
  const others = rows.filter(
    (r) =>
      !MAPEH_COMPONENT_CODES.has(r.subjectCode.toUpperCase()) &&
      !['MAPEH', 'MAP'].includes(r.subjectCode.toUpperCase()),
  );
  const flaggedComps = comps.map((c, i) => ({
    ...c,
    isMapehComponent: true,
    order: baseOrder + 0.01 * (i + 1),
  }));
  return [...others, mapeh, ...flaggedComps].sort((a, b) => a.order - b.order);
}

// General average = mean of the per-subject final grades, rounded to a whole
// number (DepEd convention). MAPEH counts once; its components are excluded.
// Returns null when no finals are recorded.
export function generalAverage(
  rows: { final?: number; isMapehComponent?: boolean }[],
): number | null {
  const finals = rows
    .filter((r) => !r.isMapehComponent)
    .map((r) => r.final)
    .filter((v): v is number => typeof v === 'number');
  if (!finals.length) return null;
  return Math.round(finals.reduce((a, b) => a + b, 0) / finals.length);
}

// ── Grading periods per school year ────────────────────────────────────────
// NPS moved to THREE terms starting SY 2026-2027; earlier (imported) years stay
// on four quarters. Storage keys remain q1..q4 — a 3-term year simply uses
// q1..q3 — so historical records and the migration pipeline are untouched.
export interface GradingPeriod {
  key: QuarterKey;
  label: string; // encoder/long form, e.g. "Term 1" / "Q1"
  short: string; // form-column header, e.g. "1"
}

const TERMS_3: GradingPeriod[] = [
  { key: 'q1', label: 'Term 1', short: '1' },
  { key: 'q2', label: 'Term 2', short: '2' },
  { key: 'q3', label: 'Term 3', short: '3' },
];
const QUARTERS_4: GradingPeriod[] = [
  { key: 'q1', label: 'Q1', short: '1' },
  { key: 'q2', label: 'Q2', short: '2' },
  { key: 'q3', label: 'Q3', short: '3' },
  { key: 'q4', label: 'Q4', short: '4' },
];

export function periodsForSy(sy?: string): GradingPeriod[] {
  const startYear = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  return Number.isFinite(startYear) && startYear >= 2026 ? TERMS_3 : QUARTERS_4;
}

// ── Per-year academic record (the heart of Form 137) ───────────────────────
export interface YearRecord {
  sy: string;
  gradeLevel?: string;
  gradeName: string;
  sectionName?: string;
  adviserName?: string;
  schoolName?: string;
  daysPresent?: number;
  rows: SubjectRow[];
  generalAverage: number | null;
  action?: string;
}

function enrolmentBySy(student: Student): Map<string, EnrolmentEntry> {
  const m = new Map<string, EnrolmentEntry>();
  for (const e of student.enrolmentHistory ?? []) m.set(e.sy, e);
  return m;
}

// One record per school year that has grades, oldest → newest. Decorated with
// the matching enrolment-history row (grade level, section, adviser, days).
export function buildAcademicRecord(student: Student, subjects: Subject[]): YearRecord[] {
  const index = subjectIndex(subjects);
  const enrol = enrolmentBySy(student);
  const grades = student.grades ?? {};
  const syKeys = Object.keys(grades).sort() as SchoolYearCode[];

  return syKeys.map((sy) => {
    const rows = buildSubjectRows(grades[sy] ?? [], index);
    const e = enrol.get(sy);
    // prefer the officially-recorded GA; fall back to computing from finals
    const ga = e?.generalAverage != null ? Math.round(e.generalAverage) : generalAverage(rows);
    return {
      sy,
      gradeLevel: e?.gradeLevel,
      gradeName: gradeLabel(e?.gradeLevel),
      sectionName: e?.sectionName,
      adviserName: e?.adviserName,
      schoolName: e?.schoolName,
      daysPresent: e?.daysPresent,
      rows,
      generalAverage: ga,
      action: e?.action,
    };
  });
}

// The most recent school year that actually has grades (for the report card /
// Grades tab default selection).
export function latestGradedSy(student: Student): string | null {
  const keys = Object.keys(student.grades ?? {}).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

// One school year's raw grade rows (avoids SchoolYearCode index friction).
export function gradesForSy(student: Student, sy: string): QuarterGrade[] {
  const g = (student.grades ?? {}) as Record<string, QuarterGrade[]>;
  return g[sy] ?? [];
}

// Format an SY code ("2024-2025") as "2024 – 2025".
export function formatSy(sy: string): string {
  const [a, b] = sy.split('-');
  return b ? `${a} – ${b}` : sy;
}

// ── Conduct (attendance / observed values / special programs) ──────────────
// School-year months in DepEd order (June start). Keys match the imported data.
export const MONTHS: { key: string; label: string }[] = [
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dec' },
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Apr' },
];

// The 14 observed-values traits NPS tracked, in report-card order.
export const VALUE_TRAITS: { key: string; label: string }[] = [
  { key: 'piety', label: 'Piety / Faith in God' },
  { key: 'simple', label: 'Simplicity' },
  { key: 'grateful', label: 'Gratefulness' },
  { key: 'honest', label: 'Honesty' },
  { key: 'humble', label: 'Humility' },
  { key: 'friendly', label: 'Friendliness' },
  { key: 'selfreliance', label: 'Self-Reliance' },
  { key: 'diligent', label: 'Diligence' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'punctual', label: 'Punctuality' },
  { key: 'environment', label: 'Care for the Environment' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'capacity', label: 'Capacity / Ability' },
  { key: 'rules', label: 'Obedience to Rules' },
];

export const PROGRAM_LABELS: Record<string, string> = {
  computer: 'Computer',
  homeroom: 'Homeroom Guidance',
  sap: 'SAP',
  scouting: 'Scouting',
};

export function conductForSy(student: Student, sy: string): ConductYear {
  const c = (student.conduct ?? {}) as Record<string, ConductYear>;
  return c[sy] ?? {};
}

// Mean of the per-year values averages across a learner's whole record — the
// basis for a Good Moral Certificate.
export function overallValuesAverage(student: Student): number | null {
  const all: number[] = [];
  for (const y of Object.values((student.conduct ?? {}) as Record<string, ConductYear>)) {
    if (y.values?.average != null) all.push(y.values.average);
  }
  if (!all.length) return null;
  return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
}

export function valuesDescriptor(v?: number | null): string {
  if (v == null) return '—';
  if (v >= 90) return 'Outstanding';
  if (v >= 85) return 'Very Satisfactory';
  if (v >= 80) return 'Satisfactory';
  if (v >= 75) return 'Fairly Satisfactory';
  return 'Needs Improvement';
}
