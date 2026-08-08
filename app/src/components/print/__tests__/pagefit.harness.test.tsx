/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — vitest-only harness; it uses node APIs the app tsconfig
// deliberately has no types for. Vitest runs it fine.
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import type { Student, Subject } from '@/types';
import { ReportCard138 } from '../ReportCard138';
import { ReportCardPreschool } from '../ReportCardPreschool';

// ── PAGE-FIT HARNESS — not a test of correctness ───────────────────────────
// Renders the report cards to standalone HTML files so headless Chrome can
// print them to PDF and COUNT PAGES. This is how "does it fit one sheet?" is
// verified before shipping — sizing by eyeball kept regressing.
//
// Run:  PAGEFIT=<outdir> npx vitest run src/components/print/__tests__/pagefit.harness.test.tsx
// then: chrome --headless=new --no-pdf-header-footer --print-to-pdf=out.pdf <file>.html
// (see scripts in the session notes; page count = occurrences of "/Type /Page")
//
// Skipped entirely unless PAGEFIT is set, so normal test runs are untouched.

const OUT = process.env.PAGEFIT;

const subjects: Subject[] = [
  { code: 'MAT', fullName: 'Mathematics', abbreviation: '', category: 'Core', order: 1 },
  { code: 'ENG', fullName: 'English', abbreviation: '', category: 'Core', order: 2 },
];

const base: Student = {
  lrn: '403875150432',
  studentNo: '2627126',
  firstName: 'Rob Damian',
  middleName: 'Bañola',
  lastName: 'Bachiller',
  extension: '',
  gender: 'Male',
  birthdate: '2021-08-14',
  religion: 'Roman Catholic',
  address: 'Naga City',
  contactNumber: '0917',
  fatherName: 'Juan',
  motherMaidenName: 'Maria',
  guardianRelation: 'Mother',
  currentSY: '2026-2027',
  currentClassId: '',
  curriculum: 'Kto12-B',
  status: 'Active',
  elemSchoolGraduatedFrom: '',
  schoolType: '',
  loyaltyYears: 1,
  enrolmentHistory: [
    { sy: '2026-2027', gradeLevel: 'N1', sectionName: 'St. Tarcisius', adviserName: 'Mrs. Caren M. Luna' },
  ],
  grades: { '2026-2027': [] },
  conduct: {
    '2026-2027': {
      attendance: { present: { jun: 16, jul: 25 }, tardy: {}, totalPresent: 41, totalTardy: 0 },
    },
  },
  credentials: {
    bc: 'on-file', bp: 'on-file', hc: 'pending', pix: 'on-file',
    rf: 'na', f137: 'on-file', rc: 'on-file', gmc: 'pending',
  },
};

// The elem/JHS SF9 with every optional block (programs + deportment + attendance).
const gradeSix: Student = {
  ...base,
  enrolmentHistory: [
    { sy: '2026-2027', gradeLevel: 'VI', sectionName: 'St. Ignatius', adviserName: 'Mr. John Ace B. De Leon' },
  ],
  grades: {
    '2026-2027': [
      { subjectCode: 'MAT', q1: 88, q2: 90, q3: 87, final: 88 },
      { subjectCode: 'ENG', q1: 85, q2: 86, q3: 84, final: 85 },
    ],
  },
  conduct: {
    '2026-2027': {
      attendance: { present: { jun: 16, jul: 25 }, tardy: { jul: 1 }, totalPresent: 41, totalTardy: 1 },
      values: { q: { q1: { faith: 92, integrity: 88, respect: 90, excellence: 87, socialResponsibility: 91 } } },
      programs: { q: { q1: { scouting: 90, homeroom: 88, sap: 91 } } },
    },
  },
};

// A Grade XII-sized subject list (16 rows) — the dense-mode stressor.
const dense: Student = {
  ...base,
  enrolmentHistory: [
    { sy: '2026-2027', gradeLevel: 'XII-GAS', sectionName: 'St. Teresa', adviserName: 'Mr. Marvin A. Almario' },
  ],
  grades: {
    '2026-2027': Array.from({ length: 16 }, (_, i) => ({
      subjectCode: `SUBJ${i + 1}`,
      customName: `Trends, Networks and Critical Thinking in the 21st Century ${i + 1}`,
      q1: 85 + (i % 10),
      final: 85 + (i % 10),
    })),
  },
};

function page(html: string, strict = false): string {
  // strict: shrink the page to 10.2in — Letter (11in) printed with Chrome's
  // DEFAULT margins (~0.4in each), which is the tightest content box a school
  // machine realistically uses. "Minimum" margins give ~10.68in, so a card
  // that clears 10.2in clears every setting.
  const override = strict
    ? '<style>@media print { @page { size: 8.5in 10.2in; margin: 0; } }</style>'
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="./app.css"></head><body>${html}${override}</body></html>`;
}

describe('page-fit harness', () => {
  it('writes the harness HTML files', () => {
    if (!OUT) return; // normal test runs: no-op
    mkdirSync(OUT, { recursive: true });
    const cases: [string, React.ReactElement][] = [
      ['preschool', <ReportCardPreschool student={base} subjects={subjects} sy="2026-2027" />],
      ['sf9-elem', <ReportCard138 student={gradeSix} subjects={subjects} sy="2026-2027" />],
      ['sf9-dense', <ReportCard138 student={dense} subjects={subjects} sy="2026-2027" />],
    ];
    for (const [name, el] of cases) {
      const { container, unmount } = render(el);
      writeFileSync(join(OUT, `${name}.html`), page(container.innerHTML));
      writeFileSync(join(OUT, `${name}-strict.html`), page(container.innerHTML, true));
      unmount();
    }
  });
});
