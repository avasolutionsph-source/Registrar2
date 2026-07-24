// Supabase data access for the Registrar System (NPS shared project).
// Maps the snake_case `reg_*` rows to the app's camelCase types. Screens that
// have been migrated off the mocks call these functions.

import { supabase } from './supabase';
import { idbGet, idbSet, SNAP } from './offlineCache';
import { isPlaceholderLrn } from './lrn';
import {
  AREA_GROUPS,
  isAreaGroup,
  resolveWeights,
  DEFAULT_ATTITUDE_SCALE,
  isDescriptiveLevel,
  descriptiveScaleFor,
  numericalFloorForSy,
  type AreaGroup,
  type Weights,
  type AttitudeBand,
  type LetterDescriptor,
} from './grading';
import type {
  Student,
  ClassRecord,
  Teacher,
  SchoolYear,
  Subject,
  SubjectCategory,
  Gender,
  GradeLevel,
  CredentialStatus,
} from '@/types';

type Row = Record<string, unknown>;

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// ── offline read cache ──────────────────────────────────────────────────
// Reads go to the network when online; if offline (or the request fails on a
// flaky connection) they fall back to the last snapshot saved by syncToDevice().
// Snapshots are only written by syncToDevice(), so online reads stay authoritative.
async function offlineRead<T>(
  network: () => Promise<T>,
  fromSnapshot: () => Promise<T | undefined>,
): Promise<T> {
  const online = typeof navigator === 'undefined' || navigator.onLine;
  if (online) {
    try {
      return await network();
    } catch (err) {
      const snap = await fromSnapshot().catch(() => undefined);
      if (snap !== undefined) return snap; // flaky network → serve cached copy
      throw err;
    }
  }
  const snap = await fromSnapshot().catch(() => undefined);
  if (snap !== undefined) return snap;
  throw new Error('Offline at walang naka-save na kopya. Mag-"Sync now" muna habang may internet.');
}

// ── fields the Add/Edit Student form collects ──
export interface StudentInput {
  lrn: string;
  studentNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extension: string;
  gender: Gender;
  birthdate: string;
  religion: string;
  address: string;
  contactNumber: string;
  fatherName: string;
  motherMaidenName: string;
  guardianRelation: Student['guardianRelation'];
  currentSY: string;
  currentClassId: string;
  curriculum: string;
  status: Student['status'];
  elemSchoolGraduatedFrom: string;
  schoolType: Student['schoolType'];
  credentials: CredentialStatus;
  // nested history/grades aren't edited in the form — carried through on edit
  enrolmentHistory?: Student['enrolmentHistory'];
  grades?: Student['grades'];
  conduct?: Student['conduct'];
  ncae?: Student['ncae'];
  nat?: Student['nat'];
}

// ── fields the Teacher form collects ──
export interface TeacherInput {
  title: string;
  familyName: string;
  firstName: string;
  middleInitial: string;
  email: string;
  yearStarted: number;
  yearEnded: number;
  isAdviser?: boolean;
  curriculum?: string;
}

// ── fields the Class form collects ──
export interface ClassInput {
  sy: string;
  gradeLevel: string;
  sectionName: string;
  adviserId: number | null;
  curriculum: string;
}

// ── mappers ──
const str = (v: unknown, fallback = '') => (v == null ? fallback : String(v));

function rowToTeacher(r: Row): Teacher {
  return {
    id: Number(r.id),
    title: str(r.title),
    familyName: str(r.family_name),
    firstName: str(r.first_name),
    middleInitial: str(r.middle_initial),
    email: str(r.email),
    yearStarted: Number(r.year_started ?? 0),
    yearEnded: Number(r.year_ended ?? 0),
    isAdviser: Boolean(r.is_adviser),
    curriculum: str(r.curriculum),
  };
}

const BLANK_ADVISER: Teacher = {
  id: 0, title: '', familyName: '—', firstName: '', middleInitial: '',
  email: '', yearStarted: 0, yearEnded: 0,
};

function rowToClass(r: Row, adviser?: Teacher): ClassRecord {
  return {
    id: str(r.id),
    sy: str(r.sy) as unknown as ClassRecord['sy'],
    gradeLevel: str(r.grade_level) as GradeLevel,
    sectionName: str(r.section_name),
    adviser: adviser ?? BLANK_ADVISER,
    curriculum: str(r.curriculum),
    studentLrns: [],
  };
}

function rowToStudent(r: Row): Student {
  return {
    lrn: str(r.lrn),
    studentNo: str(r.student_no),
    firstName: str(r.first_name),
    middleName: str(r.middle_name),
    lastName: str(r.last_name),
    extension: str(r.extension),
    gender: (str(r.gender) || 'Male') as Gender,
    birthdate: str(r.birthdate),
    religion: str(r.religion),
    address: str(r.address),
    contactNumber: str(r.contact_number),
    fatherName: str(r.father_name),
    motherMaidenName: str(r.mother_maiden_name),
    guardianRelation: (str(r.guardian_relation) || 'Mother') as Student['guardianRelation'],
    currentSY: str(r.current_sy) as unknown as Student['currentSY'],
    currentClassId: str(r.current_class_id),
    curriculum: str(r.curriculum),
    status: (str(r.status) || 'Active') as Student['status'],
    elemSchoolGraduatedFrom: str(r.elem_school_graduated_from),
    schoolType: str(r.school_type) as Student['schoolType'],
    enrolmentHistory: (r.enrolment_history ?? []) as Student['enrolmentHistory'],
    loyaltyYears: Number(r.loyalty_years ?? 0),
    grades: (r.grades ?? {}) as unknown as Student['grades'],
    conduct: (r.conduct ?? {}) as unknown as Student['conduct'],
    credentials: (r.credentials ?? {}) as unknown as CredentialStatus,
    ncae: (r.ncae ?? undefined) as Student['ncae'],
    nat: (r.nat ?? undefined) as Student['nat'],
    photoPath: r.photo_url ? str(r.photo_url) : undefined,
  };
}

function studentToRow(s: StudentInput): Row {
  return {
    lrn: s.lrn,
    student_no: s.studentNo ?? '',
    first_name: s.firstName,
    middle_name: s.middleName ?? '',
    last_name: s.lastName,
    extension: s.extension ?? '',
    gender: s.gender,
    birthdate: s.birthdate || null,
    religion: s.religion ?? '',
    address: s.address ?? '',
    contact_number: s.contactNumber ?? '',
    father_name: s.fatherName ?? '',
    mother_maiden_name: s.motherMaidenName ?? '',
    guardian_relation: s.guardianRelation ?? 'Mother',
    current_sy: s.currentSY || null,
    current_class_id: s.currentClassId || null,
    curriculum: s.curriculum ?? '',
    status: s.status ?? 'Active',
    elem_school_graduated_from: s.elemSchoolGraduatedFrom ?? '',
    school_type: s.schoolType ?? '',
    enrolment_history: s.enrolmentHistory ?? [],
    grades: s.grades ?? {},
    conduct: s.conduct ?? {},
    credentials: s.credentials ?? {},
    ncae: s.ncae ?? null,
    nat: s.nat ?? null,
  };
}

// ── students ──
// PostgREST caps a single response at ~1000 rows, but NPS has ~6,000 students.
// Page through with .range() until a short page comes back so we get them all.
const PAGE = 1000;

export async function listStudents(): Promise<Student[]> {
  return offlineRead(
    async () => {
      const c = client();
      const out: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await c
          .from('reg_students')
          .select('*')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })
          .order('lrn', { ascending: true }) // stable tiebreaker across pages
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Row[];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      return out.map(rowToStudent);
    },
    async () => idbGet<Student[]>(SNAP.students),
  );
}

export async function getStudent(lrn: string): Promise<Student | null> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_students')
        .select('*')
        .eq('lrn', lrn)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToStudent(data) : null;
    },
    async () => {
      const arr = await idbGet<Student[]>(SNAP.students);
      if (!arr) return undefined; // no offline copy at all
      return arr.find((s) => s.lrn === lrn) ?? null;
    },
  );
}

// Columns the list/report/setup screens actually display. Deliberately EXCLUDES
// the encrypted PII (address/contact/parents/birthdate) and the heavy
// grades/conduct/enrolment JSONB, so these screens never pay the per-row
// decryption cost — full `select *` decrypts 5 columns × 6k rows (~0.6–1s);
// this slim shape runs in a few ms.
const STUDENT_LITE_COLS =
  'lrn,student_no,first_name,middle_name,last_name,extension,gender,religion,' +
  'guardian_relation,current_sy,current_class_id,curriculum,status,' +
  'elem_school_graduated_from,school_type,loyalty_years';

export async function listStudentsLite(): Promise<Student[]> {
  return offlineRead(
    async () => {
      const c = client();
      const out: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await c
          .from('reg_students')
          .select(STUDENT_LITE_COLS)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })
          .order('lrn', { ascending: true }) // stable tiebreaker across pages
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as unknown as Row[];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      return out.map(rowToStudent);
    },
    // the full students snapshot is a superset — fine for the lite screens
    async () => idbGet<Student[]>(SNAP.students),
  );
}

// NPS's DepEd School ID. An enrolment_history entry carrying this schoolId is a
// year the learner spent AT NPS (vs a transferee's prior-school year).
const NPS_SCHOOL_ID = '403875';
const NPS_SCHOOL_NAME = 'Naga Parochial School';

// A learner decorated with the grade/section they held in a particular SY (read
// from that year's enrolment_history entry rather than their current class).
export interface StudentYear extends Student {
  yearGrade?: string; // gradeLevel code for the requested SY
  yearSection?: string; // section name for the requested SY
}

function decorateYear(s: Student, sy: string): StudentYear {
  const hist = s.enrolmentHistory ?? [];
  const e = hist.find((x) => x.sy === sy && x.schoolId === NPS_SCHOOL_ID) ?? hist.find((x) => x.sy === sy);
  return { ...s, yearGrade: e?.gradeLevel, yearSection: e?.sectionName };
}

// True NPS roster for a school year, derived from enrolment_history — so it
// includes EVERY learner enrolled at NPS that year, not just the ones whose
// LAST recorded year it happened to be (which is all `current_sy` filtering can
// see). Each row carries the grade/section the learner was in that year.
export async function listStudentsBySy(sy: string): Promise<StudentYear[]> {
  return offlineRead(
    async () => {
      const c = client();
      const out: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await c
          .from('reg_students')
          .select(`${STUDENT_LITE_COLS},enrolment_history`)
          .contains('enrolment_history', [{ sy, schoolId: NPS_SCHOOL_ID }])
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })
          .order('lrn', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as unknown as Row[];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      return out.map((r) => decorateYear(rowToStudent(r), sy));
    },
    async () => {
      const arr = await idbGet<Student[]>(SNAP.students);
      return arr
        ?.filter((s) => (s.enrolmentHistory ?? []).some((e) => e.sy === sy && e.schoolId === NPS_SCHOOL_ID))
        .map((s) => decorateYear(s, sy));
    },
  );
}

// Full rows for one class's roster (small N → decryption is negligible). Used by
// ClassDetail so it no longer pulls every student just to keep ~40.
export async function listStudentsByClass(classId: string): Promise<Student[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_students')
        .select('*')
        .eq('current_class_id', classId)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Row[]).map(rowToStudent);
    },
    async () => (await idbGet<Student[]>(SNAP.students))?.filter((s) => s.currentClassId === classId),
  );
}

// Bulk restore from a decrypted archive. Calls the SECURITY-checked server RPC
// (reg_import_students), which upserts by LRN and re-encrypts PII via the view's
// triggers. Accepts the same Student shape produced by listStudents(). Returns
// the number of records written.
export async function importStudents(students: Student[]): Promise<number> {
  const { data, error } = await client().rpc('reg_import_students', { p_students: students });
  if (error) throw error;
  return (data as number) ?? 0;
}

// Insert (no originalLrn) or update (by originalLrn). Update keeps the row's
// other JSONB columns intact only because the form carries them through.
export async function saveStudent(input: StudentInput, originalLrn?: string): Promise<void> {
  const row = studentToRow(input);
  // LRN is the primary key, so a learner with no LRN yet (Nursery/Kinder before
  // LIS enrolment) can't be stored as '' — a second one would collide (409).
  // Give them a unique placeholder key instead; keep a stable one across edits.
  const clean = (input.lrn ?? '').trim();
  row.lrn = clean
    ? clean
    : originalLrn && isPlaceholderLrn(originalLrn)
      ? originalLrn
      : `NOLRN-${crypto.randomUUID()}`;
  const c = client();
  const { error } = originalLrn
    ? await c.from('reg_students').update(row).eq('lrn', originalLrn)
    : await c.from('reg_students').insert(row);
  if (error) throw error;
}

export async function deleteStudent(lrn: string): Promise<void> {
  const { error } = await client().from('reg_students').delete().eq('lrn', lrn);
  if (error) throw error;
}

// Targeted update of just the enrolment status ('Active' | 'Transferred' |
// 'Dropped' | 'Graduated'). Purely a status change — no records are removed, the
// learner stays on the master list and in their class list.
export async function setStudentStatus(lrn: string, status: Student['status']): Promise<void> {
  const { error } = await client().from('reg_students').update({ status }).eq('lrn', lrn);
  if (error) throw error;
}

// Does ONE subject entry carry an actually-encoded score/grade? A QuarterGrade
// row is auto-created for every enrolled subject, so its mere existence means
// nothing — only real values count (transmuted grades, raw item scores, or an
// attitude rating).
function entryHasGradeValue(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const entry = e as Record<string, unknown>;
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  for (const k of ['q1', 'q2', 'q3', 'q4', 'final']) {
    if (isNum(entry[k])) return true;
  }
  // raw item scores, e.g. items.q1[] = [{ earned, total }]
  const items = entry.items;
  if (items && typeof items === 'object') {
    for (const arr of Object.values(items as Record<string, unknown>)) {
      if (Array.isArray(arr) && arr.some((it) => isNum((it as Record<string, unknown>)?.earned))) return true;
    }
  }
  const attitude = entry.attitude;
  if (attitude && typeof attitude === 'object') {
    if (Object.values(attitude as Record<string, unknown>).some(isNum)) return true;
  }
  return false;
}

// Facts needed before a permanent delete:
//  • hasGrades — an encoded score/grade in ANY school year (never scoped to the
//    active SY). `grades` is Record<SY, QuarterGrade[]>, so every year is scanned.
//  • enrolmentCount — how many enrolment entries go away with the learner.
// Enrolment history alone never blocks a delete (enrolled but never studied).
export async function getStudentDeleteInfo(
  lrn: string,
): Promise<{ hasGrades: boolean; enrolmentCount: number }> {
  const { data, error } = await client()
    .from('reg_students')
    .select('grades,enrolment_history')
    .eq('lrn', lrn)
    .maybeSingle();
  if (error) throw error;
  const grades = (data?.grades ?? {}) as Record<string, unknown>;
  const hasGrades = Object.values(grades).some(
    (perSy) => Array.isArray(perSy) && perSy.some(entryHasGradeValue),
  );
  const history = data?.enrolment_history;
  return { hasGrades, enrolmentCount: Array.isArray(history) ? history.length : 0 };
}

// Targeted update of just the grades JSONB (used by the grade encoder) so other
// columns can never be clobbered.
export async function saveStudentGrades(lrn: string, grades: Student['grades']): Promise<void> {
  const { error } = await client().from('reg_students').update({ grades }).eq('lrn', lrn);
  if (error) throw error;
}

// Targeted update of just the enrolment_history JSONB. Used when encoding a
// learner's prior-school years from a RECEIVED SF 10 (transferee). Re-sorts by
// SY and recomputes loyalty_years (count of years spent AT NPS).
export async function saveEnrolmentHistory(
  lrn: string,
  history: Student['enrolmentHistory'],
): Promise<void> {
  const sorted = [...history].sort((a, b) => String(a.sy).localeCompare(String(b.sy)));
  const loyaltyYears = sorted.filter((e) => e.schoolId === NPS_SCHOOL_ID).length;
  const { error } = await client()
    .from('reg_students')
    .update({ enrolment_history: sorted, loyalty_years: loyaltyYears })
    .eq('lrn', lrn);
  if (error) throw error;
}

// ── enrolment / re-enrolment ──
export interface EnrollInput {
  sy: string;
  classId: string;
  gradeLevel: string;
  sectionName: string;
  adviserName: string;
  action?: 'promoted' | 'retained' | 'irregular';
}

// Enroll (or re-enroll) a learner for a school year. Appends — or replaces, if
// re-enrolling the same year — that year's NPS enrolment_history entry and makes
// it the learner's CURRENT enrolment (status Active). Runs as the signed-in
// registrar, so the encrypted view's triggers keep the PII columns intact.
export async function enrollStudentForSy(lrn: string, input: EnrollInput): Promise<void> {
  const s = await getStudent(lrn);
  if (!s) throw new Error('Student not found.');
  const history = (s.enrolmentHistory ?? []).filter((e) => e.sy !== input.sy);
  history.push({
    sy: input.sy as Student['currentSY'],
    gradeLevel: input.gradeLevel as GradeLevel,
    sectionName: input.sectionName,
    adviserName: input.adviserName,
    schoolId: NPS_SCHOOL_ID,
    schoolName: NPS_SCHOOL_NAME,
    action: input.action,
  });
  history.sort((a, b) => String(a.sy).localeCompare(String(b.sy)));
  const loyaltyYears = history.filter((e) => e.schoolId === NPS_SCHOOL_ID).length;
  const { error } = await client()
    .from('reg_students')
    .update({
      enrolment_history: history,
      current_sy: input.sy,
      current_class_id: input.classId,
      status: 'Active',
      loyalty_years: loyaltyYears,
    })
    .eq('lrn', lrn);
  if (error) throw error;
}

// Enroll several learners into the same section/SY (used by the class roster's
// "Add learners" panel). Sequential — sections are small and each call reads +
// updates one student.
export async function bulkEnrollForSy(lrns: string[], input: EnrollInput): Promise<void> {
  for (const lrn of lrns) {
    // eslint-disable-next-line no-await-in-loop
    await enrollStudentForSy(lrn, input);
  }
}

// Unenroll a learner from a class roster: clears their current class assignment so
// they drop off that section's list. Keeps the learner record and their enrolment
// history intact (they can be re-enrolled later or assigned to another section).
// Only clears if they are actually in the given class, to avoid races.
export async function unenrollFromClass(lrn: string, classId: string): Promise<void> {
  const { error } = await client()
    .from('reg_students')
    .update({ current_class_id: null })
    .eq('lrn', lrn)
    .eq('current_class_id', classId);
  if (error) throw error;
}

// ── ID photos (private `student-photos` bucket) ──
const PHOTO_BUCKET = 'student-photos';

// Upload/replace a learner's ID photo; stores the object path on the row.
export async function uploadStudentPhoto(lrn: string, file: File): Promise<string> {
  const c = client();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${lrn}/${lrn}-${Date.now()}.${ext}`;
  const { error: upErr } = await c.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;
  const { error } = await c.from('reg_students').update({ photo_url: path }).eq('lrn', lrn);
  if (error) throw error;
  return path;
}

// Short-lived signed URL for displaying a private photo (default 1 hour).
export async function getPhotoSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await client().storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function removeStudentPhoto(lrn: string, path: string): Promise<void> {
  const c = client();
  await c.storage.from(PHOTO_BUCKET).remove([path]);
  const { error } = await c.from('reg_students').update({ photo_url: null }).eq('lrn', lrn);
  if (error) throw error;
}

// ── Form 137 release log ──
export interface Form137Release {
  id: number;
  level: number | null;
  releasedText: string; // raw recorded date string
  releasedDate: string | null; // best-effort ISO (nullable)
  requestingSchool: string;
  purpose: string;
}

export async function listForm137Log(lrn: string): Promise<Form137Release[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_form137_log')
        .select('*')
        .eq('lrn', lrn)
        .order('released_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: Number(r.id),
        level: r.level == null ? null : Number(r.level),
        releasedText: str(r.released_text),
        releasedDate: r.released_date ? str(r.released_date) : null,
        requestingSchool: str(r.requesting_school),
        purpose: str(r.purpose),
      }));
    },
    async () => {
      const all = (await idbGet<(Form137Release & { lrn: string })[]>(SNAP.form137log)) ?? [];
      return all
        .filter((x) => x.lrn === lrn)
        .map((x) => ({
          id: x.id,
          level: x.level,
          releasedText: x.releasedText,
          releasedDate: x.releasedDate,
          requestingSchool: x.requestingSchool,
          purpose: x.purpose,
        }));
    },
  );
}

// ── transfers (learner in/out of a section during an SY) ──
export interface Transfer {
  id: number;
  classId: string | null;
  lrn: string | null;
  learnerName: string;
  sy: string;
  direction: 'in' | 'out';
  transferDate: string | null;
  otherSchool: string;
  remarks: string;
}

export interface TransferInput {
  classId: string;
  lrn?: string | null;
  learnerName: string;
  sy: string;
  direction: 'in' | 'out';
  transferDate?: string | null;
  otherSchool?: string;
  remarks?: string;
}

export async function listTransfersForClass(classId: string): Promise<Transfer[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_transfers')
        .select('*')
        .eq('class_id', classId)
        .order('transfer_date', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: Number(r.id),
        classId: r.class_id ? str(r.class_id) : null,
        lrn: r.lrn ? str(r.lrn) : null,
        learnerName: str(r.learner_name),
        sy: str(r.sy),
        direction: (str(r.direction) || 'in') as 'in' | 'out',
        transferDate: r.transfer_date ? str(r.transfer_date) : null,
        otherSchool: str(r.other_school),
        remarks: str(r.remarks),
      }));
    },
    async () => (await idbGet<Transfer[]>(SNAP.transfers))?.filter((t) => t.classId === classId) ?? [],
  );
}

export async function addTransfer(input: TransferInput): Promise<void> {
  const { error } = await client().from('reg_transfers').insert({
    class_id: input.classId,
    lrn: input.lrn || null,
    learner_name: input.learnerName,
    sy: input.sy,
    direction: input.direction,
    transfer_date: input.transferDate || null,
    other_school: input.otherSchool || null,
    remarks: input.remarks || null,
  });
  if (error) throw error;
}

export async function deleteTransfer(id: number): Promise<void> {
  const { error } = await client().from('reg_transfers').delete().eq('id', id);
  if (error) throw error;
}

// ── ESC grants (Education Service Contracting) ──
export interface EscRecord {
  grantee: boolean;
  escNo: string;
}

export async function listEscForClass(lrns: string[], sy: string): Promise<Record<string, EscRecord>> {
  if (lrns.length === 0) return {};
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_esc_grants')
        .select('lrn, grantee, esc_no')
        .eq('sy', sy)
        .in('lrn', lrns);
      if (error) throw error;
      const out: Record<string, EscRecord> = {};
      for (const r of data ?? []) out[str(r.lrn)] = { grantee: Boolean(r.grantee), escNo: str(r.esc_no) };
      return out;
    },
    async () => {
      const all = (await idbGet<{ lrn: string; sy: string; grantee: boolean; escNo: string }[]>(SNAP.esc)) ?? [];
      const out: Record<string, EscRecord> = {};
      for (const r of all) {
        if (r.sy === sy && lrns.includes(r.lrn)) out[r.lrn] = { grantee: r.grantee, escNo: r.escNo };
      }
      return out;
    },
  );
}

export async function saveEsc(
  records: { lrn: string; sy: string; grantee: boolean; escNo: string }[],
): Promise<void> {
  if (records.length === 0) return;
  const rows = records.map((r) => ({
    lrn: r.lrn,
    sy: r.sy,
    grantee: r.grantee,
    esc_no: r.escNo || null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await client().from('reg_esc_grants').upsert(rows, { onConflict: 'lrn,sy' });
  if (error) throw error;
}

// ── teachers ──
function teacherToRow(t: TeacherInput): Row {
  return {
    title: t.title ?? '',
    family_name: t.familyName,
    first_name: t.firstName,
    middle_initial: t.middleInitial ?? '',
    email: t.email ?? '',
    year_started: t.yearStarted ?? 0,
    year_ended: t.yearEnded ?? 0,
    is_adviser: t.isAdviser ?? false,
    curriculum: t.curriculum ?? '',
  };
}

export async function listTeachers(): Promise<Teacher[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_teachers')
        .select('*')
        .order('family_name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToTeacher);
    },
    async () => idbGet<Teacher[]>(SNAP.teachers),
  );
}

export async function getTeacher(id: number): Promise<Teacher | null> {
  return offlineRead(
    async () => {
      const { data, error } = await client().from('reg_teachers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? rowToTeacher(data) : null;
    },
    async () => {
      const arr = await idbGet<Teacher[]>(SNAP.teachers);
      if (!arr) return undefined;
      return arr.find((t) => t.id === id) ?? null;
    },
  );
}

export async function saveTeacher(input: TeacherInput, id?: number): Promise<void> {
  const row = teacherToRow(input);
  const c = client();
  const { error } = id
    ? await c.from('reg_teachers').update(row).eq('id', id)
    : await c.from('reg_teachers').insert(row);
  if (error) throw error;
}

export async function deleteTeacher(id: number): Promise<void> {
  const { error } = await client().from('reg_teachers').delete().eq('id', id);
  if (error) throw error;
}

// ── classes (with adviser joined in JS) ──
function classToRow(c: ClassInput): Row {
  return {
    sy: c.sy || null,
    grade_level: c.gradeLevel,
    section_name: c.sectionName,
    adviser_id: c.adviserId,
    curriculum: c.curriculum ?? '',
  };
}

export async function listClasses(): Promise<ClassRecord[]> {
  return offlineRead(
    async () => {
      const c = client();
      const [clsRes, tchRes] = await Promise.all([
        c.from('reg_classes').select('*').order('grade_level', { ascending: true }),
        c.from('reg_teachers').select('*'),
      ]);
      if (clsRes.error) throw clsRes.error;
      if (tchRes.error) throw tchRes.error;
      const byId = new Map<number, Teacher>((tchRes.data ?? []).map((t) => [Number(t.id), rowToTeacher(t)]));
      return (clsRes.data ?? []).map((r) => rowToClass(r, byId.get(Number(r.adviser_id))));
    },
    async () => idbGet<ClassRecord[]>(SNAP.classes),
  );
}

export async function getClass(id: string): Promise<ClassRecord | null> {
  return offlineRead(
    async () => {
      const c = client();
      const { data, error } = await c.from('reg_classes').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let adviser: Teacher | undefined;
      if (data.adviser_id != null) {
        const { data: t } = await c.from('reg_teachers').select('*').eq('id', data.adviser_id).maybeSingle();
        if (t) adviser = rowToTeacher(t);
      }
      return rowToClass(data, adviser);
    },
    async () => {
      const arr = await idbGet<ClassRecord[]>(SNAP.classes);
      if (!arr) return undefined;
      return arr.find((k) => k.id === id) ?? null;
    },
  );
}

export async function saveClass(input: ClassInput, id?: string): Promise<void> {
  const row = classToRow(input);
  const c = client();
  const { error } = id
    ? await c.from('reg_classes').update(row).eq('id', id)
    : await c.from('reg_classes').insert(row);
  if (error) throw error;
}

// Assign (or change) a section's adviser directly — used from the Teacher page so an
// advisory can be set from the teacher's side, not only by editing the section.
export async function setClassAdviser(classId: string, teacherId: number): Promise<void> {
  const { error } = await client()
    .from('reg_classes')
    .update({ adviser_id: teacherId })
    .eq('id', classId);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await client().from('reg_classes').delete().eq('id', id);
  if (error) throw error;
}

// ── school years ──
function rowToSchoolYear(r: Row): SchoolYear {
  const days =
    r.school_days && typeof r.school_days === 'object'
      ? (r.school_days as Record<string, number>)
      : undefined;
  return {
    code: str(r.code) as unknown as SchoolYear['code'],
    label: str(r.label),
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    isActive: Boolean(r.is_active),
    schoolDays: days,
  };
}

// Save the editable School Year config (date range + school days per month).
export async function updateSchoolYear(
  code: string,
  patch: { startDate?: string; endDate?: string; schoolDays?: Record<string, number> },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.startDate !== undefined) row.start_date = patch.startDate || null;
  if (patch.endDate !== undefined) row.end_date = patch.endDate || null;
  if (patch.schoolDays !== undefined) row.school_days = patch.schoolDays;
  if (Object.keys(row).length === 0) return;
  const { error } = await client().from('reg_school_years').update(row).eq('code', code);
  if (error) throw error;
}

export async function listSchoolYears(): Promise<SchoolYear[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_school_years')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToSchoolYear);
    },
    async () => idbGet<SchoolYear[]>(SNAP.schoolYears),
  );
}

export async function getActiveSchoolYear(): Promise<SchoolYear | null> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_school_years')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: false })
        .limit(1);
      if (error) throw error;
      const r = data?.[0];
      return r ? rowToSchoolYear(r) : null;
    },
    async () => {
      const arr = await idbGet<SchoolYear[]>(SNAP.schoolYears);
      if (!arr) return undefined;
      return arr.find((y) => y.isActive) ?? null;
    },
  );
}

// ── subjects ──
export async function listSubjects(): Promise<Subject[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_subjects')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('code', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r, i) => ({
        code: str(r.code),
        fullName: str(r.full_name),
        abbreviation: str(r.abbreviation),
        category: (str(r.category) || undefined) as SubjectCategory | undefined,
        level: (str(r.level) || undefined) as Subject['level'],
        order: r.sort_order == null ? 9000 + i : Number(r.sort_order),
        termLabels:
          r.term_labels && typeof r.term_labels === 'object' && !Array.isArray(r.term_labels)
            ? (r.term_labels as Record<string, string>)
            : undefined,
      }));
    },
    async () => idbGet<Subject[]>(SNAP.subjects),
  );
}

// Persist a new subject display order (positions 1..N by array index). Runs as
// the signed-in registrar; reg_subjects RLS gates the writes.
export async function saveSubjectOrder(orderedCodes: string[]): Promise<void> {
  const c = client();
  const results = await Promise.all(
    orderedCodes.map((code, i) => c.from('reg_subjects').update({ sort_order: i + 1 }).eq('code', code)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// Persist display order AND education-level grouping in one save (positions 1..N
// by array index). Needs reg_subjects.level (setup-subject-level.sql).
export async function saveSubjects(
  ordered: { code: string; level?: string | null }[],
): Promise<void> {
  const c = client();
  const results = await Promise.all(
    ordered.map((s, i) =>
      c.from('reg_subjects').update({ sort_order: i + 1, level: s.level ?? null }).eq('code', s.code),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// Add a new subject. Appends to the end of the display order. Runs as the
// signed-in registrar; reg_subjects RLS gates the write.
export interface SubjectInput {
  code: string;
  fullName: string;
  abbreviation: string;
  category?: SubjectCategory; // SHS-only; omit for Elementary / JHS
  level?: string | null; // 'preschool' | 'elem' | 'jhs' | 'shs'
  // Combination subject: per-term content labels keyed by period
  // ({ q1: 'EPP', q2: 'EPP', q3: 'ICT' }). Null/omitted = ordinary subject.
  termLabels?: Record<string, string> | null;
}

export async function addSubject(input: SubjectInput): Promise<void> {
  const c = client();
  // place the new subject after the current last one
  const { data } = await c
    .from('reg_subjects')
    .select('sort_order')
    .order('sort_order', { ascending: false, nullsFirst: false })
    .limit(1);
  const nextOrder = Number(data?.[0]?.sort_order ?? 0) + 1;
  const { error } = await c.from('reg_subjects').insert({
    code: input.code,
    full_name: input.fullName,
    abbreviation: input.abbreviation,
    category: input.category ?? null,
    level: input.level ?? null,
    sort_order: nextOrder,
    term_labels: input.termLabels ?? null,
  });
  if (error) throw error;
}

// ── per-grade / per-strand ordered subject list (reg_grade_subjects) ──
// Drives the report card + grade-encoding subject order. Curated in Setup ▸
// Subjects by picking a grade/strand and dragging to reorder / add / remove.
export async function listGradeSubjects(gradeLevel: string): Promise<string[]> {
  const { data, error } = await client()
    .from('reg_grade_subjects')
    .select('subject_code, sort_order')
    .eq('grade_level', gradeLevel)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => str(r.subject_code));
}

// Replace a grade/strand's whole ordered subject list (reorder + add + remove).
export async function saveGradeSubjects(gradeLevel: string, orderedCodes: string[]): Promise<void> {
  const c = client();
  const del = await c.from('reg_grade_subjects').delete().eq('grade_level', gradeLevel);
  if (del.error) throw del.error;
  if (!orderedCodes.length) return;
  const { error } = await c.from('reg_grade_subjects').insert(
    orderedCodes.map((code, i) => ({ grade_level: gradeLevel, subject_code: code, sort_order: i + 1 })),
  );
  if (error) throw error;
}

// ── teaching load (which teacher teaches which subject in a section) ──
// One row per (class, subject). teacherId may be null while a subject is
// offered in the section but not yet assigned to a teacher. Backs the acad
// "subject load" assignment and scopes the teacher grade sheet later.
export interface ClassSubjectAssignment {
  subjectCode: string;
  teacherId: number | null;
}

export async function listClassSubjects(classId: string): Promise<ClassSubjectAssignment[]> {
  const { data, error } = await client()
    .from('reg_class_subjects')
    .select('*')
    .eq('class_id', classId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    subjectCode: str(r.subject_code),
    teacherId: r.teacher_id == null ? null : Number(r.teacher_id),
  }));
}

// EVERY (class, subject, teacher) row in the system — for the registrar's
// oversight of what the Academic Coordinators assigned. teacherId null = the
// subject is offered in that section but no teacher is assigned yet.
export interface TeachingAssignmentRow {
  classId: string;
  subjectCode: string;
  teacherId: number | null;
  assignedBy: string; // email of whoever assigned it — coordinator or registrar ('' if unknown)
}
// Every (grade_level, subject) the registrar set as a grade's curriculum
// (Setup ▸ Subjects). Returned as a set of `${gradeLevel}|${SUBJECT}` for quick
// "does this subject belong to this grade?" checks.
export async function listGradeSubjectKeys(): Promise<Set<string>> {
  const set = new Set<string>();
  const { data, error } = await client().from('reg_grade_subjects').select('grade_level, subject_code');
  if (error) throw error;
  for (const r of data ?? []) set.add(`${str(r.grade_level)}|${str(r.subject_code).toUpperCase()}`);
  return set;
}

export async function listAllClassSubjects(): Promise<TeachingAssignmentRow[]> {
  const { data, error } = await client()
    .from('reg_class_subjects')
    .select('class_id, subject_code, teacher_id, assigned_by');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    classId: str(r.class_id),
    subjectCode: str(r.subject_code),
    teacherId: r.teacher_id == null ? null : Number(r.teacher_id),
    assignedBy: r.assigned_by ? str(r.assigned_by) : '',
  }));
}

// Replace the section's whole teaching load with the given rows (subjects with
// no teacher are stored with teacher_id null; subjects not passed are dropped).
// The rewrite preserves what the delete would otherwise erase: each kept
// subject's type (Setup ▸ Weight Components) and — when the teacher is
// unchanged — who assigned them. A new or changed teacher is stamped with the
// signed-in registrar's email, matching what acad_assign_subject does for the
// Academic Coordinators.
export async function saveClassSubjects(
  classId: string,
  rows: ClassSubjectAssignment[],
): Promise<void> {
  const c = client();
  const { data: prevRows, error: prevErr } = await c
    .from('reg_class_subjects')
    .select('subject_code, teacher_id, subject_type, assigned_by, term, term_teachers')
    .eq('class_id', classId);
  if (prevErr) throw prevErr;
  const prev = new Map(
    (prevRows ?? []).map((r: Row) => [
      str(r.subject_code),
      {
        teacherId: r.teacher_id == null ? null : Number(r.teacher_id),
        subjectType: r.subject_type ? str(r.subject_type) : null,
        assignedBy: r.assigned_by ? str(r.assigned_by) : null,
        term: r.term ? str(r.term) : null,
        termTeachers: (r.term_teachers ?? null) as Record<string, number> | null,
      },
    ]),
  );
  const me = (await c.auth.getSession()).data.session?.user?.email ?? null;
  // UPSERT + delete-stale instead of delete-then-insert: a failed write can no
  // longer leave the class with ZERO rows (destroying subject types, term
  // coverage, and the coordinators' per-term teacher maps).
  if (rows.length) {
    const { error } = await c.from('reg_class_subjects').upsert(
      rows.map((r) => {
        const p = prev.get(r.subjectCode);
        // Term coverage + per-term teacher maps survive a re-save as long as
        // the teacher is unchanged. A teacher-less row with a map (later terms
        // assigned, first term still open) treats a picked teacher as the
        // FILL for its earliest open term. Picking a genuinely DIFFERENT
        // teacher resets to single-teacher — the registrar's explicit choice.
        const sameTeacher = p && p.teacherId === r.teacherId;
        const fill = !!p && p.teacherId == null && p.termTeachers != null && r.teacherId != null;
        let term = sameTeacher ? p.term : null;
        let termTeachers = sameTeacher ? p.termTeachers : null;
        if (fill) {
          const map = { ...(p.termTeachers as Record<string, number>) };
          const openKey = ['q1', 'q2', 'q3', 'q4'].find((k) => map[k] == null);
          if (openKey) map[openKey] = r.teacherId as number;
          termTeachers = map;
          term = Object.keys(map).sort().join(',');
        }
        return {
          class_id: classId,
          subject_code: r.subjectCode,
          teacher_id: r.teacherId,
          subject_type: p?.subjectType ?? null,
          assigned_by:
            r.teacherId == null ? null
            : sameTeacher ? p.assignedBy
            : me,
          term,
          term_teachers: termTeachers,
        };
      }),
      { onConflict: 'class_id,subject_code' },
    );
    if (error) throw error;
  }
  const keep = rows.map((r) => r.subjectCode);
  const del = keep.length
    ? await c
        .from('reg_class_subjects')
        .delete()
        .eq('class_id', classId)
        .not('subject_code', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`)
    : await c.from('reg_class_subjects').delete().eq('class_id', classId);
  if (del.error) throw del.error;
}

// Every (class, subject) this teacher teaches — across ALL sections. Backs the
// teacher-centric "Subjects Taught" assignment on the teacher page.
export async function listTeacherLoad(
  teacherId: number,
): Promise<{ classId: string; subjectCode: string }[]> {
  const { data, error } = await client()
    .from('reg_class_subjects')
    .select('class_id, subject_code')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ classId: str(r.class_id), subjectCode: str(r.subject_code) }));
}

// Assign (or clear) ONE subject in ONE section to a teacher without touching the
// section's other subjects. Upserts the single (class, subject) row — teacherId
// null keeps the subject offered but unassigned. PK (class_id, subject_code)
// backs the on-conflict merge. Stamps the signed-in registrar as the assigner
// (cleared with the teacher), same as acad_assign_subject for the coordinators.
export async function assignTeacherSubject(
  classId: string,
  subjectCode: string,
  teacherId: number | null,
): Promise<void> {
  const c = client();
  const me = (await c.auth.getSession()).data.session?.user?.email ?? null;
  const { error } = await c
    .from('reg_class_subjects')
    .upsert(
      {
        class_id: classId,
        subject_code: subjectCode,
        teacher_id: teacherId,
        assigned_by: teacherId == null ? null : me,
      },
      { onConflict: 'class_id,subject_code' },
    );
  if (error) throw error;
}

// ── account roles (portal user_roles; registrar/admin may manage) ──
export interface UserRoleRow {
  email: string;
  role: string;
}

export async function listUserRoles(): Promise<UserRoleRow[]> {
  const { data, error } = await client()
    .from('user_roles')
    .select('user_email, role')
    .order('user_email', { ascending: true })
    .order('role', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ email: str(r.user_email), role: str(r.role) }));
}

// Grant a role to an account. An account may hold SEVERAL roles — this ADDS the
// role rather than overwriting existing ones. A duplicate (same email+role) is a
// no-op, not an error (the DB has UNIQUE (user_email, role)).
export async function addUserRole(email: string, role: string): Promise<void> {
  const em = email.trim().toLowerCase();
  const { data: existing, error: selErr } = await client()
    .from('user_roles')
    .select('role')
    .eq('user_email', em)
    .eq('role', role)
    .limit(1);
  if (selErr) throw new Error(selErr.message || 'Could not check existing roles.');
  if (existing && existing.length > 0) return; // already has it
  const { error: insErr } = await client().from('user_roles').insert({ user_email: em, role });
  if (insErr) throw new Error(insErr.message || 'Could not grant the role.');
}

// Remove ONE specific role from an account (leaves the account's other roles).
export async function deleteUserRole(email: string, role: string): Promise<void> {
  const { error } = await client()
    .from('user_roles')
    .delete()
    .eq('user_email', email)
    .eq('role', role);
  if (error) throw error;
}

// ── term encoding status (open/close grade encoding per SY term) ──
// Returns { [periodKey]: isOpen }. A missing table or row means OPEN.
export async function listTermStatus(sy: string): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await client()
      .from('reg_term_status')
      .select('term, is_open')
      .eq('sy', sy);
    if (error) throw error;
    const m: Record<string, boolean> = {};
    for (const r of data ?? []) m[str(r.term)] = !!r.is_open;
    return m;
  } catch {
    return {};
  }
}

export async function setTermStatus(sy: string, term: string, isOpen: boolean): Promise<void> {
  const { error } = await client()
    .from('reg_term_status')
    .upsert({ sy, term, is_open: isOpen }, { onConflict: 'sy,term' });
  if (error) throw error;
}

// Per-term encoding deadlines (term key → ISO date). Missing table/column → {}.
export async function listTermDeadlines(sy: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await client()
      .from('reg_term_status')
      .select('term, deadline')
      .eq('sy', sy);
    if (error) throw error;
    const m: Record<string, string> = {};
    for (const r of data ?? []) if (r.deadline) m[str(r.term)] = str(r.deadline);
    return m;
  } catch {
    return {};
  }
}

// Set (or clear) a term's encoding deadline. Setting a deadline also OPENS the
// term for encoding; clearing it leaves the open/close status untouched.
export async function setTermDeadline(
  sy: string,
  term: string,
  deadline: string | null,
): Promise<void> {
  const row: Record<string, unknown> = { sy, term, deadline: deadline || null };
  if (deadline) row.is_open = true;
  const { error } = await client()
    .from('reg_term_status')
    .upsert(row, { onConflict: 'sy,term' });
  if (error) throw error;
}

// ── grade weight configuration (registrar-managed, DepEd defaults) ──
// Each learning-area group has a WW/PT/ST split. The DepEd values are the
// defaults (see grading.ts); the registrar may override any group here. Stored
// in reg_grade_weights (area_group PK). A group with no row falls back to the
// DepEd default via resolveWeights().
export type WeightConfig = Record<AreaGroup, Weights>;

export async function listWeightConfig(): Promise<WeightConfig> {
  const overrides = await offlineRead<Partial<Record<AreaGroup, Weights>>>(
    async () => {
      const { data, error } = await client().from('reg_grade_weights').select('*');
      if (error) throw error;
      const map: Partial<Record<AreaGroup, Weights>> = {};
      for (const r of data ?? []) {
        const g = str(r.area_group);
        if (isAreaGroup(g)) {
          map[g] = { ww: Number(r.ww), pt: Number(r.pt), st: Number(r.st) };
        }
      }
      return map;
    },
    async () => idbGet<Partial<Record<AreaGroup, Weights>>>(SNAP.weights),
  );
  return resolveWeights(overrides);
}

// Persist the full weight table (one upsert per group). Runs as the signed-in
// registrar; reg_grade_weights RLS gates the writes.
export async function saveWeightConfig(config: WeightConfig): Promise<void> {
  const rows = AREA_GROUPS.map((g) => ({
    area_group: g,
    ww: config[g].ww,
    pt: config[g].pt,
    st: config[g].st,
  }));
  const { error } = await client().from('reg_grade_weights').upsert(rows, { onConflict: 'area_group' });
  if (error) throw error;
}

// ── weight components per learning area (WWs / PTs / EXs-QA) ──
// The official split, keyed by SCHOOL YEAR × SUBJECT TYPE (reg_weight_components).
// This supersedes reg_grade_weights, whose "area group" was guessed from the
// subject's name and so could not express the real rules — General Biology 1 is
// a Grade 11 Academic Elective (20/50/30) AND a Grade 12 Specialized subject
// (25/45/30), and Grade 11 Core (20/50/30) differs from Grade 12 Core (25/50/25).
//
// Each school year holds its OWN copy, so editing next year's split never moves
// a grade already computed in a past year.

export interface WeightComponent {
  sy: string;
  typeKey: string;
  label: string;
  ww: number;
  pt: number;
  ex: number;
  sortOrder: number;
  levelGroup: string | null; // which per-level table this type belongs to
  groupOrder: number; // ordering of the tables
}

export async function listWeightComponents(sy: string): Promise<WeightComponent[]> {
  const { data, error } = await client()
    .from('reg_weight_components')
    .select('*')
    .eq('sy', sy)
    .order('group_order', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    sy: str(r.sy),
    typeKey: str(r.type_key),
    label: str(r.label),
    ww: Number(r.ww),
    pt: Number(r.pt),
    ex: Number(r.ex),
    sortOrder: Number(r.sort_order),
    levelGroup: r.level_group ? str(r.level_group) : null,
    groupOrder: Number(r.group_order ?? 99),
  }));
}

// Official {ww,pt,st} split PER SUBJECT for a grade level + SY, resolved from
// the subject's TYPE (reg_default_subject_type → reg_weight_components) — the
// same rule the teacher portal uses (reg_weights_for). The per-student grade
// encoder has no section, so it resolves by grade level. Returns a map keyed by
// subject code; codes with no configured type are omitted so the caller can
// fall back to its legacy area-group weights. Never throws to the caller path —
// on any error it returns {} so encoding still works.
export interface GradeSubjectWeights { ww: number; pt: number; st: number }
export async function listGradeSubjectWeights(
  sy: string,
  gradeLevel: string,
  codes: string[],
): Promise<Record<string, GradeSubjectWeights>> {
  const out: Record<string, GradeSubjectWeights> = {};
  if (!sy || !gradeLevel || !codes.length) return out;
  try {
    const { data, error } = await client().rpc('reg_weights_for_grade', {
      p_sy: sy,
      p_grade_level: gradeLevel,
      p_subject_codes: codes,
    });
    if (error) throw error;
    for (const r of data ?? []) {
      out[String(r.subject_code).toUpperCase()] = { ww: Number(r.ww), pt: Number(r.pt), st: Number(r.ex) };
    }
  } catch {
    // RPC missing / offline → empty map → caller uses legacy weights.
  }
  return out;
}

// Official split for ONE section × subject, resolved from the subject's TYPE in
// that section (reg_class_subjects.subject_type → reg_weight_components) — the
// exact resolver the teacher portal computes with (reg_weights_for). Null when
// the type is unset or has no weights for the SY: the caller must block the
// computation and say so, never guess a split.
export interface ClassSubjectWeights {
  ww: number; pt: number; st: number;
  exLabel: string; typeKey: string; label: string;
}
export async function weightsForClassSubject(
  classId: string,
  subjectCode: string,
): Promise<ClassSubjectWeights | null> {
  const { data, error } = await client().rpc('reg_weights_for', {
    p_class_id: classId,
    p_subject_code: subjectCode,
  });
  if (error) throw error;
  const r = (data ?? [])[0];
  if (!r) return null;
  return {
    ww: Number(r.ww), pt: Number(r.pt), st: Number(r.ex),
    exLabel: str(r.ex_label) || 'EXs', typeKey: str(r.type_key), label: str(r.label),
  };
}

// The DB CHECK constraint enforces ww+pt+ex=100, but validate here too so the
// user gets a clear message instead of a raw Postgres error.
export async function saveWeightComponents(rows: WeightComponent[]): Promise<void> {
  const bad = rows.find((r) => r.ww + r.pt + r.ex !== 100);
  if (bad) throw new Error(`"${bad.label}" totals ${bad.ww + bad.pt + bad.ex}%. Each type must total exactly 100%.`);
  const { error } = await client().from('reg_weight_components').upsert(
    rows.map((r) => ({
      sy: r.sy, type_key: r.typeKey, label: r.label,
      ww: r.ww, pt: r.pt, ex: r.ex, sort_order: r.sortOrder,
      level_group: r.levelGroup, group_order: r.groupOrder,
    })),
    { onConflict: 'sy,type_key' },
  );
  if (error) throw error;
}

// Copy a year's weights forward so the registrar can edit NEXT year's split
// without touching the year in progress. Returns the number of types copied (0
// when the target year already has its own rows).
export async function copyWeightsToSy(fromSy: string, toSy: string): Promise<number> {
  const { data, error } = await client().rpc('reg_copy_weights_to_sy', { p_from_sy: fromSy, p_to_sy: toSy });
  if (error) throw error;
  return Number(data ?? 0);
}

export interface UntypedClassSubject {
  classId: string;
  sy: string;
  gradeLevel: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
}

// Every section × subject whose grades CANNOT be computed because no subject
// type is set (or its type has no weights for that year). The registrar fixes
// these; nothing is guessed on their behalf.
export async function listUntypedClassSubjects(): Promise<UntypedClassSubject[]> {
  const { data, error } = await client().rpc('reg_untyped_class_subjects');
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    classId: str(r.class_id),
    sy: str(r.sy),
    gradeLevel: str(r.grade_level),
    sectionName: str(r.section_name),
    subjectCode: str(r.subject_code),
    subjectName: str(r.subject_name),
  }));
}

export interface ClassSubjectType {
  classId: string;
  gradeLevel: string;
  sectionName: string;
  subjectCode: string;
  subjectName: string;
  typeKey: string | null;
  configured: boolean;
}

// Every section × subject for a year with its current type, so any can be
// re-assigned — not only the ones that have no type yet.
export async function listAllClassSubjectTypes(sy: string): Promise<ClassSubjectType[]> {
  const { data, error } = await client().rpc('reg_all_class_subject_types', { p_sy: sy });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    classId: str(r.class_id),
    gradeLevel: str(r.grade_level),
    sectionName: str(r.section_name),
    subjectCode: str(r.subject_code),
    subjectName: str(r.subject_name),
    typeKey: r.type_key ? str(r.type_key) : null,
    configured: Boolean(r.configured),
  }));
}

export async function setClassSubjectType(
  classId: string,
  subjectCode: string,
  typeKey: string,
): Promise<void> {
  const { error } = await client()
    .from('reg_class_subjects')
    .update({ subject_type: typeKey })
    .eq('class_id', classId)
    .eq('subject_code', subjectCode);
  if (error) throw error;
}

export interface WeightAuditRow {
  id: number;
  sy: string;
  typeKey: string;
  oldSplit: string | null;
  newSplit: string;
  changedBy: string;
  changedAt: string;
}

export async function listWeightAudit(limit = 50): Promise<WeightAuditRow[]> {
  const { data, error } = await client()
    .from('reg_weight_audit')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    sy: str(r.sy),
    typeKey: str(r.type_key),
    oldSplit: r.old_ww == null ? null : `${r.old_ww}/${r.old_pt}/${r.old_ex}`,
    newSplit: `${r.new_ww}/${r.new_pt}/${r.new_ex}`,
    changedBy: str(r.changed_by) || '—',
    changedAt: str(r.changed_at),
  }));
}

// ── descriptor scales + descriptive/numerical toggle (per SY) ──
// Display layer only. Preschool (C/D/B) and Grades 1-3 (A/B/C/D/E) are separate
// scales because the same letter means different things in each.

export interface DescriptorBand {
  scaleKey: string;
  letter: string;
  label: string;
  min: number;
  sortOrder: number;
}
export interface DescriptiveLevel {
  gradeLevel: string;
  mode: 'descriptive' | 'numerical';
  scaleKey: string | null;
}

export async function listDescriptorScales(sy: string): Promise<DescriptorBand[]> {
  const { data, error } = await client()
    .from('reg_descriptor_scales')
    .select('*')
    .eq('sy', sy)
    .order('scale_key', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    scaleKey: str(r.scale_key), letter: str(r.letter), label: str(r.label),
    min: Number(r.min), sortOrder: Number(r.sort_order),
  }));
}

export async function listDescriptiveLevels(sy: string): Promise<DescriptiveLevel[]> {
  const { data, error } = await client()
    .from('reg_descriptive_levels')
    .select('*')
    .eq('sy', sy)
    .order('grade_level', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    gradeLevel: str(r.grade_level),
    mode: str(r.mode) as DescriptiveLevel['mode'],
    scaleKey: r.scale_key ? str(r.scale_key) : null,
  }));
}

// Validate here so the registrar gets a clear message: no overlap and no gap
// inside a scale's covered range (Part F).
export async function saveDescriptorScales(sy: string, bands: DescriptorBand[]): Promise<void> {
  const byScale = new Map<string, number[]>();
  for (const b of bands) {
    if (!byScale.has(b.scaleKey)) byScale.set(b.scaleKey, []);
    byScale.get(b.scaleKey)!.push(b.min);
  }
  for (const [key, mins] of byScale) {
    if (new Set(mins).size !== mins.length)
      throw new Error(`Scale "${key}" has two bands with the same minimum.`);
  }
  const { error: delErr } = await client().from('reg_descriptor_scales').delete().eq('sy', sy);
  if (delErr) throw delErr;
  const { error } = await client().from('reg_descriptor_scales').insert(
    bands.map((b) => ({
      sy, scale_key: b.scaleKey, letter: b.letter, label: b.label,
      min: b.min, sort_order: b.sortOrder,
    })),
  );
  if (error) throw error;
}

export async function saveDescriptiveLevels(sy: string, levels: DescriptiveLevel[]): Promise<void> {
  const { error } = await client().from('reg_descriptive_levels').upsert(
    levels.map((l) => ({
      sy, grade_level: l.gradeLevel, mode: l.mode,
      scale_key: l.mode === 'descriptive' ? l.scaleKey : null,
    })),
    { onConflict: 'sy,grade_level' },
  );
  if (error) throw error;
}

// A ready-to-use view of a school year's descriptor configuration. Built once
// from the DB and consulted by the encoder and the report card, so both agree
// on which levels are descriptive and which letters they use — instead of the
// old hardcoded phase-in rule. Falls back to the code defaults for any level
// the DB has no row for, so an unseeded year still renders.
export interface DescriptorConfig {
  isDescriptive: (gradeLevel?: string, sy?: string) => boolean;
  scaleFor: (gradeLevel?: string) => LetterDescriptor[];
}

export async function getDescriptorConfig(sy: string): Promise<DescriptorConfig> {
  let bands: DescriptorBand[] = [];
  let levels: DescriptiveLevel[] = [];
  try {
    [bands, levels] = await Promise.all([listDescriptorScales(sy), listDescriptiveLevels(sy)]);
  } catch {
    // Table missing or unreachable → pure code fallback below.
  }
  const levelByGrade = new Map(levels.map((l) => [l.gradeLevel, l]));
  const bandsByScale = new Map<string, LetterDescriptor[]>();
  for (const b of bands) {
    if (!bandsByScale.has(b.scaleKey)) bandsByScale.set(b.scaleKey, []);
    bandsByScale.get(b.scaleKey)!.push({ letter: b.letter, label: b.label, filipino: '' });
  }

  return {
    isDescriptive: (gradeLevel, sYear) => {
      const row = gradeLevel ? levelByGrade.get(gradeLevel) : undefined;
      if (row) return row.mode === 'descriptive';
      return isDescriptiveLevel(gradeLevel, sYear ?? sy); // unseeded level → code rule
    },
    scaleFor: (gradeLevel) => {
      const row = gradeLevel ? levelByGrade.get(gradeLevel) : undefined;
      const fromDb = row?.scaleKey ? bandsByScale.get(row.scaleKey) : undefined;
      return fromDb && fromDb.length ? fromDb : descriptiveScaleFor(gradeLevel);
    },
  };
}

// ── honor criteria (Academic Excellence Award thresholds, per SY) ──
export interface HonorCriteriaRow { gaMin: number; floor: number; }

export async function getHonorCriteria(sy: string): Promise<HonorCriteriaRow> {
  const { data, error } = await client()
    .from('reg_honor_criteria')
    .select('ga_min,grade_floor')
    .eq('sy', sy)
    .maybeSingle();
  if (error) throw error;
  return data ? { gaMin: Number(data.ga_min), floor: Number(data.grade_floor) } : { gaMin: 90, floor: 80 };
}

export async function saveHonorCriteria(sy: string, gaMin: number, floor: number): Promise<void> {
  if (gaMin < 0 || gaMin > 100 || floor < 0 || floor > 100)
    throw new Error('Both values must be between 0 and 100.');
  const { error } = await client()
    .from('reg_honor_criteria')
    .upsert({ sy, ga_min: gaMin, grade_floor: floor }, { onConflict: 'sy' });
  if (error) throw error;
}

// ── NAT scores (National Achievement Test, registrar-entered, per SY) ──
export const NAT_SUBJECTS = [
  { key: 'english', label: 'English' },
  { key: 'filipino', label: 'Filipino' },
  { key: 'math', label: 'Math' },
  { key: 'science', label: 'Science' },
  { key: 'ap', label: 'Araling Panlipunan' },
] as const;
export type NatSubjectKey = (typeof NAT_SUBJECTS)[number]['key'];
export type NatRow = Partial<Record<NatSubjectKey, number>>;

// NAT rows for a SY, keyed by LRN. Empty subjects are omitted.
export async function listNatScores(sy: string): Promise<Record<string, NatRow>> {
  const out: Record<string, NatRow> = {};
  if (!sy) return out;
  try {
    const { data, error } = await client()
      .from('reg_nat_scores')
      .select('lrn, english, filipino, math, science, ap')
      .eq('sy', sy);
    if (error) throw error;
    for (const r of data ?? []) {
      const row: NatRow = {};
      for (const s of NAT_SUBJECTS) {
        const v = r[s.key];
        if (v != null) row[s.key] = Number(v);
      }
      out[str(r.lrn)] = row;
    }
  } catch {
    /* table missing / offline → empty */
  }
  return out;
}

// Upsert one learner's whole NAT row (blank subjects saved as null).
export async function saveNatRow(sy: string, lrn: string, row: NatRow): Promise<void> {
  const payload: Record<string, unknown> = { sy, lrn, updated_at: new Date().toISOString() };
  for (const s of NAT_SUBJECTS) {
    const v = row[s.key];
    payload[s.key] = v == null || Number.isNaN(v) ? null : v;
  }
  const { error } = await client().from('reg_nat_scores').upsert(payload, { onConflict: 'sy,lrn' });
  if (error) throw error;
}

// ── honor exclusions (manual derogatory-record screening, per SY) ──
// A row = the learner is excluded from that year's Academic Excellence Award
// even if their grades qualify. Returned as lrn → reason.
export async function listHonorExclusions(sy: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!sy) return out;
  try {
    const { data, error } = await client()
      .from('reg_honor_exclusions')
      .select('lrn, reason')
      .eq('sy', sy);
    if (error) throw error;
    for (const r of data ?? []) out[str(r.lrn)] = str(r.reason);
  } catch {
    /* table missing / offline → no exclusions */
  }
  return out;
}

// Exclude a learner (excluded=true) or restore them (excluded=false).
export async function setHonorExclusion(
  sy: string, lrn: string, excluded: boolean, reason = '',
): Promise<void> {
  const c = client();
  if (excluded) {
    const { error } = await c
      .from('reg_honor_exclusions')
      .upsert({ sy, lrn, reason, updated_at: new Date().toISOString() }, { onConflict: 'sy,lrn' });
    if (error) throw error;
  } else {
    const { error } = await c.from('reg_honor_exclusions').delete().eq('sy', sy).eq('lrn', lrn);
    if (error) throw error;
  }
}

// ── school officials / signatories (printed on Form 137/138/SF10) ──
export interface Official { positionKey: string; personName: string; title: string; }

export async function listOfficials(): Promise<Official[]> {
  try {
    const { data, error } = await client()
      .from('reg_officials')
      .select('position_key, person_name, title');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      positionKey: str(r.position_key), personName: str(r.person_name), title: str(r.title),
    }));
  } catch {
    return [];
  }
}

export async function saveOfficials(rows: Official[]): Promise<void> {
  const payload = rows.map((r) => ({
    position_key: r.positionKey,
    person_name: r.personName.trim(),
    title: r.title.trim(),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await client().from('reg_officials').upsert(payload, { onConflict: 'position_key' });
  if (error) throw error;
}

// ── school profile (identity shown on printed forms; single row) ──
export interface SchoolProfile {
  name: string; schoolId: string; address: string;
  district: string; division: string; region: string; type: string;
}

export async function getSchoolProfile(): Promise<SchoolProfile | null> {
  try {
    const { data, error } = await client()
      .from('reg_school_profile')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      name: str(data.name), schoolId: str(data.school_id), address: str(data.address),
      district: str(data.district), division: str(data.division),
      region: str(data.region), type: str(data.type),
    };
  } catch {
    return null; // offline / table missing → caller keeps code defaults
  }
}

export async function saveSchoolProfile(p: SchoolProfile): Promise<void> {
  if (!p.name.trim() || !p.schoolId.trim())
    throw new Error('School name and School ID are required.');
  const { error } = await client()
    .from('reg_school_profile')
    .upsert({
      id: 'main', name: p.name, school_id: p.schoolId, address: p.address,
      district: p.district, division: p.division, region: p.region, type: p.type,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
}

// ── grading policy (promotion, averaging, phase-in, tiers — per SY) ──
// The last grading constants that used to live only in code. Every field has a
// code default equal to its old hardcoded value, so an unseeded year behaves
// exactly as before. The honor phase-in defaults follow the same year-math the
// code used (numericalFloorForSy / minHonorGrade / honorRegime).
export interface GradingPolicy {
  passingGrade: number;
  remedialMaxFails: number;
  gaDecimals: number;
  tiebreakDecimals: number;
  roundIgBeforeTransmute: boolean;
  numericalFloor: number;
  honorMinGrade: number;
  honorRegime: 'excellence' | 'tiered';
  tierWith: number;
  tierHigh: number;
  tierHighest: number;
}

// Code defaults for an unseeded year, mirroring grading.ts / honors.ts.
export function defaultGradingPolicy(sy?: string): GradingPolicy {
  const y = sy ? parseInt(sy.slice(0, 4), 10) : NaN;
  const honorMin = !Number.isFinite(y) ? 4 : y <= 2026 ? 2 : y === 2027 ? 3 : 4;
  const regime: 'excellence' | 'tiered' =
    Number.isFinite(y) && y <= 2025 ? 'tiered' : 'excellence';
  return {
    passingGrade: 75,
    remedialMaxFails: 2,
    gaDecimals: 0,
    tiebreakDecimals: 2,
    roundIgBeforeTransmute: true,
    numericalFloor: numericalFloorForSy(sy),
    honorMinGrade: honorMin,
    honorRegime: regime,
    tierWith: 90,
    tierHigh: 95,
    tierHighest: 98,
  };
}

export async function getGradingPolicy(sy: string): Promise<GradingPolicy> {
  const def = defaultGradingPolicy(sy);
  try {
    const { data, error } = await client()
      .from('reg_grading_policy')
      .select('*')
      .eq('sy', sy)
      .maybeSingle();
    if (error) throw error;
    if (!data) return def;
    return {
      passingGrade: Number(data.passing_grade),
      remedialMaxFails: Number(data.remedial_max_fails),
      gaDecimals: Number(data.ga_decimals),
      tiebreakDecimals: Number(data.tiebreak_decimals),
      roundIgBeforeTransmute: Boolean(data.round_ig_before_transmute),
      numericalFloor: Number(data.numerical_floor),
      honorMinGrade: Number(data.honor_min_grade),
      honorRegime: data.honor_regime === 'tiered' ? 'tiered' : 'excellence',
      tierWith: Number(data.tier_with),
      tierHigh: Number(data.tier_high),
      tierHighest: Number(data.tier_highest),
    };
  } catch {
    return def; // table missing / offline → code defaults
  }
}

export async function saveGradingPolicy(sy: string, p: GradingPolicy): Promise<void> {
  const pct = (n: number) => n >= 0 && n <= 100;
  if (!pct(p.passingGrade) || !pct(p.tierWith) || !pct(p.tierHigh) || !pct(p.tierHighest))
    throw new Error('Passing grade and honor tiers must be between 0 and 100.');
  if (p.remedialMaxFails < 0 || p.remedialMaxFails > 20)
    throw new Error('Remedial max fails is out of range.');
  if (p.gaDecimals < 0 || p.gaDecimals > 4 || p.tiebreakDecimals < 0 || p.tiebreakDecimals > 6)
    throw new Error('Decimal places are out of range.');
  if (p.numericalFloor < 1 || p.numericalFloor > 12 || p.honorMinGrade < 1 || p.honorMinGrade > 12)
    throw new Error('Grade-level coverage must be between 1 and 12.');
  const { error } = await client()
    .from('reg_grading_policy')
    .upsert(
      {
        sy,
        passing_grade: p.passingGrade,
        remedial_max_fails: p.remedialMaxFails,
        ga_decimals: p.gaDecimals,
        tiebreak_decimals: p.tiebreakDecimals,
        round_ig_before_transmute: p.roundIgBeforeTransmute,
        numerical_floor: p.numericalFloor,
        honor_min_grade: p.honorMinGrade,
        honor_regime: p.honorRegime,
        tier_with: p.tierWith,
        tier_high: p.tierHigh,
        tier_highest: p.tierHighest,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sy' },
    );
  if (error) throw error;
}

// ── transmutation table (Initial Grade → transmuted grade, per SY) ──
export interface TransmuteRow { min: number; grade: number; }

// Registrar-configured transmutation for a SY, sorted high → low. Empty means
// unseeded — pass it straight to computeGrade, which falls back to the DepEd
// default when the array is empty, so grading never breaks on a missing year.
export async function listTransmutation(sy: string): Promise<TransmuteRow[]> {
  const { data, error } = await client()
    .from('reg_transmutation')
    .select('min_score,grade')
    .eq('sy', sy)
    .order('min_score', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ min: Number(r.min_score), grade: Number(r.grade) }));
}

// Replace a year's whole table in one shot, after validating it covers 0–100
// with no gap and no overlap — a bad table would silently mis-grade the school.
export async function saveTransmutation(sy: string, rows: TransmuteRow[], note?: string): Promise<void> {
  const sorted = [...rows].sort((a, b) => a.min - b.min);
  if (!sorted.length) throw new Error('The table cannot be empty.');
  if (sorted[0].min !== 0) throw new Error('The lowest band must start at 0 so every score is covered.');
  const mins = sorted.map((r) => r.min);
  if (new Set(mins).size !== mins.length) throw new Error('Two bands share the same minimum.');
  if (rows.some((r) => r.grade < 0 || r.grade > 100)) throw new Error('Every transmuted grade must be 0–100.');

  const del = await client().from('reg_transmutation').delete().eq('sy', sy);
  if (del.error) throw del.error;
  const ins = await client().from('reg_transmutation').insert(
    sorted.map((r) => ({ sy, min_score: r.min, grade: r.grade })),
  );
  if (ins.error) throw ins.error;
  await client().from('reg_transmutation_audit').insert({ sy, note: note ?? 'Table replaced' });
}

// ── grade approval routing (whose grades each role checks) ──
// One setting, not per school year: the history of an approval lives in that
// approval's own record, not in this table.

export interface RoutingRule {
  id: number;
  sourceRole: string;
  sourceScope: string | null; // null = every department
  approverKind: 'fixed' | 'derived' | 'unset';
  approverRole: string | null;
  approverDerive: string | null;
}

export async function listRoutingRules(): Promise<RoutingRule[]> {
  const { data, error } = await client()
    .from('reg_approval_routing')
    .select('*')
    .order('source_role', { ascending: true })
    .order('source_scope', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    sourceRole: str(r.source_role),
    sourceScope: r.source_scope ? str(r.source_scope) : null,
    approverKind: str(r.approver_kind) as RoutingRule['approverKind'],
    approverRole: r.approver_role ? str(r.approver_role) : null,
    approverDerive: r.approver_derive ? str(r.approver_derive) : null,
  }));
}

// Saves every changed rule or none: one upsert, so a partial write cannot leave
// the chain half-changed.
export async function saveRoutingRules(rules: RoutingRule[]): Promise<void> {
  const { error } = await client().from('reg_approval_routing').upsert(
    rules.map((r) => ({
      id: r.id,
      source_role: r.sourceRole,
      source_scope: r.sourceScope,
      approver_kind: r.approverKind,
      approver_role: r.approverKind === 'fixed' ? r.approverRole : null,
      approver_derive: r.approverKind === 'derived' ? r.approverDerive : null,
    })),
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export interface RoutingAuditRow {
  id: number;
  sourceRole: string;
  sourceScope: string | null;
  oldRule: string | null;
  newRule: string;
  changedBy: string;
  changedAt: string;
}

export async function listRoutingAudit(limit = 50): Promise<RoutingAuditRow[]> {
  const { data, error } = await client()
    .from('reg_approval_routing_audit')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    sourceRole: str(r.source_role),
    sourceScope: r.source_scope ? str(r.source_scope) : null,
    oldRule: r.old_rule ? str(r.old_rule) : null,
    newRule: str(r.new_rule),
    changedBy: str(r.changed_by) || '—',
    changedAt: str(r.changed_at),
  }));
}

// ── attitude scale (numerical → letter, registrar-configurable) ──
// The subject grade sheet's attitude column converts a numerical score to a
// letter using these bands. Stored in reg_attitude_scale; falls back to the
// DepEd-style default when the table is empty or unavailable.
// Attitude is now stored per SY in reg_descriptor_scales (scale_key='attitude'),
// alongside the other descriptor scales. When a SY is given, that is the source;
// the legacy single-setting reg_attitude_scale is a fallback for old callers and
// unseeded years, and the code default is the last resort.
export async function listAttitudeScale(sy?: string): Promise<AttitudeBand[]> {
  try {
    if (sy) {
      const { data } = await client()
        .from('reg_descriptor_scales')
        .select('letter,label,min')
        .eq('sy', sy).eq('scale_key', 'attitude')
        .order('min', { ascending: false });
      if (data && data.length) return data.map((r) => ({ min: Number(r.min), letter: str(r.letter), label: str(r.label) }));
    }
    const { data, error } = await client()
      .from('reg_attitude_scale')
      .select('*')
      .order('min', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({ min: Number(r.min), letter: str(r.letter), label: str(r.label) }));
    return rows.length ? rows : DEFAULT_ATTITUDE_SCALE;
  } catch {
    return DEFAULT_ATTITUDE_SCALE;
  }
}

// ── schools (transferee origin master list) ──
export interface SchoolRecord {
  id: string; // 6-digit DepEd School ID (matches LRN[0:6])
  name: string;
  address: string;
  district: string;
  division: string;
  region: string;
  type: 'Public' | 'Private' | 'SUC';
}

export async function listSchools(): Promise<SchoolRecord[]> {
  return offlineRead(
    async () => {
      const { data, error } = await client()
        .from('reg_schools')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: str(r.code),
        name: str(r.name),
        address: str(r.address),
        district: str(r.district),
        division: str(r.division),
        region: str(r.region),
        type: (str(r.type) || 'Public') as SchoolRecord['type'],
      }));
    },
    async () => idbGet<SchoolRecord[]>(SNAP.schools),
  );
}

// ── offline sync: download everything to the device for offline view & print ──
async function fetchAllForm137(): Promise<(Form137Release & { lrn: string })[]> {
  const c = client();
  const out: (Form137Release & { lrn: string })[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c
      .from('reg_form137_log')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const r of batch) {
      out.push({
        lrn: str(r.lrn),
        id: Number(r.id),
        level: r.level == null ? null : Number(r.level),
        releasedText: str(r.released_text),
        releasedDate: r.released_date ? str(r.released_date) : null,
        requestingSchool: str(r.requesting_school),
        purpose: str(r.purpose),
      });
    }
    if (batch.length < PAGE) break;
  }
  return out;
}

async function fetchAllTransfers(): Promise<Transfer[]> {
  const { data, error } = await client().from('reg_transfers').select('*');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    classId: r.class_id ? str(r.class_id) : null,
    lrn: r.lrn ? str(r.lrn) : null,
    learnerName: str(r.learner_name),
    sy: str(r.sy),
    direction: (str(r.direction) || 'in') as 'in' | 'out',
    transferDate: r.transfer_date ? str(r.transfer_date) : null,
    otherSchool: str(r.other_school),
    remarks: str(r.remarks),
  }));
}

async function fetchAllEsc(): Promise<{ lrn: string; sy: string; grantee: boolean; escNo: string }[]> {
  const { data, error } = await client().from('reg_esc_grants').select('lrn, sy, grantee, esc_no');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    lrn: str(r.lrn),
    sy: str(r.sy),
    grantee: Boolean(r.grantee),
    escNo: str(r.esc_no),
  }));
}

export interface SyncResult {
  lastSyncedAt: string;
  counts: Record<string, number>;
}

// Pull every dataset to the device (IndexedDB) so the app can be VIEWED and
// PRINTED offline. Must be called while online. The snapshots hold decrypted PII
// locally (the Offline page can wipe them).
export async function syncToDevice(): Promise<SyncResult> {
  const [students, classes, teachers, schoolYears, subjects, schools, transfers, esc, form137log] =
    await Promise.all([
      listStudents(),
      listClasses(),
      listTeachers(),
      listSchoolYears(),
      listSubjects(),
      listSchools(),
      fetchAllTransfers(),
      fetchAllEsc(),
      fetchAllForm137(),
    ]);
  await Promise.all([
    idbSet(SNAP.students, students),
    idbSet(SNAP.classes, classes),
    idbSet(SNAP.teachers, teachers),
    idbSet(SNAP.schoolYears, schoolYears),
    idbSet(SNAP.subjects, subjects),
    idbSet(SNAP.schools, schools),
    idbSet(SNAP.transfers, transfers),
    idbSet(SNAP.esc, esc),
    idbSet(SNAP.form137log, form137log),
  ]);
  const counts: Record<string, number> = {
    students: students.length,
    classes: classes.length,
    teachers: teachers.length,
    schoolYears: schoolYears.length,
    subjects: subjects.length,
    schools: schools.length,
    transfers: transfers.length,
    esc: esc.length,
    form137log: form137log.length,
  };
  const meta = { lastSyncedAt: new Date().toISOString(), counts };
  await idbSet(SNAP.meta, meta);
  return meta;
}
