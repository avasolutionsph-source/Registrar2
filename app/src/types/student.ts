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
  f137: CredentialState; // Form 137 / SF 10
  rc: CredentialState; // Report Card (SF 9)
  gmc: CredentialState; // Good Moral
  // SY2026-2027 additions (optional — legacy rows predate them). The
  // "Certification" item was split out of the old "Certification / Report Card".
  certEligibility?: CredentialState; // Certification of Eligibility
  esc?: CredentialState; // ESC Certificate / Voucher
  diploma?: CredentialState; // Diploma
  affidavit?: CredentialState; // Affidavit of Undertaking
  confirmation?: CredentialState; // Confirmation Certificate
  others?: CredentialState; // catch-all for extra learner-specific requirements
  othersText?: string; // free-text description of the "Others" requirement(s)
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

// One summative component's raw score (points earned over highest possible).
export interface RawScore {
  earned: number;
  total: number;
}

// The three DepEd summative components for a single quarter.
export interface QuarterComponents {
  ww?: RawScore; // Written / Oral Works
  pt?: RawScore; // Product / Performance Tasks
  st?: RawScore; // Summative Tests + Term Exam
}

export type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';

export interface QuarterGrade {
  subjectCode: string;
  // Transmuted quarterly grades + the subject's final. For grades encoded the
  // new way these are DERIVED from `raw`; legacy/migrated rows carry them directly.
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  final?: number;
  // DepEd SY2026-2027: the teacher-encoded raw component scores per quarter. The
  // grade engine turns these into q1..q4. Editing the raw scores is how a
  // corrected grade is reached (instead of editing the final directly).
  raw?: Partial<Record<QuarterKey, QuarterComponents>>;
  // Learning-area weight-group override (else inferred from the subject).
  areaGroup?: string;
  // KS1 (Kinder–Grade 3) descriptive letter per quarter, in place of a number.
  letters?: Partial<Record<QuarterKey, string>>;
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
