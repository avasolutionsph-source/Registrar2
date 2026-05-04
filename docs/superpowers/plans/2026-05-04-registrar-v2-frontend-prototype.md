# Registrar v2 Frontend Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a navigable React frontend prototype of the NPS Registrar v2 covering the App Shell, Student detail, Class detail, and the Students/Classes list pages — with mock data, no backend. Style locked to "Soft & Clean" per the design spec.

**Architecture:** Vite + React 18 + TypeScript single-page app under `app/`. React Router for URL-shareable routes. Tailwind for design tokens. shadcn/ui for accessible primitives. Mock data hardcoded in `src/mocks/`. Pure functions (LRN parser, formatters) covered by Vitest unit tests; component-level testing limited to smoke tests since the UI is meant to be iterated on freely.

**Tech Stack:** Vite 5 · React 18 · TypeScript 5 · Tailwind CSS 3 · shadcn/ui · React Router 6 · Lucide React · Vitest · ESLint + Prettier

**Source-of-truth references:**
- Design spec: [`docs/superpowers/specs/2026-05-04-registrar-v2-frontend-design.md`](../specs/2026-05-04-registrar-v2-frontend-design.md)
- Legacy catalog (for data shapes and UX patterns): [`docs/legacy-catalog/`](../../legacy-catalog/)

**Working directory throughout:** `c:/Users/opet_/OneDrive/Desktop/Registrar System v2/`. All paths in this plan are relative to this directory.

**TDD scope (deliberate):** TDD for pure functions in `app/src/lib/`. For UI components, "test = visual review in the browser" — the user said "less is better"; full component testing of a freely-iterating prototype would be wasted. Each task that produces UI ends with a visual verification step, not unit tests.

---

## Task 1: Bootstrap Vite + React + TypeScript app

**Files:**
- Create: `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/index.css`

- [ ] **Step 1: Scaffold the app**

Run from the project root:

```bash
npm create vite@latest app -- --template react-ts
cd app
npm install
```

Expected: `app/` directory created with default Vite + React + TS template. `app/package.json` exists.

- [ ] **Step 2: Verify dev server starts**

Run from `app/`:

```bash
npm run dev
```

Expected: Vite logs `Local: http://localhost:5173/`. Open the URL in browser; default Vite landing page renders.

Stop the server (Ctrl+C) before proceeding.

- [ ] **Step 3: Configure path alias `@/` → `src/`**

Edit `app/tsconfig.json` — replace its contents with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Edit `app/vite.config.ts` — replace contents with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
});
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "chore(app): scaffold Vite + React + TS prototype with @/ alias"
```

---

## Task 2: Install Tailwind CSS and configure Style A design tokens

**Files:**
- Create: `app/tailwind.config.ts`, `app/postcss.config.js`
- Modify: `app/src/index.css`

- [ ] **Step 1: Install Tailwind**

Run from `app/`:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Expected: `app/tailwind.config.js` and `app/postcss.config.js` created.

- [ ] **Step 2: Convert tailwind config to TS and apply Style A tokens**

Delete `app/tailwind.config.js`. Create `app/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#f8f8f5',
        sidebar: '#f1efea',
        panel: '#ffffff',
        'panel-alt': '#fafaf6',
        border: { DEFAULT: '#e7e3da', soft: '#f0ede4' },
        ink: {
          primary: '#1f1f1b',
          secondary: '#6b6b65',
          muted: '#8a8478',
        },
        accent: '#1f1f1b',
        ok: { bg: '#ecf3e9', fg: '#3f6233' },
        pending: { bg: '#fbf3e3', fg: '#8a6c1d' },
        na: { bg: '#f0ede4', fg: '#8a8478' },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '10px', lg: '12px' },
      fontSize: {
        'label': ['11px', { letterSpacing: '0.06em', lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Replace `app/src/index.css` with Tailwind directives + base styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root { height: 100%; }
  body {
    @apply bg-app text-ink-primary font-sans;
    font-feature-settings: 'tnum' 1;
  }
}
```

- [ ] **Step 4: Smoke test the Tailwind setup**

Replace `app/src/App.tsx` contents with:

```tsx
export default function App() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-ink-primary">Tailwind OK</h1>
      <p className="text-sm text-ink-secondary mt-1">
        If this is on a soft cream background and the heading is near-black, Style A tokens are wired.
      </p>
    </div>
  );
}
```

Run `npm run dev` from `app/`. Open http://localhost:5173. Expected:
- Page background is off-white cream (`#f8f8f5`), not pure white
- Heading is near-black (`#1f1f1b`)
- Body text is muted gray (`#6b6b65`)

Stop the server.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): install Tailwind and lock Style A design tokens"
```

---

## Task 3: Configure ESLint, Prettier, and Vitest

**Files:**
- Create: `app/.eslintrc.cjs`, `app/.prettierrc.json`, `app/vitest.config.ts`
- Modify: `app/package.json` (add scripts), `app/tsconfig.json` (add vitest types)

- [ ] **Step 1: Install dev tooling**

From `app/`:

```bash
npm install -D prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `app/.prettierrc.json`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: Create `app/.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 4: Create `app/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
```

- [ ] **Step 5: Create `app/src/setupTests.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Add test/lint scripts to `app/package.json`**

In the `"scripts"` block, add (keep existing scripts):

```json
"test": "vitest run",
"test:watch": "vitest",
"lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
"format": "prettier --write \"src/**/*.{ts,tsx,css,md}\""
```

- [ ] **Step 7: Add vitest types to `app/tsconfig.json`**

In `compilerOptions`, add `"types": ["vitest/globals", "@testing-library/jest-dom"]`.

- [ ] **Step 8: Verify the pipeline**

From `app/`:

```bash
npm run lint
npm run test
```

Expected: Lint passes (no errors). Test runner reports "No test files found" — that's correct, we'll add tests in later tasks.

- [ ] **Step 9: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "chore(app): configure ESLint, Prettier, Vitest"
```

---

## Task 4: Define TypeScript types for domain entities

**Files:**
- Create: `app/src/types/student.ts`, `app/src/types/class.ts`, `app/src/types/teacher.ts`, `app/src/types/schoolYear.ts`, `app/src/types/subject.ts`, `app/src/types/index.ts`

- [ ] **Step 1: Create `app/src/types/schoolYear.ts`**

```ts
export type SchoolYearCode = `${number}-${number}`; // e.g. "2025-2026"

export interface SchoolYear {
  code: SchoolYearCode;
  label: string;          // "SY 2025–2026"
  startDate: string;      // ISO YYYY-MM-DD
  endDate: string;
  isActive: boolean;      // current SY indicator
}
```

- [ ] **Step 2: Create `app/src/types/teacher.ts`**

```ts
export interface Teacher {
  id: number;             // legacy sequential int
  title: string;          // "Mrs.", "Mr.", "Fr.", etc.
  familyName: string;
  firstName: string;
  middleInitial: string;
  email: string;
  yearStarted: number;
  yearEnded: number;      // 0 = still active per legacy convention
  isAdviser?: boolean;
  curriculum?: string;    // e.g. "Kto12-B"
}
```

- [ ] **Step 3: Create `app/src/types/subject.ts`**

```ts
export type SubjectCategory = 'Core' | 'Specialized' | 'Applied' | 'Elective';

export interface Subject {
  code: string;           // 3-letter, e.g. "FIL", "MAT", "MAPEH"
  fullName: string;       // e.g. "Filipino"
  abbreviation: string;
  category: SubjectCategory;
}
```

- [ ] **Step 4: Create `app/src/types/class.ts`**

```ts
import type { SchoolYearCode } from './schoolYear';
import type { Teacher } from './teacher';

export type GradeLevel =
  | 'N1' | 'N2' | 'K' | 'S'  // Pre-K + SPED
  | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'    // Elem
  | 'VII' | 'VIII' | 'IX' | 'X'                // JHS
  | 'XI-GAS' | 'XI-HUMSS' | 'XI-STEM' | 'XI-ABM'   // SHS Gr 11
  | 'XII-GAS' | 'XII-HUMSS' | 'XII-STEM' | 'XII-ABM'; // SHS Gr 12

export interface ClassRecord {
  id: string;             // UUID; sections are immutable across SYs
  sy: SchoolYearCode;
  gradeLevel: GradeLevel;
  sectionName: string;    // e.g. "St. John Vianney"
  adviser: Teacher;
  curriculum: string;     // e.g. "Kto12-B"
  studentLrns: string[];  // 12-digit LRNs of enrolled students
}
```

- [ ] **Step 5: Create `app/src/types/student.ts`**

```ts
import type { GradeLevel } from './class';
import type { SchoolYearCode } from './schoolYear';

export type Gender = 'Male' | 'Female';

export type EnrolmentAction = 'promoted' | 'retained' | 'irregular';

export interface CredentialStatus {
  bc: 'on-file' | 'pending' | 'na';   // Birth Certificate
  bp: 'on-file' | 'pending' | 'na';   // Baptismal
  hc: 'on-file' | 'pending' | 'na';   // Health Cert
  pix: 'on-file' | 'pending' | 'na';  // 1x1 photo
  rf: 'on-file' | 'pending' | 'na';   // Recommendation Form
  f137: 'on-file' | 'pending' | 'na'; // Form 137
  rc: 'on-file' | 'pending' | 'na';   // Report Card
  gmc: 'on-file' | 'pending' | 'na';  // Good Moral
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
  lrn: string;            // 12-digit
  studentNo: string;      // legacy NPS internal: YY1YY2{seq}
  firstName: string;
  middleName: string;     // full middle/maternal surname (legacy "M.I." mislabeled)
  lastName: string;
  extension: string;      // suffix (Jr, II, III) — may be empty
  gender: Gender;
  birthdate: string;      // ISO YYYY-MM-DD
  religion: string;       // e.g. "Roman Catholic"

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
  loyaltyYears: number;   // years of continuous NPS enrollment

  // grades by SY (only the current SY is displayed in the prototype)
  grades: Record<SchoolYearCode, QuarterGrade[]>;

  // credentials (per current SY)
  credentials: CredentialStatus;

  // standardized tests (only populated for eligible grade levels)
  ncae?: { gmc?: number; fil?: number; mapeh?: number; total?: number };
  nat?: { fil?: number };
}
```

- [ ] **Step 6: Create `app/src/types/index.ts`**

```ts
export type * from './schoolYear';
export type * from './teacher';
export type * from './subject';
export type * from './class';
export type * from './student';
```

- [ ] **Step 7: Verify types compile**

From `app/`:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/src/types/
git commit -m "feat(app): define domain types (Student, Class, Teacher, SY, Subject)"
```

---

## Task 5: Build LRN parser with TDD

**Files:**
- Create: `app/src/lib/lrn.ts`, `app/src/lib/__tests__/lrn.test.ts`

Background: per the legacy catalog (Batch 11), the DepEd LRN's first 6 digits encode the student's school of original enrollment. Verified via the NAT page where the `SCHOOL ID` column equals `LRN[0:6]` for every row. We expose helpers for this derivation.

- [ ] **Step 1: Write failing tests**

Create `app/src/lib/__tests__/lrn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseLrn, isValidLrn, schoolIdFromLrn } from '../lrn';

describe('LRN parsing', () => {
  it('rejects LRNs that are not exactly 12 digits', () => {
    expect(isValidLrn('40387524000')).toBe(false);   // 11 digits
    expect(isValidLrn('4038752400011')).toBe(false); // 13 digits
    expect(isValidLrn('40387524000a')).toBe(false);  // non-digit
    expect(isValidLrn('')).toBe(false);
  });

  it('accepts a well-formed 12-digit LRN', () => {
    expect(isValidLrn('403875240001')).toBe(true);
  });

  it('extracts the school ID as the first 6 digits', () => {
    expect(schoolIdFromLrn('403875240001')).toBe('403875');
    expect(schoolIdFromLrn('436534240018')).toBe('436534');
  });

  it('throws on invalid LRN when extracting school ID', () => {
    expect(() => schoolIdFromLrn('invalid')).toThrow();
  });

  it('parseLrn returns school ID, year segment, and sequence', () => {
    expect(parseLrn('403875240001')).toEqual({
      schoolId: '403875',
      yearSegment: '24',
      sequence: '0001',
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

From `app/`:

```bash
npm run test -- lrn
```

Expected: FAIL — `parseLrn`/`isValidLrn`/`schoolIdFromLrn` not exported.

- [ ] **Step 3: Implement `app/src/lib/lrn.ts`**

```ts
const LRN_REGEX = /^\d{12}$/;

export function isValidLrn(lrn: string): boolean {
  return LRN_REGEX.test(lrn);
}

export function schoolIdFromLrn(lrn: string): string {
  if (!isValidLrn(lrn)) {
    throw new Error(`Invalid LRN: ${lrn}`);
  }
  return lrn.slice(0, 6);
}

export interface ParsedLrn {
  schoolId: string;       // first 6 digits — original school of enrollment
  yearSegment: string;    // digits 7-8 — encodes SY
  sequence: string;       // digits 9-12 — student sequence at that school
}

export function parseLrn(lrn: string): ParsedLrn {
  if (!isValidLrn(lrn)) {
    throw new Error(`Invalid LRN: ${lrn}`);
  }
  return {
    schoolId: lrn.slice(0, 6),
    yearSegment: lrn.slice(6, 8),
    sequence: lrn.slice(8, 12),
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- lrn
```

Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/src/lib/
git commit -m "feat(app): add LRN parser (school ID derivation per Batch 11)"
```

---

## Task 6: Build name and date formatters with TDD

**Files:**
- Create: `app/src/lib/format.ts`, `app/src/lib/__tests__/format.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/src/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatFullName,
  formatLastFirstMiddle,
  formatBirthdate,
  ageOnDate,
} from '../format';

describe('Name formatting', () => {
  it('formats full name as Last, First Middle', () => {
    expect(
      formatLastFirstMiddle({
        firstName: 'Marcuz Karmelo',
        middleName: 'Delos Reyes',
        lastName: 'Abordo',
      }),
    ).toBe('ABORDO, Marcuz Karmelo Delos Reyes');
  });

  it('handles names with extension', () => {
    expect(
      formatLastFirstMiddle({
        firstName: 'Juan',
        middleName: 'Cruz',
        lastName: 'Dela Cruz',
        extension: 'Jr.',
      }),
    ).toBe('DELA CRUZ, Juan Cruz, Jr.');
  });

  it('First Middle Last without comma format', () => {
    expect(
      formatFullName({
        firstName: 'Marcuz Karmelo',
        middleName: 'Delos Reyes',
        lastName: 'Abordo',
      }),
    ).toBe('Marcuz Karmelo Delos Reyes Abordo');
  });
});

describe('Birthdate formatting', () => {
  it('formats ISO date as locale-friendly', () => {
    expect(formatBirthdate('2019-03-03')).toBe('3 Mar 2019');
  });

  it('age on a given reference date', () => {
    // Marcuz born 2019-03-03; on 2026-05-04 he is 7
    expect(ageOnDate('2019-03-03', '2026-05-04')).toBe(7);
    // Edge: birthday hasn't passed yet this year
    expect(ageOnDate('2019-06-15', '2026-05-04')).toBe(6);
    // Edge: exactly birthday
    expect(ageOnDate('2019-05-04', '2026-05-04')).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test -- format
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `app/src/lib/format.ts`**

```ts
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface NameParts {
  firstName: string;
  middleName: string;
  lastName: string;
  extension?: string;
}

export function formatLastFirstMiddle(p: NameParts): string {
  const ext = p.extension ? `, ${p.extension}` : '';
  return `${p.lastName.toUpperCase()}, ${p.firstName} ${p.middleName}${ext}`.trim();
}

export function formatFullName(p: NameParts): string {
  const ext = p.extension ? ` ${p.extension}` : '';
  return `${p.firstName} ${p.middleName} ${p.lastName}${ext}`.trim();
}

export function formatBirthdate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

export function ageOnDate(birthIso: string, refIso: string): number {
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ry, rm, rd] = refIso.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- format
```

Expected: PASS (5/5 — 3 name + 2 birthdate).

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/src/lib/
git commit -m "feat(app): add name and date formatters"
```

---

## Task 7: Create mock fixture data

**Files:**
- Create: `app/src/mocks/schoolYears.ts`, `app/src/mocks/teachers.ts`, `app/src/mocks/subjects.ts`, `app/src/mocks/classes.ts`, `app/src/mocks/students.ts`, `app/src/mocks/index.ts`

- [ ] **Step 1: Create `app/src/mocks/schoolYears.ts`**

```ts
import type { SchoolYear } from '@/types';

export const schoolYears: SchoolYear[] = [
  { code: '2024-2025', label: 'SY 2024–2025', startDate: '2024-08-26', endDate: '2025-04-04', isActive: false },
  { code: '2025-2026', label: 'SY 2025–2026', startDate: '2025-08-25', endDate: '2026-04-03', isActive: true },
  { code: '2026-2027', label: 'SY 2026–2027', startDate: '2026-08-24', endDate: '2027-04-02', isActive: false },
];
```

- [ ] **Step 2: Create `app/src/mocks/teachers.ts`**

```ts
import type { Teacher } from '@/types';

// Mrs. Juliet P. De Vela is the real adviser of Grade I · St. John Vianney
// per Batch 11 catalog. Other teachers are MOCK names plausibly suffixed.
export const teachers: Teacher[] = [
  {
    id: 14, title: 'Mrs.', familyName: 'De Vela', firstName: 'Juliet', middleInitial: 'P.',
    email: 'jdevela@nps.edu.ph', yearStarted: 2008, yearEnded: 0,
    isAdviser: true, curriculum: 'Kto12-B',
  },
  {
    id: 7, title: 'Mr.', familyName: 'Reyes', firstName: 'Mark Anthony', middleInitial: 'C.',
    email: 'mreyes@nps.edu.ph', yearStarted: 2012, yearEnded: 0,
    isAdviser: true, curriculum: 'Kto12-B',
  },
  {
    id: 22, title: 'Ms.', familyName: 'Cruz', firstName: 'Andrea Beatriz', middleInitial: 'L.',
    email: 'acruz@nps.edu.ph', yearStarted: 2015, yearEnded: 0,
    isAdviser: true, curriculum: 'Kto12-B',
  },
  {
    id: 31, title: 'Mr.', familyName: 'Santos', firstName: 'Joaquin', middleInitial: 'D.',
    email: 'jsantos@nps.edu.ph', yearStarted: 2010, yearEnded: 0,
    isAdviser: true, curriculum: 'Kto12-B',
  },
  {
    id: 45, title: 'Mrs.', familyName: 'Buenaflor', firstName: 'Maricar', middleInitial: 'F.',
    email: 'mbuenaflor@nps.edu.ph', yearStarted: 2007, yearEnded: 0,
    isAdviser: true, curriculum: 'Kto12-B',
  },
];
```

- [ ] **Step 3: Create `app/src/mocks/subjects.ts`**

```ts
import type { Subject } from '@/types';

// 3-letter subject codes from legacy catalog (Batch 9). Subset used in mocks.
export const subjects: Subject[] = [
  { code: 'CLE', fullName: 'Christian Living Education', abbreviation: 'CLE', category: 'Core' },
  { code: 'LAN', fullName: 'Language', abbreviation: 'Lang', category: 'Core' },
  { code: 'REA', fullName: 'Reading', abbreviation: 'Rdg', category: 'Core' },
  { code: 'MAT', fullName: 'Mathematics', abbreviation: 'Math', category: 'Core' },
  { code: 'FIL', fullName: 'Filipino', abbreviation: 'Fil', category: 'Core' },
  { code: 'MAPEH', fullName: 'MAPEH', abbreviation: 'MAPEH', category: 'Core' },
  { code: 'SCI', fullName: 'Science', abbreviation: 'Sci', category: 'Core' },
  { code: 'ESP', fullName: 'Edukasyon sa Pagpapakatao', abbreviation: 'EsP', category: 'Core' },
  { code: 'EPP', fullName: 'Edukasyong Pantahanan at Pangkabuhayan', abbreviation: 'EPP', category: 'Core' },
  { code: 'GMC', fullName: 'Good Moral Conduct', abbreviation: 'GMC', category: 'Core' },
];
```

- [ ] **Step 4: Create `app/src/mocks/classes.ts`**

```ts
import type { ClassRecord } from '@/types';
import { teachers } from './teachers';

// Real SY 2025-2026 Grade I · St. John Vianney class, plus a few mocks for
// other grade levels so the sidebar / classes list has variety to test.
export const classes: ClassRecord[] = [
  {
    id: 'cls-grade1-vianney-2526',
    sy: '2025-2026',
    gradeLevel: 'I',
    sectionName: 'St. John Vianney',
    adviser: teachers[0],
    curriculum: 'Kto12-B',
    studentLrns: [
      '403875240001', '403870240018', '403875240028', '403875240010',
      '403875240029', '410553240008', '403875240031', '403875240011',
      '403875240035', '403875240005', '433591240005', '403875240021',
      '403875240041', '436513240035', '410553240015', '403875240008',
      '436534240018',
    ],
  },
  {
    id: 'cls-grade1-camillus-2526',
    sy: '2025-2026', gradeLevel: 'I', sectionName: 'St. Camillus de Lellis',
    adviser: teachers[2], curriculum: 'Kto12-B', studentLrns: [],
  },
  {
    id: 'cls-grade7-padrepio-2526',
    sy: '2025-2026', gradeLevel: 'VII', sectionName: 'San Pedro Calungsod',
    adviser: teachers[1], curriculum: 'Kto12-B', studentLrns: [],
  },
  {
    id: 'cls-grade11-padrepio-2526',
    sy: '2025-2026', gradeLevel: 'XI-GAS', sectionName: 'St. Padre Pio',
    adviser: teachers[3], curriculum: 'Kto12-B', studentLrns: [],
  },
  {
    id: 'cls-spedgerald-2526',
    sy: '2025-2026', gradeLevel: 'S', sectionName: 'St. Gerald',
    adviser: teachers[4], curriculum: 'Kto12-B', studentLrns: [],
  },
];
```

- [ ] **Step 5: Create `app/src/mocks/students.ts`**

This is the long one — 17 real students from the catalog. Mock parents/addresses/contacts because they weren't visible in screenshots.

```ts
import type { Student } from '@/types';

// MOCK note: parent names, addresses, contact numbers, and grades are
// plausibly faked. Names, LRNs, birthdates, gender are real per legacy
// catalog Batch 11 + 12 (Grade I · St. John Vianney roster).

const SY = '2025-2026' as const;
const CLS = 'cls-grade1-vianney-2526';
const CURR = 'Kto12-B';

const blankCredentials = {
  bc: 'on-file', bp: 'on-file', hc: 'pending', pix: 'on-file',
  rf: 'on-file', f137: 'na', rc: 'na', gmc: 'na',
} as const;

export const students: Student[] = [
  {
    lrn: '403875240001', studentNo: '252600013',
    firstName: 'Marcuz Karmelo', middleName: 'Delos Reyes',
    lastName: 'Abordo', extension: '',
    gender: 'Male', birthdate: '2019-03-03', religion: 'Roman Catholic',
    address: 'Concepcion Pequeña, Naga City, Camarines Sur',
    contactNumber: '0917 123 4567',
    fatherName: 'Mark Anthony Abordo',
    motherMaidenName: 'Maria Lourdes Delos Reyes',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [],
    loyaltyYears: 1,
    grades: { '2025-2026': [] },
    credentials: { ...blankCredentials },
  },
  {
    lrn: '403870240018', studentNo: '252600014',
    firstName: 'Cris Kendrick', middleName: 'Delloro',
    lastName: 'Baylon', extension: '',
    gender: 'Male', birthdate: '2019-07-24', religion: 'Roman Catholic',
    address: 'Triangulo, Naga City, Camarines Sur',
    contactNumber: '0917 234 5678',
    fatherName: 'Kenneth Baylon',
    motherMaidenName: 'Janelle Delloro',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [],
    loyaltyYears: 1,
    grades: { '2025-2026': [] },
    credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240028', studentNo: '252600015',
    firstName: 'Joseph Maximus', middleName: 'Francia',
    lastName: 'Fernandez', extension: '',
    gender: 'Male', birthdate: '2019-09-20', religion: 'Roman Catholic',
    address: 'Pacol, Naga City, Camarines Sur',
    contactNumber: '0917 345 6789',
    fatherName: 'Joseph Fernandez Sr.',
    motherMaidenName: 'Maria Francia',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240010', studentNo: '252600016',
    firstName: 'Michael Cairo', middleName: 'Araguirang',
    lastName: 'Gagalac', extension: '',
    gender: 'Male', birthdate: '2018-05-06', religion: 'Roman Catholic',
    address: 'San Felipe, Naga City, Camarines Sur',
    contactNumber: '0917 456 7890',
    fatherName: 'Cairo Gagalac',
    motherMaidenName: 'Lorena Araguirang',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240029', studentNo: '252600017',
    firstName: 'Santino Reigh', middleName: 'San Vicente',
    lastName: 'Moises', extension: '',
    gender: 'Male', birthdate: '2019-01-18', religion: 'Roman Catholic',
    address: 'Sabang, Naga City, Camarines Sur',
    contactNumber: '0917 567 8901',
    fatherName: 'Reynaldo Moises',
    motherMaidenName: 'Cristina San Vicente',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '410553240008', studentNo: '252600018',
    firstName: 'Austin Sage', middleName: 'Cea',
    lastName: 'Palmaria', extension: '',
    gender: 'Male', birthdate: '2019-02-25', religion: 'Roman Catholic',
    address: 'Calauag, Naga City, Camarines Sur',
    contactNumber: '0917 678 9012',
    fatherName: 'Augusto Palmaria',
    motherMaidenName: 'Sandra Cea',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240031', studentNo: '252600019',
    firstName: 'Alonzo Lukas', middleName: 'Gueriña',
    lastName: 'Repane', extension: '',
    gender: 'Male', birthdate: '2019-02-28', religion: 'Roman Catholic',
    address: 'Bagumbayan Sur, Naga City, Camarines Sur',
    contactNumber: '0917 789 0123',
    fatherName: 'Luis Repane',
    motherMaidenName: 'Anna Gueriña',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240011', studentNo: '252600020',
    firstName: 'Elicho Sebee', middleName: 'Gimpaya',
    lastName: 'Agullo', extension: '',
    gender: 'Female', birthdate: '2018-12-14', religion: 'Roman Catholic',
    address: 'Penafrancia, Naga City, Camarines Sur',
    contactNumber: '0917 890 1234',
    fatherName: 'Eli Agullo',
    motherMaidenName: 'Bea Gimpaya',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240035', studentNo: '252600021',
    firstName: 'Chloe Jane', middleName: 'Gomez',
    lastName: 'Camacho', extension: '',
    gender: 'Female', birthdate: '2018-11-25', religion: 'Roman Catholic',
    address: 'San Francisco, Naga City, Camarines Sur',
    contactNumber: '0918 111 2222',
    fatherName: 'Carlo Camacho',
    motherMaidenName: 'Janelle Gomez',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240005', studentNo: '252600022',
    firstName: 'Thea Ellisha', middleName: 'Solis',
    lastName: 'Conor', extension: '',
    gender: 'Female', birthdate: '2018-11-27', religion: 'Roman Catholic',
    address: 'Tinago, Naga City, Camarines Sur',
    contactNumber: '0918 222 3333',
    fatherName: 'Thomas Conor',
    motherMaidenName: 'Elsa Solis',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '433591240005', studentNo: '252600023',
    firstName: 'Jiana Kylee', middleName: 'Escober',
    lastName: 'Estrada', extension: '',
    gender: 'Female', birthdate: '2019-08-22', religion: 'Roman Catholic',
    address: 'Dayangdang, Naga City, Camarines Sur',
    contactNumber: '0918 333 4444',
    fatherName: 'Jorge Estrada',
    motherMaidenName: 'Karina Escober',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240021', studentNo: '252600024',
    firstName: 'Savina Mariche', middleName: 'Turiano',
    lastName: 'Gerez', extension: '',
    gender: 'Female', birthdate: '2018-11-09', religion: 'Roman Catholic',
    address: 'Lerma, Naga City, Camarines Sur',
    contactNumber: '0918 444 5555',
    fatherName: 'Gabriel Gerez',
    motherMaidenName: 'Marisol Turiano',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240041', studentNo: '252600025',
    firstName: 'Ysabella', middleName: 'Razon',
    lastName: 'Gonzales', extension: '',
    gender: 'Female', birthdate: '2018-10-26', religion: 'Roman Catholic',
    address: 'Concepcion Grande, Naga City, Camarines Sur',
    contactNumber: '0918 555 6666',
    fatherName: 'Rodrigo Gonzales',
    motherMaidenName: 'Belinda Razon',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '436513240035', studentNo: '252600026',
    firstName: 'Patricia Ysabelle', middleName: 'Occiano',
    lastName: 'Molaer', extension: '',
    gender: 'Female', birthdate: '2019-05-12', religion: 'Roman Catholic',
    address: 'Cararayan, Naga City, Camarines Sur',
    contactNumber: '0918 666 7777',
    fatherName: 'Patrick Molaer',
    motherMaidenName: 'Yvette Occiano',
    guardianRelation: 'Mother',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '410553240015', studentNo: '252600027',
    firstName: 'Andrea Mae', middleName: 'Apagar',
    lastName: 'Puri', extension: '',
    gender: 'Female', birthdate: '2018-08-30', religion: 'Roman Catholic',
    address: 'Mabolo, Naga City, Camarines Sur',
    contactNumber: '0918 777 8888',
    fatherName: 'Antonio Puri',
    motherMaidenName: 'Maricel Apagar',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '403875240008', studentNo: '252600028',
    firstName: 'Bella Louise', middleName: 'Nocomura',
    lastName: 'Sumangid', extension: '',
    gender: 'Female', birthdate: '2019-01-07', religion: 'Roman Catholic',
    address: 'Liboton, Naga City, Camarines Sur',
    contactNumber: '0918 888 9999',
    fatherName: 'Bernardo Sumangid',
    motherMaidenName: 'Naomi Nocomura',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
  {
    lrn: '436534240018', studentNo: '252600029',
    firstName: 'Alex Andrea', middleName: 'Fernandez',
    lastName: 'Talavera', extension: '',
    gender: 'Female', birthdate: '2018-12-02', religion: 'Roman Catholic',
    address: 'Igualdad, Naga City, Camarines Sur',
    contactNumber: '0918 999 0000',
    fatherName: 'Allan Talavera',
    motherMaidenName: 'Andrea Fernandez',
    guardianRelation: 'Father',
    currentSY: SY, currentClassId: CLS, curriculum: CURR, status: 'Active',
    elemSchoolGraduatedFrom: '', schoolType: '',
    enrolmentHistory: [], loyaltyYears: 1,
    grades: { '2025-2026': [] }, credentials: { ...blankCredentials },
  },
];
```

- [ ] **Step 6: Create `app/src/mocks/index.ts`**

```ts
export { schoolYears } from './schoolYears';
export { teachers } from './teachers';
export { subjects } from './subjects';
export { classes } from './classes';
export { students } from './students';
```

- [ ] **Step 7: Verify mocks compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/src/mocks/
git commit -m "feat(app): add mock fixture data (Grade I · St. John Vianney roster + classes)"
```

---

## Task 8: Install shadcn/ui base primitives

**Files:**
- Create: `app/components.json`, `app/src/lib/utils.ts`, and individual `app/src/components/ui/*.tsx` files

- [ ] **Step 1: Init shadcn/ui**

From `app/`:

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Stone** (warm neutrals match Style A; we override anyway)
- CSS variables: **Yes**

Expected: `app/components.json` and `app/src/lib/utils.ts` created. `app/src/index.css` gets shadcn CSS variables appended (we'll keep them; they sit alongside Style A custom colors and don't conflict).

- [ ] **Step 2: Install Button, Input, Badge, DropdownMenu, Tabs, Dialog, Tooltip**

```bash
npx shadcn@latest add button input badge dropdown-menu tabs dialog tooltip
```

Expected: 7 component files in `app/src/components/ui/`.

- [ ] **Step 3: Override Button variants to use Style A tokens**

Edit `app/src/components/ui/button.tsx`. Replace the `buttonVariants` `cva` call's `variants.variant` block so primary/default uses our `accent` color and outline uses our `border`:

Find the `variant` block (it currently looks like `variant: { default: 'bg-primary ...', outline: 'border ...' }`) and replace just that block with:

```ts
variant: {
  default: 'bg-accent text-white hover:bg-accent/90',
  outline: 'border border-border bg-panel text-ink-primary hover:bg-app',
  ghost: 'hover:bg-app text-ink-primary',
  destructive: 'bg-pending-fg text-white hover:bg-pending-fg/90',
  secondary: 'bg-panel-alt text-ink-primary hover:bg-app',
  link: 'text-ink-primary underline-offset-4 hover:underline',
},
```

Leave `size` variants as-is.

- [ ] **Step 4: Verify Button renders with Style A colors**

Replace `app/src/App.tsx` temporarily with:

```tsx
import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="p-6 space-y-3">
      <Button>Primary (near-black)</Button>
      <Button variant="outline">Outline (cream border)</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}
```

Run `npm run dev`. Expected:
- Primary button has near-black `#1f1f1b` background, white text
- Outline button has cream `#e7e3da` border on white panel background
- Ghost has no border; hover applies app-bg

Stop the server.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): install shadcn/ui primitives, retheme Button to Style A"
```

---

## Task 9: Build app shell — Sidebar, SchoolYearSelector, AppShell, Breadcrumb

**Files:**
- Create: `app/src/components/shell/Sidebar.tsx`, `app/src/components/shell/SchoolYearSelector.tsx`, `app/src/components/shell/AppShell.tsx`, `app/src/components/shell/Breadcrumb.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Create `app/src/components/shell/SchoolYearSelector.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { schoolYears } from '@/mocks';
import type { SchoolYear } from '@/types';

interface Props {
  value: SchoolYear;
  onChange: (sy: SchoolYear) => void;
}

export function SchoolYearSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-panel border border-border rounded text-xs text-ink-secondary hover:bg-panel-alt"
      >
        <span>{value.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded shadow-sm z-10">
          {schoolYears.map(sy => (
            <button
              key={sy.code}
              onClick={() => { onChange(sy); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-ink-secondary hover:bg-app first:rounded-t last:rounded-b"
            >
              {sy.label}{sy.isActive && <span className="ml-2 text-ok-fg">· current</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Install `lucide-react`:

```bash
cd app && npm install lucide-react
```

- [ ] **Step 2: Create `app/src/components/shell/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { Users, GraduationCap, UserCog, Settings, BarChart3 } from 'lucide-react';
import { SchoolYearSelector } from './SchoolYearSelector';
import type { SchoolYear } from '@/types';

interface Props {
  currentSY: SchoolYear;
  onSYChange: (sy: SchoolYear) => void;
}

const navItems = [
  { to: '/students', label: 'Students', icon: Users },
  { to: '/classes', label: 'Classes', icon: GraduationCap },
  { to: '/teachers', label: 'Teachers', icon: UserCog },
  { to: '/setup', label: 'Setup', icon: Settings },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ currentSY, onSYChange }: Props) {
  return (
    <aside className="w-[200px] shrink-0 bg-sidebar border-r border-border p-3 flex flex-col gap-3 h-full">
      <div className="px-1 py-1 text-[11px] font-bold tracking-[0.04em] text-ink-primary">
        NPS REGISTRAR
      </div>
      <SchoolYearSelector value={currentSY} onChange={onSYChange} />
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 px-2.5 py-2 rounded text-[12.5px]',
                isActive
                  ? 'bg-accent text-white'
                  : 'text-ink-secondary hover:bg-panel/60',
              ].join(' ')
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-3 border-t border-border-soft text-[11px] text-ink-muted px-1">
        Mocked: Registrar
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create `app/src/components/shell/Breadcrumb.tsx`**

```tsx
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-[11.5px] text-ink-muted mb-2">
      {items.map((item, i) => (
        <span key={i}>
          {item.to ? (
            <Link to={item.to} className="hover:text-ink-secondary">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-1.5">›</span>}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Create `app/src/components/shell/AppShell.tsx`**

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { schoolYears } from '@/mocks';
import type { SchoolYear } from '@/types';

const activeSY = schoolYears.find(sy => sy.isActive)!;

export function AppShell() {
  const [currentSY, setCurrentSY] = useState<SchoolYear>(activeSY);
  return (
    <div className="flex h-screen bg-app">
      <Sidebar currentSY={currentSY} onSYChange={setCurrentSY} />
      <main className="flex-1 overflow-auto">
        <div className="px-7 py-6 max-w-[1280px]">
          <Outlet context={{ currentSY }} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Install React Router**

```bash
cd app && npm install react-router-dom
```

- [ ] **Step 6: Wire up routes in `app/src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';

// placeholder route components for now
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-ink-primary">{title}</h1>
      <p className="text-sm text-ink-secondary mt-1">Coming up in a later task.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/students" replace />} />
          <Route path="students" element={<PlaceholderPage title="Students" />} />
          <Route path="classes" element={<PlaceholderPage title="Classes" />} />
          <Route path="teachers" element={<PlaceholderPage title="Teachers" />} />
          <Route path="setup" element={<PlaceholderPage title="Setup" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Visual verify**

```bash
cd app && npm run dev
```

Open http://localhost:5173. Expected:
- 200px sidebar on the left, cream background, "NPS REGISTRAR" wordmark on top
- SY 2025–2026 selector below; clicking opens dropdown with 3 school years
- 5 nav items (Students/Classes/Teachers/Setup/Reports) with Lucide icons
- "Students" highlighted (near-black pill) — auto-redirected from `/`
- Clicking nav items changes the URL and active highlight
- Main area shows placeholder titles per route

Stop server.

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): build app shell (Sidebar, SY selector, router)"
```

---

## Task 10: Build entity primitives (EntityRail, SectionCard, KeyValueGrid, StatusBadge)

**Files:**
- Create: `app/src/components/entity/EntityRail.tsx`, `app/src/components/entity/SectionCard.tsx`, `app/src/components/entity/KeyValueGrid.tsx`, `app/src/components/entity/StatusBadge.tsx`

- [ ] **Step 1: Create `app/src/components/entity/StatusBadge.tsx`**

```tsx
import type { ReactNode } from 'react';

type Tone = 'ok' | 'pending' | 'na';

const toneClasses: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  pending: 'bg-pending-bg text-pending-fg',
  na: 'bg-na-bg text-na-fg',
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create `app/src/components/entity/KeyValueGrid.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface KVRow {
  label: string;
  value: ReactNode;
}

export function KeyValueGrid({ rows, columns = 2 }: { rows: KVRow[]; columns?: 1 | 2 }) {
  const cls = columns === 2 ? 'grid grid-cols-2 gap-x-4' : 'flex flex-col';
  return (
    <div className={cls}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 py-2 px-1 text-[12.5px] border-b border-border-soft last:border-0"
        >
          <span className="text-ink-secondary shrink-0">{r.label}</span>
          <span className="text-ink-primary font-medium text-right">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `app/src/components/entity/SectionCard.tsx`**

```tsx
import type { ReactNode } from 'react';

export function SectionCard({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-panel border border-border rounded-md p-4"
    >
      <h2 className="text-label uppercase font-bold text-ink-muted mb-2.5">
        {heading}
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Create `app/src/components/entity/EntityRail.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface RailAnchor {
  id: string;
  label: string;
}

export function EntityRail({
  avatar,
  name,
  subtitle,
  ids,
  actions,
  anchors,
  activeAnchor,
}: {
  avatar: ReactNode;
  name: string;
  subtitle: string;
  ids: { label: string; value: ReactNode }[];
  actions: ReactNode;
  anchors: RailAnchor[];
  activeAnchor?: string;
}) {
  return (
    <aside className="w-[240px] shrink-0 bg-panel border border-border rounded-md p-4 self-start sticky top-6">
      <div className="flex justify-center mb-2.5">{avatar}</div>
      <div className="text-center font-bold text-[14px] text-ink-primary">{name}</div>
      <div className="text-center text-[11.5px] text-ink-secondary mb-3">{subtitle}</div>

      <div className="border-t border-border-soft pt-2.5 mb-3">
        {ids.map((row, i) => (
          <div key={i} className="flex justify-between text-[11.5px] py-1">
            <span className="text-ink-muted">{row.label}</span>
            <span className="text-ink-primary">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border-soft pt-2.5 mb-3 flex flex-col gap-1.5">
        {actions}
      </div>

      <div className="border-t border-border-soft pt-2.5 flex flex-col">
        {anchors.map(a => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className={[
              'block px-2 py-1.5 rounded text-[12px]',
              a.id === activeAnchor
                ? 'bg-sidebar text-ink-primary font-semibold'
                : 'text-ink-secondary hover:bg-app',
            ].join(' ')}
          >
            {a.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Quick visual smoke (no commit yet)**

We'll exercise these in Task 11. Just verify they typecheck:

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/src/components/entity/
git commit -m "feat(app): add entity-page primitives (EntityRail, SectionCard, KeyValueGrid, StatusBadge)"
```

---

## Task 11: Build Student detail page

**Files:**
- Create: `app/src/routes/students/StudentDetail.tsx`, `app/src/lib/studentLookup.ts`
- Modify: `app/src/App.tsx` (replace Students placeholder with the new routes)

- [ ] **Step 1: Create lookup helper `app/src/lib/studentLookup.ts`**

```ts
import { students, classes } from '@/mocks';
import type { Student, ClassRecord } from '@/types';

export function getStudentByLrn(lrn: string): Student | undefined {
  return students.find(s => s.lrn === lrn);
}

export function getClassById(id: string): ClassRecord | undefined {
  return classes.find(c => c.id === id);
}
```

- [ ] **Step 2: Create `app/src/routes/students/StudentDetail.tsx`**

```tsx
import { useParams, Link } from 'react-router-dom';
import { Pencil, Printer, FileText, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { KeyValueGrid } from '@/components/entity/KeyValueGrid';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { getStudentByLrn, getClassById } from '@/lib/studentLookup';
import { formatLastFirstMiddle, formatBirthdate, ageOnDate } from '@/lib/format';

const REF_DATE = '2026-05-04'; // mocked "today"

const credLabels: Record<string, string> = {
  bc: 'BC · Birth Certificate',
  bp: 'BP · Baptismal',
  hc: 'HC · Health Cert',
  pix: 'Pix · 1×1 Photo',
  rf: 'RF · Recommendation Form',
  f137: 'F137 · Form 137',
  rc: 'RC · Report Card',
  gmc: 'GMC · Good Moral',
};

const credTone = (s: 'on-file' | 'pending' | 'na') =>
  s === 'on-file' ? 'ok' : s === 'pending' ? 'pending' : 'na';
const credText = (s: 'on-file' | 'pending' | 'na') =>
  s === 'on-file' ? 'on file' : s === 'pending' ? 'pending' : 'N/A';

export default function StudentDetail() {
  const { lrn } = useParams<{ lrn: string }>();
  const student = lrn ? getStudentByLrn(lrn) : undefined;

  if (!student) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No student with LRN {lrn}.</p>
      </div>
    );
  }

  const klass = getClassById(student.currentClassId);
  const fullName = formatLastFirstMiddle(student);
  const initials = student.firstName.charAt(0) + student.lastName.charAt(0);
  const age = ageOnDate(student.birthdate, REF_DATE);

  const anchors = [
    { id: 'profile', label: 'Profile' },
    { id: 'family', label: 'Family' },
    { id: 'enrolment', label: 'Enrolment history' },
    { id: 'grades', label: 'Grades' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'tests', label: 'Tests' },
  ];

  return (
    <>
      <Breadcrumb items={[
        { label: 'Students', to: '/students' },
        { label: fullName },
      ]} />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted font-bold text-[28px]">
              {initials}
            </div>
          }
          name={`${student.firstName} ${student.lastName}`}
          subtitle={klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—'}
          ids={[
            { label: 'LRN', value: student.lrn },
            { label: 'Student No.', value: student.studentNo },
            { label: 'Status', value: <StatusBadge tone="ok">{student.status}</StatusBadge> },
          ]}
          actions={
            <>
              <Button variant="outline" className="justify-start gap-2">
                <Pencil className="w-3.5 h-3.5" /> Edit profile
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Printer className="w-3.5 h-3.5" /> Print Report Card
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <IdCard className="w-3.5 h-3.5" /> Print ID
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <FileText className="w-3.5 h-3.5" /> Form 137
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <FileText className="w-3.5 h-3.5" /> SF 10
              </Button>
            </>
          }
          anchors={anchors}
          activeAnchor="profile"
        />
        <div className="flex flex-col gap-3.5 flex-1 min-w-0">
          <SectionCard id="profile" heading="Profile">
            <KeyValueGrid rows={[
              { label: 'Birthdate', value: `${formatBirthdate(student.birthdate)} (${age} yrs)` },
              { label: 'Gender', value: student.gender },
              { label: 'Religion', value: student.religion },
              { label: 'Address', value: student.address },
              { label: 'Contact', value: student.contactNumber },
              { label: 'Curriculum', value: student.curriculum },
            ]} />
          </SectionCard>

          <SectionCard id="family" heading="Family">
            <KeyValueGrid rows={[
              { label: 'Father', value: student.fatherName },
              { label: 'Mother (maiden)', value: student.motherMaidenName },
              { label: 'Guardian', value: student.guardianRelation },
              { label: 'Parent contact', value: student.contactNumber },
            ]} />
          </SectionCard>

          <SectionCard id="enrolment" heading="Enrolment">
            <KeyValueGrid rows={[
              { label: 'Current SY', value: student.currentSY },
              { label: 'Class', value: klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—' },
              { label: 'Adviser', value: klass ? `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}` : '—' },
              { label: 'Loyalty Years', value: `${student.loyaltyYears}` },
              { label: 'Origin School', value: student.elemSchoolGraduatedFrom || '— (first year at NPS)' },
              { label: 'School Type', value: student.schoolType || '—' },
            ]} />
          </SectionCard>

          <SectionCard id="grades" heading="Grades — SY 2025–2026">
            <p className="text-[12.5px] text-ink-secondary px-1">
              No grades encoded yet. Encoding window opens after the 1st quarter end date.
            </p>
          </SectionCard>

          <SectionCard id="credentials" heading="Credentials">
            <KeyValueGrid rows={Object.entries(student.credentials).map(([key, status]) => ({
              label: credLabels[key] ?? key,
              value: <StatusBadge tone={credTone(status)}>{credText(status)}</StatusBadge>,
            }))} />
          </SectionCard>

          <SectionCard id="tests" heading="Standardized tests">
            <p className="text-[12.5px] text-ink-secondary px-1">
              {klass && ['I','II','III','IV','V','VI'].includes(klass.gradeLevel)
                ? 'NCAE / NAT not applicable for this grade level.'
                : 'No scores recorded.'}
            </p>
          </SectionCard>
        </div>
      </div>
      <p className="text-[10px] text-ink-muted mt-6">
        Tip: <Link className="underline" to="/students">return to list</Link>.
      </p>
    </>
  );
}
```

- [ ] **Step 3: Add Student detail route to `app/src/App.tsx`**

Replace the existing `<Route path="students" element={<PlaceholderPage title="Students" />} />` line with:

```tsx
<Route path="students" element={<PlaceholderPage title="Students" />} />
<Route path="students/:lrn" element={<StudentDetail />} />
```

And add to the imports at the top of `App.tsx`:

```tsx
import StudentDetail from '@/routes/students/StudentDetail';
```

- [ ] **Step 4: Visual verify**

Run dev server. Navigate to http://localhost:5173/students/403875240001 (Marcuz Karmelo Abordo). Expected:
- Sticky left rail with avatar (MA), name, "Grade I · St. John Vianney", LRN/Student No./Active badge, 5 action buttons, anchor nav (Profile · Family · Enrolment history · Grades · Credentials · Tests)
- Right side has 6 SectionCards with the student's data
- Credentials show: BC/BP/Pix/RF as "on file" (green), HC as "pending" (amber), F137/RC/GMC as "N/A" (gray)
- Standardized tests section says "NCAE / NAT not applicable for this grade level."
- Anchor links jump to corresponding sections
- Try a few more LRNs from the roster (e.g., `/students/403870240018`, `/students/436534240018`) — each renders correctly

Stop server.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): build Student detail page with two-column sticky-rail layout"
```

---

## Task 12: Build Students list page

**Files:**
- Create: `app/src/components/tables/DataTable.tsx`, `app/src/routes/students/StudentsList.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Create generic `DataTable` component**

`app/src/components/tables/DataTable.tsx`:

```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  searchableText: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  rightActions?: ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  searchableText,
  onRowClick,
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  rightActions,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(row => searchableText(row).toLowerCase().includes(q));
  }, [data, query, searchableText]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 h-8 text-[13px]"
          />
        </div>
        {rightActions && <div className="ml-auto flex gap-2">{rightActions}</div>}
      </div>
      <div className="bg-panel border border-border rounded-md overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-panel-alt border-b border-border">
              {columns.map(c => (
                <th
                  key={c.key}
                  className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted font-semibold px-3.5 py-2"
                  style={{ width: c.width }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3.5 py-6 text-center text-ink-secondary">
                  {emptyText}
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={[
                  'border-b border-border-soft last:border-0',
                  onRowClick ? 'cursor-pointer hover:bg-app' : '',
                ].join(' ')}
              >
                {columns.map(c => (
                  <td key={c.key} className="px-3.5 py-2 text-ink-primary">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted mt-2">
        {filtered.length} of {data.length} {data.length === 1 ? 'record' : 'records'}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/src/routes/students/StudentsList.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { students, classes } from '@/mocks';
import type { Student } from '@/types';
import { formatLastFirstMiddle } from '@/lib/format';

export default function StudentsList() {
  const navigate = useNavigate();

  const cols: Column<Student>[] = [
    { key: 'name', header: 'Name', width: '32%', render: s => formatLastFirstMiddle(s) },
    { key: 'lrn', header: 'LRN', width: '15%', render: s => <span className="font-mono">{s.lrn}</span> },
    {
      key: 'class',
      header: 'Class',
      width: '24%',
      render: s => {
        const c = classes.find(c => c.id === s.currentClassId);
        return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '—';
      },
    },
    { key: 'gender', header: 'Sex', width: '7%', render: s => s.gender.charAt(0) },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: s => <StatusBadge tone="ok">{s.status}</StatusBadge>,
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Students' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Students</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {students.length} learners in SY 2025–2026
        </p>
      </div>
      <DataTable<Student>
        data={students}
        columns={cols}
        searchableText={s => `${formatLastFirstMiddle(s)} ${s.lrn} ${s.studentNo}`}
        onRowClick={s => navigate(`/students/${s.lrn}`)}
        searchPlaceholder="Search by name, LRN, or Student No.…"
        rightActions={
          <Button>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
          </Button>
        }
      />
    </>
  );
}
```

- [ ] **Step 3: Update `app/src/App.tsx` Students route**

Replace the line `<Route path="students" element={<PlaceholderPage title="Students" />} />` with:

```tsx
<Route path="students" element={<StudentsList />} />
```

Add to imports: `import StudentsList from '@/routes/students/StudentsList';`

- [ ] **Step 4: Visual verify**

Run dev server. Navigate to http://localhost:5173/students. Expected:
- Page heading "Students" + "17 learners in SY 2025–2026"
- Search box + "+ Add Student" button right-aligned
- Table with 17 rows (all St. John Vianney roster), columns: Name · LRN · Class · Sex · Status
- Hover row: light background; cursor: pointer
- Click row: navigate to that student's detail page
- Type "abor" in search: only the Abordo row remains; "1 of 17 records" shown
- Type "403875240001" (LRN search): same result

Stop server.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): build Students list with search-first DataTable"
```

---

## Task 13: Build Class detail page (with tabbed sub-views)

**Files:**
- Create: `app/src/routes/classes/ClassDetail.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Create `app/src/routes/classes/ClassDetail.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { Printer, FileText, Users as UsersIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { classes, students } from '@/mocks';
import { schoolIdFromLrn } from '@/lib/lrn';
import { formatLastFirstMiddle } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

const TAB_KEYS = [
  'list', 'form1', 'pupils', 'idinfo', 'parents', 'credentials',
  'form5', 'ncae', 'nat', 'reportcard', 'esc', 'transferees',
] as const;

const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  list: 'List',
  form1: 'Form 1',
  pupils: 'Pupils',
  idinfo: 'ID Info',
  parents: 'Parents',
  credentials: 'Credentials',
  form5: 'Form 5',
  ncae: 'NCAE',
  nat: 'NAT',
  reportcard: 'Report Card',
  esc: 'ESC Billing',
  transferees: 'Transferees',
};

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const klass = classes.find(c => c.id === id);
  const navigate = useNavigate();

  if (!klass) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No class with id {id}.</p>
      </div>
    );
  }

  const roster = students.filter(s => klass.studentLrns.includes(s.lrn));
  const males = roster.filter(s => s.gender === 'Male');
  const females = roster.filter(s => s.gender === 'Female');
  const adviserName = `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`;

  return (
    <>
      <Breadcrumb items={[
        { label: 'Classes', to: '/classes' },
        { label: `Grade ${klass.gradeLevel} · ${klass.sectionName}` },
      ]} />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted font-bold text-[28px]">
              <UsersIcon className="w-9 h-9" />
            </div>
          }
          name={klass.sectionName}
          subtitle={`Grade ${klass.gradeLevel} · ${klass.sy}`}
          ids={[
            { label: 'Adviser', value: klass.adviser.familyName },
            { label: 'Curriculum', value: klass.curriculum },
            { label: 'Roster', value: <StatusBadge tone="ok">{roster.length} learners</StatusBadge> },
          ]}
          actions={
            <>
              <Button variant="outline" className="justify-start gap-2">
                <FileText className="w-3.5 h-3.5" /> Print Form 1
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <FileText className="w-3.5 h-3.5" /> Print Form 5
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Printer className="w-3.5 h-3.5" /> Print Report Cards
              </Button>
            </>
          }
          anchors={[]}
        />
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="list">
            <TabsList className="bg-panel border border-border-soft p-0.5 mb-3 overflow-x-auto flex w-full justify-start">
              {TAB_KEYS.map(k => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="data-[state=active]:bg-accent data-[state=active]:text-white text-[12px] px-3 py-1 whitespace-nowrap"
                >
                  {TAB_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="list">
              <SectionCard heading="Class List">
                <div className="grid grid-cols-2 gap-x-4">
                  <div>
                    <div className="bg-panel-alt -mx-4 px-4 py-2 border-b border-border text-label uppercase font-bold text-ink-muted">Male · {males.length}</div>
                    {males.map((s, i) => (
                      <div
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="flex gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span>{formatLastFirstMiddle(s)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="bg-panel-alt -mx-4 px-4 py-2 border-b border-border text-label uppercase font-bold text-ink-muted">Female · {females.length}</div>
                    {females.map((s, i) => (
                      <div
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="flex gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span>{formatLastFirstMiddle(s)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="form1">
              <SectionCard heading={`Form 1 — DepEd SF 1 (Adviser: ${adviserName})`}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">LRN</th>
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">Sex</th>
                      <th className="py-1.5 pr-3">Birthdate</th>
                      <th className="py-1.5 pr-3">Father</th>
                      <th className="py-1.5">Mother (maiden)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(s => (
                      <tr key={s.lrn} className="border-b border-border-soft">
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3">{s.gender.charAt(0)}</td>
                        <td className="py-1.5 pr-3">{s.birthdate}</td>
                        <td className="py-1.5 pr-3">{s.fatherName}</td>
                        <td className="py-1.5">{s.motherMaidenName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="nat">
              <SectionCard heading="NAT scores (DepEd National Achievement Test)">
                <p className="text-[12.5px] text-ink-secondary mb-3">
                  Grade {klass.gradeLevel} is not eligible for NAT. Page shown for completeness; SCHOOL ID column is derived from LRN[0:6].
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">LRN</th>
                      <th className="py-1.5 pr-3">School ID (from LRN)</th>
                      <th className="py-1.5">Filipino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(s => (
                      <tr key={s.lrn} className="border-b border-border-soft">
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3 font-mono text-ink-secondary">{schoolIdFromLrn(s.lrn)}</td>
                        <td className="py-1.5 text-ink-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            {(['pupils','idinfo','parents','credentials','form5','ncae','reportcard','esc','transferees'] as const).map(k => (
              <TabsContent key={k} value={k}>
                <SectionCard heading={TAB_LABELS[k]}>
                  <p className="text-[12.5px] text-ink-secondary">
                    Placeholder. Apply the same roster + per-tab columns pattern shown in
                    <span className="font-semibold"> List, Form 1,</span> and <span className="font-semibold">NAT</span> tabs.
                  </p>
                </SectionCard>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire up route**

In `app/src/App.tsx`, add the route under `<Route path="/" element={<AppShell />}>`:

```tsx
<Route path="classes/:id" element={<ClassDetail />} />
```

And import: `import ClassDetail from '@/routes/classes/ClassDetail';`

- [ ] **Step 3: Visual verify**

Run dev server. Navigate to http://localhost:5173/classes/cls-grade1-vianney-2526. Expected:
- Sticky rail: avatar, "St. John Vianney", "Grade I · 2025-2026", adviser/curriculum/roster IDs, 3 print actions
- Right side: 12 horizontal tabs, "List" active by default
- List tab: two columns Male (7) / Female (10), names sorted by section index, click name → navigate to student detail
- Form 1 tab: full table with 17 rows, all columns from legacy SF 1 schema (LRN/Name/Sex/Birthdate/Father/Mother)
- NAT tab: shows the eligibility note, table with derived `SCHOOL ID` column matching LRN[0:6]
- Other 9 tabs show placeholder text — by design (less is better; we extend when needed)

Stop server.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): build Class detail with tabbed legacy sub-views (List/Form 1/NAT live)"
```

---

## Task 14: Build Classes list page

**Files:**
- Create: `app/src/routes/classes/ClassesList.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Create `app/src/routes/classes/ClassesList.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { classes, students } from '@/mocks';
import type { ClassRecord } from '@/types';

function rosterCount(c: ClassRecord) {
  return c.studentLrns.length || students.filter(s => s.currentClassId === c.id).length;
}

const GRADE_GROUPS: { label: string; levels: ClassRecord['gradeLevel'][] }[] = [
  { label: 'Pre-Elem', levels: ['N1', 'N2', 'K'] },
  { label: 'Elementary', levels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'Junior HS', levels: ['VII', 'VIII', 'IX', 'X'] },
  { label: 'Senior HS', levels: ['XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM', 'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM'] },
  { label: 'SPED', levels: ['S'] },
];

export default function ClassesList() {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb items={[{ label: 'Classes' }]} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Classes</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {classes.length} sections in SY 2025–2026
          </p>
        </div>
        <Button>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Class
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {GRADE_GROUPS.map(group => {
          const groupClasses = classes.filter(c => group.levels.includes(c.gradeLevel));
          if (groupClasses.length === 0) return null;
          return (
            <section key={group.label}>
              <h2 className="text-label uppercase font-bold text-ink-muted mb-2 px-1">{group.label}</h2>
              <div className="grid grid-cols-3 gap-3">
                {groupClasses.map(c => {
                  const count = rosterCount(c);
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/classes/${c.id}`)}
                      className="text-left bg-panel border border-border rounded-md p-3.5 hover:bg-panel-alt transition-colors"
                    >
                      <div className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">
                        Grade {c.gradeLevel}
                      </div>
                      <div className="text-[14px] font-semibold text-ink-primary mt-0.5">
                        {c.sectionName}
                      </div>
                      <div className="text-[12px] text-ink-secondary mt-2">
                        {c.adviser.title} {c.adviser.familyName}
                      </div>
                      <div className="text-[11.5px] text-ink-muted mt-1">
                        {count} {count === 1 ? 'learner' : 'learners'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire up route**

In `app/src/App.tsx`, replace `<Route path="classes" element={<PlaceholderPage title="Classes" />} />` with:

```tsx
<Route path="classes" element={<ClassesList />} />
```

Add import: `import ClassesList from '@/routes/classes/ClassesList';`

- [ ] **Step 3: Visual verify**

Run dev server. Navigate to http://localhost:5173/classes. Expected:
- Heading "Classes · 5 sections in SY 2025–2026"
- "+ Add Class" button right-aligned
- Grouped sections: Elementary (Grade I × 2 cards), Junior HS (Grade VII × 1), Senior HS (Grade XI-GAS × 1), SPED (Grade S × 1)
- Each card shows grade level (small caps), section name (bold), adviser, learner count
- Click a card → navigate to that class's detail page
- The "Pre-Elem" group has no classes in mocks — section is hidden, not shown empty

Stop server.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit -m "feat(app): build Classes list with grade-group sections"
```

---

## Task 15: Visual review pass + checkpoint

**Files:**
- No code changes expected unless gaps surface
- Modify (if needed): individual files based on review findings

- [ ] **Step 1: Run lint and tests**

From `app/`:

```bash
npm run lint
npm run test
```

Expected: zero lint errors, all unit tests pass (LRN parser + format helpers).

- [ ] **Step 2: Run dev server, walk every flow**

```bash
npm run dev
```

Walk through these flows in the browser at http://localhost:5173. Check every box; document anything that breaks the spec.

- [ ] **Flow A — Sidebar + SY selector:**
  - All 5 nav items render with Lucide icons. Active item is near-black pill, not blue.
  - SY selector dropdown opens, shows 3 SYs, marks 2025–2026 as "current" (green text).
  - Page background is `#f8f8f5`, sidebar background is `#f1efea`.

- [ ] **Flow B — Students list → Student detail (round-trip):**
  - `/students` shows 17 rows.
  - Search "abor" narrows to 1 row. Clear search returns to 17.
  - Click any row → URL becomes `/students/<lrn>` and detail page renders with sticky rail.
  - Click breadcrumb "Students" → returns to list.

- [ ] **Flow C — Classes list → Class detail (round-trip):**
  - `/classes` shows 5 cards in grade groups.
  - Click "St. John Vianney" card → URL becomes `/classes/cls-grade1-vianney-2526`.
  - Tabs: List (default), Form 1, NAT all render real data. Other tabs show the "placeholder, apply same pattern" message.
  - Click any name in the List tab → navigates to that student.
  - Click breadcrumb "Classes" → returns to list.

- [ ] **Flow D — Style audit (Style A consistency):**
  - No bare blue links anywhere.
  - All buttons use the `accent` near-black or outline variants — no Bootstrap blue.
  - All key/value rows use `text-ink-secondary` for labels and `text-ink-primary` for values.
  - Status badges only use ok (green-ish), pending (amber), or na (gray) tones.
  - Border colors are `#e7e3da` (`border`) or `#f0ede4` (`border-soft`).

- [ ] **Flow E — Behavioral correctness (LRN/School ID derivation):**
  - On `/classes/cls-grade1-vianney-2526` NAT tab, every row's "School ID (from LRN)" column matches that row's LRN's first 6 digits. Spot-check at least 3 rows.

- [ ] **Step 3: Fix any discrepancies inline**

If any flow above reveals a violation of the spec or design tokens, fix it directly in the offending file. Each fix is a small commit. If no fixes are needed, skip to step 4.

- [ ] **Step 4: Final checkpoint commit**

```bash
cd "c:/Users/opet_/OneDrive/Desktop/Registrar System v2"
git add app/
git commit --allow-empty -m "chore(app): visual review checkpoint — pages 1-5 of roadmap complete"
```

- [ ] **Step 5: Reassess against the spec**

Re-read [`docs/superpowers/specs/2026-05-04-registrar-v2-frontend-design.md`](../specs/2026-05-04-registrar-v2-frontend-design.md) "Page Build Order" section. The spec said: *"Stop after page 5 and reassess. If the patterns hold, pages 6–8 should be mechanical."*

Decide what to do next based on what you observed:
- **If patterns held cleanly** → spin up a follow-up plan covering Teachers list/detail, Setup pages, and Reports (mechanical extensions of existing components).
- **If issues surfaced** (Style A felt cramped; tabs vs anchors confusion; rail too narrow at certain content) → revise the spec first, then plan pages 6–8.

Surface the reassessment outcome in conversation; do not silently proceed to pages 6–8.

---

## Self-Review

Spec coverage check (against [`2026-05-04-registrar-v2-frontend-design.md`](../specs/2026-05-04-registrar-v2-frontend-design.md)):

| Spec section | Implemented in |
|---|---|
| 5-bucket IA (Students/Classes/Teachers/Setup/Reports) | Task 9 (Sidebar + AppShell) |
| Style A design tokens | Task 2 (tailwind.config + index.css) |
| App shell (sidebar, SY selector, breadcrumb) | Task 9 |
| Two-column sticky-rail entity detail (Student) | Tasks 10 + 11 |
| Search-first list/index page | Tasks 12 + 14 |
| Class detail with tabs (12 legacy sub-views) | Task 13 |
| Tech stack (React + Vite + TS + Tailwind + shadcn + Router + Lucide + Vitest) | Tasks 1–3, 8–9 |
| `app/` project structure | All tasks |
| Mock data anchored on Grade I · St. John Vianney roster | Task 7 |
| LRN-derived School ID surfaced in NAT tab | Tasks 5 + 13 |
| Print actions stubbed (no PDF generation) | Tasks 11 + 13 (buttons present, no handlers) |
| TDD for `lib/` pure functions | Tasks 5 + 6 |
| `.gitignore` for `.superpowers/` and `node_modules/` | Already committed pre-plan |

Deferred to a follow-up plan (per spec roadmap step 6+):
- Teachers list + detail (Task ~16 in follow-up)
- Setup pages (subjects, sections, grade levels, school year, schools, admin) (~17–22)
- Reports (statistics, alumni, loyalty, new enrollees, not enrolled, student no.) (~23–26)
- Login screen (deferred per spec — backend phase)
- Dashboard (deferred per spec — to be reassessed after page 5)
- Grade encoding workflow (deferred — teacher-facing, phase 2)
- PDF generation for Print buttons (deferred — backend phase)

Placeholder scan: searched for "TBD/TODO/implement later/handle edge cases/similar to Task" — none found in the task body. Open question text exists only in the deferred-list above, which is correct per spec.

Type consistency: `Student.firstName` / `middleName` / `lastName` are used identically in `formatLastFirstMiddle` (Task 6), in mock fixtures (Task 7), and in Student detail (Task 11). `ClassRecord.gradeLevel` and `ClassRecord.sectionName` are used identically across mocks, list, and detail. `CredentialStatus` keys match the legacy 8-credential code mapping (BC/BP/HC/Pix/RF/F137/RC/GMC) per Batch 3 catalog.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-registrar-v2-frontend-prototype.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach?
