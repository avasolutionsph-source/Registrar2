// DepEd "Revised Guidelines on Classroom Assessment, Grading System, and Awards
// and Recognition for the K to 12 Basic Education Program" — Policy Briefer
// (last updated 2026-04-13), effective SY 2026-2027.
//
// Single source of truth for turning the teacher-encoded RAW summative scores
// into a learner's quarterly/term grade. Pure data + functions (no DB, no UI),
// so it is easy to unit-test and reuse from the grade encoder and report cards.

// ── Summative components ────────────────────────────────────────────────────
// WW = Written/Oral Works · PT = Product/Performance Tasks · ST = Summative
// Tests + Term Examination.
export type Component = 'ww' | 'pt' | 'st';

export interface Weights {
  ww: number;
  pt: number;
  st: number; // percentages; sum to 100
}

// ── Learning-area weight groups (KS2–KS4, i.e. Grade 4–12) ──────────────────
export type AreaGroup =
  | 'core' // AP, English, Filipino, Math, Science, GMRC/Values Education
  | 'mapeh-tle' // EPP/TLE and MAPEH
  | 'shs-core' // SHS Core Subjects, Other SHS Academic Electives
  | 'shs-field' // SHS Field Exposure, Arts Apprenticeship, Creative Production & Innovation
  | 'shs-arts' // SHS Arts, Sports, Health & Wellness Electives
  | 'shs-research' // SHS Research Electives, Design & Innovation
  | 'shs-techpro' // SHS TechPro Electives
  | 'shs-immersion'; // SHS Work Immersion

// DepEd default weights (DepEd Order 8, s. 2015 / 2026 briefer). These are the
// FIXED national defaults; the registrar may override them per area group in
// Setup → Grade Weights (persisted in reg_grade_weights). `AREA_WEIGHTS` stays
// the fallback used whenever no override is loaded/configured.
export const DEPED_DEFAULT_WEIGHTS: Record<AreaGroup, Weights> = {
  core: { ww: 20, pt: 50, st: 30 },
  'mapeh-tle': { ww: 20, pt: 60, st: 20 },
  'shs-core': { ww: 20, pt: 50, st: 30 },
  'shs-field': { ww: 15, pt: 70, st: 15 },
  'shs-arts': { ww: 20, pt: 60, st: 20 },
  'shs-research': { ww: 40, pt: 60, st: 0 },
  'shs-techpro': { ww: 15, pt: 65, st: 20 },
  'shs-immersion': { ww: 20, pt: 80, st: 0 },
};

// Back-compat alias: existing callers import AREA_WEIGHTS as "the weights to use".
export const AREA_WEIGHTS: Record<AreaGroup, Weights> = DEPED_DEFAULT_WEIGHTS;

// Merge registrar overrides over the DepEd defaults, keeping only rows whose
// three components sum to 100 (an invalid/partial override is ignored so the
// computation never silently uses a bad split).
export function resolveWeights(
  overrides?: Partial<Record<AreaGroup, Weights>> | null,
): Record<AreaGroup, Weights> {
  if (!overrides) return DEPED_DEFAULT_WEIGHTS;
  const merged = { ...DEPED_DEFAULT_WEIGHTS };
  for (const g of AREA_GROUPS) {
    const o = overrides[g];
    if (o && o.ww + o.pt + o.st === 100) merged[g] = { ww: o.ww, pt: o.pt, st: o.st };
  }
  return merged;
}

export const AREA_GROUPS = Object.keys(AREA_WEIGHTS) as AreaGroup[];

export function isAreaGroup(s?: string | null): s is AreaGroup {
  return s != null && Object.prototype.hasOwnProperty.call(AREA_WEIGHTS, s);
}

export const AREA_GROUP_LABEL: Record<AreaGroup, string> = {
  core: 'AP / English / Filipino / Math / Science / GMRC',
  'mapeh-tle': 'MAPEH / EPP / TLE',
  'shs-core': 'SHS Core & Academic Electives',
  'shs-field': 'SHS Field Exposure / Apprenticeship / Creative Production',
  'shs-arts': 'SHS Arts / Sports / Health & Wellness',
  'shs-research': 'SHS Research / Design & Innovation',
  'shs-techpro': 'SHS TechPro',
  'shs-immersion': 'SHS Work Immersion',
};

// ── A component's raw score (points earned over highest possible) ───────────
export interface ComponentScore {
  earned: number;
  total: number;
}

// Percentage score (0..100) for one component, or null if not yet encoded.
export function componentPercent(s?: ComponentScore | null): number | null {
  if (!s || !s.total) return null;
  return (s.earned / s.total) * 100;
}

export interface RawComponents {
  ww?: ComponentScore | null;
  pt?: ComponentScore | null;
  st?: ComponentScore | null;
}

// ── Initial (weighted) grade from the three components ─────────────────────
// Each component's percentage × its weight, summed. Components not yet encoded
// are dropped and the remaining weights re-normalised, so a term still computes
// mid-way (e.g. before the Term Exam is in). Returns null if nothing is encoded.
export function initialGrade(raw: RawComponents, w: Weights): number | null {
  const parts: { pct: number; weight: number }[] = [];
  const add = (pct: number | null, weight: number) => {
    if (pct != null && weight > 0) parts.push({ pct, weight });
  };
  add(componentPercent(raw.ww), w.ww);
  add(componentPercent(raw.pt), w.pt);
  add(componentPercent(raw.st), w.st);
  if (!parts.length) return null;
  const wsum = parts.reduce((a, p) => a + p.weight, 0);
  return parts.reduce((a, p) => a + p.pct * p.weight, 0) / wsum;
}

// ── Transmutation (SY 2026-2027 transition table) ───────────────────────────
// Initial grade (0..100) → transmuted quarterly/term grade. Rows are kept in
// DESCENDING order of their lower bound so the first match wins.
const TRANSMUTATION: { min: number; grade: number }[] = [
  { min: 99.5, grade: 100 },
  { min: 97.5, grade: 99 },
  { min: 96.0, grade: 98 },
  { min: 95.0, grade: 97 },
  { min: 94.0, grade: 96 },
  { min: 93.0, grade: 95 },
  { min: 92.0, grade: 94 },
  { min: 91.0, grade: 93 },
  { min: 90.0, grade: 92 },
  { min: 89.0, grade: 91 },
  { min: 88.0, grade: 90 },
  { min: 87.0, grade: 89 },
  { min: 86.0, grade: 88 },
  { min: 85.0, grade: 87 },
  { min: 84.0, grade: 86 },
  { min: 83.0, grade: 85 },
  { min: 82.0, grade: 84 },
  { min: 81.0, grade: 83 },
  { min: 80.0, grade: 82 },
  { min: 79.0, grade: 81 },
  { min: 78.0, grade: 80 },
  { min: 77.0, grade: 79 },
  { min: 76.0, grade: 78 },
  { min: 75.0, grade: 77 },
  { min: 73.0, grade: 76 },
  { min: 70.0, grade: 75 },
  { min: 68.0, grade: 74 },
  { min: 66.0, grade: 73 },
  { min: 64.0, grade: 72 },
  { min: 62.0, grade: 71 },
  { min: 60.0, grade: 70 },
  { min: 58.0, grade: 69 },
  { min: 56.0, grade: 68 },
  { min: 54.0, grade: 67 },
  { min: 52.0, grade: 66 },
  { min: 50.0, grade: 65 },
  { min: 48.0, grade: 64 },
  { min: 46.0, grade: 63 },
  { min: 43.0, grade: 62 },
  { min: 40.0, grade: 61 },
  { min: 25.0, grade: 60 },
  { min: 0, grade: 60 }, // default minimum
];

export function transmute(initial: number | null): number | null {
  if (initial == null) return null;
  for (const r of TRANSMUTATION) if (initial >= r.min) return r.grade;
  return 60;
}

// One transmutation row as stored per school year (reg_transmutation).
export interface TransmuteRow {
  min: number;
  grade: number;
}

// Transmute against a registrar-configured table (per SY). Rows are matched
// high -> low, so they need not arrive sorted. An empty/undefined table falls
// back to the built-in DepEd default, so an unseeded year still grades.
export function transmuteWith(initial: number | null, table?: TransmuteRow[] | null): number | null {
  if (initial == null) return null;
  if (!table || !table.length) return transmute(initial);
  const sorted = [...table].sort((a, b) => b.min - a.min);
  for (const r of sorted) if (initial >= r.min) return r.grade;
  return sorted[sorted.length - 1]?.grade ?? 60;
}

// Convenience: raw components → final transmuted grade for a learning area.
//
// NPS applies the transmutation table to the Initial Grade ROUNDED to a whole
// number — exactly as shown on the school's official SY 2026-2027 grading
// sheets (e.g. IG 87.7 → round 88 → 90; IG 89.4 → round 89 → 91). Rounding here
// (and not inside `transmute`) keeps the raw table lookups testable.
export function computeGrade(
  raw: RawComponents,
  group: AreaGroup,
  weights: Record<AreaGroup, Weights> = AREA_WEIGHTS,
  transmutation?: TransmuteRow[] | null,
): number | null {
  const ig = initialGrade(raw, weights[group]);
  return ig == null ? null : transmuteWith(Math.round(ig), transmutation);
}

// Same computation, but taking the {ww,pt,st} split DIRECTLY instead of looking
// it up by area group. The official weights depend on the subject's TYPE in a
// given section (reg_class_subjects.subject_type → reg_weight_components), which
// no name-based group can express: General Biology 1 is a Grade 11 Academic
// Elective (20/50/30) AND a Grade 12 Specialized subject (25/45/30). Callers
// resolve the split server-side (reg_weights_for) and pass it here.
export function computeGradeWith(
  raw: RawComponents,
  w: Weights,
  transmutation?: TransmuteRow[] | null,
): number | null {
  const ig = initialGrade(raw, w);
  return ig == null ? null : transmuteWith(Math.round(ig), transmutation);
}

// ── Attitude / behaviour rating (numerical → letter) ────────────────────────
// The subject grade sheet has a final column where the teacher encodes a
// NUMERICAL attitude score; it is converted to a letter using this scale. The
// bands are registrar-configurable (Setup → Grade Weights), stored in
// reg_attitude_scale, and default to the values below.
export interface AttitudeBand {
  min: number; // lower bound (inclusive); rows are matched high → low
  letter: string; // e.g. 'O', 'VS'
  label: string; // e.g. 'Outstanding'
}

// Official scale: 75–99. There is no 100 and nothing below 75, so NI's lower
// bound is 75 — NOT 0. A score under 75 must match NO band; attitudeLetter then
// returns null and the caller flags it, rather than it silently reading as NI.
export const DEFAULT_ATTITUDE_SCALE: AttitudeBand[] = [
  { min: 95, letter: 'MO', label: 'Most Outstanding' },
  { min: 90, letter: 'O', label: 'Outstanding' },
  { min: 85, letter: 'S', label: 'Satisfactory' },
  { min: 80, letter: 'F', label: 'Fair' },
  { min: 75, letter: 'NI', label: 'Needs Improvement' },
];

// Convert a numerical attitude score to its letter using the given scale
// (bands are sorted high → low so the first satisfied lower-bound wins).
export function attitudeLetter(
  score: number | null | undefined,
  scale: AttitudeBand[] = DEFAULT_ATTITUDE_SCALE,
): AttitudeBand | null {
  if (score == null || !Number.isFinite(score)) return null;
  const ordered = [...scale].sort((a, b) => b.min - a.min);
  return ordered.find((b) => score >= b.min) ?? null;
}

// ── Qualitative descriptors (KS2–KS4 numerical grades) ──────────────────────
export interface Descriptor {
  min: number;
  label: string;
  filipino: string;
}

export const NUMERIC_DESCRIPTORS: Descriptor[] = [
  { min: 90, label: 'Advancing', filipino: 'Namumukodtangi' },
  { min: 80, label: 'Benchmarking', filipino: 'Napamamalas' },
  { min: 75, label: 'Connecting', filipino: 'Natutungo' },
  { min: 65, label: 'Developing', filipino: 'Napauunlad' },
  { min: 0, label: 'Emerging', filipino: 'Nagsisimula' },
];

export function descriptorFor(grade: number | null): Descriptor | null {
  if (grade == null) return null;
  return NUMERIC_DESCRIPTORS.find((d) => grade >= d.min) ?? null;
}

// ── Key stages ──────────────────────────────────────────────────────────────
// Kinder & Nursery are ALWAYS descriptive. For the numbered grades, DepEd's
// MATATAG descriptive grading phases IN one grade per year, so a numbered grade
// is descriptive only until numerical grading reaches it:
//   SY 2026-2027 → numerical from Grade 2 (only Grade 1 descriptive)
//   SY 2027-2028 → numerical from Grade 3 (Grades 1–2 descriptive)
//   SY 2028-2029+ → numerical from Grade 4 (Grades 1–3 descriptive)
// This is the mirror of the honors coverage phase-in (see honors.ts).
const KINDER_LEVELS = new Set(['N1', 'N2', 'K']);
const NUMBERED_ORDINAL: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

// First numbered grade that is NUMERICAL in a given SY (this + up = numerical).
export function numericalFloorForSy(sy?: string): number {
  const y = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  if (!Number.isFinite(y)) return 2;
  if (y <= 2026) return 2;
  if (y === 2027) return 3;
  return 4;
}

// MATATAG descriptive (letter) grading for the numbered grades STARTED at NPS in
// SY 2026-2027. Earlier records — e.g. a transferee's prior-school SF10 — used
// numeric grades even in Grades 1–3, so those must be encoded as numbers.
const DESCRIPTIVE_ROLLOUT_START = 2026;

export function isDescriptiveLevel(gradeLevel?: string, sy?: string): boolean {
  if (!gradeLevel) return false;
  if (KINDER_LEVELS.has(gradeLevel)) return true;
  const ord = NUMBERED_ORDINAL[gradeLevel.split('-')[0]] ?? 0;
  if (ord === 0) return false; // SHS strands & unknowns → numerical
  const y = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  // Before the roll-out year, numbered grades were numeric (historical / transferee data).
  if (Number.isFinite(y) && y < DESCRIPTIVE_ROLLOUT_START) return false;
  return ord < numericalFloorForSy(sy);
}

export interface LetterDescriptor {
  letter: string;
  label: string;
  filipino: string;
  description?: string; // MATATAG "General Description"
}

// Grade 1–3 descriptive scale (DepEd MATATAG "Table 8. Grade 1 to 3 Descriptive
// Grading"). NPS applies it grade-by-grade — SY 2026-2027 = Grade 1 only (see
// numericalFloorForSy / isDescriptiveLevel).
export const G1_3_SCALE: LetterDescriptor[] = [
  {
    letter: 'A',
    label: 'Advancing',
    filipino: 'Namumukod-tangi',
    description:
      'Consistently demonstrates advanced skills, understanding, and values beyond expectations; performs with confidence, accuracy, and independence',
  },
  {
    letter: 'B',
    label: 'Benchmarking',
    filipino: 'Napamamalas',
    description:
      'Demonstrates expected skills, understanding, and values at grade level with consistency; performs tasks accurately and independently',
  },
  {
    letter: 'C',
    label: 'Connecting',
    filipino: 'Natutungo',
    description:
      'Demonstrates foundational skills, understanding, and values; applies learning in familiar tasks with minimal guidance',
  },
  {
    letter: 'D',
    label: 'Developing',
    filipino: 'Napauunlad',
    description:
      'Demonstrates partial understanding and inconsistent application of skills and values; requires targeted support and regular practice to improve performance',
  },
  {
    letter: 'E',
    label: 'Emerging',
    filipino: 'Nagsisimula',
    description:
      'Beginning to demonstrate basic skills, understanding, and values; requires intensive support and close guidance',
  },
];

// Kindergarten descriptive scale.
export const KINDER_SCALE: LetterDescriptor[] = [
  { letter: 'C', label: 'Consistent', filipino: 'Palagiang Naipapakita' },
  { letter: 'D', label: 'Developing', filipino: 'Umuusbong' },
  { letter: 'B', label: 'Beginning', filipino: 'Nagsisimula' },
];

export function descriptiveScaleFor(gradeLevel?: string): LetterDescriptor[] {
  return gradeLevel === 'K' || gradeLevel === 'N1' || gradeLevel === 'N2' ? KINDER_SCALE : G1_3_SCALE;
}

// ── Promotion / remediation ─────────────────────────────────────────────────
export const PASSING = 75;
export const REMEDIAL_MAX_FAILS = 2; // remedial is allowed if failing at most 2 learning areas

export function promotionStatus(finals: number[]): 'promoted' | 'remedial' | 'retained' {
  const fails = finals.filter((g) => g < PASSING).length;
  if (fails === 0) return 'promoted';
  if (fails <= REMEDIAL_MAX_FAILS) return 'remedial';
  return 'retained';
}

// ── Subject → learning-area group (best-effort by code/name) ────────────────
// A pragmatic classifier so the encoder can pick weights automatically. SHS
// strand subtleties can't always be inferred from the catalog, so SHS subjects
// default to 'shs-core' and the registrar can override per subject later.
export function classifyArea(subject: { code?: string; fullName?: string; category?: string }): AreaGroup {
  const t = `${subject.code ?? ''} ${subject.fullName ?? ''}`.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  if (has('work immersion', 'immersion')) return 'shs-immersion';
  if (has('research', 'design and innovation', 'inquiries', 'capstone')) return 'shs-research';
  if (has('techpro', 'tech-voc', 'tvl', 'ict', 'cookery', 'agri')) return 'shs-techpro';
  if (has('field exposure', 'apprenticeship', 'creative production')) return 'shs-field';
  if (has('mapeh', 'music', 'arts', 'physical education', 'health', 'mape', 'p.e', 'pe ', 'edukasyon sa pantahanan',
          'epp', 'tle', 'livelihood', 'pantahanan')) return 'mapeh-tle';
  // everything else (AP, English, Filipino, Math, Science, GMRC/ESP/Values,
  // Christian Living, Mother Tongue, etc.) follows the core 20/50/30 split.
  return 'core';
}
