# 03 — Students Menu Pages

Source: **Batch 2** (5 screenshots).

All pages identify a student by:
- `Database ID` (internal PK, e.g., `2223175`)
- `NAME` (e.g., `Lozano, Sofia Fontelar`)

Sample data is from **Sofia Fontelar Lozano** — Grade XII STEM, transferred from Arborvitae Plains Montessori in Grade 9.

---

## Students menu structure

The **Students** top-level menu opens a dropdown with the following items:

| # | Menu item | Submenu items |
|---|-----------|---------------|
| 1 | Summary of Grades | — |
| 2 | Enrolment Details | — |
| 3 | Edit Profile | — |
| 4 | View Grades | — |
| 5 | Form 137 ▶ | Form 137 Elem · Form 137 HS · Form 137 Log |
| 6 | SF 10 ▶ | SF 10 Elem · SF 10 HS · Credentials · Remedial Form HS |
| 7 | Add New Student | — |

Form 137 + SF 10 sub-pages are documented in [04-form137-sf10-add-student.md](04-form137-sf10-add-student.md).

---

## Page: Enrolment Details

**Purpose:** Per-student enrollment history across all school years and schools.

**Header:**
- `Database ID`
- `NAME`

**Editable table (one row per school year):**

| Column | Type / Format | Notes |
|--------|---------------|-------|
| `School Year` | Dropdown (e.g., `2018-2019`) | |
| `Date Entered` | Date picker `mm/dd/yyyy` | Optional |
| `Date Left` | Date picker `mm/dd/yyyy` | Optional |
| `Gra` | Grade level | Supports SHS strand suffix: `11-3`, `12-3` etc. |
| `Sec` | Section ID (numeric) | References Section Reference legend (see [01-software-overview.md](01-software-overview.md)) |
| `School ID` | DepEd school code | e.g., `403855` (Arborvitae), `403875` (NPS) |
| `School Attended` | Short school name | e.g., `Arborvitae P`, `NPS` |
| `Adviser (non-NPS)` | Text | Only filled if attended a non-NPS school that year |
| `Days Present` | Number (decimal allowed, e.g., `184.0`) | |
| `Ave` | General average | |
| `Drop` | (column purpose unclear) | |
| `Remarks` | Text | e.g., `promoted` |
| `To` | Next destination | e.g., `Grade VII`, `First Year College` |

**Controls:**
- Empty bottom row for new entry
- **`Add Last Entry`** button

**Footer legends:**
- SHS strand options (see [01-software-overview.md](01-software-overview.md))
- Section Reference (see [01-software-overview.md](01-software-overview.md))

---

## Page: View Grades (= SF 9 / Form 138 — Report Card)

**Purpose:** Generate the official **Report on Learning Progress and Achievement** (printable report card). Outputs to PDF.

**Header block:**
- Student No (= Database ID)
- LRN
- School Year
- Full Name (LASTNAME, Firstname Middlename)
- `GRADE/SECTION`
- `TRACK`
- `STRAND`

### Grades section (per semester)

For SHS, two semester blocks: **First Semester** and **Second Semester**.

**Per-semester table columns:**

| Column | Notes |
|--------|-------|
| Subject Type | One of: `Core`, `Applied`, `Specialized`, `Elective` |
| Subject Name | e.g., "Media and Information Literacy", "Practical Research 1" |
| Quarter grades | `1st`, `2nd` (1st sem) / `3rd`, `4th` (2nd sem) |
| `Final Grade` | |

Last row of each semester: **`Conduct`** (separate from academic subjects).

**Footer per semester:** `General Average for the Semester: NN`

### Attendance Report block

| Row | Cells |
|-----|-------|
| Months header | `Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr` + `Total` |
| `School Days` | per-month counts |
| `Days Present` | per-month counts (decimals allowed) |
| `Days Absent` | per-month counts (decimals allowed) |
| `Times Tardy` | per-month counts |

### Deportment / Core Values block

**Columns:** `1st`, `2nd`, `3rd`, `4th`, `FINAL`

**Rows (Core Values):**
- Faith
- Integrity
- Respect
- Excellence
- Social Responsibility

**Rating codes legend:**

| Code | Meaning | Score range |
|------|---------|-------------|
| `AO` | Always Observed | 91–100 |
| `SO` | Sometimes Observed | 86–90 |
| `RO` | Rarely Observed | 80–85 |
| `NO` | Not Observed | 75–79 |

### Certification & footer

- **Certification text:** "This is to certify that [NAME] is eligible for transfer and admission to First Year College."
- **Class Adviser** name (e.g., `Ms. Cristin Laire B. Borela`)
- **Principal** name (e.g., `Mrs. Rosario Olalia`)
- **Cancellation of Transfer Eligibility** sub-block:
  - `Admitted in` field
  - `Date` field
  - `Principal` signature line
- Status text: `Not valid for transfer.` (red, default)
- Checkbox: ☐ `Valid for transfer.`
- Button: **`TO PDF`** — exports the report card

**Below the form:**
- `Official email:` (student's email)
- `Father email:`

---

## Page: Edit Profile

**Purpose:** Master student profile / personal information form.

### Identity block

| Field | Notes |
|-------|-------|
| `Database ID` | Read-only PK |
| `LRN` | 12-digit |
| `Year Entered` | YYYY (when student first enrolled at NPS) |
| `Family Name` | |
| `First Name` | |
| `Middle Name` | |
| `Home Address` | |
| `Date of Birth` + `Where?` | Date + place of birth |
| `Date of Baptism` + `Where?` | Date + parish |
| `Nationality` | Default `Filipino` + "If not Filipino, please specify" override |
| `Religion` | Default `Roman Catholic` + "If not Roman Catholic, please specify" override |
| `Sex` | Radio: Male / Female |
| `Landline Number` | |
| `CP Number 1` | Mobile primary |
| `CP Number 2` | Mobile secondary |
| `Messenger Account` | (Facebook Messenger handle) |
| `Official Email` | |

### Parents and Guardian block

For **Father** and **Mother** (parallel sub-sections):

- Full Name (text)
- ☐ `Deceased?` checkbox
- `Educ Attainment`
- `Occupation`
- `Office Address`
- `Tel/CP Number`
- `Email`

**Brothers and Sisters (presently studying at NPS):**
- Sub-table: `Name` | `Grade`

**Guardian (separate from parents):**
- `Guardian` (name)
- `Guardian Contact`
- `Relation`

### Contact Person in Case of Emergency

- `Name`
- `Address`
- `Contact`

### Credentials checklist

Checkboxes for documents on file (full list — confirmed via Add New Student, Batch 3):

- ☐ Photocopy of Birth Certificate (`BC`)
- ☐ Photocopy of Baptismal Certificate (`BP`)
- ☐ Health Certificate (`HC`)
- ☐ 1 Recent 1×1 ID picture (`Pix`)
- ☐ Recommendation Form (`RF`)
- ☐ Form 137 / Form 10 (`F137`)
- ☐ Certification/Report Card (N–VI) (`RC`)
- ☐ Good Moral Certificate (Grades II–VI) (`GMC`)

---

## Page: Summary of Grades

**Purpose:** All-years grade history per student. Multiple year tables stacked, one block per `School Year + Grade + School` combination.

**Header:**
- `Database ID`, `NAME`
- **In-app note:** "You can edit/add the Subjects. If you happen to encode the grade first, the SUBJECT on that ROW cannot be edited unless you refresh by clicking the name of the student at the left pane." (UX quirk — a refresh-required-after-encode bug/limitation)

**Per-year block:**

- Header: `School Year: YYYY-YYYY`, `Grade: N`, `School: [name]`
- Columns: `Subjects` | `Q1` | `Q2` | `Q3` | `Q4` | `FINAL`

### Curriculum visible across grade levels

**Grade 6 (Elementary)** — Arborvitae Plains Montessori:
- Christian Living Education
- Language and Spelling
- Reading and Phonics
- Mathematics
- Science and Health
- Wika
- Pagbasa
- Sibika at Kultura/HEKASI
- MAPE/MSEP

**Grade 7 (JHS)** — Arborvitae Plains Montessori:
- Filipino, English, Mathematics, Science
- Financial Literacy
- Araling Panlipunan
- Computer Science
- MAPEH
- Edukasyon sa Pagpapakatao

**Grade 8 (JHS)** — Arborvitae Plains Montessori (partial):
- Filipino, English, ... *(rest cut off)*

**Behavior:** Old years (transferred-in) only have `FINAL` column populated; quarterly cells are blank. Quarterly grades are encoded only for years at NPS.

---

## Cross-page observations

1. **Two-tier student identity:** internal `Database ID` + DepEd `LRN`. Both required.
2. **Multi-school transfer support** — fully tracked per year via `School ID` + `School Attended` + `Adviser (non-NPS)` fields in Enrolment Details.
3. **Three DepEd output forms** integrated:
   - **SF 9 / Form 138** = `View Grades` page (with PDF export)
   - **SF 10** = submenu (not yet documented)
   - **Form 137** = submenu (not yet documented)
4. **Transfer eligibility workflow** is explicit and bidirectional (set `Valid for transfer` → can also `Cancel Transfer Eligibility`).
5. **Grade 11/12 strand suffix** stored on Grade field (e.g., `12-3`).
6. UX quirk on Summary of Grades requires refresh after first encoding — flag for fix in the rebuild.
