# Grade 12 — Subject Distribution by Term & Strand (SY 2026-2027 ONLY)

Source: NPS "Grade 12 Subject Distribution" sheet provided by Registrar Marites C. Ramos.
**Applies to SY 2026-2027 only.** Subjects are offered per TERM (3-term year) per strand.

## GAS — St. Teresa of Avila
- **First Term:** Media and Information Literacy · Introduction to the Philosophy of the Human Person · Physical Edu. and Health 3 & 4 · Practical Research 1 · Discipline & Ideas in the Applied Social Sciences
- **Second Term:** Physical Science · Applied Economics · Intro. to World Religion and Belief System · Organization & Management · Work Immersion · Catholic Social Teaching
- **Third Term:** Practical Research 2 · Research Project · Entrepreneurship · **Disaster Readiness and Risk Reduction (SPECIALIZED)** · Trends, Networks and Critical Thinking in the 21st Century Culture

## HUMSS — St. Clare of Assisi
- **First Term:** Media and Information Literacy · Introduction to the Philosophy of the Human Person · Physical Edu. and Health 3 & 4 · Practical Research 1 · Creative Writing · Discipline & Ideas in the Applied Social Sciences
- **Second Term:** Physical Science · Intro. to World Religion and Belief System · Creative Nonfiction · Work Immersion · Catholic Social Teaching
- **Third Term:** Practical Research 2 · Research Project · Entrepreneurship · Trends, Networks and Critical Thinking in the 21st Century Culture · Community Engagement, Solidarity and Citizenship

## STEM — St. Joan of Arc
- **First Term:** Media and Information Literacy · Introduction to the Philosophy of the Human Person · Personal Development · Physical Edu. and Health 3 & 4 · Practical Research 1 · General Biology 1
- **Second Term:** General Biology 2 · General Chemistry 2 · General Physics 1 · Work Immersion · Catholic Social Teaching
- **Third Term:** **Disaster Readiness and Risk Reduction (CORE)** · Practical Research 2 · Research Project · Entrepreneurship · General Physics 2

## ⚠️ Weight note — SAME subject, DIFFERENT weights per strand
**Disaster Readiness and Risk Reduction (DRRR):**
- **GAS (St. Teresa of Avila) → SPECIALIZED:** WW **25%** · PT **45%** · QA **30%**
- **STEM (St. Joan of Arc) → CORE:** WW **25%** · PT **50%** · QA **25%**

So NPS SHS weight categories (this data):
- **Core:** 25 / 50 / 25
- **Specialized:** 25 / 45 / 30

These differ from the DepEd defaults in `grading.ts AREA_WEIGHTS`. Because the SAME subject
(DRRR) is Core in one strand and Specialized in another, the weight is a **per-(subject ×
section/strand)** choice — handle it via the encoder's per-subject **Weights** dropdown
(the areaGroup override) and configure the exact SHS groups in **Setup ▸ Weights**. See
`memory/deped-2026-grading.md`.
