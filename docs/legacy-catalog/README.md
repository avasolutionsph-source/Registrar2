# Legacy Registrar System Catalog

> **Purpose:** Document the existing **NPS Computerized System v2.4.2** before designing its replacement.
> This is the discovery/cataloging phase of the overhaul project.

## Project context

- **School:** **Naga Parochial School (NPS)** — confirmed Catholic school in Naga City
- **Current software name:** `NPS Computerized System v2.4.2`
- **Platform:** Desktop Windows app (legacy)
- **Domain:** Student registrar — enrollment, grades, attendance, DepEd form output
- **DepEd alignment:** Outputs SF 9, SF 10, Form 137; supports **Nursery 1 → Grade 12** including SHS strands (GAS / HUMSS / STEM / ABM)
- **Goal:** Major overhaul / rebuild

## Cataloging method

User is sending **screenshots in batches of 3-5 images**. For each image, document:

1. Page/screen name
2. Header info (what identifies the record)
3. All visible fields, columns, buttons, controls
4. Layout / sectioning
5. Notes & open questions

## Index

| File | Contents | Source |
|---|---|---|
| [01-software-overview.md](01-software-overview.md) | App-wide structure: top menu bar, sidebar, common patterns | All batches |
| [02-class-menu-pages.md](02-class-menu-pages.md) | Class menu: full 12-item menu — Class List, Form 1, Pupils Directory, ID Info, Credentials, Form 5, NCAE, NAT, Parents' Directory documented; Report Card + ESC Billing + Class Transferees pending | Batches 1 + 10 + 11 + 12 (13 imgs) |
| [03-students-menu-pages.md](03-students-menu-pages.md) | Students menu: Summary of Grades, Enrolment Details, View Grades, Edit Profile | Batch 2 (5 imgs) |
| [04-form137-sf10-add-student.md](04-form137-sf10-add-student.md) | Form 137 + SF 10 submenus, Add New Student, Form 137 Elem, Form 137 HS | Batch 3 (5 imgs) |
| [05-statistics-menu.md](05-statistics-menu.md) | Statistics menu — full coverage: Alumni Grade 6/10/12, Statistics matrix, New Enrollees, Not Enrolled, Student No., Loyalty | Batches 4 + 5 (10 imgs) |
| [06-file-edit-setup-menus.md](06-file-edit-setup-menus.md) | File menu (4 items), Edit menu (6 items), Setup menu (3 items) + Setup SchoolYear + Add Schools | Batch 6 (4 imgs) |
| [07-grading-rubrics.md](07-grading-rubrics.md) | Naga Parochial School grading rubrics (Academic Excellence, Academic, Attitude, Deportment, Special Program) | Batch 6 (1 reference photo) |
| [08-grade-section-teachers-menus.md](08-grade-section-teachers-menus.md) | Grade/Section menu (2 items) + Teachers menu (5 items) + master grade-level table + master section list + Add New Teacher + List All/Active + View+Edit Advisers + View Class Grade-Sheet | Batches 7 + 8 (9 imgs) |
| [09-security-concerns.md](09-security-concerns.md) | 🚨 Critical security flaws in legacy system (plaintext passwords, weak credentials, PII exposure) + mitigations for rebuild | Batch 8 |
| [10-subjects-menu.md](10-subjects-menu.md) | Subjects menu (3 items) — Add Subjects (master + SETS), Setup Subjects (per-SY items+percentages), Order Subjects (set→grade-level) | Batch 9 (4 imgs) |
| [open-questions.md](open-questions.md) | Pending clarifications + resolutions | Cumulative |

## Pages still to catalog (pending screenshots)

### Top-level menus not yet captured
- ~~**File** menu — 4 items captured~~ ✅
- ~~**Edit** menu — 6 items captured~~ ✅
- ~~**Setup** menu — fully documented (incl. Setup Admin)~~ ✅
- ~~**Grade/Section** menu — fully documented~~ ✅
- ~~**Teachers** menu — fully documented~~ ✅ (List All/Active, Advisers, Grade-Sheet captured; Grade-Sheet *content after teacher selection* still pending)
- ~~**Subjects** menu — fully documented~~ ✅
- ~~**Class** menu — full 12-item structure documented~~ ✅; sub-pages still pending: Parents' Directory, Report Card, ESC Billing, Class Transferees (NCAE, NAT, Form 5 done)
- ~~**Statistics** menu — fully documented~~ ✅
- **Enrol** menu (enrollment workflow)
- ~~**Help** menu — 2 items captured (View Notifications, Change Password); content of those pages not yet captured~~

### Students menu — sub-pages still pending
- **Form 137** submenu:
  - ~~Form 137 Elem~~ ✅ done
  - ~~Form 137 HS~~ ✅ done
  - **Form 137 Log** — pending
- **SF 10** submenu:
  - **SF 10 Elem** — pending
  - **SF 10 HS** — pending
  - **Credentials** — pending
  - **Remedial Form HS** — pending

### App entry points
- **Login screen** — confirmed exists (Help > Change Password implies user accounts) — not yet captured
- **Main dashboard** (if any) — not yet captured

### Help menu pages (sub-pages)
- **View Notifications** — content not yet captured
- **Change Password** — form not yet captured

### Teachers menu — drill-down still pending
- **View Class Grade-Sheet** — content shown after a teacher is selected (the actual grade-input view)

### Class menu — sub-pages pending
- ~~**Parents' Directory** — separate from Pupils Directory~~ ✅ done (Batch 12, page identification has caveats)
- **Report Card** — likely batch SF 9 print
- ~~**NCAE** — National Career Assessment Examination report~~ ✅ done (Batch 11)
- ~~**NAT** — National Achievement Test report~~ ✅ done (Batch 11)
- **ESC Billing** — Education Service Contracting govt subsidy
- **Class Transferees** — class-scoped transferee log

### Sidebar widgets seen on Setup pages (TBD)
- **Birthday Celebrants** widget
- **Awaiting Confirmation** widget
- **Submitted:** status indicator

## Next steps after cataloging

1. Confirm assumptions and resolve open questions
2. Identify pain points in the legacy system (see [09-security-concerns.md](09-security-concerns.md) for critical gaps)
3. Brainstorm desired feature set for v2 (the new build)
4. Choose tech stack (must support: web/desktop, multi-user, RBAC, encryption at rest, PDF generation)
5. Design data model (UUIDs for sections, hashed passwords, normalized curriculum/grade-level master tables)
6. Plan migration path from legacy DB (must include: dedupe schools, normalize section spellings, force password reset on import, fix `ñ` encoding bug)
