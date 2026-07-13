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
  type AreaGroup,
  type Weights,
  type AttitudeBand,
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

// Replace the section's whole teaching load with the given rows (subjects with
// no teacher are stored with teacher_id null; subjects not passed are dropped).
export async function saveClassSubjects(
  classId: string,
  rows: ClassSubjectAssignment[],
): Promise<void> {
  const c = client();
  const del = await c.from('reg_class_subjects').delete().eq('class_id', classId);
  if (del.error) throw del.error;
  if (!rows.length) return;
  const { error } = await c.from('reg_class_subjects').insert(
    rows.map((r) => ({
      class_id: classId,
      subject_code: r.subjectCode,
      teacher_id: r.teacherId,
    })),
  );
  if (error) throw error;
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
// backs the on-conflict merge.
export async function assignTeacherSubject(
  classId: string,
  subjectCode: string,
  teacherId: number | null,
): Promise<void> {
  const { error } = await client()
    .from('reg_class_subjects')
    .upsert(
      { class_id: classId, subject_code: subjectCode, teacher_id: teacherId },
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

// ── attitude scale (numerical → letter, registrar-configurable) ──
// The subject grade sheet's attitude column converts a numerical score to a
// letter using these bands. Stored in reg_attitude_scale; falls back to the
// DepEd-style default when the table is empty or unavailable.
export async function listAttitudeScale(): Promise<AttitudeBand[]> {
  try {
    const { data, error } = await client()
      .from('reg_attitude_scale')
      .select('*')
      .order('min', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({
      min: Number(r.min),
      letter: str(r.letter),
      label: str(r.label),
    }));
    return rows.length ? rows : DEFAULT_ATTITUDE_SCALE;
  } catch {
    return DEFAULT_ATTITUDE_SCALE;
  }
}

// Replace the whole attitude scale with the given bands. Runs as the signed-in
// registrar; reg_attitude_scale RLS gates the writes.
export async function saveAttitudeScale(bands: AttitudeBand[]): Promise<void> {
  const c = client();
  const del = await c.from('reg_attitude_scale').delete().gte('min', -1);
  if (del.error) throw del.error;
  if (!bands.length) return;
  const { error } = await c
    .from('reg_attitude_scale')
    .insert(bands.map((b) => ({ letter: b.letter, label: b.label, min: b.min })));
  if (error) throw error;
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
