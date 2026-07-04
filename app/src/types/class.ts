import type { SchoolYearCode } from './schoolYear';
import type { Teacher } from './teacher';

export type GradeLevel =
  | 'N1'
  | 'N2'
  | 'K'
  | 'S' // Pre-K + SPED
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI' // Elem
  | 'VII'
  | 'VIII'
  | 'IX'
  | 'X' // JHS
  | 'XI-GAS'
  | 'XI-HUMSS'
  | 'XI-STEM'
  | 'XI-ABM' // SHS Gr 11
  | 'XII-GAS'
  | 'XII-HUMSS'
  | 'XII-STEM'
  | 'XII-ABM' // SHS Gr 12 (legacy strands, kept for prior-year sections)
  | 'XI-ASSH'
  | 'XI-STEM-ENG'
  | 'XI-STEM-HA' // SHS Gr 11 (current strands)
  | 'XII-ASSH'
  | 'XII-STEM-ENG'
  | 'XII-STEM-HA'; // SHS Gr 12 (current strands)

export interface ClassRecord {
  id: string; // UUID; sections are immutable across SYs
  sy: SchoolYearCode;
  gradeLevel: GradeLevel;
  sectionName: string; // e.g. "St. John Vianney"
  adviser: Teacher;
  curriculum: string; // e.g. "Kto12-B"
  studentLrns: string[]; // 12-digit LRNs of enrolled students
}
