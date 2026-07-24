export type SubjectCategory = 'Core' | 'Specialized' | 'Applied' | 'Elective';

// Education level a subject belongs to (for grouping the catalog).
export type SubjectLevel = 'preschool' | 'elem' | 'jhs' | 'shs';

export interface Subject {
  code: string; // 3-letter, e.g. "FIL", "MAT", "MAPEH"
  fullName: string; // e.g. "Filipino"
  abbreviation: string;
  // SHS-only (DepEd K-12): Core / Applied / Specialized / Elective. Elementary
  // and Junior High subjects have no category — leave undefined for them.
  category?: SubjectCategory;
  level?: SubjectLevel; // Pre-School / Elementary / JHS / SHS (registrar-assigned)
  order: number; // registrar-defined display order (lower = earlier)
  // Combination subject (EPP-ICT, TLE-ICT): what is taught each term, keyed by
  // period ({ q1: 'EPP', q2: 'EPP', q3: 'ICT' }). Null/undefined = ordinary
  // subject. Presence of this map is what marks a subject as a combination —
  // coordinators then assign a teacher PER TERM instead of one for the year.
  termLabels?: Record<string, string> | null;
}
