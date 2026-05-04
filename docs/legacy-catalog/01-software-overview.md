# 01 — Software Overview

App-wide structure and patterns observed across all pages.

## Software metadata

| Field | Value |
|---|---|
| Name | `NPS Computerized System` |
| Version | `v2.4.2` |
| Platform | Desktop Windows app |
| School | **Naga Parochial School** (Catholic K-12 school, City of Naga; logo: red shield) |
| Global PDF export | `Ctrl+Shift+P` (File menu) — works on any printable view |
| Global Print | `Ctrl+P` |
| Reload (refresh-from-DB) | `Ctrl+R` (manual refresh required for some views) |
| Other version sighting | `V203` partial label seen in one screenshot — possibly an older module/dialog |

## Top menu bar (consistent across pages)

| # | Menu | Purpose (inferred) |
|---|---|---|
| 1 | **File** | 4 items: `Reload` (Ctrl+R) · `Export as PDF` (Ctrl+Shift+P) · `Print` (Ctrl+P) · `Exit` |
| 2 | **Edit** | 6 items: `Undo` · `Redo` · `Cut` · `Copy` · `Paste` · `Select All` (standard text ops) |
| 3 | **Setup** | 3 items: `Setup SchoolYear` · `Add Schools` · `Setup Admin` (admin-only) |
| 4 | **Grade/Section** | 2 items: `Add Grade/Year Level` (master grade-code list with IN/OUT) · `Add Sections` (master section list, 70+ entries) |
| 5 | **Teachers** | 5 items: `Add New Teacher` · `List of Teachers (All)` · `List of Teachers (Active)` · `View and Edit Advisers` · `View Class Grade-Sheet` |
| 6 | **Subjects** | 3 items: `Add Subjects` (master + SETS) · `Setup Subjects` (per-SY config + items/percentages) · `Order Subjects` (assign sets to grade levels) |
| 7 | **Class** | 12 items: `Class List`, `Form 1`, `Pupils Directory`, `ID Info`, `Parents' Directory`, `Credentials`, `Report Card`, `Form 5`, `NCAE`, `NAT`, `ESC Billing`, `Class Transferees` |
| 8 | **Students** | Per-student records (7 sub-items documented) |
| 9 | **Statistics** | Reports — Alumni Grade 6/10/12, Statistics matrix, New Enrollees, Not Enrolled, Student No., Loyalty (8 items, see [05-statistics-menu.md](05-statistics-menu.md)) |
| 10 | **Enrol** | Enrollment workflow |
| 11 | **Help** | 2 items: `View Notifications` · `Change Password` |

## Global selectors

- **School Year dropdown** at upper-left (e.g., `2025-2026`) — drives the data shown
  - Confirmed range: **2007-2008 through 2026-2027** (~20 years of historical data + 1 future SY for setup). Big migration scope.
- **Left sidebar:** Grade/Section list (visible on Class menu pages)

## Grade level tiers supported

The system tracks **the full pipeline from Nursery to Grade 12 + SPED**. Authoritative master list via Grade/Section > Add Grade/Year Level (Batch 7):

### `IN` — Active NPS levels (LEVEL = display tier)

| Code | Grade/Year | Level |
|------|-----------|-------|
| `S` | SPED (Special Education) | 1 |
| `K` | Kinder | 1 |
| `N1` | Nursery I | 1 |
| `N2` | Nursery II | 1 |
| `1`–`6` | Grade I – Grade VI | 2 |
| `7`–`10` | Grade VII – Grade X | 3 |
| `11-1` | Grade XI-GAS | 4 |
| `11-2` | Grade XI-HUMSS | 4 |
| `11-3` | Grade XI-STEM | 4 |
| `11-4` | Grade XI-ABM | 4 |
| `12-1` | Grade XII-GAS | 4 |
| `12-2` | Grade XII-HUMSS | 4 |
| `12-3` | Grade XII-STEM | 4 |

### `OUT` — Legacy/external codes (transferee compatibility only)

`N` (Nursery), `P` (Prep), `K1` (Kinder I), `K2` (Kinder II), `JC` (Junior Casa), `AC` (Advanced Casa), `SC` (Senior Casa), `JA` (Junior Advanced), `1y`/`2y`/`3y`/`4y` (1st–4th Year, pre-K-12 HS naming).

> ✅ Pre-K, SPED, all 4 SHS strands (GAS/HUMSS/STEM/ABM) confirmed.

> ⚠️ The Class menu's left sidebar only shows Grades I–XII visible-by-default. Pre-K (`S`, `K`, `N1`, `N2`) sections appear to be tracked in the database but possibly not surfaced uniformly across all views. Verify in rebuild.

## Left sidebar — Grade/Section list (sample, SY 2025-2026)

Sections are named after **saints** (with some exceptions — see Section Reference table).

- **Grade I:** St. John Vianney, St. Camillus de Lellis, St. John Bosco
- **Grade II:** St. Pius X, **St. Gregory the Great**, St. Leo the Great
- **Grade III:** St. Peter Baptist, San Lorenzo Ruiz
- **Grade IV:** St. John the Baptist, St. Joseph
- **Grade V:** St. Benedict, St. Dominic of Guzman
- **Grade VI:** St. Thomas Aquinas, St. Augustine
- **Grade VII:** San Pedro Calungsod, St. Aloysius Gonzaga
- **Grade VIII:** St. John Paul II, St. John XXIII
- **Grade IX:** St. Jerome, St. Ambrose
- **Grade X:** St. Albert the Great, St. Alphonsus Liguori
- **Grade XI-GAS:** St. Padre Pio
- **Grade XII-GAS:** St. Teresa of Avila
- *(more sections likely below — partially visible: Paul VI, Clare of Assisi, Catherine of Siena, Joan of Arc)*

## Section Reference (full numeric codes)

Used in **Enrolment Details** as `Sec` field. Numeric IDs mapped to section names.

### Saints (1–60 range)

| ID | Name | ID | Name | ID | Name |
|----|------|----|------|----|------|
| 1 | St. Therese | 18 | St. Peter Baptist | 38 | San Pedro Calungsod |
| 2 | St. Tarcisius | 19 | St. Thomas More | 39 | St. Aloysius Gonzaga |
| 3 | St. John the Evangelist | 20 | San Lorenzo Ruiz | 40 | St. Dominic Savio |
| 4 | St. Luke | 21 | St. John the Baptist | 41 | St. John Paul II |
| 5 | St. Paul | 22 | St. Joseph | 42 | St. John XXIII |
| 6 | St. Peter | 23 | St. Patrick | 43 | St. Ambrose |
| 7 | St. Mark | 24 | St. Francis Xavier | 44 | St. Jerome |
| 8 | St. Matthew | 25 | St. Francis of Assisi | 45 | St. Albert the Great |
| 9 | St. Anthony Zaccaria | 26 | St. Benedict | 46 | St. Dominic of Guzman |
|  |  |  |  | 47 | St. Alphonsus de Ligouri |
| 55 | St. Martin de Porres | 57 | St. Clare of Assisi | 58 | St. Joan of Arc |
| 59 | St. Teresa of Avila | 60 | St. Stanislaus | 62 | St. Vincent de Paul |
| 63 | St. Jude Thaddeus |  |  |  |  |

### Provinces / places (61, 64–66, 73–79)

| ID | Name |
|----|------|
| 61 | Sorsogon |
| 64 | Camarines Norte |
| 65 | Catanduanes |
| 66 | Garcia |
| 73 | Vinzons |
| 74 | Roxas |
| 75 | Magsaysay |
| 76 | Quezon |
| 77 | Camarines Sur |
| 78 | Albay |
| 79 | Mabini |

⚠️ **Open question:** Why are some section IDs places (Bicol provinces / municipalities) instead of saints? Likely used for SHS HUMSS or different academic tracks. **Needs confirmation.**

## SHS Strand encoding

Stored as suffix on Grade field in **Enrolment Details**:

| Code | Strand |
|------|--------|
| `1` | GAS — General Academic Strand |
| `2` | HUMSS — Humanities and Social Sciences |
| `3` | STEM — Science, Technology, Engineering, Mathematics |
| `41` | ABM — Accountancy, Business and Management |

Format: `{grade}-{strand}` e.g., `11-3` = Grade 11 STEM, `12-1` = Grade 12 GAS.

## Common patterns

- **`Internet`** indicator label visible on upper-right of some pages — suggests online sync feature.
- **Database ID** (internal student PK, e.g., `2223175`) is shown alongside **LRN** (DepEd Learner Reference Number, 12-digit) on student pages.
- **Student No.** is a different identifier from Database ID — format `YY1YY2{seq}` encoding the SY of first NPS enrollment (e.g., `2526033` = SY 2025-2026, seq 033).
- **Boys/Girls separation** in class roster views (Directory, ID Info, List).
- **`[D]` flag** appended to student name (e.g., `CORNEJO, Zeus Jessy Cedilla [D]`) — meaning unconfirmed (Dropped? Deceased?).
- Adviser name is shown in header of every class-scoped page.
- All dates use `YYYY-MM-DD` for stored values; date pickers use `mm/dd/yyyy` placeholder.
- **Authentication exists** — Help menu has "Change Password", confirming user-account-based login (login screen not yet captured).
- **In-app notifications system** — Help menu has "View Notifications" (purpose/content not yet captured).
- **Teachers = user accounts** — `Add New Teacher` form has Email + Password fields. Each teacher is a system user. (Batch 7)
- **Teachers have numeric IDs** (1–~200 range, sequential) used internally as foreign keys. (Batch 7)
- **Setup Admin assigns teachers to roles** that auto-populate signature lines on certifications, report cards, and Form 137 (Registrar, Principal, Coordinator-Elem/HS/SHS, Guidance Coordinator, Director, Finance). (Batch 7)
- **Subject codes are 3-letter** (e.g., `MAT`, `FIL`, `SCI`). HS/SHS may concatenate with `-` (e.g., `CLE-ESP`, `TLE-ICT`). (Batch 7)
- **Subject categories** (DepEd SHS-aligned): `Core`, `Specialized`, `Applied`, `Elective`. (Batch 9)
- **SETS architecture**: subjects are grouped into named/numbered ordered SETS; each Grade Level is assigned a SET (or two for SHS — Set1=1st Sem, Set2=2nd Sem) which determines what subjects appear and in what order on the Report Card. ~30+ sets in use. (Batch 9)
- **Per-subject grading components** are configurable (`ITEMS` comma-separated, `PERCENTAGE` slash-separated) — drives DepEd-style transmutation per subject. (Batch 9)
- **DepEd Form alignment** is strong throughout the system: Form 1 = SF 1 (Register), Form 5 = SF 5 (Promotion Report), Report Card = SF 9 / Form 138, Form 137 = SF 10 (Permanent Record). NCAE + NAT (standardized test scores) and ESC Billing (govt subsidy) also tracked. (Batch 10)
- **DepEd Level of Proficiency descriptors** (5 tiers) used on Form 5: `BEGINNING` / `DEVELOPING` / `APPROACHING PROFICIENCY` / `PROFICIENT` / `ADVANCED`. (Batch 10)
- **Promotion outcomes** (DepEd): `promoted` / `irregular` / `retained`. (Batch 10)
- **Each class has a `Curriculum` tag** (e.g., `Kto12-B`) — DepEd-aligned curriculum version code. Visible on `View and Edit Advisers` page. (Batch 8)
- **NPS official email domain** is `@nps.edu.ph`. Older teacher accounts use external domains (yahoo, gmail, rocketmail); newer ones use the official domain. (Batch 8)
- **Teacher tenure tracking:** `Year_S` (year started) + `Year_E` (year ended); **`Year_E = 0`** sentinel = still active. Earliest active record dates back to 1976. (Batch 8)
- 🚨 **Passwords stored in PLAINTEXT** in the legacy DB — see [09-security-concerns.md](09-security-concerns.md). Must be hashed in rebuild. (Batch 8)
