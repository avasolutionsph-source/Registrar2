# Registrar System v2 — Frontend Design Spec

**Date:** 2026-05-04
**Phase:** Frontend-only prototype (backend deferred)
**Source of truth for legacy behavior:** [`docs/legacy-catalog/`](../../legacy-catalog/)

## Goal

Rebuild the **NPS Computerized System v2.4.2** UI as a modern, minimalist, daily-friendly frontend prototype. Get the look-and-feel and information architecture locked before any backend, database, or authentication work begins.

## Non-Goals (explicit)

- **No backend.** No database, no API server, no auth flow. All data is mocked in `src/mocks/`.
- **No new features beyond the legacy catalog.** Only allowed addition: automating something the legacy already does (e.g., auto-deriving school-of-origin from `LRN[0:6]` instead of a separate stored field).
- **No mobile app, parent portal, payments, push notifications, AI features, or real-time sync.** These were never in the legacy software and are out of scope.
- **No printing engine implementation yet.** Print buttons stub to a "Preview" modal showing what would be exported; actual PDF generation is a backend concern.
- **No migration tooling.** Migration from the legacy DB is its own future project.

## Constraints (user-stated)

1. **"Less is better"** — registrar workflow favors minimalism. No bloat.
2. **"Modern minimalist, hindi masakit sa mata"** — soft, calm visual treatment for older daily users.
3. **Page consolidation encouraged** — the legacy software's 11 top-level menus and dozens of sub-pages are the navigation pain point. Collapse where it makes sense.
4. **Frontend first** — iterate on UI freely, wire up backend only when the frontend is locked.

## Information Architecture (5-bucket sidebar)

The legacy 11-menu structure (`File / Edit / Setup / Grade-Section / Teachers / Subjects / Class / Students / Statistics / Enrol / Help`) collapses into **5 buckets**:

| Bucket | Includes (mapped from legacy) |
|---|---|
| **Students** | Per-student record (Edit Profile, Enrolment Details, Summary of Grades, View Grades, Add New Student); Form 137 Elem/HS/Log; SF 10 Elem/HS; Credentials; Remedial Form HS |
| **Classes** | Class List, Form 1, Pupils Directory, ID Info, Parents' Directory, Credentials grid, Form 5, NCAE, NAT, Report Card, ESC Billing, Class Transferees |
| **Teachers** | Add New Teacher, List of Teachers (All / Active), View and Edit Advisers, View Class Grade-Sheet |
| **Setup** | Setup SchoolYear, Add Schools, Setup Admin, Add Grade/Year Level, Add Sections, Add Subjects, Setup Subjects, Order Subjects |
| **Reports** | Statistics matrix, Alumni (Grade 6/10/12), New Enrollees, Not Enrolled, Student No., Loyalty |

Notes:
- The legacy `File` menu (Reload, Export as PDF, Print, Exit) becomes per-page actions and a global app menu, not a top-level area.
- The legacy `Edit` menu (Undo/Redo/Cut/Copy/Paste/Select All) is browser-native; not a navigation bucket.
- The legacy `Help` menu (View Notifications, Change Password) becomes a user menu in the sidebar footer.
- The legacy `Enrol` menu workflow gets surfaced as a primary action on Classes (and possibly the dashboard if we add one later) rather than as its own top-level area.
- The **School Year selector** is global and lives in the sidebar, not per-page.

## Visual Design — Style A: Soft & Clean

Locked design tokens (Tailwind-friendly):

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#f8f8f5` | Page background |
| `--bg-sidebar` | `#f1efea` | Sidebar |
| `--bg-panel` | `#ffffff` | Cards, panels, table backgrounds |
| `--bg-panel-alt` | `#fafaf6` | Table column headers |
| `--border` | `#e7e3da` | All borders, dividers |
| `--border-soft` | `#f0ede4` | Inner row dividers |
| `--text-primary` | `#1f1f1b` | Body text, headings |
| `--text-secondary` | `#6b6b65` | Helper text, values |
| `--text-muted` | `#8a8478` | Labels, breadcrumbs, placeholders |
| `--accent` | `#1f1f1b` | Active nav item background, primary buttons (intentionally near-black, not blue — keeps the palette neutral) |
| `--badge-ok-bg / fg` | `#ecf3e9` / `#3f6233` | "On file", "Active", "Promoted" |
| `--badge-pending-bg / fg` | `#fbf3e3` / `#8a6c1d` | "Pending", "Awaiting" |
| `--badge-na-bg / fg` | `#f0ede4` / `#8a8478` | "N/A", "—" |
| `--radius` | `8px` (small), `10–12px` (panels) | Corner radius |
| Font | System sans (`-apple-system, Segoe UI, Roboto, sans-serif`) | All text |

Density and spacing rules:
- Generous panel padding (16–20px), tight row padding (7–8px) to balance scannability with readability.
- Tabular numerics for any numeric column (LRN, Student No., scores, IDs).
- Section labels are uppercased, letter-spaced, muted-gray — visually quiet but scannable.
- Active sidebar nav item uses a near-black pill background (not blue) — neutral and easy on the eyes.
- All interactive elements have a 1px border or background change; never bare-blue links. Underlines reserved for actual prose links.

## Layout Patterns

### App shell

Persistent left sidebar (200px) + main content area. Sidebar contains:
1. App brand (small "NPS REGISTRAR" wordmark)
2. School Year selector (global; changes the SY context for every page)
3. 5-bucket navigation (Students / Classes / Teachers / Setup / Reports)
4. Footer area for user menu (notifications, change password, sign out — placeholder for now since auth is deferred)

### Entity detail page (Student, Class, Teacher) — **two-column with sticky left rail**

Used for any single-record view. Pattern:
- **Left rail (240px, sticky):** photo/avatar · name · key IDs · status badge · vertical action stack (Edit, Print Form 137, Print SF 10, Print Report Card, Print ID, …) · section anchor nav (jump-to-section)
- **Right (flexible width):** stack of section cards (Profile · Family · Enrolment · Grades · Credentials · Tests · Documents). Each card is a `Panel` with a small uppercased heading and a 2-column key-value grid inside.

Why this pattern: registrars open student records all day. Identity + print actions stay visible while they scroll through the record. Anchor nav doubles as a TOC.

### Index/list page (Students list, Classes list, Teachers list) — **search-first, table primary**

Pattern:
- Top bar: search input · filters (grade/section/status) · primary action ("+ Add Student", "+ Add Class")
- Table: dense rows, sortable columns. Row click navigates to the entity detail page.
- Pagination only when needed; default to virtualized scroll for long lists (70+ sections, hundreds of students).

### Class detail (special case — entity with many sub-views)

The legacy Class menu has 12 sub-pages (Class List, Form 1, Pupils Directory, ID Info, Parents' Directory, Credentials, Form 5, NCAE, NAT, Report Card, ESC Billing, Class Transferees). All 12 are essentially **different views of the same student roster**. Consolidation:
- Same two-column entity layout with sticky left rail (class identity, adviser, "Print all" actions, section anchor).
- Right side has **horizontal tabs** for the 12 views (since they're orthogonal lenses on the same data, not stacked sections).

This breaks the consistency with Student page slightly (Student uses anchor sections, Class uses tabs) — but it matches the legacy mental model and avoids 12 stacked panels of the same roster.

### Setup pages

Single-purpose forms or master tables. Stick to the same Style A panel + key-value grid where applicable.

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **React 18** | User has prior React experience (AVADAETSPA project); component reuse |
| Build tool | **Vite** | Fast HMR, simple config, easy static deploy when frontend is locked |
| Language | **TypeScript** | Catches typos in field names (`LRN`, `Student No.`, etc.) early |
| Styling | **Tailwind CSS** | Maps Style A tokens directly into utility classes; consistent design language without writing CSS files |
| Components | **shadcn/ui** (selectively) | Accessible primitives (Dialog, DropdownMenu, Tabs, Tooltip) without owning a component library; copy-paste model |
| Routing | **React Router 6** | URL-shareable pages, browser-native back/forward |
| Icons | **Lucide React** | Clean, neutral icon set that fits Style A |
| State | **React Query** for any future fetching · `useState` / Zustand for local UI state | Defer until needed |
| Mock data | Hardcoded TypeScript modules in `src/mocks/` | Realistic data shapes; fixtures derived from real catalog screenshots |
| Linting | ESLint + Prettier | Consistent formatting |

## Project Structure

```
Registrar System v2/
├── docs/
│   ├── legacy-catalog/                    (existing — frozen, source of truth)
│   └── superpowers/specs/
│       └── 2026-05-04-registrar-v2-frontend-design.md  (this file)
├── app/                                   (new — the React prototype)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                        (router + shell)
│       ├── routes/
│       │   ├── students/
│       │   │   ├── StudentsList.tsx
│       │   │   └── StudentDetail.tsx
│       │   ├── classes/
│       │   │   ├── ClassesList.tsx
│       │   │   └── ClassDetail.tsx
│       │   ├── teachers/
│       │   ├── setup/
│       │   └── reports/
│       ├── components/
│       │   ├── shell/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── SchoolYearSelector.tsx
│       │   │   └── Breadcrumb.tsx
│       │   ├── ui/                        (shadcn components, customized)
│       │   ├── entity/
│       │   │   ├── EntityRail.tsx         (sticky left rail for detail pages)
│       │   │   ├── SectionCard.tsx
│       │   │   ├── KeyValueGrid.tsx
│       │   │   └── StatusBadge.tsx
│       │   └── tables/
│       │       └── DataTable.tsx
│       ├── mocks/
│       │   ├── students.ts                (Grade I · St. John Vianney roster)
│       │   ├── classes.ts                 (sections from legacy catalog)
│       │   ├── teachers.ts                (sample teachers)
│       │   ├── subjects.ts                (3-letter codes from catalog)
│       │   └── schoolYears.ts             (2007-2008 → 2026-2027)
│       ├── lib/
│       │   ├── lrn.ts                     (parse LRN: schoolId, year, sequence)
│       │   ├── studentNo.ts               (parse format YY1YY2{seq})
│       │   └── format.ts                  (date, name, LRN display formatters)
│       └── types/
│           ├── student.ts
│           ├── class.ts
│           ├── teacher.ts
│           └── schoolYear.ts
└── .superpowers/                          (gitignored — brainstorm session artifacts)
```

## Mock Data Strategy

Mock fixtures come from the legacy catalog screenshots. The reference class is **Grade I · St. John Vianney, SY 2025-2026** (17 students captured across batches 11–12) because it has the most complete data we observed (full names, LRNs, birthdates, gender). Where the catalog was silent (parents, addresses, contact numbers, grades), values are plausibly faked — clearly labeled as `MOCK` in code comments so they're easy to swap for real data later.

Coverage targets for the mock layer:
- ≥ 1 fully populated class (Grade I · St. John Vianney) with all 17 students
- ≥ 1 partial class for each grade level (Pre-K through Grade 12 + SPED) for sidebar testing
- All section names from the master sections list (~70 saint sections)
- All SHS strands represented (GAS, HUMSS, STEM, ABM)
- ≥ 5 teachers with mocked passwords (since we're modeling the legacy schema, but we'll never display them — this is the rebuild)
- ≥ 3 school years (2024-25, 2025-26, 2026-27) so the SY selector is testable

## Page Build Order (Roadmap)

Priority sequenced by daily-use frequency and pattern coverage:

1. **App shell** — sidebar nav, SY selector, breadcrumb header, empty content slot. Validates Style A end-to-end.
2. **Student detail page** — the consolidated entity view (Two-Column with sticky rail). Anchor for the "consolidate per-entity" pattern.
3. **Class detail page** — same shell, but tabbed sub-views (12 legacy pages → 12 tabs). Anchor for the "tabbed sub-view" pattern.
4. **Students list** — search-first table. Validates the index/list pattern + click-through to Student detail.
5. **Classes list** — grid of grade/section cards (or table). Validates list of multi-attribute entities.
6. **Teachers list + Teacher detail** — applies the existing patterns; verifies they generalize.
7. **Setup pages** (Subjects, Sections, Grade Levels, School Year, Schools) — form-heavy; validates form patterns.
8. **Reports** (Statistics, Alumni, Loyalty, etc.) — read-only output pages; validates dense-table patterns.

Stop after page 5 and reassess. If the patterns hold, pages 6–8 should be mechanical.

## What Counts as "Done" for Frontend Phase

- All pages from the page-build-order roadmap rendered with mock data
- Style A locked in `tailwind.config.ts` design tokens; no inline color values in components
- All navigation flows reachable (click a class → see class detail → click a student → see student detail → click "Print Form 137" → see modal → close → return to student)
- No real backend calls; all data flows through the mocks layer with a swappable `useStudent(lrn)` / `useClass(sectionId)` hook contract
- Visual review pass complete: every page reviewed against Style A tokens; no Bootstrap-default-blue, no cluttered layouts, no harsh contrast
- Spec doc updated with any layout decisions made during build

After this gate, we plan the backend (data model, auth, sync, hosting) as a separate phase.

## Open Questions / Deferred Decisions

These are deliberately not resolved in this spec — to be revisited during build or in the backend phase:

1. **Login screen / auth flow.** Legacy has accounts (Help > Change Password). Frontend phase: stub with a "Mocked logged in as Registrar" indicator; design real login when backend is chosen.
2. **Dashboard / home page.** Considered as Option C in IA brainstorm; deferred. After building the 5 main areas, we may discover a dashboard's value (or not). Legacy didn't have a strong dashboard.
3. **Grade encoding workflow** (View Class Grade-Sheet). Daily for teachers, but this rebuild's primary user is the registrar. Punt to phase 2.
4. **Form 137 / SF 10 PDF generation.** Print buttons stub to preview only.
5. **Real-time multi-user concerns.** None for the prototype.
6. **i18n.** All UI in English for now (matches legacy).
7. **Curriculum versioning** (`Kto12-B` and others observed in legacy). Display only for the prototype; modeling waits for backend.
8. **Remaining uncaptured legacy pages** (Report Card, ESC Billing, Class Transferees, Form 137 Log, SF 10 sub-pages, Help sub-pages, Enrol menu workflow). Designed as best-guess placeholders during build; revisit if the user provides screenshots or in-person verification.
