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
  // Rotating subject (EPP-ICT, TLE-ICT): different content per term. The flag
  // only OPENS the feature — the actual term breakdown (what is taught each
  // term) is set PER SECTION in Classes ▸ Subjects & Teachers, because
  // sections may run the terms in a different order.
  isRotating?: boolean;
  // LEGACY: the old per-subject breakdown ({ q1: 'EPP', ... }); superseded by
  // the per-section reg_class_subjects.term_labels. Read-only, never written.
  termLabels?: Record<string, string> | null;
}
