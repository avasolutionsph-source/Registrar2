export interface Teacher {
  id: number; // legacy sequential int
  title: string; // "Mrs.", "Mr.", "Fr.", etc.
  familyName: string;
  firstName: string;
  middleInitial: string;
  email: string;
  yearStarted: number;
  yearEnded: number; // 0 = still active per legacy convention
  isAdviser?: boolean;
  curriculum?: string; // e.g. "Kto12-B"
}
