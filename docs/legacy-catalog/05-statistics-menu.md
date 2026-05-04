# 05 — Statistics Menu

Source: **Batch 4 + Batch 5** (full Statistics menu now documented).

---

## Statistics menu structure

When `Statistics` top-level menu is clicked, a dropdown opens with **8 items**:

| # | Item | Purpose |
|---|------|---------|
| 1 | **Alumni Grade 6** | Outgoing/graduating Grade 6 students for current SY (last year of elementary) |
| 2 | **Alumni Grade 10** | Outgoing/graduating Grade 10 students for current SY (last year of JHS) |
| 3 | **Alumni Grade 12** | Outgoing/graduating Grade 12 students for current SY (last year of SHS) |
| 4 | **Statistics** | Enrollment statistics matrix per grade × section |
| 5 | **New Enrollees** | List of incoming students for current SY (with prior school info) |
| 6 | **Not Enrolled** | Students from prior SY's DB who didn't enroll this SY ("Did Not Enrol") |
| 7 | **Student No.** | Comprehensive student lookup table (Student No. ↔ Name ↔ Grade/Section ↔ LRN) |
| 8 | **Loyalty** | "Loyalty Awardee" list — students who've been at NPS the entire duration (Years(NPS) ≥ current grade) |

---

## Page: Alumni Grade 6 / 10 / 12 (3 parallel pages)

**Purpose:** Lists of students in the **terminal grade** of each level (Grade 6 = end of elementary, Grade 10 = end of JHS, Grade 12 = end of SHS) for the selected SY. These are "soon-to-be alumni" — outgoing batches.

**Title format:** `List of Alumni for the School Year YYYY-YYYY for Grade N.`

**Page header:**
- Top menu bar (full)
- School Year dropdown (drives the report)

**Table columns:**

| Column | Notes |
|--------|-------|
| `NAME` | `LASTNAME, Firstname Middlename` (numbered alphabetical list) |
| `ADDRESS` | Full text |
| `CONTACT` | Mobile number(s); multiple separated by `/` |

**Sample volumes (SY 2025-2026):**

- **Grade 6** — 21+ students (alphabetical list, scrollable)
- **Grade 10** — 22+ students (alphabetical list, scrollable)
- **Grade 12** — 16 students (small batch, full visible)

**Naming encoding bug observed:**
On Grade 10 alumni list, names with `ñ` show garbled as `Ãf±` (e.g., `BAñARIA` rendered as `BAñARIA` in visible text but `Sto. Niño` shown as `Sto. NiÃfÂ±o` in address). **Encoding issue (likely Latin-1 vs UTF-8) — flag for fix in rebuild.**

> 🎯 **Cross-reference:** `LOZANO, Sofia Fontelar` (the same student documented in [03-students-menu-pages.md](03-students-menu-pages.md)) appears at #10 of Grade 12 alumni — confirming she's a graduating SHS student in SY 2025-2026.

---

## Page: Statistics (the enrollment matrix)

**Purpose:** Per-section enrollment counts for the selected SY. Used for DepEd reporting / school census.

**Title:** `Statistics for School Year YYYY-YYYY`

**Table columns (full):**

| Group | Columns |
|-------|---------|
| Identity | `GRADE` · `SECTION` |
| Male breakdown | `New` · `Old` · `MALE` (total) |
| Female breakdown | `New` · `Old` · `FEMALE` (total) |
| Totals | `ANNUAL ENROLMENT` · `DROPOUTS` · `CORRECTED ENROLMENT` |

Where:
- `New` = newly enrolled this SY
- `Old` = continuing student (enrolled in prior SY too)
- `MALE` = New + Old (male)
- `FEMALE` = New + Old (female)
- `ANNUAL ENROLMENT` = MALE + FEMALE (gross)
- `DROPOUTS` = students who dropped during the SY
- `CORRECTED ENROLMENT` = Annual − Dropouts (final count)

### Grade level codes observed (FULL list — confirms Pre-K support)

The system supports **more than just Grades 1-12**. Pre-K tier exists:

| Code | Likely meaning | Sample sections (SY 2025-2026) |
|------|---------------|-------------------------------|
| `S` | Senior Casa / Senior Kinder (Montessori-style top pre-K) — to confirm | St. Gerald (20 students) |
| `K` | Kinder | St. Matthew (10) · St. Mark (15) · St. Paul (10) |
| `N1` | Nursery 1 | St. Tarcisius (9) · St. Therese (10) |
| `N2` | Nursery 2 | St. John the Evangelist (9) · St. Luke (10) |
| `1` | Grade 1 | St. Camillus de Lellis (19) · St. John Bosco (20) · St. John Vianney (17) |
| `2` | Grade 2 | St. Gregory the Great (23) · St. Leo the Great (26) · St. Pius X (25) |
| `3` | Grade 3 | San Lorenzo Ruiz (31) · St. Peter Baptist (33) |
| `4` | Grade 4 | St. John the Baptist (35) · St. Joseph (34) |
| `5` | Grade 5 | St. Dominic of Guzman (40) · St. Benedict (41) |
| `6` | Grade 6 | St. Augustine (30) · St. Thomas Aquinas (28) |
| `7` | Grade 7 | San Pedro Calungsod (32) · St. Aloysius Gonzaga (35) · St. John Paul II (cut) |
| ... | (more visible if scrolled) | |

> ⚠️ **Important architectural insight:** The Class menu sidebar (documented in [01-software-overview.md](01-software-overview.md)) only shows **Grade I to Grade XII-GAS**. But the Statistics page reveals **the database actually stores Pre-K (S, K, N1, N2) sections too**. Either:
> - The Class menu sidebar simply hides/scrolls past pre-K levels, or
> - Class views are intentionally restricted to Grades 1-12 (pre-K may not have full DepEd-style reporting)
>
> Verify in the rebuild: pre-K must be a first-class supported level, not an afterthought.

### Sample dropout data observed
- St. Paul (K): 1 dropout
- St. John the Evangelist (N2): 1 dropout
- St. Gregory the Great (Grade 2): 1 dropout

→ Dropouts are tracked per-section per-SY.

---

## Page: New Enrollees

**Purpose:** List of incoming students enrolled for the current SY, including their prior school info (for transferees).

**Title:** `New Enrollees for the School Year YYYY-YYYY:`

**Table columns:**

| Column | Notes |
|--------|-------|
| `NAME` | `LASTNAME, Firstname Middlename` (numbered alphabetical) |
| `GRADE` | Grade level code (e.g., `S`, `7`, `11-1`, `11-2`, `11-3`, `N1`, `K`, `5`, `6`, `9`) |
| `SECTION` | Section name (e.g., `St. Gerald`, `St. Aloysius Gonzaga`) |
| `SCHOOL LAST ATTENDED` | Prior school name (blank if first-time enrollee, e.g., for N1/Pre-K) |
| `SCHOOL LAST ADDRESS` | Prior school address |

**Observation:** First-time enrollees (typical for `N1`, `K`, `S` levels) have blank `SCHOOL LAST ATTENDED` and `SCHOOL LAST ADDRESS`. Transferees from other schools have these populated.

**SHS section names confirmed via this view:**

| Code | Strand | Section |
|------|--------|---------|
| `11-1` | GAS | St. Padre Pio |
| `11-2` | HUMSS | St. Paul VI |
| `11-3` | STEM | St. Catherine of Siena |
| `12-3` | STEM | St. Joan of Arc *(seen earlier in Batch 2 / Lozano case)* |

---

## Page: Not Enrolled (= "DID NOT ENROL")

**Purpose:** List of students from the database who do **not** have an enrollment record for the current SY (i.e., students who left, didn't return, or transferred out).

**Title:** `DID NOT ENROL FOR THIS SCHOOL YEAR: YYYY-YYYY`

**Table columns:**

| Column | Notes |
|--------|-------|
| `NAME` | Student full name |
| `ADDRESS` | Last known home address |
| `CONTACT DETAILS` | Phone numbers (multiple separated by `/`) |
| `GRADE (PastYear)` | Grade level student was in last enrolled SY (e.g., `12-3`, `6`, `10`, `K`, `S`) |

**Sample insight from observed data:**
- Includes recent SHS graduates (Grade 12 = `12-3`) — they finished and moved on
- Includes mid-pipeline dropouts (Grades K, 4, 6, 10)
- Useful for follow-up / re-enrollment outreach

---

## Page: Student No.

**Purpose:** Master student lookup table — comprehensive index by Student Number.

**Layout:** Single sortable table (no school year filter visible — possibly all-time DB).

**Table columns:**

| Column | Notes |
|--------|-------|
| `STUDENT NO.` | Internal student number — format `YY1YY2{seq}` (compressed entry SY + seq) |
| `NAME` | `LASTNAME, Firstname Middlename` |
| `GRADE/SECTION` | Current grade + section (e.g., `Grade XI-STEM - St. Catherine of Siena`, `Kinder - St. Mark`, `SPED - St. Gerald`) |
| `LRN` | DepEd Learner Reference Number (12-13 digits) |

### Student Number format (decoded)

Pattern: `YY1YY2{NNN}` where `YY1YY2` is the compressed SY of first NPS enrollment.

Examples:
- `2526033` → SY 2025-2026, sequence #033 (newly enrolled this year)
- `1819055` → SY 2018-2019, sequence #055 (long-time student)
- `2122025` → SY 2021-2022 entry
- `1415212` → SY 2014-2015 entry (old timer)
- `2324111` → SY 2023-2024 entry

> ⚠️ **Outlier observed:** `23244115` (8 digits, irregular) — possibly a manual or imported record. Schema should accommodate variable-length but enforce a canonical format in the rebuild.

### Naming convention quirk in this view

The `GRADE/SECTION` column uses **mixed grade format conventions**:

- Roman numerals: `Grade I`, `Grade II`, ... `Grade XII`
- Arabic numeral pre-K: `Kinder`, `SPED`
- SHS uses **strand suffix**: `Grade XI-STEM`, `Grade XII-STEM` (strand by name, not numeric code)
- The `S` code seen in Statistics page maps to **`SPED`** (Special Education) here ✅

> 🎯 **CONFIRMED:** `S` grade level code = **SPED (Special Education)**. The "St. Gerald" section is the SPED class. This resolves the prior open question.

---

## Page: Loyalty (= "Loyalty Awardee")

**Purpose:** Identifies students who have been at NPS the entire duration of their schooling — those eligible for loyalty / longevity awards. Filtered per terminal grade level (Grade 6 / 10 / 12).

**Title:** `Loyalty Awardee for the School Year YYYY-YYYY - Grade N`

**Table columns:**

| Column | Notes |
|--------|-------|
| `Database ID` | Internal student PK (e.g., `1516216`) |
| `NAME` | Student full name |
| `GRADE` | Current grade level |
| `YearsEnrolled` | Total years in school across **all schools** (incl. transfers from elsewhere) |
| `Years(NPS)` | Years specifically at **Naga Parochial School** |

### Eligibility logic (observed)

For Grade 10 awardees in SY 2025-2026:
- All have `Years(NPS)` = `10` (i.e., they've been at NPS since their 1st year of formal schooling — Grade 1 or earlier)
- `YearsEnrolled` ranges from 11 to 13 (some attended Pre-K which counts but not at NPS, then transferred for Grade 1)

→ Loyalty award = continuous NPS enrollment for the full grade-school duration.

---

## Cross-page observations

1. **"Alumni" terminology is forward-looking, not past.** The Alumni reports show *current* students who will graduate at the end of the SY — not past graduates.
2. **Three terminal grades** (6, 10, 12) match Philippine K-12 structure boundaries.
3. **Pre-K + SPED tiers** fully tracked: `N1`, `N2`, `K`, `S` (SPED) — system supports the full education pipeline from Nursery through Grade 12, plus Special Education.
4. **`S` = SPED (Special Education)** ✅ confirmed via Student No. lookup. Section: `St. Gerald`.
5. **Encoding bug** on legacy reports with `ñ` characters — should be addressed in rebuild (use UTF-8 throughout).
6. **New vs. Old** distinction is core domain concept — driven by per-student enrollment history.
7. **Student Number** is a compact `YY1YY2{seq}` format that encodes the SY of first NPS enrollment.
8. **Mixed grade naming conventions** in legacy UI — Roman numerals (`Grade I`–`XII`), word labels (`Kinder`, `SPED`), strand suffixes (`Grade XI-STEM`). Normalize in rebuild.
9. **Loyalty awards** track full-duration NPS enrollment — important domain concept (school PR/recognition).
10. **`Not Enrolled` page** is a useful re-engagement / outreach tool — useful pattern to preserve in rebuild.
