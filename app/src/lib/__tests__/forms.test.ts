import { describe, it, expect } from 'vitest';
import {
  buildSubjectRows,
  subjectIndex,
  generalAverage,
  periodsForSy,
} from '../forms';
import type { Subject, QuarterGrade } from '@/types';

const subjects: Subject[] = [
  { code: 'MAT', fullName: 'Mathematics', abbreviation: '', category: 'Core', order: 1 },
  { code: 'MUA', fullName: 'Music & Arts', abbreviation: 'MAPEH', category: 'Core', order: 6 },
  { code: 'PEH', fullName: 'Physical Education & Health', abbreviation: 'MAPEH', category: 'Core', order: 7 },
];
const index = subjectIndex(subjects);

describe('periodsForSy', () => {
  it('uses 3 terms from SY 2026-2027 and 4 quarters before', () => {
    expect(periodsForSy('2026-2027').map((p) => p.key)).toEqual(['q1', 'q2', 'q3']);
    expect(periodsForSy('2027-2028').length).toBe(3);
    expect(periodsForSy('2017-2018').map((p) => p.key)).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});

describe('MAPEH derivation', () => {
  // Mirrors the registrar's screenshot: Music & Arts 89,90 and PE & Health 90,91
  // → MAPEH 89,90,90,91 with a final of 90.
  const grades: QuarterGrade[] = [
    { subjectCode: 'MAT', q1: 88, q2: 90, q3: 87, q4: 89, final: 89 },
    { subjectCode: 'MUA', q1: 89, q2: 90, final: 90 },
    { subjectCode: 'PEH', q3: 90, q4: 91, final: 90 },
  ];
  const rows = buildSubjectRows(grades, index);

  it('inserts a derived MAPEH parent that averages its components per period', () => {
    const mapeh = rows.find((r) => r.subjectCode === 'MAPEH');
    expect(mapeh?.isMapehParent).toBe(true);
    expect(mapeh?.q1).toBe(89);
    expect(mapeh?.q2).toBe(90);
    expect(mapeh?.q3).toBe(90);
    expect(mapeh?.q4).toBe(91);
    expect(mapeh?.final).toBe(90);
  });

  it('flags the two components and orders them right after MAPEH', () => {
    const codes = rows.map((r) => r.subjectCode);
    expect(codes).toEqual(['MAT', 'MAPEH', 'MUA', 'PEH']);
    expect(rows.find((r) => r.subjectCode === 'MUA')?.isMapehComponent).toBe(true);
    expect(rows.find((r) => r.subjectCode === 'PEH')?.isMapehComponent).toBe(true);
  });

  it('counts MAPEH once in the General Average — never its components', () => {
    // GA = mean(MAT 89, MAPEH 90) = 90 (components excluded)
    expect(generalAverage(rows)).toBe(90);
  });
});
