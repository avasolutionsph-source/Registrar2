import type { GradeLevel } from './class';
import type { SchoolYearCode } from './schoolYear';

export type Gender = 'Male' | 'Female';

export type EnrolmentAction = 'promoted' | 'retained' | 'irregular';

export type CredentialState = 'on-file' | 'pending' | 'na';

export interface CredentialStatus {
  bc: CredentialState; // Birth Certificate
  bp: CredentialState; // Baptismal
  hc: CredentialState; // Health Cert
  pix: CredentialState; // 1x1 photo
  rf: CredentialState; // Recommendation Form
  f137: CredentialState; // Form 137
  rc: CredentialState; // Report Card
  gmc: CredentialState; // Good Moral
}

export interface EnrolmentEntry {
  sy: SchoolYearCode;
  gradeLevel: GradeLevel;
  sectionName: string;
  adviserName: string;
  generalAverage?: number;
  action?: EnrolmentAction;
  // present on the imported legacy records (optional for hand-entered rows)
  schoolName?: string; // school attended that year ("Naga Parochial School" for NPS years)
  schoolId?: string; // 6-digit DepEd School ID
  daysPresent?: number;
  dateEntered?: string; // ISO
  dateLeft?: string; // ISO
  startYear?: number;
  to?: string; // grade promoted to, e.g. "Grade VII"
}

export interface QuarterGrade {
  subjectCode: string;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  final?: number;
}

// ── conduct (imported from legacy attendance / deportment / special programs) ──
export interface AttendanceRecord {
  present?: Record<string, number>; // month key (jun…apr) → days present
  tardy?: Record<string, number>; // month key → times tardy
  totalPresent?: number;
  totalTardy?: number;
}

export interface ValuesRecord {
  q: Record<string, Record<string, number>>; // quarter "1".."4" → trait → rating
  average?: number;
}

export interface ProgramsRecord {
  q: Record<string, Record<string, number>>; // quarter → program → grade
}

export interface ConductYear {
  attendance?: AttendanceRecord;
  values?: ValuesRecord;
  programs?: ProgramsRecord;
}

export interface Student {
  // identity
  lrn: string; // 12-digit
  studentNo: string; // legacy NPS internal: YY1YY2{seq}
  firstName: string;
  middleName: string; // full middle/maternal surname (legacy "M.I." mislabeled)
  lastName: string;
  extension: string; // suffix (Jr, II, III) — may be empty
  gender: Gender;
  birthdate: string; // ISO YYYY-MM-DD
  religion: string; // e.g. "Roman Catholic"

  // contact
  address: string;
  contactNumber: string;

  // family
  fatherName: string;
  motherMaidenName: string;
  guardianRelation: 'Father' | 'Mother' | 'Other';

  // school context
  currentSY: SchoolYearCode;
  currentClassId: string; // ClassRecord.id
  curriculum: string;
  status: 'Active' | 'Dropped' | 'Transferred' | 'Graduated';

  // origin (for transferees)
  elemSchoolGraduatedFrom: string;
  schoolType: 'Public' | 'Private' | 'SUC' | '';

  // history
  enrolmentHistory: EnrolmentEntry[];
  loyaltyYears: number; // years of continuous NPS enrollment

  // grades by SY (only the current SY is displayed in the prototype)
  grades: Record<SchoolYearCode, QuarterGrade[]>;

  // conduct by SY: attendance, observed core values, special-program ratings.
  // Optional: legacy mock fixtures predate this field; the DB mapper always sets it.
  conduct?: Record<SchoolYearCode, ConductYear>;

  // credentials (per current SY)
  credentials: CredentialStatus;

  // standardized tests (only populated for eligible grade levels)
  ncae?: { gmc?: number; fil?: number; mapeh?: number; total?: number };
  nat?: { fil?: number };

  // ID photo: storage object path in the private `student-photos` bucket
  // (resolved to a short-lived signed URL for display). Undefined = no photo.
  photoPath?: string;
}
