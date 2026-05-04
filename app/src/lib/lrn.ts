const LRN_REGEX = /^\d{12}$/;

export function isValidLrn(lrn: string): boolean {
  return LRN_REGEX.test(lrn);
}

export function schoolIdFromLrn(lrn: string): string {
  if (!isValidLrn(lrn)) {
    throw new Error(`Invalid LRN: ${lrn}`);
  }
  return lrn.slice(0, 6);
}

export interface ParsedLrn {
  schoolId: string; // first 6 digits — original school of enrollment
  yearSegment: string; // digits 7-8 — encodes SY
  sequence: string; // digits 9-12 — student sequence at that school
}

export function parseLrn(lrn: string): ParsedLrn {
  if (!isValidLrn(lrn)) {
    throw new Error(`Invalid LRN: ${lrn}`);
  }
  return {
    schoolId: lrn.slice(0, 6),
    yearSegment: lrn.slice(6, 8),
    sequence: lrn.slice(8, 12),
  };
}
