// Supabase data access for the Registrar System (NPS shared project).
// Maps the snake_case `reg_*` rows to the app's camelCase types. Screens that
// have been migrated off the mocks call these functions.

import { supabase } from './supabase';
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
}

export async function getStudent(lrn: string): Promise<Student | null> {
  const { data, error } = await client()
    .from('reg_students')
    .select('*')
    .eq('lrn', lrn)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStudent(data) : null;
}

// Insert (no originalLrn) or update (by originalLrn). Update keeps the row's
// other JSONB columns intact only because the form carries them through.
export async function saveStudent(input: StudentInput, originalLrn?: string): Promise<void> {
  const row = studentToRow(input);
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
  const { data, error } = await client()
    .from('reg_teachers')
    .select('*')
    .order('family_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToTeacher);
}

export async function getTeacher(id: number): Promise<Teacher | null> {
  const { data, error } = await client().from('reg_teachers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToTeacher(data) : null;
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
  const c = client();
  const [clsRes, tchRes] = await Promise.all([
    c.from('reg_classes').select('*').order('grade_level', { ascending: true }),
    c.from('reg_teachers').select('*'),
  ]);
  if (clsRes.error) throw clsRes.error;
  if (tchRes.error) throw tchRes.error;
  const byId = new Map<number, Teacher>((tchRes.data ?? []).map((t) => [Number(t.id), rowToTeacher(t)]));
  return (clsRes.data ?? []).map((r) => rowToClass(r, byId.get(Number(r.adviser_id))));
}

export async function getClass(id: string): Promise<ClassRecord | null> {
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
}

export async function saveClass(input: ClassInput, id?: string): Promise<void> {
  const row = classToRow(input);
  const c = client();
  const { error } = id
    ? await c.from('reg_classes').update(row).eq('id', id)
    : await c.from('reg_classes').insert(row);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await client().from('reg_classes').delete().eq('id', id);
  if (error) throw error;
}

// ── school years ──
function rowToSchoolYear(r: Row): SchoolYear {
  return {
    code: str(r.code) as unknown as SchoolYear['code'],
    label: str(r.label),
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    isActive: Boolean(r.is_active),
  };
}

export async function listSchoolYears(): Promise<SchoolYear[]> {
  const { data, error } = await client()
    .from('reg_school_years')
    .select('*')
    .order('code', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSchoolYear);
}

export async function getActiveSchoolYear(): Promise<SchoolYear | null> {
  const { data, error } = await client()
    .from('reg_school_years')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: false })
    .limit(1);
  if (error) throw error;
  const r = data?.[0];
  return r ? rowToSchoolYear(r) : null;
}

// ── subjects ──
export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await client()
    .from('reg_subjects')
    .select('*')
    .order('code', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    code: str(r.code),
    fullName: str(r.full_name),
    abbreviation: str(r.abbreviation),
    category: (str(r.category) || 'Core') as SubjectCategory,
  }));
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
}
