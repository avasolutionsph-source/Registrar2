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

export const AREA_WEIGHTS: Record<AreaGroup, Weights> = {
  core: { ww: 20, pt: 50, st: 30 },
  'mapeh-tle': { ww: 20, pt: 60, st: 20 },
  'shs-core': { ww: 20, pt: 50, st: 30 },
  'shs-field': { ww: 15, pt: 70, st: 15 },
  'shs-arts': { ww: 20, pt: 60, st: 20 },
  'shs-research': { ww: 40, pt: 60, st: 0 },
  'shs-techpro': { ww: 15, pt: 65, st: 20 },
  'shs-immersion': { ww: 20, pt: 80, st: 0 },
};

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

// Convenience: raw components → final transmuted grade for a learning area.
//
// NPS applies the transmutation table to the Initial Grade ROUNDED to a whole
// number — exactly as shown on the school's official SY 2026-2027 grading
// sheets (e.g. IG 87.7 → round 88 → 90; IG 89.4 → round 89 → 91). Rounding here
// (and not inside `transmute`) keeps the raw table lookups testable.
export function computeGrade(raw: RawComponents, group: AreaGroup): number | null {
  const ig = initialGrade(raw, AREA_WEIGHTS[group]);
  return ig == null ? null : transmute(Math.round(ig));
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
// KS1 (Kinder–Grade 3) uses DESCRIPTIVE letter grades, NOT numerical ones.
// NPS pre-Kinder (Nursery) is treated the same. Grade levels use the app's
// internal codes (N1, N2, K = Kinder, I/II/III = Grades 1–3).
const DESCRIPTIVE_LEVELS = new Set(['N1', 'N2', 'K', 'I', 'II', 'III']);

export function isDescriptiveLevel(gradeLevel?: string): boolean {
  return !!gradeLevel && DESCRIPTIVE_LEVELS.has(gradeLevel);
}

export interface LetterDescriptor {
  letter: string;
  label: string;
  filipino: string;
}

// Grade 1–3 descriptive scale.
export const G1_3_SCALE: LetterDescriptor[] = [
  { letter: 'A', label: 'Advancing', filipino: 'Namumukodtangi' },
  { letter: 'B', label: 'Benchmarking', filipino: 'Napamamalas' },
  { letter: 'C', label: 'Connecting', filipino: 'Natutungo' },
  { letter: 'D', label: 'Developing', filipino: 'Napauunlad' },
  { letter: 'E', label: 'Emerging', filipino: 'Nagsisimula' },
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
