// Academic-honors computation for the registrar's Honor Students report.
//
// The Class Adviser submits a list of qualifiers per term (and at year-end); the
// registrar VERIFIES it against the system's own computed list, then forwards
// the verified list to the Academic Coordinator (who prepares invitations and
// certificates). This module is the "system's own computed list" — the single,
// testable source of truth the registrar checks against.
//
// Cutoffs follow DepEd Order #36, s. 2016 (Academic Excellence), computed on the
// General Average (mean of subject finals, MAPEH counted once). The optional
// "no grade below" floor is a school policy knob the registrar can change from
// the UI (many schools require no learning-area grade below 85 for honors).

import { buildSubjectRows, subjectIndex } from './forms';
import { isDescriptiveLevel } from './grading';
import type { QuarterGrade, QuarterKey, Subject } from '@/types';

// A term ('q1'..'q3'/'q4') or the year-end final average.
export type HonorPeriod = QuarterKey | 'final';

export interface HonorTier {
  id: 'highest' | 'high' | 'honors';
  label: string;
  min: number; // inclusive
  max: number; // inclusive
}

// DESCENDING so the first match wins.
export const HONOR_TIERS: HonorTier[] = [
  { id: 'highest', label: 'With Highest Honors', min: 98, max: 100 },
  { id: 'high', label: 'With High Honors', min: 95, max: 97 },
  { id: 'honors', label: 'With Honors', min: 90, max: 94 },
];

export function tierForGa(ga: number | null): HonorTier | null {
  if (ga == null) return null;
  return HONOR_TIERS.find((t) => ga >= t.min && ga <= t.max) ?? null;
}

// Honors are numeric-grade awards only. KS1 (Nursery–Grade 3 at NPS) uses
// DESCRIPTIVE letter grades, so those levels are never ranked for honors.
export function isHonorEligibleLevel(gradeLevel?: string): boolean {
  return !!gradeLevel && !isDescriptiveLevel(gradeLevel);
}

export interface PeriodAverage {
  ga: number | null; // rounded General Average for the period
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
  if (!vals.length) return { ga: null, lowest: null, counted: 0 };
  const ga = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return { ga, lowest: Math.min(...vals), counted: vals.length };
}

export interface HonorResult extends PeriodAverage {
  tier: HonorTier | null; // tier by GA alone
  qualified: boolean; // tier reached AND floor rule (if any) satisfied
  belowFloor: boolean; // GA reaches a tier but a subject is under the floor
}

// Decide a learner's honor standing for a period. `floor` is the minimum any
// single subject grade may be (null = no floor rule).
export function evaluateHonor(
  grades: QuarterGrade[],
  index: Map<string, Subject>,
  period: HonorPeriod,
  floor: number | null,
): HonorResult {
  const pa = periodAverage(grades, index, period);
  const tier = tierForGa(pa.ga);
  const belowFloor =
    !!tier && floor != null && pa.lowest != null && pa.lowest < floor;
  return { ...pa, tier, qualified: !!tier && !belowFloor, belowFloor };
}

// Convenience for building `index` once per report render.
export { subjectIndex };
