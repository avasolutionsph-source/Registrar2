# 10 — Subjects Menu

Source: **Batch 9** (5 screenshots).

---

## Subjects menu (3 items)

| # | Item | Purpose |
|---|------|---------|
| 1 | **Add Subjects** | Master list of all subjects (CODE → Full Name → Abbr → Category) + SETS panel |
| 2 | **Setup Subjects** | Per-SY subject config: Level, Curriculum, Items (components), Percentages |
| 3 | **Order Subjects** | Assign which subject **SET** is used per Grade Level (Set1 = 1st Sem, Set2 = 2nd Sem for SHS) |

---

## Page: Subjects > Add Subjects

**Purpose:** Master subject catalog. Each subject has a 3-letter code, full name, abbreviation, and category.

**Layout:**
- **Top form (insert row):** input fields for CODE, SUBJECT, Abbr, CATEGORY + `SAVE` button
- **Main grid:** existing subjects listed alphabetically by code
- **Right panel:** **SETS** list — predefined ordered subject lists (used by Order Subjects)

### Main grid columns

| Column | Notes |
|--------|-------|
| `CODE` | 3-letter unique identifier (e.g., `MAT`, `FIL`, `LPW`) |
| `SUBJECT` | Full English name (e.g., `21st Century Literature from the Phil. and the World`) |
| `Abbr` | Abbreviation (often blank) |
| `CATEGORY` | One of: `Core`, `Specialized`, `Applied`, `Elective` (per DepEd SHS curriculum nomenclature) |

### Subject codes observed (30+ visible)

| Code | Subject | Category |
|------|---------|----------|
| `LPW` | 21st Century Literature from the Phil. and the World | Core |
| `APE` | Applied Economics | Specialized |
| `APN` | Araling Panlipunan | (blank) |
| `ART` | Arts | (blank) |
| `BCA` | Basic Calculus | Specialized |
| `CLE` | Christian Living Ed. | (blank) |
| `CES` | CLE-ESP | (blank) |
| `CGM` | CLE-GMRC | (blank) |
| `CLV` | CLVE | (blank) |
| `CSC` | Community Engagement, Solidarity and Citizenship | Specialized |
| `CPA` | Contemporary Phil. Arts from the Regions | Core |
| `CNF` | Creative Nonfiction | Specialized |
| `CWR` | Creative Writing | Specialized |
| `CUL` | Culminating Activity | Specialized |
| `DRR` | Disaster and Readiness and Risk Reduction | Core |
| `DIS` | Disaster and Readiness and Risk Reduction | Specialized ⚠️ **duplicate name, different code** |
| `DAS` | Discipline and Ideas in the Applied Social Sciences | Specialized |
| `DSS` | Discipline and Ideas in the Social Sciences | Core |
| `ELS` | Earth and Life Science | Core |
| `ESC` | Earth Science | (blank) |
| `ESP` | Ed. sa Pagpapakatao | Applied |
| *(more visible if scrolled)* | | |

### Other subject codes referenced (via SETS panel — short codes for elementary/JHS curriculum)

`LAN` (Language & Spelling), `REA` (Reading & Phonics), `MAT` (Mathematics), `SAH` (Science & Health), `FIL` (Filipino), `HEK` (HEKASI), `MAP` (MAPE), `MOT` (Mother Tongue?), `ENG` (English), `MUS` (Music), `PED` (P.E.), `HEA` (Health), `EPP` (Edukasyong Pantahanan at Pangkabuhayan), `TLE` (Technology and Livelihood Education), `LAT`/`LAS` (Lab variants?), `SIB` (Sibika at Kultura?), `TLC`/`EPC`/`ECT` (TLE specializations?), `OCC` (Oral Communication?), `GEM` (General Math), `PDE`/`KPK` (Personal Devel. Eduk. / KPK?), `UCS` (Understanding Culture & Society?), `PEH` (P.E. & Health), `EAP` (English for Academic Purposes), `RWS` (Reading and Writing Skills), `SAP` (Statistics and Probability?), `PPP` (Pagsulat / Filipino skill?), `HDE` (?), `EMT` (Empowerment Technologies), `PFP`/`PPG`/`GEC`/`PCA` (?), `MIL` (Media and Information Literacy), `IPH` (Intro to Philosophy of Human?), `PHS` (Phys. Sci. or Phys. Sciences?), `PHE` (Physics?), `PRA` (Practical Research?), `ENT` (Entrepreneurship), `PHH` (Phys. Health?), `PRE`/`REP`/`TNC`/`IWB` (?), `ORM` (?).

> ⚠️ Many short codes are inferred — full mapping needs Add Subjects scrolled-through view.

### SETS panel (right side)

**Title:** "SETS: The sets are the orders that appear in the report card."

This is the **subject-set library** — each Set is a comma-separated, ordered list of subject codes. The Set chosen per Grade Level (via Order Subjects) determines which subjects appear and **in what order** on the printed Report Card.

**Sample SET definitions observed (with inferred grade level mapping):**

| Set # | Subject codes (ordered) | Likely usage |
|-------|--------------------------|--------------|
| 1 | `CLE,LAN,REA,MAT,SAH,FIL,HEK` | Lower Elementary (Grade 1-3, no MAPE) |
| 2 | `CLE,LAN,REA,MAT,SAH,FIL,HEK,MAP` | Elementary with MAPE |
| 3 | `CLE,LAN,REA,MAT,SAH,FIL,HEK,EPP,MAP` | Upper Elementary with EPP |
| 5 | `CLE,MOT,FIL,ENG,MAT,APN,ESP,MUS,ART,PED,HEA` | Kinder/Pre-K with Mother Tongue |
| 6 | `CLE,ENG,MAT,SAH,FIL,HEK,MAP` | (mid-level elementary) |
| 7 | `CLE,ENG,MAT,SAH,FIL,HEK,EPP,MAP` | (upper elementary with EPP) |
| 8 | `CES,FIL,ENG,MAT,SCI,APN,TLE,LAT,MUS,ART,PED,HEA` | JHS with TLE |
| 9 | `CLE,LAN,REA,MAT` | (very early — N1/N2?) |
| 10 | `CLE,LAN,REA,MAT,FIL` | (early elementary) |
| 13 | `CES,MOT,FIL,ENG,MAT,SCI,APN,MUS,ART,PED,HEA` | (Kinder/G1?) |
| 14 | `CES,MOT,FIL,ENG,MAT,APN,MUS,ART,PED,HEA` | (similar — no SCI?) |
| 15 | `CES,FIL,ENG,MAT,SCI,APN,TLE,LAS,MUS,ART,PED,HEA` | JHS variant with LAS |
| 16 | `CLE,LAN,REA,MAT,SAH,FIL,SIB` | (mid elementary with Sibika) |
| 17 | `CLE,LAN,REA,MAT,SAH,FIL,SIB,MAP` | (with MAPE) |
| 18 | `CES,FIL,ENG,MAT,SCI,APN,EPP,MUS,ART,PED,HEA` | (Grade 4-6 with EPP) |
| 19 | `CES,FIL,ENG,MAT,SCI,APN,TLE,MUS,ART,PED,HEA` | (JHS general) |
| 20 | `CES,FIL,ENG,MAT,SCI,APN,TLC,MUS,ART,PED,HEA` | (JHS - TLC variant) |
| 21 | `CES,FIL,ENG,MAT,SCI,APN,EPC,MUS,ART,PED,HEA` | (JHS - EPC variant) |
| 22 | `CES,FIL,ENG,MAT,SCI,APN,ECT,MUS,ART,PED,HEA` | (JHS - ECT variant) |
| 23 | `OCC,GEM,ELS,PDE,KPK,CPA,UCS,PEH,EAP` | SHS (Grade 11 GAS Sem 1?) |
| 24 | `RWS,LPW,SAP,PPP,HDE,EMT,PFP,PPG,DSS` | SHS (Grade 11 GAS Sem 2?) |
| 25 | `OCC,GEM,ESC,KPK,CPA,UCS,PEH,EAP,PCA` | SHS variant |
| 26 | `RWS,LPW,SAP,PPP,HDE,EMT,PFP,GEC,BCA` | SHS variant w/ Basic Calculus |
| 27 | `MIL,IPH,PHS,PHE,PRA,ENT,DAS,DRR` | SHS (Grade 12) |
| 28 | `PHH,PRE,REP,TNC,IWB,APE,ORM,CUL` | SHS (Grade 12 with Culminating) |
| 29 | `MIL,IPH,PHS,PHE,PRA,ENT,DAS,CWR` | SHS (Creative Writing track) |
| 30 | `PHH,PRE,REP,TNC,IWB,CNF,CSC,CUL` | SHS (Creative Nonfiction track) |
| 31+ | (cut off) | |

> Note Set 4, 11, 12 are missing from the visible list — possibly deleted or never existed (numbering gaps).

> **Insight:** SETS encode **per-grade-level + per-strand + per-curriculum-version** subject orderings. This is a sophisticated way to handle the variation of curricula across all the levels NPS supports (N1 → SPED → Grade 1 → ... → Grade 12 SHS strands).

---

## Page: Subjects > Setup Subjects

**Purpose:** Configure subjects to be taken up in the current SY, including per-subject grading **components** (items) and their **weight percentages**.

**Title:** `Set the Subjects to be taken up for the School Year YYYY-YYYY:`

**Top action:** "Do you want to copy the configuration of the SUBJECTS from the previous school year?" + **`Yes?`** button — convenience: bulk-copy last year's setup.

**Form columns:**

| Column | Type | Notes |
|--------|------|-------|
| `SUBJECTS` | Dropdown (`select subject`) | Pulls from Add Subjects master list |
| `LEVEL` | Dropdown (`Level`) | Grade level (uses master Grade/Year Level codes) |
| `CURR` | Dropdown (`select`) | Curriculum version (e.g., `Kto12-B`) |
| `ITEMS` | Text input | Comma-separated grading component names (e.g., `Quizzes,Performance Tasks,Quarterly Test`) |
| `PERCENTAGE` | Text input | Slash-separated weights (e.g., `30/40/30` to match items) |
| `DEL/SAVE` | Action | `SAVE` button |

**Notes (in-app):**
1. "If a subject does not appear in the options, it must be added to the table of subjects. Go to the Main Menu, click 'Subjects', click 'Add Subjects'"
2. "Items should be separated by a comma(,) and percentage should be separated by a slash(/)."

> 🎯 **This explains how DepEd-style transmuted grades are computed.** The grading components and percentages drive the final grade calculation per quarter. Standard DepEd K-12 weighting is something like Written Work (30%) / Performance Tasks (50%) / Quarterly Assessment (20%) — configurable here per subject.

---

## Page: Subjects > Order Subjects

**Purpose:** Assign which **subject SET** to use for each Grade Level. For SHS (Grade 11 & 12), assign separate sets per semester.

**Title:** `Assigning List of Subjects for the School Year YYYY-YYYY:`

**Layout:**
- **Left side:** SETS list (same as in Add Subjects — for reference)
- **Right side:** form
  - `GRADE LEVEL` dropdown (`Choose Grade`)
  - `SET1` (text or dropdown)
  - `SET2` (text or dropdown — for SHS only)
  - `DEL/SAVE` (`SAVE` button)

**Notes (in-app):**
- "Set 2 is for Grade 11 & 12."
- "Set1 - 1st Sem, Set2 - 2nd Sem"

> **Domain rule:** Elementary/JHS = single set per year (no semestral split). SHS = two sets, one per semester (matches DepEd SHS structure).

---

## Cross-page observations

1. **3-tier subject configuration:**
   - **Subjects table** (Add Subjects) → defines what subjects exist
   - **SETS** (within Add Subjects) → defines ordered groupings of subjects per curriculum/level
   - **Order Subjects** → assigns a Set to each Grade Level (with separate Sem1/Sem2 sets for SHS)
   - **Setup Subjects** → per-subject grading component configuration (items + percentages)
2. **Categorization:** subjects use DepEd SHS-style categories (`Core`, `Specialized`, `Applied`, `Elective`).
3. **Per-subject grading weights** are configurable — this is critical for handling DepEd transmutation. Rebuild must support this flexibility.
4. **"Copy from previous SY"** is a UX convenience — preserve in rebuild as it saves significant configuration time year-over-year.
5. **Set numbering has gaps** (no 4, 11, 12) — could be deleted entries; rebuild should soft-delete vs. renumber to preserve report card history.
6. **Subject codes are dense / cryptic** — system relies heavily on 3-letter codes. Many overlap across grade levels (CLE used in elementary, JHS, SHS variants). Rebuild should preserve compactness but also expose human-readable names everywhere.
7. **Duplicate "Disaster and Readiness and Risk Reduction"** under codes `DRR` (Core) and `DIS` (Specialized) — possibly intentional (one for JHS, one for SHS) but confusing. Worth normalizing in rebuild.
