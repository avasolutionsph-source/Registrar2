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
}

export interface QuarterGrade {
  subjectCode: string;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  final?: number;
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

  // credentials (per current SY)
  credentials: CredentialStatus;

  // standardized tests (only populated for eligible grade levels)
  ncae?: { gmc?: number; fil?: number; mapeh?: number; total?: number };
  nat?: { fil?: number };
}
