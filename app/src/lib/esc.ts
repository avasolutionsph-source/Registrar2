// ESC — Educational Service Contracting, the DepEd subsidy NPS bills for its
// Junior High learners. The billing list carries more than the grantee flag:
// it identifies each learner (name parts, birthdate, gender, LRN) and states
// what school they came from, which is what the subsidy is checked against.

import type { Student } from '@/types';

// ESC covers Junior High only. Senior High runs on the SHS voucher instead, and
// the lower levels have no equivalent — so only these four sections of the
// school produce an ESC list.
export const ESC_GRADE_LEVELS = ['VII', 'VIII', 'IX', 'X'];

export const isEscLevel = (gradeLevel?: string): boolean =>
  ESC_GRADE_LEVELS.includes(gradeLevel ?? '');

// The prior-school column changes meaning with the grade level: an incoming
// Grade 7 reports the ELEMENTARY SCHOOL GRADUATED FROM, while Grades 8–10
// report the SCHOOL LAST ATTENDED (NPS itself, for a continuing learner). Both
// ask the same question of the data, so one column carries both.
export const escSchoolHeader = (gradeLevel?: string): string =>
  gradeLevel === 'VII' ? 'Elem. School Graduated From' : 'School Last Attended';

const NPS_NAME = 'Naga Parochial School';

// "2026-2027" → "2025-2026". Empty for anything that is not a year pair.
export function prevSy(sy: string): string {
  const [a, b] = (sy ?? '').split('-').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? `${a - 1}-${b - 1}` : '';
}

export interface PriorSchool {
  school: string;
  schoolType: string;
  // True when the value came off last year's enrolment record because the
  // learner's own prior-school fields are blank. Flagged on screen so the
  // registrar can see what has still to be entered on the learner's record.
  derived: boolean;
}

// Where this learner came from. Their own record wins; when it is blank we fall
// back to last school year's enrolment entry, which is the same fact recorded
// from the other side.
export function priorSchool(s: Student, sy: string): PriorSchool {
  const own = (s.elemSchoolGraduatedFrom ?? '').trim();
  const ownType = (s.schoolType ?? '').trim();
  if (own) return { school: own, schoolType: ownType, derived: false };

  const history = s.enrolmentHistory ?? [];
  const want = prevSy(sy);
  const entry =
    history.find((e) => e.sy === want && (e.schoolName ?? '').trim()) ??
    [...history]
      .filter((e) => e.sy < sy && (e.schoolName ?? '').trim())
      .sort((a, b) => b.sy.localeCompare(a.sy))[0];

  const school = (entry?.schoolName ?? '').trim();
  if (!school) return { school: '', schoolType: ownType, derived: false };
  // NPS is the only school we can classify without being told — it is ours.
  const type = ownType || (school === NPS_NAME ? 'Private' : '');
  return { school, schoolType: type, derived: true };
}

export const hasFullLrn = (lrn: string): boolean => /^\d{12}$/.test(lrn ?? '');
