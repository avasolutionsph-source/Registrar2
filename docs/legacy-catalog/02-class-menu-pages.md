# 02 — Class Menu Pages

Source: **Batch 1 + Batch 10 + Batch 11 + Batch 12** (full menu structure documented; Parents' Directory candidate page captured in Batch 12).

## Class menu — FULL structure (12 items)

The Class menu has **12 items**, not just 5 (Batch 10 dropdown capture):

| # | Item | Status |
|---|------|--------|
| 1 | **Class List** | ✅ Documented below |
| 2 | **Form 1** | ✅ Documented below |
| 3 | **Pupils Directory** | ✅ Documented below (was named "Class Directory" in earlier capture) |
| 4 | **ID Info** | ✅ Documented below |
| 5 | **Parents' Directory** | ✅ Documented below (Batch 12 — page identification has caveats; see notes) |
| 6 | **Credentials** | ✅ Documented below |
| 7 | **Report Card** | ⏳ Pending capture (likely batch-print SF 9) |
| 8 | **Form 5** | ✅ Fully captured (Batch 10 + Batch 11) — see below |
| 9 | **NCAE** | ✅ Documented below (Batch 11) |
| 10 | **NAT** | ✅ Documented below (Batch 11) |
| 11 | **ESC Billing** | ⏳ Pending capture (Education Service Contracting subsidy billing) |
| 12 | **Class Transferees** | ⏳ Pending capture (class-scoped transferee log) |

> Pages 3 and 4 of the original Batch 1 used the names "Class Directory" and "Class ID Info" in their page headers, but the menu items are simply "Pupils Directory" and "ID Info". They map to the same pages.

---

All pages share a common header:
- School Year (e.g., `2025-2026`)
- Grade/Year (e.g., `Grade II - St. Gregory the Great`)
- Adviser (e.g., `Ms. Mary Grace Y. Baudin`)

Sample data is from **Grade II - St. Gregory the Great**: 9 boys + 14 girls.

---

## Page: Class Credentials

**Purpose:** Track which credentials each student has submitted.

**Layout:**
- Numbered student list (Boys 1–9, Girls 1–14)
- Checkmark grid: ✓ if credential is on file

**Columns / Credential codes** (all confirmed via Add New Student form, Batch 3):

| Code | Full label |
|------|-----------|
| `BC` | Photocopy of Birth Certificate |
| `BP` | Photocopy of Baptismal Certificate |
| `HC` | Health Certificate |
| `Pix` | 1 Recent 1×1 ID picture |
| `RF` | Recommendation Form |
| `F137` | Form 137 / Form 10 |
| `RC` | Certification/Report Card (N–VI) |
| `GMC` | Good Moral Certificate (Grades II–VI) |

---

## Page: Class Directory

**Purpose:** Address book / contact directory for the class.

**Sectioned layout:**
- **BOYS** subsection (numbered 1–9)
- **GIRLS** subsection (numbered 1–14)

**Columns:**

| Column | Notes |
|--------|-------|
| `NAME` | `LASTNAME, Firstname Middlename` format |
| `ADDRESS` | Full text — barangay, subdivision, city/municipality, province |
| `CONTACT` | Mobile number(s); multiple separated by `/` |

---

## Page: Class Form 1

**Purpose:** Master roster equivalent to **DepEd School Form 1** (school register).

**Columns:**

| Column | Format / Notes |
|--------|----------------|
| `LRN` | 12-digit DepEd Learner Reference Number |
| `NAME` | `LASTNAME, Firstname Middlename` |
| `GENDER` | `M` / `F` |
| `BIRTHDAY` | `YYYY-MM-DD` |
| `Father's Name` | Full name (may be blank) |
| `Mother's Maiden Name` | Full name (maiden) |
| `ADDRESS` | Full text |
| `CONTACT` | Mobile number(s) |

**Header indicators:**
- `Internet` label visible (upper-right) — online sync indicator
- Window title shows partial `V203...` — possibly older module label

---

## Page: Class ID Info

**Purpose:** Data needed for printing student IDs (parent contact emphasized).

**Sectioned layout:**
- **BOYS** subsection
- **GIRLS** subsection

**Columns:**

| Column | Notes |
|--------|-------|
| `NAME` | Student full name |
| `CONTACT` | **Parent/guardian name** (not phone — confusingly labeled) |
| `ADDRESS` | Home address |
| `CONTACT NOS.` | Mobile number(s) |

⚠️ **Naming inconsistency:** This page uses `CONTACT` for parent name but `CONTACT NOS.` for phone numbers. Other pages use `CONTACT` for phone numbers. Worth normalizing in the rebuild.

---

## Page: Class List

**Purpose:** Simplest roster view — names only.

**Layout:** Two parallel columns:

- **MALE** (numbered 1–9)
- **FEMALE** (numbered 1–14)

No other fields. Pure list output.

---

## Page: Form 5 (DepEd SF 5 — Report on Promotion)

Source: **Batch 10 + Batch 11** (full layout now captured).

**Purpose:** Per-class promotion summary — DepEd-aligned **School Form 5 (SF 5)**. Used at end-of-SY to report which students were promoted, irregular, or retained.

**Layout:**

**Main table columns:**

| Column | Notes |
|--------|-------|
| `LRN` | 12-digit DepEd Learner Reference Number |
| `LEARNER'S NAME` | `LASTNAME, Firstname Middlename` |
| `GENERAL AVERAGE` | Numeric (`0` shown for early-SY classes; populated at year-end) |
| `ACTION TAKEN` | `promoted` / `retained` / `irregular` (DepEd promotion outcomes) |

**Right-side panel — SUMMARY TABLE:**

Shows class-level aggregates with Male/Female/Total breakdown:

| STATUS | MALE | FEMALE | TOTAL |
|--------|------|--------|-------|
| `PROMOTED` | (e.g., 7) | (e.g., 10) | (e.g., 17) |
| `IRREGULAR` | | | |
| `RETAINED` | (e.g., 0) | (e.g., 0) | (e.g., 0) |

**Right-side panel — LEVEL OF PROFICIENCY:**

Per-grade-level proficiency distribution (DepEd K-12 grading descriptors), Male/Female/Total:

| LEVEL | MALE | FEMALE | TOTAL |
|-------|------|--------|-------|
| `BEGINNING` | 0 | 0 | 0 |
| `DEVELOPING` | 0 | 0 | 0 |
| `APPROACHING PROFICIENCY` | 0 | 0 | 0 |
| `PROFICIENT` | 0 | 0 | 0 |
| `ADVANCED` | 0 | 0 | 0 |

> The DepEd K-12 proficiency descriptor cutoffs (typical):
> - Beginning: 74 and below
> - Developing: 75-79
> - Approaching Proficiency: 80-84
> - Proficient: 85-89
> - Advanced: 90 and above

**Sample data (Grade I - St. John Vianney, SY 2025-2026):** 17 students all `promoted` (7 male + 10 female). All values `0` for General Average — likely because grades not yet finalized for current SY.

> Note: SF 5 is a **DepEd-required form** submitted at end of SY. Critical for promotion decisions and DepEd reporting.

---

## Page: Parents' Directory

Source: **Batch 12** (page identification inferred — see caveat below).

**Observed purpose:** Despite the menu label suggesting a parent-contact list, the captured page shows **student demographic + school-of-origin** data — fields parents would care about for each pupil. No parent name or parent contact fields are visible. The page reads as a "pupils' identity sheet" more than a parent directory.

**Header:**
- `School Year:` (e.g., `2025-2026`)
- `Grade/Year:` (e.g., `Grade I - St. John Vianney`)
- *(No `CLASS XXX` page title visible in capture — header is cropped)*

**Layout:** Single roster table with **continuous numbering 1–17** (males listed first, then females — no Boys/Girls subsection split, unlike the Pupils Directory and ID Info pages).

**Columns:**

| Column | Notes |
|--------|-------|
| `#` | Continuous row number (1–17 in sample; males 1–7, females 8–17) |
| `FIRST NAME` | Given names (may be compound, e.g., `MARCUZ KARMELO`, `PATRICIA YSABELLE`) |
| `M.I.` | **Mislabeled** — actually shows the **full middle/maternal surname** (e.g., `DELOS REYES`, `ARAGUIRANG`, `OCCIANO`), not a single-letter initial |
| `LAST NAME` | Paternal surname |
| `EXT` | Suffix (Jr., II, III) — blank in all sampled rows |
| `BIRTHDATE` | `MM/DD/YYYY` format (e.g., `03/03/2019`) — note: **different format from Form 1's `YYYY-MM-DD`** |
| `GENDER` | Spelled out: `MALE` / `FEMALE` (Form 1 uses `M` / `F`) |
| `Elem. School Graduated From` | School-of-origin for elementary completers — **blank for Grade 1** (haven't graduated elem yet); populated for Grade 7+ |
| `SCHOOL TYPE` | Type classifier (Public / Private / SUC / etc.) — also blank for Grade 1 |
| `LRN` | 12-digit DepEd Learner Reference Number |

> ⚠️ **Page identification caveat:** The captured screenshot has the page title cropped. Identification as "Parents' Directory" is by elimination — it's the only Class menu item whose page hadn't been seen before this batch (Items 7/11/12 — Report Card, ESC Billing, Class Transferees — remain uncaptured but their content would not match these columns). The cursor in the dropdown capture (Image 2) hovers on **ESC Billing**, suggesting the user was about to navigate away from this page; the page beneath the dropdown could plausibly be Parents' Directory or a horizontal-scroll variant of Form 1. **Verification needed:** confirm with user.

> ⚠️ **Naming inconsistencies vs. other Class pages:**
> - `M.I.` column header is misleading (shows full middle surname, not initial)
> - Birthdate format `MM/DD/YYYY` here vs. `YYYY-MM-DD` in Form 1 — UI inconsistency
> - Gender as `MALE`/`FEMALE` here vs. `M`/`F` in Form 1
>
> Rebuild should standardize: birthdates as ISO-8601 (`YYYY-MM-DD`), gender as a controlled enum, and label columns accurately (`Middle Name` not `M.I.` if showing the full word).

> 🔑 **Implication for rebuild:** This page is essentially a per-class export of `(student_identity + origin_school)` — useful for DepEd transferee reporting and SF 1 cross-checks. Consider unifying with Form 1 in the rebuild rather than maintaining two near-duplicate views with inconsistent formatting.

**Sample data (Grade I - St. John Vianney, SY 2025-2026):** 17 students; all `Elem. School Graduated From` and `SCHOOL TYPE` cells blank (expected — Grade 1 cohort hasn't graduated elementary yet).

---

## Page: Report Card (PENDING CAPTURE)

**Inferred purpose:** Class-scoped batch print of report cards (SF 9 / Form 138). Per-class equivalent of the per-student `Students > View Grades` page.

> Likely allows printing all students in the class with one action.

---

## Page: NCAE (DepEd National Career Assessment Examination)

Source: **Batch 11**.

**Purpose:** Per-class score sheet for the **National Career Assessment Examination** — DepEd standardized career-aptitude test traditionally taken by Grade 9 students (recently shifted to Grade 10 / SHS in some cycles).

**Header:**
- `CLASS NCAE` page title
- `School Year:` (e.g., `2025-2026`)
- `Adviser:` (e.g., `Mrs. De Vela, Juliet P.`)
- `Grade/Section:` (e.g., `Grade I - St. John Vianney`)

**Layout:** Single roster table with one row per enrolled student. Boys-then-girls numbering reset is visible (1–7 for boys, 1–10 for girls), matching the directory-style sectioning seen in other Class pages.

**Columns (visible portion):**

| Column | Notes |
|--------|-------|
| `#` | Per-section row number |
| `NAME` | `LASTNAME, Firstname Middlename` |
| `LRN` | 12-digit DepEd Learner Reference Number |
| `gmc` | Score field — meaning unconfirmed (lowercase header in UI; matches NPS subject code `GMC`) |
| `fil` | Score field — likely Filipino subject component |
| `MAPEH` | Score field — Music/Arts/PE/Health composite |
| `TOTAL` | Aggregate score |

> ⚠️ **Schema oddity:** The visible column headers (`gmc`, `fil`, `MAPEH`) reuse NPS internal subject codes rather than standard NCAE subtests (Scientific Ability, Reading Comprehension, Verbal Ability, Mathematical Ability, etc.). Possibilities: (a) the displayed columns are a scrollable subset of a wider table; (b) NPS repurposed the NCAE table to track internal subject scores; (c) the school entered NCAE results under whatever column slots were available. **Capture needed:** scrolled-right view to see the full column set. Logged in [open-questions.md](open-questions.md).

**Sample data (Grade I - St. John Vianney, SY 2025-2026):** All 17 students show `0 / 0 / 0 / 0` — expected, since Grade 1 does not take NCAE. The page renders the roster regardless of grade level; only grade levels that actually take the test would have populated values.

> **Implication for rebuild:** NCAE is grade-level-specific (Grade 9/10 only). The legacy system shows it for every class indiscriminately. The rebuild should either (a) gate the page to grade levels that actually take NCAE, or (b) show empty state with a clear "this grade level does not take NCAE" message rather than blank zeros.

---

## Page: NAT (DepEd National Achievement Test)

Source: **Batch 11**.

**Purpose:** Per-class score sheet for the **National Achievement Test** — DepEd standardized achievement test administered at terminal/checkpoint grades (Grades 3, 6, 10, 12 historically; current cycle varies).

**Header:**
- `CLASS NAT` page title
- `School Year:` (e.g., `2025-2026`)
- `Adviser:` (e.g., `Mrs. De Vela, Juliet P.`)
- `Grade/Section:` (e.g., `Grade I - St. John Vianney`)

**Layout:** Single roster table with boys-then-girls numbering reset (1–7 boys, 1–10 girls), 17 students for the sample class.

**Columns (visible portion):**

| Column | Notes |
|--------|-------|
| `#` | Per-section row number |
| `NAME` | `LASTNAME, Firstname Middlename` |
| `LRN` | 12-digit DepEd Learner Reference Number |
| `fil` | Score field — likely Filipino (single visible subject column) |
| `SCHOOL ID` | 6-digit school code — **matches the first 6 digits of the student's LRN** |

> 🔑 **Key insight — SCHOOL ID derivation:** The `SCHOOL ID` column equals **LRN[0:6]** for every row sampled (e.g., LRN `403875240001` → School ID `403875`; LRN `433591240005` → `433591`). DepEd's LRN format encodes the **school of original enrollment** as the first 6 digits, so this column is showing each student's **point-of-origin school** (where they were first enrolled in the DepEd system) — useful for NAT reporting because DepEd aggregates NAT scores back to the originating school. This column is **derived**, not separately stored.
>
> **Implication for rebuild:** Don't store School ID as a separate field on the NAT record — derive it from LRN. Useful for transferee statistics across the whole app.

> ⚠️ **Schema oddity:** Same as NCAE — only one subject column (`fil`) is visible. NAT subjects historically include English, Mathematics, Science, Filipino, and Araling Panlipunan. The visible column set is likely a scrollable subset.

**Sample data (Grade I - St. John Vianney, SY 2025-2026):** All `fil` scores are `0` (Grade 1 doesn't take NAT). Multiple distinct `SCHOOL ID` values visible (`403875`, `403870`, `410553`, `433591`, `436513`, `436534`) — i.e., students in this class came from at least 6 different originating schools.

> **Implication for rebuild:** Same as NCAE — gate visibility to grade levels that actually take NAT, or render an explicit empty-state message.

---

## Page: ESC Billing (PENDING CAPTURE)

**Inferred purpose:** **Education Service Contracting** subsidy billing tracker. ESC is a Philippine government program where private school students receive subsidies to cover tuition. The system tracks per-student ESC eligibility and billing for reimbursement claims to the government.

---

## Page: Class Transferees (PENDING CAPTURE)

**Inferred purpose:** Class-scoped log of students who transferred IN or OUT of this specific class during the SY. Different from the global `Statistics > New Enrollees` and `Statistics > Not Enrolled` reports.

---

## Cross-page observations

1. The Class menu has **12 different views** of class data, each tailored to a specific use case:
   - Roll-call style: Class List, Pupils Directory, ID Info, Parents' Directory, Credentials
   - DepEd forms: Form 1 (SF 1 register), Form 5 (SF 5 promotion), Report Card (SF 9 / Form 138)
   - Standardized tests: NCAE, NAT
   - Government program tracking: ESC Billing
   - Movement tracking: Class Transferees
2. Boys/Girls separation is enforced in most directory-style views (Pupils Directory, ID Info, List, NCAE, NAT). Form 1, Form 5, and report-card-style views use unified numbering.
3. The `[D]` annotation on student names appears in roster views — meaning still unconfirmed.
4. Most views are **read-only printable reports**. Some (Form 5) have computed summary tables; some (NCAE, NAT) are score-entry tables.
5. **DepEd alignment** is strong — Form 1 = SF 1, Form 5 = SF 5, Report Card = SF 9 / Form 138, Form 137 = SF 10. The system is designed around DepEd's official forms.
6. **ESC Billing integration** is a Philippine private-school-specific feature — important domain reality for the rebuild.
7. **NCAE / NAT are not gated by grade level** in the legacy system — every class shows the page even when the grade doesn't take that test (all-zeros rendering). The rebuild should gate by grade-level eligibility.
8. **LRN encodes the originating school ID** in its first 6 digits (confirmed via NAT page's `SCHOOL ID` column). This is a useful invariant for transferee detection and DepEd reporting; school-of-origin should be a derived attribute, not a stored field.
9. **Formatting inconsistency across pages** — same fields shown differently on different pages: birthdate is `YYYY-MM-DD` on Form 1 but `MM/DD/YYYY` on Parents' Directory; gender is `M`/`F` on Form 1 but `MALE`/`FEMALE` on Parents' Directory; the `M.I.` header on Parents' Directory shows full middle surnames, not initials. Rebuild must enforce a single canonical format per field across all views.
10. **Numbering style varies by page intent** — directory/roll-call pages (Pupils Directory, ID Info, NCAE, NAT) use Boys/Girls split numbering (resets); roster/register pages (Form 1, Form 5, Parents' Directory) use continuous 1–N numbering. The convention seems to track whether the page is for **calling roll** (split) vs. **listing the cohort** (continuous).
