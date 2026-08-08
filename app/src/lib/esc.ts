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
  // True when the authoritative source for this grade level was empty and the
  // value had to be taken from the other one. Flagged on screen so the
  // registrar can see what has still to be entered on the learner's record.
  derived: boolean;
}

// The school this learner attended in the school year before `sy`, read off
// their enrolment history.
function lastYearSchool(s: Student, sy: string): string {
  const history = s.enrolmentHistory ?? [];
  const want = prevSy(sy);
  const entry =
    history.find((e) => e.sy === want && (e.schoolName ?? '').trim()) ??
    [...history]
      .filter((e) => e.sy < sy && (e.schoolName ?? '').trim())
      .sort((a, b) => b.sy.localeCompare(a.sy))[0];
  return (entry?.schoolName ?? '').trim();
}

// What goes in the prior-school column, and where it comes from.
//
// The two grade bands ask DIFFERENT questions, so they read different sources:
//
//   Grade 7  — "elem. school graduated from". The learner's own record holds
//              exactly that (the form calls it "Previous School Attended", the
//              school they came to NPS from), so their record is authoritative.
//   Grade 8-10 — "school last attended", which is last school year's enrolment
//              entry. Their own record is NOT it: a learner who transferred in
//              back at Grade 7 still carries that elementary school on their
//              record, and by Grade 9 the school they last attended is NPS.
//
// Whichever source is authoritative is tried first; the other is a fallback and
// is flagged as derived.
export function priorSchool(s: Student, sy: string, gradeLevel?: string): PriorSchool {
  const own = (s.elemSchoolGraduatedFrom ?? '').trim();
  const ownType = (s.schoolType ?? '').trim();
  const lastYear = lastYearSchool(s, sy);

  const ownIsAuthoritative = !gradeLevel || gradeLevel === 'VII';
  const [primary, fallback] = ownIsAuthoritative ? [own, lastYear] : [lastYear, own];

  const school = primary || fallback;
  if (!school) return { school: '', schoolType: '', derived: false };

  // The recorded school type describes the learner's OWN prior school, so it
  // only applies when that is the school being shown. NPS is the one school we
  // can classify without being told — it is ours.
  const schoolType = school === NPS_NAME ? 'Private' : school === own ? ownType : '';
  return { school, schoolType, derived: !primary };
}

export const hasFullLrn = (lrn: string): boolean => /^\d{12}$/.test(lrn ?? '');
