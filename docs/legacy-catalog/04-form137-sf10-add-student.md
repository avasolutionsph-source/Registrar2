# 04 — Form 137, SF 10 & Add New Student

Source: **Batch 3** (5 screenshots).

---

## Form 137 submenu structure

When `Students > Form 137` is hovered, a submenu opens with 3 items:

| # | Item | Purpose |
|---|------|---------|
| 1 | **Form 137 Elem** | Elementary Pupil's Permanent Record (DepEd format) |
| 2 | **Form 137 HS** | Junior High School Permanent Record (DepEd format) |
| 3 | **Form 137 Log** | Log/audit trail of Form 137 generation events (inferred — not yet captured) |

## SF 10 submenu structure

When `Students > SF 10` is hovered, a submenu opens with 4 items:

| # | Item | Purpose |
|---|------|---------|
| 1 | **SF 10 Elem** | School Form 10 — Elementary version |
| 2 | **SF 10 HS** | School Form 10 — High School version |
| 3 | **Credentials** | Credentials list/report (separate from Class Credentials view) |
| 4 | **Remedial Form HS** | Remedial class record / form for HS |

---

## Page: Add New Student

**Purpose:** Blank intake form for new student enrollment. **Layout matches Edit Profile** (same fields), but with all values empty by default.

**Form fields (full list — confirmed):**

### Identity
- `Database ID` (auto-generated on save?)
- `LRN`
- `Year Entered` (YYYY)
- `Family Name`, `First Name`, `Middle Name`
- `Home Address`
- `Date of Birth` + `Where?` (place of birth, free text)
- `Date of Baptism` + `Where?` (parish, free text)
- `Nationality` + override field
- `Religion` + override field
- `Sex` (Male/Female radio)
- `Landline Number`, `CP Number 1`, `CP Number 2`
- `Messenger Account`, `Official Email`

### Parents and Guardian
For Father AND Mother (parallel):
- Name, ☐ `Deceased?`, `Educ Attainment`, `Occupation`, `Office Address`, `Tel/CP Number`, `Email`

`Guardian`, `Guardian Contact`, `Relation` (single block, distinct from parents)

### Contact Person in Case of Emergency
- `Name`, `Address`, `Contact`

### Credentials checklist (FULL list — 8 checkboxes confirmed)

This finally confirms the abbreviations seen in **Class Credentials** page:

| Abbrev | Full label | Confirmed |
|--------|-----------|-----------|
| `BC` | Photocopy of **Birth Certificate** | ✅ |
| `BP` | Photocopy of **Baptismal Certificate** | ✅ |
| `HC` | **Health Certificate** | ✅ |
| `Pix` | **1 Recent 1×1 ID picture** | ✅ |
| `RF` | **Recommendation Form** | ✅ |
| `F137` | **Form 137 / Form 10** | ✅ |
| `RC` | **Certification/Report Card (N–VI)** | ✅ |
| `GMC` | **Good Moral Certificate (Grades II–VI)** | ✅ |

**Submit:** **`SAVE`** button at the bottom.

---

## Page: Form 137 Elem (Elementary Pupil's Permanent Record)

**Purpose:** DepEd-aligned printable elementary cumulative record. Output document.

**Title:** `ELEMENTARY PUPIL'S PERMANENT RECORD`

### Header (student info — pulled from profile)
| Field | Source field |
|-------|--------------|
| Name | `LASTNAME, Firstname Middlename` |
| Date of Birth | full English month-day-year format (e.g., `June 27, 2007`) |
| Place of Birth | text |
| Father's Name | text |
| Mother's Name | text (maiden name expected) |
| Address | text |
| Gender | `M` / `F` |
| Nationality | text |
| Occupation (Father) | text |
| Occupation (Mother) | text |
| LRN | 12-digit |

### Top summary table

Columns:

- `SCHOOL YEAR`
- `DATE ENTERED`
- `DATE LEFT`
- `SCHOOL ATTENDED`
- `GRADE`
- `DAYS PRESENT`
- `FINAL RATING`
- `ACTION TAKEN`

### Per-year block (one block per grade level attended)

For each grade level, a sub-section:

- **Header line:** `Grade: N    Section: [name]`
- **Sub-header:** `School: [school name]    SY: YYYY-YYYY`
- **Subjects table:**
  - Columns: `SUBJECTS | 1st | 2nd | 3rd | 4th | Final | Remarks`
- Footer: `Gen Ave. NN.NN`
- Promotion text: e.g., `Promoted to Grade VII`

### Attendance Report block

| SCHOOL YEAR | GRADE LEVEL | NUMBER OF SCHOOL DAYS | NUMBER OF DAYS PRESENT |

### Certification footer

> "I CERTIFY that this is a true record of [NAME]. This pupil is eligible for admission to ____. Copy of this record is sent to the principal of ____ on ____."

- Signed by: `Registrar` name (e.g., `Marites C. Ramos`)
- Checkbox: ☐ `for reference only` (toggles watermark / disclaimer?)

---

## Page: Form 137 HS (Junior High School Permanent Record)

**Purpose:** DepEd-aligned printable high-school cumulative record. Multi-year layout.

**Title:** `JUNIOR HIGH SCHOOL PERMANENT RECORD`

### Header

Same student-info block as Form 137 Elem, **plus**:
- `Elementary Course Completed:` (school name where elem was completed)
- `School Year` (entered HS)
- `General Average:` (cumulative)

### Per-year blocks (Grade 7 → Grade 10, stacked)

For each grade:
- **Header line:** `Grade: N    Section: [name]`
- **Sub-header:** `School: [school name]    SY: YYYY-YYYY`
- **Subjects table:**
  - Columns: `SUBJECTS | 1st | 2nd | 3rd | 4th | Final | Remarks`
  - Per-row remarks: `Passed` / (other DepEd action codes)
- Footer: `Gen Ave. NN.NN`
- Promotion text: e.g., `Promoted to Grade VIII`

### Subjects observed in JHS curriculum (NPS)

Grade 9 onward at NPS uses curriculum:
- `CLE-ESP` (Christian Living Education / Edukasyon sa Pagpapakatao — likely combined)
- `Filipino`
- `English`
- `Mathematics`
- `Science`
- `Araling Panlipunan`
- `TLE-ICT` (Technology and Livelihood Education — ICT track)
- `MAPEH`
- `Music` *(separately listed in Grade 10? — unusual; verify)*

Pre-NPS curriculum (Arborvitae Plains Montessori, Grade 7–8) used:
- Filipino, English, Mathematics, Science, Financial Literacy, Araling Panlipunan, Computer Science, MAPEH, Edukasyon sa Pagpapakatao

### Sample data observed

The screenshot shows real data for Lozano, Sofia (cross-school):
- **Grade 7** (2019-2020) at Arborvitae — final grades only, Gen Ave 78.89, Promoted to Grade VIII
- **Grade 8** (2021-2022) at Arborvitae — final grades only, Gen Ave 81.33, Promoted to Grade IX
- **Grade 9** (2022-2023) at **Naga Parochial School**, Section: **St. Maria Goretti** — Q1–Q4 grades + Final
- **Grade 10** (2023-2024) at **Naga Parochial School**, Section: **St. Alphonsus Liguori** — Q1–Q4 grades + Final

> 🎯 **Confirmed:** The school is **Naga Parochial School** (NPS).

---

## SF 10 pages — pending capture

Submenu items not yet documented:
- `SF 10 Elem`
- `SF 10 HS`
- `Credentials`
- `Remedial Form HS`

## Form 137 Log — pending capture

Likely an audit trail or printout history. Not yet captured.

---

## Cross-page observations

1. **Add New Student ≅ Edit Profile** in field structure — same form, different mode (insert vs. update).
2. **Two separate transcript outputs** for Elem vs. HS — different headers and layouts, but both follow the per-year block pattern.
3. **Grade 11/12 (SHS) Form 137** is **not yet documented** — likely a third sub-form or merged into HS. Needs verification.
4. **Subject naming differs across schools** — system stores subjects per-grade per-year, so transferred-in students keep their old curriculum names.
5. **Section names appear in Form 137 HS** — "St. Maria Goretti" (Grade 9), "St. Alphonsus Liguori" (Grade 10) — these don't appear in the Section Reference table for current SY. The section list may be **per-school-year** (changes year to year), not a fixed master list.
