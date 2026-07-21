// Academic-honors computation for the registrar's Honor Students report.
//
// The Class Adviser submits a list of qualifiers per term (and at year-end); the
// registrar VERIFIES it against the system's own computed list, then forwards
// the verified list to the Academic Coordinator (who prepares invitations and
// certificates). This module is the "system's own computed list" — the single,
// testable source of truth the registrar checks against.
//
// NPS policy (Academic Excellence Award):
//   Granted to learners in Grade 4–12 who attain a General Average of at least
//   90, with NO final grade lower than 80 in any learning area. It is a single
//   flat award — awardees are listed ALPHABETICALLY (no ranking) to promote
//   fairness and minimise undue competition. (Eligible learners must also have
//   no derogatory records — a manual check the registrar/adviser applies.)
//
// Grade coverage phases in as the lower grades move to numerical grading:
//   SY 2026-2027 → Grade 2–12 · SY 2027-2028 → Grade 3–12 · 2028-2029+ → 4–12.

import { buildSubjectRows, subjectIndex } from './forms';
import type { QuarterGrade, QuarterKey, Subject } from '@/types';

// A term ('q1'..'q3'/'q4') or the year-end final average.
export type HonorPeriod = QuarterKey | 'final';

export const HONOR_GA_MIN = 90; // default minimum General Average
export const HONOR_GRADE_FLOOR = 80; // default per-subject floor

// Registrar-configurable criteria (reg_honor_criteria), per SY. Callers that
// load it pass it in; the defaults above stand when it is absent.
export interface HonorCriteria {
  gaMin: number;
  floor: number;
}
const DEFAULT_CRITERIA: HonorCriteria = { gaMin: HONOR_GA_MIN, floor: HONOR_GRADE_FLOOR };

// Ordinal per grade-level code (Grade 1..12); pre-elementary → 0.
const LEVEL_ORDINAL: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};
function ordinalOf(gradeLevel?: string): number {
  if (!gradeLevel) return 0;
  const base = gradeLevel.split('-')[0]; // "XII-STEM" → "XII"
  if (base === 'XI') return 11;
  if (base === 'XII') return 12;
  return LEVEL_ORDINAL[base] ?? 0;
}

// Lowest honor-eligible grade for a school year (numerical-grading roll-out).
export function minHonorGradeForSy(sy?: string): number {
  const y = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  if (!Number.isFinite(y)) return 4;
  if (y <= 2026) return 2; // this year: Grade 2 up (all are numerical)
  if (y === 2027) return 3; // next year: Grade 3 up
  return 4; // 2028-2029 onward: Grade 4 up
}

// Which honor regime applies to a school year.
//   'excellence' — SY 2026-2027 onward: the flat Academic Excellence Award
//                  (GA ≥ 90 AND no learning-area grade below 80).
//   'tiered'     — SY 2025-2026 and earlier: the old DepEd tiered honors
//                  (With / High / Highest Honors) with NO per-subject floor —
//                  a learner still made honors with a grade in the 70s as long
//                  as the GA reached 90. The 80 floor is exactly what the new
//                  award added ("ngayon dapat walang line of 7").
export type HonorRegime = 'excellence' | 'tiered';
export function honorRegimeForSy(sy?: string): HonorRegime {
  const y = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) && y <= 2025 ? 'tiered' : 'excellence';
}

// Old tiered honor bands (quarterly average). No per-subject floor applied.
export type HonorTier = 'with' | 'high' | 'highest';
export const TIER_LABEL: Record<HonorTier, string> = {
  with: 'With Honors',
  high: 'With High Honors',
  highest: 'With Highest Honors',
};
// Tiered-regime cutoffs. Defaults (98/95/90) match the old DepEd bands; a caller
// may pass registrar-configured values from reg_grading_policy.
export interface HonorTiers {
  with: number;
  high: number;
  highest: number;
}
const DEFAULT_TIERS: HonorTiers = { with: HONOR_GA_MIN, high: 95, highest: 98 };

export function tierForGa(ga: number | null, tiers: HonorTiers = DEFAULT_TIERS): HonorTier | null {
  if (ga == null) return null;
  if (ga >= tiers.highest) return 'highest';
  if (ga >= tiers.high) return 'high';
  if (ga >= tiers.with) return 'with';
  return null;
}

// A learner's grade level is honor-eligible in a given SY. Under the current
// award the band phases in (minHonorGradeForSy..12); under the old tiered
// regime any numerical level (Grade 1..12) was eligible.
export function isHonorEligibleLevel(
  gradeLevel: string | undefined,
  sy?: string,
  override?: { regime?: HonorRegime; minGrade?: number },
): boolean {
  const ord = ordinalOf(gradeLevel);
  if (ord < 1 || ord > 12) return false;
  const regime = override?.regime ?? honorRegimeForSy(sy);
  const minGrade = override?.minGrade ?? minHonorGradeForSy(sy);
  return regime === 'tiered' ? true : ord >= minGrade;
}

export interface PeriodAverage {
  ga: number | null; // rounded General Average (matches the report card)
  gaExact: number | null; // UNROUNDED average kept to 2 decimals — used for
  // class ranking and the year-end NPS Excellence Award (Grade 6/10/12), where
  // whole-number ties must be broken by the true decimal average.
  lowest: number | null; // lowest counted subject grade (drives the floor rule)
  counted: number; // number of subjects that contributed
}

// General Average for ONE period across a learner's subjects for a school year.
// MAPEH is derived once (its components are excluded), matching the report card
// and Form 137. For a term we average that period's column; for 'final' we
// average the subject finals — identical to `generalAverage()` in forms.ts.
// Rounding rule for the General Average. `gaDecimals` shapes the reported GA
// (0 = whole number, as before) and `tiebreakDecimals` the unrounded ranking
// value (2 by default). Both come from reg_grading_policy when supplied.
export interface RoundingRule {
  gaDecimals: number;
  tiebreakDecimals: number;
}
const DEFAULT_ROUNDING: RoundingRule = { gaDecimals: 0, tiebreakDecimals: 2 };
function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, Math.max(0, decimals));
  return Math.round(n * f) / f;
}

export function periodAverage(
  grades: QuarterGrade[],
  index: Map<string, Subject>,
  period: HonorPeriod,
  rounding: RoundingRule = DEFAULT_ROUNDING,
): PeriodAverage {
  const rows = buildSubjectRows(grades, index).filter((r) => !r.isMapehComponent);
  const vals = rows
    .map((r) => (period === 'final' ? r.final : r[period]))
    .filter((v): v is number => typeof v === 'number');
  if (!vals.length) return { ga: null, gaExact: null, lowest: null, counted: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    ga: roundTo(mean, rounding.gaDecimals),
    gaExact: roundTo(mean, rounding.tiebreakDecimals),
    lowest: Math.min(...vals),
    counted: vals.length,
  };
}

export interface HonorResult extends PeriodAverage {
  gaMet: boolean; // GA reaches 90
  belowFloor: boolean; // GA reaches 90 but a subject is under 80
  qualified: boolean; // GA ≥ 90 AND no grade below 80
}

// Decide a learner's Academic Excellence Award standing for a period.
export function evaluateHonor(
  grades: QuarterGrade[],
  index: Map<string, Subject>,
  period: HonorPeriod,
  criteria: HonorCriteria = DEFAULT_CRITERIA,
): HonorResult {
  const pa = periodAverage(grades, index, period);
  const gaMet = pa.ga != null && pa.ga >= criteria.gaMin;
  const belowFloor = gaMet && pa.lowest != null && pa.lowest < criteria.floor;
  return { ...pa, gaMet, belowFloor, qualified: gaMet && !belowFloor };
}

export interface AwardResult extends PeriodAverage {
  regime: HonorRegime;
  qualified: boolean;
  tier: HonorTier | null; // set only under the tiered (old) regime
  belowFloor: boolean; // meaningful only under the excellence regime
}

// Regime-aware evaluation. Under 'excellence' this is evaluateHonor (GA ≥ 90 AND
// no grade below 80). Under 'tiered' it is GA ≥ 90 with a tier label and NO floor.
// `policy` (from reg_grading_policy) overrides the code year-math: regime, the
// tiered cutoffs, and the GA rounding. Omitted → the historical code behaviour.
export interface AwardPolicy {
  regime?: HonorRegime;
  tiers?: HonorTiers;
  rounding?: RoundingRule;
}

export function evaluateAward(
  grades: QuarterGrade[],
  index: Map<string, Subject>,
  period: HonorPeriod,
  sy?: string,
  criteria: HonorCriteria = DEFAULT_CRITERIA,
  policy?: AwardPolicy,
): AwardResult {
  const pa = periodAverage(grades, index, period, policy?.rounding ?? DEFAULT_ROUNDING);
  const regime = policy?.regime ?? honorRegimeForSy(sy);
  const gaMet = pa.ga != null && pa.ga >= criteria.gaMin;
  if (regime === 'tiered') {
    return { ...pa, regime, qualified: gaMet, tier: tierForGa(pa.ga, policy?.tiers), belowFloor: false };
  }
  const belowFloor = gaMet && pa.lowest != null && pa.lowest < criteria.floor;
  return { ...pa, regime, qualified: gaMet && !belowFloor, tier: null, belowFloor };
}

// Convenience for building `index` once per report render.
export { subjectIndex };
