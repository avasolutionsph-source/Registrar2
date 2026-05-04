# 08 — Grade/Section & Teachers Menus

Source: **Batch 7** (5 screenshots).

---

## Grade/Section menu (2 items)

| # | Item | Purpose |
|---|------|---------|
| 1 | **Add Grade/Year Level** | Manage master list of grade level codes (incl. legacy/external codes for transferees) |
| 2 | **Add Sections** | Manage master list of section names |

---

## Page: Grade/Section > Add Grade/Year Level

**Purpose:** Master table of all grade-level codes the system recognizes — both **active NPS levels (`IN`)** and **legacy/external codes (`OUT`)** for transferee record compatibility.

**Table columns:**

| Column | Type | Notes |
|--------|------|-------|
| `GRADE/YEAR` | Display label | Human-readable name |
| `Code` | Short code | Stored value used in records |
| `LEVEL` | Numeric tier | `1` = Pre-elementary · `2` = Elementary · `3` = JHS/HS · `4` = SHS |
| `IN/OUT` | Toggle | `IN` = active at NPS · `OUT` = legacy/external (for transferee tracking only) |

### Full grade-level master list

#### `IN` — Currently used at NPS (21 entries)

| # | Grade/Year | Code | Level |
|---|-----------|------|-------|
| 1 | SPED | `S` | 1 |
| 2 | Kinder | `K` | 1 |
| 3 | Nursery I | `N1` | 1 |
| 4 | Nursery II | `N2` | 1 |
| 5 | Grade I | `1` | 2 |
| 6 | Grade II | `2` | 2 |
| 7 | Grade III | `3` | 2 |
| 8 | Grade IV | `4` | 2 |
| 9 | Grade V | `5` | 2 |
| 10 | Grade VI | `6` | 2 |
| 11 | Grade VII | `7` | 3 |
| 12 | Grade VIII | `8` | 3 |
| 13 | Grade IX | `9` | 3 |
| 14 | Grade X | `10` | 3 |
| 15 | Grade XI-GAS | `11-1` | 4 |
| 16 | Grade XII-GAS | `12-1` | 4 |
| 17 | Grade XI-HUMSS | `11-2` | 4 |
| 18 | Grade XII-HUMSS | `12-2` | 4 |
| 19 | Grade XI-STEM | `11-3` | 4 |
| 20 | GRADE XII-STEM | `12-3` | 4 |
| 21 | GRADE XI-ABM | `11-4` | 4 |

> ✅ **Confirmed:** ABM strand IS supported (`11-4`). No `12-4` (Grade XII-ABM) yet — possibly because no batch has reached Grade 12 ABM yet.

> ⚠️ **Note on the `41` ABM code**: Earlier seen in Enrolment Details footer as "41-ABM". Here the canonical code is `11-4`. The "41" in the footer may have been a parse of `11-4` without the dash, or a separate convention. The master table here is authoritative.

#### `OUT` — Legacy / external codes (for transferee compatibility)

Used when recording students who attended schools using older Philippine education naming or Montessori-style naming:

| # | Grade/Year | Code | Level |
|---|-----------|------|-------|
| 22 | Nursery | `N` | 1 |
| 23 | Prep | `P` | 1 |
| 24 | Kinder I | `K1` | 1 |
| 25 | Kinder II | `K2` | 1 |
| 26 | Junior Casa | `JC` | 1 |
| 27 | Advanced Casa | `AC` | 1 |
| 28 | Senior Casa | `SC` | 1 |
| 29 | Junior Advanced | `JA` | 1 |
| 30 | 1st Year | `1y` | 3 |
| 31 | 2nd Year | `2y` | 3 |
| 32 | 3rd Year | `3y` | 3 |
| 33+ | (more visible if scrolled — likely `4y`) | | |

**Insights:**
- **Junior Casa, Advanced Casa, Senior Casa, Junior Advanced** → Montessori-style pre-elementary naming
- **1st Year, 2nd Year, 3rd Year, 4th Year** → pre-K-12 reform Philippine high school naming
- These exist solely for accurate transcription of transferees' prior records on Form 137 / Enrolment Details

---

## Page: Grade/Section > Add Sections

**Purpose:** Master list of section names (saint and place names) used across grade levels.

**Title:** `SECTIONS:`

**Table columns:**
- `ID` — section identifier (numeric, sequential)
- `Name of Section` — display name

**Layout:** Two parallel columns showing 1–32 (left) and continuing 39–70+ (right).

### Sample of master section list (visible)

#### IDs 1–32 (saints)

| ID | Name | ID | Name |
|----|------|----|------|
| 1 | St. Therese | 17 | St. Lawrence |
| 2 | St. Tarcisius | 18 | St. Peter Baptist |
| 3 | St. John the Evangelist | 19 | St. Thomas More |
| 4 | St. Luke | 20 | San Lorenzo Ruiz |
| 5 | St. Paul | 21 | St. John the Baptist |
| 6 | St. Peter | 22 | St. Joseph |
| 7 | St. Mark | 23 | St. Patrick |
| 8 | St. Matthew | 24 | St. Francis Xavier |
| 9 | St. Anthony Zaccaria | 25 | St. Francis of Assisi |
| 10 | St. John Bosco | 26 | St. Benedict |
| 11 | St. John Vianney | 27 | St. Ignatius de Loyola |
| 12 | St. Camillus de Lellis | 28 | St. Dominic |
| 13 | St. Pius X | 29 | St. Thomas Aquinas |
| 14 | St. Gregory the Great | 30 | St. Augustine |
| 15 | St. Leo the Great | 31 | St. Anthony de Padua |
| 16 | St. Clement | 32 | St. John Chrysostom |

#### IDs 39–70+ (saints + places)

| ID | Name | ID | Name |
|----|------|----|------|
| 39 | St. John XXIII | 55 | St. Teresa of Avila |
| 40 | St. Ambrose | 56 | St. Stanislaus |
| 41 | St. Jerome | 57 | Sorsogon |
| 42 | St. Albert the Great | 58 | St. Vincent de Paul |
| 43 | St. Dominic of Guzman | 59 | St. Jude Thaddeus |
| 44 | St. Alphonsus de Ligouri | 60 | Camarines Norte |
| 45 | St. Alphonsus Liguori | 61 | Catanduanes |
| 46 | St. Maria Goretti | 62 | Garcia |
| 47 | St. Teresa of Calcutta | 63 | Barlin |
| 48 | St. Catherine of Siena | 64 | Laurel |
| 49 | St. Bonaventure | 65 | Rizal |
| 50 | St. Padre Pio | 66 | Masbate |
| 51 | St. Paul VI | 67 | Aguinaldo |
| 52 | St. Martin de Porres | 68 | Bonifacio |
| 53 | St. Clare of Assisi | 69 | Vinzons |
| 54 | St. Joan of Arc | 70 | Roxas |

### Issues observed

1. **Duplicate spelling** of same saint: ID 44 `St. Alphonsus de Ligouri` and ID 45 `St. Alphonsus Liguori` — same person, different spelling. Likely two records that should be merged in the rebuild.
2. **Section IDs 33–38** not visible in this screenshot — pending capture (likely cut between the two columns).
3. **ID inconsistency vs. Enrolment Details footer:** the Section Reference shown in [03-students-menu-pages.md](03-students-menu-pages.md) (from Batch 2) had different ID-to-name mappings (e.g., ID 38 = San Pedro Calungsod there, but in this view ID 39 = St. John XXIII). Either the Enrolment Details legend is from an older state, or section IDs are mutable. **Use UUIDs in the rebuild** to avoid this category of bug.
4. **Mixed saints + place names** continues — IDs 57 onward include provinces (Sorsogon, Camarines Norte, Catanduanes, Masbate) and historical figures' names (Aguinaldo, Bonifacio, Rizal, Vinzons, Roxas, etc.) — likely legacy data from when section naming wasn't strictly saint-themed.

---

## Teachers menu (5 items)

| # | Item | Purpose |
|---|------|---------|
| 1 | **Add New Teacher** | Form to register a new teacher account |
| 2 | **List of Teachers (All)** | View all teachers ever registered (incl. inactive) |
| 3 | **List of Teachers (Active)** | View only currently-active teachers |
| 4 | **View and Edit Advisers** | Manage class adviser assignments |
| 5 | **View Class Grade-Sheet** | View grade-sheet per class (likely teacher-facing grade input) |

---

## Page: Teachers > Add New Teacher

**Purpose:** Register a new teacher account (creates a user with login credentials).

**Layout:**
- Left panel: scrollable alphabetical list of existing teachers (with the just-added one highlighted on save)
- Right panel: form for new teacher details

**Form fields:**

| Field | Type | Notes |
|-------|------|-------|
| `Title` | Text | E.g., Mr., Mrs., Ms., Dr. |
| `Family Name` | Text | Last name |
| `First Name` | Text | |
| `Middle Initial` | Text (1 char + period) | |
| `Year Started` | Text | Year teacher began at NPS |
| `Email` | Text | Likely also acts as username |
| `Password` | Text (masked) | For login |

**Submit:** `Save New Teacher` button

**In-app note:** "After clicking SAVE, the name of the teacher will appear in the List of Teachers."

> 🎯 **Confirms:** Teachers ARE the user accounts (auth system). Each teacher = one login. Email + Password drive authentication. Combined with Help > Change Password, this confirms a multi-user authentication model.

### Sample teacher list (visible from screenshot)

ALDECOA Shiela R., ALMARIO Marvin A., ANTONIO Loreto Jr. SP., AYA-AY Irish C., **BAUDIN Mary Grace Y.** (selected — same person as the Grade II adviser seen across class views!), BAYOT Kendrick Gold P., BELORO Nicole, BERDIN Sheena Mae S., BOLANO Mary Joy V., BORELA Cristin Laire B. (Class Adviser of Lozano Sofia in Form 138!), BORJA Christine F., BRAGA Kate B., CASILES Fiona Kaye M., CASILES Mary Jane C., CASTRO Leanne Krystel E., CERILLO Jerome M., CHAVEZ Catherine D., CIELOS Maricar D., DE VELA Juliet P., DECENA Isaac Benjamin C., ENRIQUEZ Giah Z., ESCALADA Mark D.P., FALLARIA Princess Clariss T., GONZALES Micah Camyla T., JACOB Angelika I.

> Cross-reference: **BAUDIN, Mary Grace Y.** = the same `Ms. Mary Grace Y. Baudin` listed as Adviser on the Grade II – St. Gregory the Great class views (Batch 1).

---

## Page: Teachers > List of Teachers (All)

**Purpose:** Full master list of all teachers ever registered (active + former).

**Layout:**
- Left sidebar: alphabetical name list (clickable for selection)
- Right panel: full data grid

**Table columns:**

| Column | Type | Notes |
|--------|------|-------|
| `Title` | Open text | `Mr.`, `Mrs.`, `Ms.`, `Fr.` (priests — Catholic school context) — not a strict enum |
| `Family Name` | Text | |
| `First Name` | Text | |
| `M.I.` | Text (1-2 chars + `.`) | Middle initial; sometimes 2-letter (e.g., `DC.`, `SM.`, `D.P.`) |
| `Year_S` | Year | Year teacher started at NPS |
| `Year_E` | Year | Year teacher ended employment; **`0` = still active** |
| `Email` | Text | Login identifier; sometimes blank (older records) |
| `Password` | Text | 🚨 **Stored in PLAINTEXT** — see [09-security-concerns.md](09-security-concerns.md) |

**Sample observations:**
- Wide tenure range: earliest `Year_S` = `1976` (Mrs. Alpe, ended 2014), most recent = `2025`
- ~150+ teacher records across the years
- Older accounts use third-party email (yahoo, gmail, rocketmail); newer accounts use **`@nps.edu.ph`** (the school's domain)

---

## Page: Teachers > List of Teachers (Active)

**Purpose:** Filtered subset showing only currently-active teachers.

**Filter rule:** `Year_E = 0` (no end-of-employment year recorded).

**Same column structure** as List of Teachers (All).

**Sample size:** ~30+ active teachers visible (sample SY shown).

> ⚠️ The `0`-as-sentinel pattern for "still active" is a legacy convention. In rebuild, prefer **NULL** or a proper `is_active` boolean to avoid ambiguity.

---

## Page: Teachers > View and Edit Advisers

**Purpose:** Per-SY adviser assignments — which teacher is the class adviser for which Grade-Section combination.

**Title:** `List of Advisers for the School Year YYYY-YYYY:`

**Layout:**
- Left sidebar: alphabetical teacher list (selectable)
- Right panel: assignments table

**Table columns:**

| Column | Notes |
|--------|-------|
| `Grade` | E.g., `Grade X`, `Grade VII`, `Grade II` |
| `Section` | E.g., `St. Albert the Great`, `St. Alphonsus Liguori` |
| `Adviser` | Teacher name (`Lastname, Firstname M.I.`) |
| `Curriculum` | **NEW concept** — curriculum code per class (e.g., `Kto12-B`) |

**Sample data (SY 2026-2027, partial):**
- Grade X / St. Albert the Great / Rodriguez, Baby Jean A. / `Kto12-B`
- Grade X / St. Alphonsus Liguori / Jacob, Angelika I. / `Kto12-B`

> 🆕 **`Curriculum` column** is a new field not seen in earlier views. `Kto12-B` looks like a DepEd-aligned curriculum version code. Important for tracking curriculum revisions over time — different cohorts may follow different DepEd curriculum versions. Capture more samples to map the full set of curriculum codes used.

---

## Page: Teachers > View Class Grade-Sheet

**Purpose:** Teacher-facing grade input/review view per class per quarter.

**Layout:**
- **Top toolbar (filters):**
  - `School Year` dropdown (e.g., `2026-2027`)
  - `Quarter` dropdown (e.g., `Quarter 1`)
  - **`select what to view`** dropdown — purpose unclear (likely choose between subject grades, conduct, attendance, etc.)
  - Quarter label: `Quarter: 1stQuarter` (display confirmation)
- **Left sidebar:** alphabetical teacher list
- **Main area:** placeholder text `"Click the name of the teacher."` — content loads after teacher selected

> ⚠️ **Teacher-driven workflow:** the registrar/admin uses this to inspect grade entries per teacher's classes. The actual grade-encoding view is rendered after a teacher selection — content not yet captured. Capture pending: select a teacher and screenshot the resulting view.

> Likely shows: list of classes that teacher is assigned to (as adviser or subject teacher), with editable cells for the selected quarter's grades.

---

---

## Cross-page observations

1. **Teachers = user accounts.** Single source of truth: an entry in the Teachers table is also a system user. Rebuild should keep this clean separation: `users` table can extend `teachers` (or vice versa) but they should not be parallel/duplicated.
2. **Grade-level master list is authoritative** — must include both `IN` (current curriculum) and `OUT` (legacy/external) codes for transferee compatibility.
3. **Section master list has 70+ entries** — saints (mostly), provinces, and Filipino historical figures' names. Multiple grade levels can share a section name (St. Gregory the Great can be Grade 2 in one SY and a different grade in another SY — cf. Lozano's Grade 9 was "St. Maria Goretti" which doesn't appear in Grade 9 sidebar of current SY).
4. **Section ID instability** observed across views — strongly suggests section IDs in the legacy DB are not stable references. Rebuild must use immutable IDs (UUIDs) and a separate per-SY assignment table (which section is which grade-level in a given SY).
5. **`OUT` grade levels** are an underrated feature — they let registrars accurately transcribe transferees' prior grade levels onto Form 137, even if the transferee came from a Montessori or pre-K-12 curriculum.
