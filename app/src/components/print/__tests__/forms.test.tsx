import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { Student, Subject, ClassRecord } from '@/types';
import { Form137 } from '../Form137';
import { ReportCard138 } from '../ReportCard138';
import { ReportCardPreschool } from '../ReportCardPreschool';
import { GoodMoral } from '../GoodMoral';
import { CertEnrollment } from '../CertEnrollment';
import { StudentId } from '../StudentId';
import { ClassForm1 } from '../ClassForm1';
import { BatchReportCards } from '../BatchReportCards';

const subjects: Subject[] = [
  { code: 'MAT', fullName: 'Mathematics', abbreviation: '', category: 'Core', order: 1 },
  { code: 'ENG', fullName: 'English', abbreviation: '', category: 'Core', order: 2 },
  { code: 'FIL', fullName: 'Filipino', abbreviation: '', category: 'Core', order: 3 },
  { code: 'ESP', fullName: 'Ed. sa Pagpapakatao', abbreviation: '', category: 'Core', order: 4 },
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
      programs: {
        q: { '1': { computer: 90, scouting: 88 }, '2': { computer: 91 } },
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

  it('Report Card (SF 9) shows grades, attendance, deportment and programs', () => {
    const { container } = render(<ReportCard138 student={student} subjects={subjects} />);
    const text = container.textContent ?? '';
    expect(text).toContain('PERFORMANCE REPORT'); // LEARNER'S PERFORMANCE REPORT
    expect(text).toContain('NAGA PAROCHIAL SCHOOL');
    expect(text).toContain('Ed. sa Pagpapakatao');
    expect(text).toContain('ATTENDANCE REPORT');
    expect(text).toContain('Days Present');
    expect(text).toContain('Days Absent');
    expect(text).toContain('Faith'); // deportment core value
    expect(text).toContain('SPECIAL PROGRAMS');
    expect(text).toContain('Scouting'); // Grade VI program row
    // complete card (default): finals + GA + promotion visible
    expect(text).toContain('88'); // general average (mean of 89,86,84,91)
    expect(text).toContain('Promoted');
    expect(text).toContain('Passed');
  });

  it('Nursery/Kinder Progress Report renders scholarship, deportment and attendance', () => {
    const kinder: Student = {
      ...student,
      currentSY: '2026-2027',
      grades: { '2026-2027': [{ subjectCode: 'LANG', letters: { q1: 'B', q2: 'D' } }] },
      enrolmentHistory: [
        { sy: '2026-2027', gradeLevel: 'K', sectionName: 'St. Therese', adviserName: 'Ms. Cruz, Ana B.' },
      ],
    };
    const { container } = render(
      <ReportCardPreschool
        student={kinder}
        subjects={[{ code: 'LANG', fullName: 'Language', abbreviation: '', category: 'Core', order: 1 }]}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('NURSERY AND KINDERGARTEN PROGRESS REPORT');
    expect(text).toContain('KINDERGARTEN:'); // level line
    expect(text).toContain('SCHOLARSHIP');
    expect(text).toContain('ACTION TAKEN');
    expect(text).toContain('Language'); // the graded area appears
    expect(text).toContain('B- Beginning'); // descriptors line
    expect(text).toContain('DEPORTMENT');
    expect(text).toContain('I make the sign of the Cross correctly.');
    expect(text).toContain('ATTENDANCE RECORD');
    expect(text).toContain('Days of School');
    expect(text).toContain('Grade I'); // eligible-for-admission autofill (complete card)
  });

  it('Report Card printed as of Term 1 hides finals, GA and promotion', () => {
    const { container } = render(<ReportCard138 student={student} subjects={subjects} upto={1} />);
    const text = container.textContent ?? '';
    expect(text).toContain('PERFORMANCE REPORT');
    expect(text).toContain('Mathematics'); // subjects still listed
    expect(text).toContain('85'); // ENG q1 (the shown term) still prints
    expect(text).not.toContain('Promoted'); // no promotion before the last term
    expect(text).not.toContain('91'); // ESP final grade masked until the complete card
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

  it('Batch report cards render one official card per learner', () => {
    const { container } = render(<BatchReportCards klass={klass} roster={roster} subjects={subjects} />);
    const text = container.textContent ?? '';
    // both learners appear; the official card header repeats per card
    expect(text.toLowerCase()).toContain('ramos');
    expect(text.toLowerCase()).toContain('santos');
    expect((text.match(/PERFORMANCE REPORT/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
