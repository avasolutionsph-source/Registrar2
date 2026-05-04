# Open Questions

Pending clarifications. As more screenshots come in, confirmations are noted here. Do not interrupt the user — questions are answered passively when new data arrives.

---

## ✅ Resolved

### School identity
- [x] **NPS = Naga Parochial School** — confirmed in Form 137 HS document header (Grade 9 & 10 records show `School: Naga Parochial School`). Source: Batch 3, Image 5.

### Credential abbreviations (Class Credentials column codes)

All 8 credential codes confirmed via the **Add New Student** form (Batch 3, Image 3):

- [x] `BC` = Photocopy of **Birth Certificate** ✅
- [x] `BP` = Photocopy of **Baptismal Certificate** ✅
- [x] `HC` = **Health Certificate** ✅
- [x] `Pix` = 1 Recent **1×1 ID picture** ✅
- [x] `RF` = **Recommendation Form** ✅
- [x] `F137` = **Form 137 / Form 10** ✅
- [x] `RC` = **Certification/Report Card (N–VI)** ✅
- [x] `GMC` = **Good Moral Certificate (Grades II–VI)** ✅

### Grade level codes
- [x] `S` = **SPED (Special Education)** ✅ (Batch 5) — section: St. Gerald
- [x] `N1`, `N2`, `K` = Nursery 1, Nursery 2, Kinder ✅ (Batch 4)

### SHS section-to-strand naming (Batch 5)
- [x] `11-1` GAS → **St. Padre Pio**
- [x] `11-2` HUMSS → **St. Paul VI**
- [x] `11-3` STEM → **St. Catherine of Siena**
- [x] `12-3` STEM → **St. Joan of Arc**

### Help menu (Batch 5)
- [x] Help menu has 2 items: `View Notifications` + `Change Password` (confirms auth + notifications system exists)

### File / Edit / Setup menus (Batch 6)
- [x] **File** menu = 4 items (Reload, Export as PDF, Print, Exit)
- [x] **Edit** menu = 6 items (Undo, Redo, Cut, Copy, Paste, Select All)
- [x] **Setup** menu = 3 items (Setup SchoolYear, Add Schools, Setup Admin)
- [x] Setup SchoolYear page configures: SY date range, per-month school days (drives attendance), encoding deadline per quarter
- [x] Add Schools page = master list of schools (used for transferee lookup); columns: Name, School ID, Address, District, Division, Region, Type
- [x] Grade-encoding window = **5 days** after each quarter's start date (per in-app note)

### Grading rubrics (Batch 6, from school wall display)
- [x] **5 rubric scales** documented: Academic Excellence Award (Honors), Academic, Attitude, Deportment, Special Program
- [x] Honors thresholds: 90-94 With Honors, 95-97 With High Honors, 98-100 With Highest Honors

---

## ⏳ Still pending (waiting for next batches)

### Section ID system
- [ ] Why are some section IDs **places/provinces** instead of saints? (IDs 61, 64–66, 73–79: Sorsogon, Camarines Norte, Catanduanes, Garcia, Vinzons, Roxas, Magsaysay, Quezon, Camarines Sur, Albay, Mabini)
  - Hypothesis: used for SHS HUMSS sections, or different academic tracks per grade level.
  - Update from Batch 3: Form 137 HS shows Grade 9 section as **"St. Maria Goretti"** which doesn't appear in current SY 2025-2026 sidebar list. Suggests section names **vary per school year**, not a fixed master list.

### Student status flags
- [ ] What does `[D]` mean on student name? (Seen on `CORNEJO, Zeus Jessy Cedilla [D]`)
  - Possibilities: Dropped, Deceased, Dismissed, Disabled (record), Designated.

### "Internet" indicator
- [ ] What is the `Internet` label / icon on the upper-right of some pages? Online sync? Cloud backup?

### Drop column (Enrolment Details)
- [ ] What is the `Drop` column for? Possibly: dropped status flag, drop date, or count of subjects dropped.

### Grade range limits
- [x] **Pre-K is supported** ✅ — confirmed via Statistics page (Batch 4): system tracks `N1` (Nursery 1), `N2` (Nursery 2), `K` (Kinder).
- [x] **`S` = SPED (Special Education)** ✅ — confirmed via Student No. lookup (Batch 5): grade/section column shows `SPED - St. Gerald` for students whose Statistics page shows them as `S` level. Not Senior Casa/Kinder as initially guessed.
- [ ] Does it support **night sections / makeup terms / summer**?

### Data persistence
- [ ] Where is the data stored? Local SQLite? Microsoft Access? Networked DB? Cloud?
- [ ] Is there an **export** feature for the entire database (for migration to v2)?
- [ ] Multi-user simultaneous access? Or single-user-at-a-time?

### SHS (Senior High School) Form 137
- [ ] Is there a separate **Form 137 SHS** sub-page? Currently only `Form 137 Elem` and `Form 137 HS` (and `Form 137 Log`) seen in submenu. Where does Grade 11/12 transcript print?
  - Hypothesis: SHS data may be appended to `Form 137 HS`, or output differently. Verify.

### Subject curriculum source (Batch 9 — RESOLVED)
- [x] **Subjects are defined in 3 layers** ✅:
  1. **Add Subjects** — master subject catalog (CODE → Full Name → Abbr → Category)
  2. **Setup Subjects** — per-SY assignment of subjects to grade levels with grading components (ITEMS comma-separated) + weight percentages (slash-separated)
  3. **Order Subjects** — assigns predefined SETS (ordered subject lists) to each Grade Level (Set1=1st Sem, Set2=2nd Sem for SHS)
- [x] **Subject categories** confirmed: `Core`, `Specialized`, `Applied`, `Elective` (DepEd SHS-aligned)
- [x] "Copy from previous SY" feature exists for bulk-copying subject configuration year-over-year

### Remedial Form HS
- [ ] What does the "Remedial Form HS" page contain? Likely for failing students who took remedial classes. Capture pending.

### Form 137 Log
- [ ] What does the Form 137 Log page show? Audit trail of generated forms? Capture pending.

### "Music" subject in Grade 10
- [x] Form 137 HS shows "Music" as a separate subject in Grade 10 — likely it's just `MUS` from a SET that splits MAPEH into separate Music/Arts/PE/Health (`MUS,ART,PED,HEA` pattern visible in many sets). NOT a display quirk; it's how the SET is configured.

### Subject codes — full mapping pending
- [ ] Many short subject codes appear only in SETS (e.g., `MOT`, `LAT`, `LAS`, `SIB`, `TLC`, `EPC`, `ECT`, `OCC`, `GEM`, `PDE`, `KPK`, `UCS`, `PEH`, `EAP`, `RWS`, `SAP`, `PPP`, `HDE`, `EMT`, `PFP`, `PPG`, `GEC`, `PCA`, `MIL`, `IPH`, `PHS`, `PHE`, `PRA`, `ENT`, `PHH`, `PRE`, `REP`, `TNC`, `IWB`, `ORM`). Need full Add Subjects scrolled-through capture to map every code to its full name.

### SET numbering gaps
- [ ] Set numbers visible: 1, 2, 3, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31+. Missing: 4, 11, 12. Soft-deleted? Reserved? Unused? Capture pending.

### Duplicate subject names
- [ ] Two subjects with same name "Disaster and Readiness and Risk Reduction" — codes `DRR` (Core) and `DIS` (Specialized). Likely intentional (different curriculum levels), but confusing. Confirm with user.

### Class menu — FULL 12-item structure (Batches 10 + 11 + 12)
- [x] **Class menu has 12 items** (was previously thought to be 5):
  1. Class List ✅
  2. Form 1 ✅
  3. Pupils Directory ✅ (= Class Directory page header)
  4. ID Info ✅ (= Class ID Info page header)
  5. Parents' Directory ✅ documented (Batch 12) — *page identification by elimination; title cropped in capture; verification needed*
  6. Credentials ✅
  7. Report Card — pending capture (likely batch SF 9 print)
  8. Form 5 ✅ fully captured (Batches 10 + 11)
  9. NCAE ✅ documented (Batch 11) — full column set still pending (scrollable)
  10. NAT ✅ documented (Batch 11) — full column set still pending (scrollable); SCHOOL ID confirmed derived from LRN
  11. ESC Billing — pending capture (Education Service Contracting subsidy billing)
  12. Class Transferees — pending capture (class-scoped transferee log)

### Parents' Directory page (Batch 12 — partial resolution)
- [x] **Page captured but identification uncertain** — title cropped in screenshot. Inferred to be Parents' Directory (Item 5) by elimination since (a) it's the only major Class menu item whose page hadn't been seen; (b) Items 7/11/12 are name-incompatible with the captured columns. Verify with user when next confirming the catalog.
- [x] **Content surprise:** the page despite being labeled "Parents' Directory" shows **student demographics + school of origin** (FIRST NAME / M.I. / LAST NAME / EXT / BIRTHDATE / GENDER / Elem. School Graduated From / SCHOOL TYPE / LRN), with NO parent-name or parent-contact fields. Either the menu label is misleading, or the captured page is something other than Parents' Directory.
- [ ] Confirm whether the legacy "Parents' Directory" actually shows parent-side data (name, address, phone — like a parent-teacher contact list), or only the pupil-side info captured in Batch 12. May indicate a missing/scrolled view.

### Cross-page format inconsistencies (Batch 12)
- [ ] **Same fields formatted differently on different pages** — birthdate `YYYY-MM-DD` (Form 1) vs `MM/DD/YYYY` (Parents' Directory); gender `M`/`F` (Form 1) vs `MALE`/`FEMALE` (Parents' Directory); name combined (Form 1's `LASTNAME, Firstname`) vs split into `FIRST NAME` / `M.I.` / `LAST NAME` / `EXT`. Rebuild must enforce a single canonical representation per field.
- [ ] **`M.I.` column mislabeled** — shows full middle surname, not initial. Rebuild should label as `Middle Name` (or `Maternal Surname` in PH context).

### SY history scope (Batch 10)
- [x] **System holds ~20 years of data** (SY 2007-2008 through SY 2026-2027). Migration scope is significant — DB likely contains: historical class rosters, archived report cards, defunct teacher accounts, old curriculum sets.
- [ ] Migration strategy: do we migrate all 20 years, or only recent N years? Older data is mostly read-only / archival.

### DepEd alignment (Batch 10 / Batch 11 partial resolution)
- [x] System tracks **standardized tests** (NCAE, NAT) and **government subsidy program** (ESC) — these are Philippine private-school requirements.
- [x] **NCAE columns visible (Batch 11):** `NAME`, `LRN`, `gmc`, `fil`, `MAPEH`, `TOTAL` — visible columns reuse NPS internal subject codes rather than standard NCAE subtests. Likely a scrollable subset; full column set still pending.
- [x] **NAT columns visible (Batch 11):** `NAME`, `LRN`, `fil`, `SCHOOL ID` — only one subject column visible (Filipino); rest of the standard NAT subjects (Eng/Math/Sci/AP) likely off-screen. **Key finding:** `SCHOOL ID` is derived from LRN's first 6 digits (school of original enrollment).
- [ ] Pending: scrolled-right capture of NCAE and NAT to see the full column set; ESC Billing page still entirely unseen.

### NCAE / NAT page behavior (Batch 11)
- [x] **Pages render for every class regardless of grade level** — Grade 1 sample shows NCAE + NAT pages with all-zero scores. Legacy doesn't gate visibility by grade-level eligibility. Rebuild should gate or render an explicit empty-state.
- [ ] Are NCAE/NAT score columns dynamically driven by what subjects the class takes (i.e., the page columns vary per grade level / SET), or are they fixed columns hardcoded in the report? Implications for data model.

### LRN encoding (Batch 11 — confirmed)
- [x] **DepEd LRN format: first 6 digits = School ID of original enrollment** ✅ — confirmed by NAT page's `SCHOOL ID` column matching `LRN[0:6]` for every row sampled. Useful invariant: school-of-origin is derivable from LRN, not separately stored.

### Statistics submenu items not yet captured
- [x] **New Enrollees** ✅ — incoming students with prior school info (Batch 5)
- [x] **Not Enrolled** ✅ — `DID NOT ENROL FOR THIS SCHOOL YEAR` page; lists students from prior years' DB without current SY enrollment, with their last-year grade (Batch 5)
- [x] **Student No.** ✅ — comprehensive student lookup table (Student No. ↔ Name ↔ Grade/Section ↔ LRN); reveals student-no format `YY1YY2{seq}` (Batch 5)
- [x] **Loyalty** ✅ — `Loyalty Awardee` page; lists students with continuous NPS enrollment (Years(NPS) = current grade level); filtered per terminal grade (6/10/12) (Batch 5)

### Encoding bug
- [ ] **Latin-1 vs UTF-8** issue: names with `ñ` characters render garbled in Alumni reports (e.g., `Sto. Niño` → `Sto. NiÃfÂ±o`). The data is being stored or rendered with mismatched encodings. Must use UTF-8 throughout in the rebuild.

### Authentication / users (newly raised by Batch 5)
- [ ] **Login screen** — system has authentication (Help > Change Password confirms user accounts) — not yet captured.
- [ ] How many user roles? (Registrar, Adviser, Principal, Admin?)
- [ ] What does `View Notifications` show? In-app messages? Sync alerts? System events?

### Student Number outliers
- [ ] One observed student number (`23244115`, 8 digits) breaks the standard `YY1YY2{seq}` 7-digit pattern. Manual entry? Imported record? Verify schema constraints.

### Mixed naming conventions
- [ ] In `Student No.` view: grade names alternate between Roman numerals (`Grade I`–`XII`), word labels (`Kinder`, `SPED`), and strand suffixes (`Grade XI-STEM`). Must normalize in rebuild.

### Grade/Section + Teachers menus (Batch 7 — RESOLVED)
- [x] **Grade/Section** menu = 2 items: Add Grade/Year Level, Add Sections
- [x] **Teachers** menu = 5 items: Add New Teacher, List of Teachers (All), List of Teachers (Active), View and Edit Advisers, View Class Grade-Sheet
- [x] Add Grade/Year Level reveals master list with **IN/OUT toggle** and **LEVEL** tier (1=Pre-elem, 2=Elem, 3=JHS, 4=SHS)
- [x] **ABM strand confirmed supported** (code `11-4`)
- [x] **`OUT` legacy codes** for transferee compatibility (Junior Casa, Advanced Casa, Senior Casa, 1st-4th Year, etc.)
- [x] Add Sections shows 70+ section names; some duplicates noticed (e.g., St. Alphonsus de Ligouri vs. St. Alphonsus Liguori — same person, different spellings)
- [x] **Add New Teacher form** confirms teachers ARE system user accounts (Email + Password fields)
- [x] **Teacher numeric IDs** are sequential integers (range 2–171+ observed)
- [x] **Subject codes** are 3-letter (CLE, LAN, REA, MAT, SAH, FIL, HEK, EPP, MAP, ESP, SCI, APN — more visible if scrolled)

### Teacher menu sub-pages (Batch 8 — RESOLVED)
- [x] **List of Teachers (All)** ✅ — columns: Title, Family Name, First Name, M.I., Year_S, Year_E, Email, Password
- [x] **List of Teachers (Active)** ✅ — same columns, filtered by `Year_E = 0`
- [x] **View and Edit Advisers** ✅ — adviser assignments with NEW `Curriculum` column (e.g., `Kto12-B`)
- [x] **View Class Grade-Sheet** ✅ — top-level filters captured (SY + Quarter + "select what to view"); teacher-driven workflow ("Click the name of the teacher" placeholder before content loads)
- [ ] **View Class Grade-Sheet content** (after teacher selection) — pending capture; this is the actual grade-input UI

### 🚨 Security findings (Batch 8)
- [x] **CRITICAL: Plaintext passwords** stored and displayed in `List of Teachers (All)` view — see [09-security-concerns.md](09-security-concerns.md). MUST be hashed (bcrypt/argon2) in rebuild. Force password reset on every imported account.
- [x] **Weak passwords observed** — many low-entropy and easily-guessable; enforce password policy in rebuild.
- [x] **Encoding bug pattern** (`ñ` → garbled) suggests possibly mismatched DB charset / improper escaping; rebuild must use UTF-8 + parameterized queries.

### Curriculum field (Batch 8)
- [x] **`Curriculum` column** confirmed on `View and Edit Advisers` page; sample value: `Kto12-B`. Each class is tagged with curriculum version.
- [ ] What other curriculum codes exist? Per grade level? Per SHS strand? Pre-K (`Kto12-B` clearly applies to K-12 cohorts; Pre-K and SPED may use different codes).

### "select what to view" dropdown (Batch 8)
- [ ] On `View Class Grade-Sheet` page, what are the options in the `select what to view` dropdown? Subject grades, conduct, attendance, deportment, etc.?

### Active filter sentinel
- [ ] Legacy uses `Year_E = 0` as "still active" sentinel — rebuild should use proper NULL or `is_active` boolean.

### Section ID instability (raised by Batch 7)
- [ ] Section IDs in Add Sections page (Batch 7) don't match Section Reference legend in Enrolment Details (Batch 2). Either IDs got renumbered, or there are multiple section ID concepts. **Implication for rebuild:** use immutable UUIDs for sections and a separate per-SY assignment table for which section is at which grade level in a given SY.

### Setup pages — sidebar widgets (Batch 6)
- [ ] **"Birthday Celebrants 2026"** sidebar widget — shows on Setup pages. What does it display? Per-month? Per-section? Where else does this surface?
- [ ] **"Awaiting Confirmation"** widget with text "If checked, edit Enrolment" — what's the workflow? Is this a gating mechanism for enrollment edits?
- [ ] **"Submitted:"** field — likely status indicator for SF/report submissions to DepEd. What does it track?

### Setup Admin page (Batch 7)
- [x] **Setup Admin** page documented ✅ — assigns teachers to school positions (Registrar, Principal, Coordinator-Elem/HS/SHS, Guidance Coordinator, Director, Finance) AND to Subject Area Coordinator roles per subject. Drives auto-populated signatures on Form 137/138.

### Add Schools data quality (Batch 6)
- [ ] Migration concern: legacy schools table has **duplicates** (e.g., "Bodega Elementary School" twice with same `SCHOOL ID 113572`), **inconsistent blank fields**, and **mismatched division/address** entries. Need a deduplication + cleanup pass before importing.

### SHS section-to-strand mapping (newly confirmed)
- [x] Confirmed via `New Enrollees` (Batch 5):
  - `11-1` GAS → St. Padre Pio
  - `11-2` HUMSS → St. Paul VI
  - `11-3` STEM → St. Catherine of Siena
  - `12-3` STEM → St. Joan of Arc
- [ ] Mapping for `12-1` (GAS), `12-2` (HUMSS), `11-41`/`12-41` (ABM) not yet observed — does NPS even offer ABM strand? Verify.
