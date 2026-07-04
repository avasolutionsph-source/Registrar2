export type SubjectCategory = 'Core' | 'Specialized' | 'Applied' | 'Elective';

export interface Subject {
  code: string; // 3-letter, e.g. "FIL", "MAT", "MAPEH"
  fullName: string; // e.g. "Filipino"
  abbreviation: string;
  // SHS-only (DepEd K-12): Core / Applied / Specialized / Elective. Elementary
  // and Junior High subjects have no category — leave undefined for them.
  category?: SubjectCategory;
  order: number; // registrar-defined display order (lower = earlier)
}
