# Descriptive Grading — Kinder & Grades 1–3 (MATATAG)

Source: DepEd MATATAG "Table 8. Grade 1 to 3 Descriptive Grading", provided by
Registrar Marites C. Ramos. Implemented in `app/src/lib/grading.ts` (`G1_3_SCALE`).

## Grade 1–3 scale
| Letter | Descriptor | Filipino | General Description |
|--------|-----------|----------|---------------------|
| **A** | Advancing | Namumukod-tangi | Consistently demonstrates advanced skills, understanding, and values beyond expectations; performs with confidence, accuracy, and independence |
| **B** | Benchmarking | Napamamalas | Demonstrates expected skills, understanding, and values at grade level with consistency; performs tasks accurately and independently |
| **C** | Connecting | Natutungo | Demonstrates foundational skills, understanding, and values; applies learning in familiar tasks with minimal guidance |
| **D** | Developing | Napauunlad | Demonstrates partial understanding and inconsistent application of skills and values; requires targeted support and regular practice to improve performance |
| **E** | Emerging | Nagsisimula | Beginning to demonstrate basic skills, understanding, and values; requires intensive support and close guidance |

## NPS roll-out (phase-in)
The descriptive grading applies grade-by-grade as MATATAG rolls out:
- **SY 2026-2027 → Grade 1 ONLY** is descriptive; **Grades 2–3 are still numerical**
  this year (confirmed by the numerical Grade 2 & 3 report-card samples).
- SY 2027-2028 → Grades 1–2 descriptive.
- SY 2028-2029+ → Grades 1–3 descriptive.
This mirrors the honors coverage phase-in (see `memory/nps-honors-policy.md`).
Encoded in `numericalFloorForSy()` + `isDescriptiveLevel(gradeLevel, sy)`.

## Kindergarten — DIFFERENT scale (PENDING confirmation)
Kinder uses its own descriptors (NOT A–E). Current placeholder in `grading.ts`
`KINDER_SCALE` = Consistent / Developing / Beginning. **Marites to send the official
Kindergarten descriptors** — replace `KINDER_SCALE` when received.

## Open
- **Teacher Jaz to verify** whether these Grade 1–3 descriptors are unchanged from prior
  years or new for SY 2026-2027.
- Grade-1 descriptive **report-card layout** sample not yet provided (the provided card
  samples are the numerical Grades 2–10).
