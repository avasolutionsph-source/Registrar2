import { students, classes } from '@/mocks';
import type { Student, ClassRecord } from '@/types';

export function getStudentByLrn(lrn: string): Student | undefined {
  return students.find((s) => s.lrn === lrn);
}

export function getClassById(id: string): ClassRecord | undefined {
  return classes.find((c) => c.id === id);
}
