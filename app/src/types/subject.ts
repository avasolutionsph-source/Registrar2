export type SubjectCategory = 'Core' | 'Specialized' | 'Applied' | 'Elective';

export interface Subject {
  code: string; // 3-letter, e.g. "FIL", "MAT", "MAPEH"
  fullName: string; // e.g. "Filipino"
  abbreviation: string;
  category: SubjectCategory;
}
