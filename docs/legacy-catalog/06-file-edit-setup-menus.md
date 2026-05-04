# 06 — File, Edit, Setup Menus

Source: **Batch 6** (4 software screenshots + 1 reference photo).

---

## File menu (4 items)

Standard file operations with keyboard shortcuts:

| # | Item | Shortcut | Purpose |
|---|------|----------|---------|
| 1 | **Reload** | `Ctrl+R` | Refresh current view from database |
| 2 | **Export as PDF** | `Ctrl+Shift+P` | Export current report/page to PDF |
| 3 | **Print** | `Ctrl+P` | Print current page |
| 4 | **Exit** | — | Close the app |

> Notable: PDF export is a **global** feature (via File menu), beyond the per-page `TO PDF` button on the Report Card. Likely works on any printable view.

---

## Edit menu (6 items)

Standard text-editing clipboard operations:

| # | Item | Shortcut |
|---|------|----------|
| 1 | **Undo** | `Ctrl+Z` |
| 2 | **Redo** | `Ctrl+Y` |
| 3 | **Cut** | `Ctrl+X` |
| 4 | **Copy** | `Ctrl+C` |
| 5 | **Paste** | `Ctrl+V` |
| 6 | **Select All** | `Ctrl+A` |

> No domain-specific editing actions here — purely OS-level text operations.

---

## Setup menu (3 items)

App-wide configuration. **Likely admin-only**.

| # | Item | Purpose |
|---|------|---------|
| 1 | **Setup SchoolYear** | Configure SY dates, attendance days per month, grade-encoding deadlines per quarter |
| 2 | **Add Schools** | Manage the master list of schools (for transferee tracking) |
| 3 | **Setup Admin** | (not yet captured — likely user/admin account management) |

---

## Page: Setup > Setup SchoolYear

**Purpose:** Configure key dates and durations for a given School Year.

### Section 1: "Configuration of Number of Days Every School Year"

**Title:** `Configuration of Number of Days Every School Year YYYY-YYYY:`

**Table columns:**

| Column | Type | Notes |
|--------|------|-------|
| `SchoolYear` | Read-only label | e.g., `2026-2027` |
| `Date Started` | Date picker (`mm/dd/yyyy`) | First day of SY (sample: `06/08/2026`) |
| `Date Ended` | Date picker (`mm/dd/yyyy`) | Last day of SY (sample: `04/08/2027`) |
| `Jun` … `Apr` | Number per month | Number of school days per month (Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr) |
| `Total` | Auto-computed | Sum of all months (auto-updated) |

**Insight:** This drives the **Attendance Report** in SF 9 / Form 138 (per-month school-day counts). Setting these per SY ensures the report card pulls correct totals.

### Section 2: "Alloted Time Duration in Encoding Grades"

**Title:** `Alloted Time Duration in Encoding Grades:`

**Table columns:**

| Column | Notes |
|--------|-------|
| `SchoolYear` | Read-only |
| `1st Quarter` | Date picker — start of encoding window for Q1 |
| `2nd Quarter` | Date picker — start of encoding window for Q2 |
| `3rd Quarter` | Date picker — start of encoding window for Q3 |
| `4th Quarter` | Date picker — start of encoding window for Q4 |

**In-app note:** *"Encoding is set for 5 days after the starting date is set."*

**Interpretation:** Teachers/registrar have a **5-day window** after each quarter's start date to encode grades. Likely enforces a deadline for the Summary of Grades / View Grades pages.

### Right-side panel (sidebar widgets)

Three small panels visible:

| Panel | Content / function |
|-------|---------------------|
| **Birthday Celebrants 2026** | Likely shows students with birthdays in current period (feature TBD) |
| **Awaiting Confirmation** | Has hint text: *"If checked, edit Enrolment"* — likely a workflow checkbox to gate Enrolment edits |
| **Submitted:** | Probably a status indicator for SF / report submission to DepEd |

> ⚠️ These panels are not fully captured yet — content/behavior TBD.

---

## Page: Setup > Add Schools

**Purpose:** Master list of all schools recognized by the system. Used when a student transfers in (need to record `School Last Attended`) or transfers out.

**Title:** `Add New School` (partially visible — confirmed by `Add N...` cutoff)

**Table columns:**

| Column | Notes |
|--------|-------|
| `NAME OF SCHOOL` | Full school name |
| `SCHOOL ID` | DepEd school code (6-digit, e.g., `403855`, `436511`) |
| `ADDRESS` | Full address |
| `DISTRICT` | DepEd district (e.g., `Naga North`, `Naga South District 1`, `Naga East District 2`) — sometimes blank |
| `DIVISION` | DepEd division (e.g., `Naga City`, `Camarines Sur`, `Las Piñas City`) |
| `REGION` | Roman numeral region code (e.g., `V` = Bicol, `IV-A` = Calabarzon, `NCR`, `III` = Central Luzon) |
| `SCHOOL TYPE` | `Public` / `Private` (sometimes blank) |

**Sample data observed:** ~23+ schools visible, mix of:
- **Naga City schools** (American School, Arborvitae Plains Montessori, Ateneo Child Learning Center, Ateneo de Naga U, Balatas NHS, Bicol Central Academy, etc.)
- **Camarines Sur public schools** (Awayan Elem, Banga Elem, Beberon Elem, Bombon Central, Buhi Central, etc.)
- **Out-of-region schools** (Bernardo College in Las Piñas City NCR, Bethany Ecumenical in Nueva Ecija III, Blessed Christian School in Sta. Rosa Laguna IV-A)
- Even **Masbate** (Bodega Elementary School, Claveria) and Muntinlupa schools

**Data quality observations** (flag for migration):

| Issue | Example |
|-------|---------|
| **Duplicate schools** | "Bodega Elementary School" appears twice (rows 15 and 16) — same `SCHOOL ID 113572` but different addresses (`Claveria, Masbate` vs. `Bodega, Claveria, Masbate`) |
| **Inconsistent blank fields** | DISTRICT often blank for non-Naga schools; SCHOOL TYPE blank for some Camarines Sur schools |
| **Mismatched fields** | "Buhi Central School" address says `San Pedro, Buhi, Camarines Sur` but DIVISION shows `Muntinlupa City` — likely a data-entry error |
| **Mismatched division/address** | "Buli Elem. School" address `Muntinlupa City`, division also `Muntinlupa City` — but in row above, `Camarines Sur` school appears |

> **Migration implication:** Need a deduplication + data-cleanup step before importing the school master list into the rebuild.

### Right-side panel (same as Setup SchoolYear)

Same three panels: `Birthday Celebrants 2026`, `Awaiting Confirmation`, `Submitted:` — appears these are **global widgets** persisting across Setup pages (or sample show on a multi-page Setup workspace).

---

## Page: Setup > Setup Admin

**Purpose:** Assign teachers to **administrative positions** AND to **subject-area coordinator roles**. Drives the names that appear on certifications, report cards, and Form 137 signatures.

**Title:** `Assign...` (cut off — likely `Assignments` or `Assign Positions`)

### Section 1: School Positions (POSITION → TEACHER assignments)

| POSITION | Sample TEACHER assigned |
|----------|-------------------------|
| Registrar | Ramos, Marites |
| Registrar | Medrano, Myra *(two registrars supported)* |
| Principal | Olalia, Rosario |
| Coordinator - Elem | Moises, Jasmin |
| Coordinator - HS | Maqueda, Trece |
| Guidance Coordinator | Bayot, Kendrick Gold |
| Coordinator - SHS | Surara, Christine |
| Director | (blank) |
| Finance | (blank) |

> 🎯 **Cross-reference:** `Ramos, Marites` (Registrar) = the name shown signing Form 137 Elem ("MARITES C. RAMOS, Registrar"). `Olalia, Rosario` (Principal) = "MRS. ROSARIO OLALIA, Principal" on Form 138 Report Card.
> 
> So the Setup Admin assignments **drive the auto-populated signatures** on official documents. Critical config to preserve in the rebuild.

### Section 2: Subject Area Coordinators

**In-app warning:** *"Don't encode on 'OTHER SAS' without assigning first the TEACHER."*

**Columns:**

| Column | Notes |
|--------|-------|
| `SUBJECTS` | Format: `CODE \| Subject Full Name` |
| `TEACHER` | Lead Subject Area Coordinator (one per subject) |
| `OTHER SAS` | Numeric — possibly count of "Other Subject Area Specialists" or related teachers |

### Subject codes confirmed from this view

The system uses **3-letter subject codes** as primary keys for subjects:

| Code | Subject |
|------|---------|
| `CLE` | Christian Living Ed. |
| `LAN` | Language & Spelling |
| `REA` | Reading & Phonics |
| `MAT` | Mathematics |
| `SAH` | Science & Health |
| `FIL` | Filipino |
| `HEK` | HEKASI |
| `EPP` | EPP *(Edukasyong Pantahanan at Pangkabuhayan)* |
| `MAP` | MAPE |
| `ESP` | Ed. sa Pagpapakatao |
| `SCI` | Science |
| `APN` | Araling Panlipunan |
| *(more visible if scrolled)* | |

> The code prefix (`CLE-ESP`, `TLE-ICT` etc. seen on Form 137 HS) likely combines subject codes when subjects are merged in HS curriculum.

### Right-side panel (numbered teacher list — Active teachers)

Scrollable alphabetical list of active teachers, each with a **numeric teacher ID**:

Sample entries: `145 - Añonuevo, Alexis Joy`, `9 - Agor, Janet`, `87 - Alarcon, Rex Andrew`, `135 - Aldecoa, Shiela`, `128 - Almario, Marvin`, `19 - Antonio, Loreto Jr.`, `151 - Baudin, Mary Grace`, `164 - Bayot, Kendrick Gold`, `166 - Borela, Cristin Laire`, etc.

> **Encoding bug** continues: `Añonuevo` rendered as `AÃfÂ±onuevo`, `Cañas` as `CaÃfÆ'Â¢ÃfÂ±as`. UTF-8 mismatch — fix in rebuild.
>
> Teacher IDs range observed: 2 to 171 (with gaps) — sequential assignment, integer-typed.

### Right-side widgets (same as other Setup pages)

- `Birthday Celebrants 2026`
- `Awaiting Confirmation` (with text "If checked, edit Enrolment")
- `Submitted:`

---

## Cross-page observations

1. **`File > Reload`** suggests the app needs manual refresh — pairs with the UX quirk noted on Summary of Grades page about needing to refresh after encoding.
2. **`File > Export as PDF`** is a **global** PDF export — preserves the print fidelity of any view, useful for archiving or external sharing.
3. **Setup is admin-only territory** — School Year config, school master list, and admin setup are foundational and typically restricted to a registrar/principal role.
4. **Encoding deadline enforcement** (5-day window per quarter) is a real domain requirement — should be preserved or made configurable in the rebuild.
5. **The schools list is a shared lookup** — when filling `School Last Attended` on Add New Student or `School Attended` on Enrolment Details, this list is the source.
6. **DepEd school code (6-digit)** is the canonical school identifier — should be a unique constraint in the rebuild's schools table.
