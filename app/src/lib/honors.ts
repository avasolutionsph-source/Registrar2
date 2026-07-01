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

export const HONOR_GA_MIN = 90; // minimum General Average
export const HONOR_GRADE_FLOOR = 80; // no learning-area grade may fall below this

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

// A learner's grade level is honor-eligible in a given SY when it falls within
// that year's numerical band (min..Grade 12).
export function isHonorEligibleLevel(gradeLevel: string | undefined, sy?: string): boolean {
  const ord = ordinalOf(gradeLevel);
  return ord >= minHonorGradeForSy(sy) && ord <= 12;
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
export function periodAverage(
  grades: QuarterGrade[],
  index: Map<string, Subject>,
  period: HonorPeriod,
): PeriodAverage {
  const rows = buildSubjectRows(grades, index).filter((r) => !r.isMapehComponent);
  const vals = rows
    .map((r) => (period === 'final' ? r.final : r[period]))
    .filter((v): v is number => typeof v === 'number');
  if (!vals.length) return { ga: null, gaExact: null, lowest: null, counted: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    ga: Math.round(mean),
    gaExact: Math.round(mean * 100) / 100,
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
): HonorResult {
  const pa = periodAverage(grades, index, period);
  const gaMet = pa.ga != null && pa.ga >= HONOR_GA_MIN;
  const belowFloor = gaMet && pa.lowest != null && pa.lowest < HONOR_GRADE_FLOOR;
  return { ...pa, gaMet, belowFloor, qualified: gaMet && !belowFloor };
}

// Convenience for building `index` once per report render.
export { subjectIndex };
