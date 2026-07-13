const LRN_REGEX = /^\d{12}$/;

export function isValidLrn(lrn: string): boolean {
  return LRN_REGEX.test(lrn);
}

// A learner with no LRN yet is stored under a unique "NOLRN-…" placeholder key
// (LRN is the primary key, so '' can't be reused). These helpers hide that
// placeholder from the UI — it must read as "no LRN", not as a real value.
export function isPlaceholderLrn(lrn?: string | null): boolean {
  return !!lrn && lrn.startsWith('NOLRN-');
}
export function displayLrn(lrn?: string | null): string {
  return !lrn || isPlaceholderLrn(lrn) ? '' : lrn;
}

// Best-effort school-ID prefix. Preschool learners (Nursery/Kinder) have no LRN yet
// (assigned only once enrolled in the DepEd LIS), so return '' instead of throwing —
// a missing/short LRN must never crash a page that lists such learners.
export function schoolIdFromLrn(lrn: string): string {
  return isValidLrn(lrn) ? lrn.slice(0, 6) : '';
}

export interface ParsedLrn {
  schoolId: string; // first 6 digits — original school of enrollment
  yearSegment: string; // digits 7-8 — encodes SY
  sequence: string; // digits 9-12 — student sequence at that school
}

export function parseLrn(lrn: string): ParsedLrn {
  // Never throw — many learners (Nursery/Kinder, some transferees/SNED) have no LRN
  // yet. Return a best-effort parse with empty parts so no page can crash.
  if (!isValidLrn(lrn)) {
    return { schoolId: '', yearSegment: '', sequence: '' };
  }
  return {
    schoolId: lrn.slice(0, 6),
    yearSegment: lrn.slice(6, 8),
    sequence: lrn.slice(8, 12),
  };
}
