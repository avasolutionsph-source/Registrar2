export type SchoolYearCode = `${number}-${number}`; // e.g. "2025-2026"

export interface SchoolYear {
  code: SchoolYearCode;
  label: string; // "SY 2025–2026"
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  isActive: boolean; // current SY indicator
}

// Sentinel option for the School Year selector meaning "don't filter by SY".
// `code` is a deliberate cast — it never matches a real "YYYY-YYYY" year, which
// is exactly how filters detect it (see ALL_TIME_CODE).
export const ALL_TIME_CODE = 'all' as SchoolYearCode;
export const ALL_TIME_SY: SchoolYear = {
  code: ALL_TIME_CODE,
  label: 'All time',
  startDate: '',
  endDate: '',
  isActive: false,
};

// True when no SY filter should be applied (All time picked, or none selected yet).
export function isAllTime(sy: SchoolYear | null | undefined): boolean {
  return !sy || sy.code === ALL_TIME_CODE;
}
