# 07 — Naga Parochial School Grading Rubrics

Source: **Batch 6** — physical wall display photo from the school (NPS bulletin board with logo).

> **Not legacy software UI** — these are the official **school grading scales** used to interpret numeric grades and assign rubric labels. Critical reference for any rebuild because Report Cards, Form 137, and Awards lists must use these mappings.

---

## Academic Excellence Award (Honors System)

Determined by **average grade per quarter**:

| English label | Filipino label | Grade range |
|---------------|----------------|-------------|
| **With Highest Honors** | May Pinakamataas na Karangalan | **98 – 100** |
| **With High Honors** | May Mataas na Karangalan | **95 – 97** |
| **With Honors** | May Karangalan | **90 – 94** |

> Used for honor-roll recognition. Applied to quarterly averages.

---

## Academic Rubric (5 levels)

For grading academic subjects:

| Code | Label | Range |
|------|-------|-------|
| `O` | Outstanding | 90 – 100 |
| `VS` | Very Satisfactory | 85 – 89 |
| `S` | Satisfactory | 80 – 84 |
| `FS` | Fairly Satisfactory | 75 – 79 |
| `DM` | Did Not Meet Expectations | Below 75 |

---

## Attitude Rubric (5 levels)

| Code | Label | Range |
|------|-------|-------|
| `MO` | Most Outstanding *(typo on display: "Oustanding")* | 95 – 99 |
| `O` | Outstanding | 90 – 94 |
| `S` | Satisfactory | 85 – 89 |
| `F` | Fair | 80 – 84 |
| `N` | Needs Improvement | 75 – 79 |

---

## Deportment Rubric (4 levels)

For Core Values evaluation (Faith, Integrity, Respect, Excellence, Social Responsibility):

| Code | Label | Range |
|------|-------|-------|
| `AO` | Always Observed | 91 – 100 |
| `SO` | Sometimes Observed | 86 – 90 |
| `RO` | Rarely Observed | 80 – 85 |
| `NO` | Not Observed | 75 – 79 |

> ✅ **Cross-reference:** This matches the rubric used on the **View Grades / Form 138 Report Card** (documented in [03-students-menu-pages.md](03-students-menu-pages.md)).

---

## Special Program Rubric (6 levels)

| Code | Label | Range |
|------|-------|-------|
| `MO` | Most Outstanding *(typo on display: "Oustanding")* | 95 – 100 |
| `O` | Outstanding | 90 – 94 |
| `VS` | Very Satisfactory | 85 – 89 |
| `S` | Satisfactory | 80 – 84 |
| `FS` | Fairly Satisfactory | 75 – 79 |
| `DM` | Did Not Meet Expectations | Below 75 |

> Likely used for SPED (Special Education) class grading or extra-curricular special programs.

---

## Implementation notes for the rebuild

1. **All 5 rubrics need to be data-driven**, not hardcoded — store as a lookup table so future scale changes don't require code edits.
2. **The Honors system applies to quarterly averages**, not final grades — must be computed per quarter.
3. **Numeric ranges overlap across rubrics** — the same score (e.g., 92) maps differently:
   - Academic → `O` (Outstanding, 90-100)
   - Attitude → `O` (Outstanding, 90-94)
   - Deportment → `AO` (Always Observed, 91-100)
   - Special Program → `O` (Outstanding, 90-94)
   - Honors → `With Honors` (90-94)
4. **Each subject/area must declare which rubric it uses.** A subject might use Academic rubric, while a behavior column uses Deportment rubric.
5. **DM (Did Not Meet Expectations)** = failing threshold = below 75. This is the DepEd-aligned cutoff.
6. **Bilingual labels** (Filipino + English) for the Honors system should be preserved on Report Cards.
7. **Typo on the official display** ("Oustanding" → "Outstanding") — fix the spelling in the rebuild.

---

## Visual confirmation: school logo

The bulletin board photo also shows the **NAGA PAROCHIAL SCHOOL** banner with the school's official logo (red shield design with "NAGA PAROCHIAL SCHOOL" text and "CITY OF NAGA"). This is the **canonical school name** to use in all generated documents.
