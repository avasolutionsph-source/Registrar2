export type SchoolYearCode = `${number}-${number}`; // e.g. "2025-2026"

export interface SchoolYear {
  code: SchoolYearCode;
  label: string; // "SY 2025–2026"
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  isActive: boolean; // current SY indicator
}
