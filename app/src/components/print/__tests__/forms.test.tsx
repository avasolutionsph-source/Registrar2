import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { Student, Subject, ClassRecord } from '@/types';
import { Form137 } from '../Form137';
import { ReportCardSF9 } from '../ReportCardSF9';
import { GoodMoral } from '../GoodMoral';
import { CertEnrollment } from '../CertEnrollment';
import { StudentId } from '../StudentId';
import { ClassForm1 } from '../ClassForm1';
import { ClassForm5 } from '../ClassForm5';
import { BatchReportCards } from '../BatchReportCards';

const subjects: Subject[] = [
  { code: 'MAT', fullName: 'Mathematics', abbreviation: '', category: 'Core' },
  { code: 'ENG', fullName: 'English', abbreviation: '', category: 'Core' },
  { code: 'FIL', fullName: 'Filipino', abbreviation: '', category: 'Core' },
  { code: 'ESP', fullName: 'Ed. sa Pagpapakatao', abbreviation: '', category: 'Core' },
];

// fixture mirroring the real reg_students JSONB shapes
const student: Student = {
  lrn: '403875150432',
  studentNo: '12-00123',
  firstName: 'Ephraim',
  middleName: 'Reyes',
  lastName: 'Ramos',
  extension: '',
  gender: 'Male',
  birthdate: '2006-08-14',
  religion: 'Roman Catholic',
  address: 'Naga City',
  contactNumber: '0917',
  fatherName: 'Juan Ramos',
  motherMaidenName: 'Maria Reyes',
  guardianRelation: 'Mother',
  currentSY: '2017-2018',
  currentClassId: '',
  curriculum: 'Kto12-B',
  status: 'Active',
  elemSchoolGraduatedFrom: '',
  schoolType: '',
  loyaltyYears: 6,
  enrolmentHistory: [
    {
      sy: '2017-2018',
      gradeLevel: 'VI',
      sectionName: 'St. Ignatius de Loyola',
      adviserName: 'Mr. De Leon, John Ace B.',
      schoolName: 'Naga Parochial School',
      daysPresent: 204,
      generalAverage: 88,
      action: 'promoted',
    },
  ],
  grades: {
    '2017-2018': [
      { subjectCode: 'MAT', q1: 88, q2: 90, q3: 87, q4: 89, final: 89 },
      { subjectCode: 'ENG', q1: 85, q2: 86, q3: 84, q4: 88, final: 86 },
      { subjectCode: 'FIL', q1: 82, q2: 83, q3: 85, q4: 84, final: 84 },
      { subjectCode: 'ESP', q1: 90, q2: 91, q3: 92, q4: 90, final: 91 },
    ],
  },
  conduct: {
    '2017-2018': {
      attendance: {
        present: { jun: 20, jul: 22, aug: 21 },
        tardy: { aug: 1 },
        totalPresent: 204,
        totalTardy: 1,
      },
      values: {
        q: { '1': { honest: 90, piety: 88 }, '2': { honest: 89, piety: 88 } },
        average: 89,
      },
    },
  },
  credentials: {
    bc: 'on-file', bp: 'on-file', hc: 'pending', pix: 'on-file',
    rf: 'na', f137: 'on-file', rc: 'on-file', gmc: 'pending',
  },
};

describe('printable forms render with real-shaped data', () => {
  it('Form 137 shows the school, subjects, grade level and averages', () => {
    const { container } = render(<Form137 student={student} subjects={subjects} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Naga Parochial School');
    expect(text).toContain('Form 137');
    expect(text).toContain('Mathematics'); // subject code resolved to name
    expect(text).toContain('Grade 6'); // gradeLevel VI → label
    expect(text).toContain('89'); // a final grade / general average
    expect(text).toContain('PROMOTED');
  });

  it('SF 10 variant renders the permanent-record title', () => {
    const { container } = render(<Form137 student={student} subjects={subjects} variant="sf10" />);
    expect(container.textContent ?? '').toContain('SF 10');
  });

  it('Report Card (SF 9) shows grades, attendance and observed values', () => {
    const { container } = render(<ReportCardSF9 student={student} subjects={subjects} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Report Card');
    expect(text).toContain('Ed. sa Pagpapakatao');
    expect(text).toContain('Record of Attendance');
    expect(text).toContain('Days Present');
    expect(text).toContain("Learner"); // Learner's Observed Values
    expect(text).toContain('Honesty'); // a core-value trait label
  });

  it('Good Moral Certificate names the learner and certifies character', () => {
    const { container } = render(<GoodMoral student={student} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Good Moral Character');
    expect(text).toContain('Ramos');
    expect(text).toContain('good moral character');
    expect(text).toContain('School Registrar');
  });

  it('Certificate of Enrollment states the school, grade and school year', () => {
    const { container } = render(<CertEnrollment student={student} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Certificate of Enrollment');
    expect(text).toContain('officially enrolled');
    expect(text).toContain('Naga Parochial School');
    expect(text).toContain(student.lrn);
    expect(text).toContain('Grade 6'); // falls back to latest enrolment entry
  });

  it('Student ID shows the learner, LRN and school', () => {
    const { container } = render(<StudentId student={student} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Student ID');
    expect(text).toContain('Naga Parochial School');
    expect(text).toContain(student.lrn);
    expect(text).toContain('Ephraim'); // full name
  });
});

// ── class-level forms ──
const adviser = {
  id: 1, title: 'Mr.', familyName: 'De Leon', firstName: 'John Ace', middleInitial: 'B',
  email: '', yearStarted: 2010, yearEnded: 0,
};
const klass: ClassRecord = {
  id: 'c1',
  sy: '2017-2018',
  gradeLevel: 'VI',
  sectionName: 'St. Ignatius de Loyola',
  adviser,
  curriculum: 'Kto12-B',
  studentLrns: [],
};
const student2: Student = {
  ...student,
  lrn: '403875150999',
  firstName: 'Maria',
  middleName: 'Cruz',
  lastName: 'Santos',
  gender: 'Female',
};
const roster = [student, student2];

describe('class-level forms render', () => {
  it('SF 1 School Register lists male and female learners', () => {
    const { container } = render(<ClassForm1 klass={klass} roster={roster} />);
    const text = (container.textContent ?? '').toLowerCase();
    expect(text).toContain('school register');
    expect(text).toContain('male');
    expect(text).toContain('female');
    expect(text).toContain('ramos'); // male (surname is upper-cased in the doc)
    expect(text).toContain('santos'); // female
    expect(text).toContain('de leon'); // adviser in header
  });

  it('SF 5 Promotion report shows general averages and actions', () => {
    const { container } = render(<ClassForm5 klass={klass} roster={roster} subjects={subjects} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Report on Promotion');
    expect(text).toContain('General Average');
    expect(text).toContain('PROMOTED'); // GA 88 ≥ 75
    expect(text).toContain('Total Enrolment');
  });

  it('Batch report cards render one per learner', () => {
    const { container } = render(<BatchReportCards klass={klass} roster={roster} subjects={subjects} />);
    const text = container.textContent ?? '';
    // both learners appear; "Report Card" header repeats per card
    expect(text.toLowerCase()).toContain('ramos');
    expect(text.toLowerCase()).toContain('santos');
    expect((text.match(/Report Card/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
