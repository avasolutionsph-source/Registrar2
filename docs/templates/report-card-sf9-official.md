# OFFICIAL Report Card — School Form 9 / Learner's Performance Report (SY 2026-2027)

Source: the actual NPS SF9 PDFs (Grades 1–4) from Registrar Marites C. Ramos. **This is
the definitive report-card layout** — supersedes the earlier parchment on-screen mock.
Implemented in `components/print/ReportCard138.tsx`.

## Header (full width)
DepEd seal (left) · centered text · NPS seal (right):
REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF EDUCATION · REGION V · SCHOOLS DIVISIONS
OFFICE OF NAGA CITY · Naga North District · **NAGA PAROCHIAL SCHOOL** (red) · Corner
Bagumbayan Sur and Ateneo Avenue, Naga City · GR. No. 002 S. 2009  GR. No. J-004 S. 2017.
Tiny "School Form 9" at the very top-left.

## LEFT column
- **LEARNER'S PERFORMANCE REPORT** (centered) · School Year 2026-2027
- Name · Age · Gender · LRN · Grade (roman) · Section · Student Number · TRACK (SHS only)
- "Dear Parents," paragraph.
- **LEARNING PROGRESS AND ACHIEVEMENT** table: `LEARNING AREAS | TERM 1 2 3 | Final Grade | Remarks`.
  - MAPEH parent shows the term grades + Final; its components (**Music & Arts**,
    **Physical Edu. & Health**) are indented and show **term grades only** (no Final/Remarks).
  - Then **Average** (per term), **Conduct** (per term letters), and a spanning
    **General Average | value | Promoted**.
- **PERFORMANCE DESCRIPTORS** table: 90-100 Advancing (Passed) · 80-89 Benchmarking
  (Passed) · 75-79 Connecting (Passed) · 65-74 Developing (Failed) · 0-64 Emerging (Failed).

## RIGHT column
- **SPECIAL PROGRAMS** (`LEARNER'S SUPPORT PROGRAM | TERM 1 2 3 | FINAL GRADE`), letters.
  - Grades 1–3: Computer · Homeroom Guidance · SAP. Grade 4+: Homeroom Guidance · SAP · Scouting.
  - Legend: MO-Most Outstanding O-Outstanding VS-Very Satisfactory S-Satisfactory FS-Fairly Satisfactory.
- **DEPORTMENT** (`CORE VALUES | TERM 1 2 3 | FINAL GRADE`): Faith · Integrity · Respect ·
  Excellence · Social Responsibility (AO/SO/RO/NO). Legend: AO-Always Observed SO-Sometimes
  Observed RO-Rarely Observed NO-Not Observed.
- **ATTENDANCE REPORT**: rows School Days · Days Present · Days Absent · Times Tardy ×
  Jun…Apr · Total.
- **CERTIFICATE OF TRANSFER**: "…has satisfactorily completed the requirements for the grade
  level indicated." · Admitted to Grade: N · Eligible for Admission to Grade: N+1 · Approved
  (Class Adviser) · **MRS. ROSARIO B. OLALIA** School Principal.
- **CANCELLATION OF ELIGIBILITY TO TRANSFER**: Admitted in ___ Date ___ · ___ School Principal.

## Per-grade specifics (SY 2026-2027)
- **Grade 1** — DESCRIPTIVE **letter grades (A/B/C/D/E)**. Areas: GMRC-CLE · Filipino ·
  Reading & Literacy · Language · Mathematics · Makabansa. Average & General Average are letters.
- **Grade 2** — numeric. Areas: GMRC-CLE · Filipino · English · Mathematics · Makabansa.
- **Grade 3** — numeric. Areas: GMRC-CLE · Filipino · English · Mathematics · Science · Makabansa.
- **Grade 4** — numeric. Areas: GMRC-CLE · Filipino · English · Mathematics · Science ·
  Araling Panlipunan · EPP-ICT · MAPEH (+ Music & Arts, Physical Edu. & Health).
- **Grades 5–6** — same layout as Grade 4.
- **Grades 7–10 (JHS)** — numeric, same two-column SF9 layout. From the official
  Grade 7 PDF (DELA CRUZ, JUAN · San Pedro Calungsod · adviser MS. MARIA VILUZLYN YEPES):
  - Learning areas: **Values Educ-CLE · Filipino · English · Mathematics · Science ·
    Araling Panlipunan · TLE-ICT · MAPEH** (+ Music & Arts, Physical Edu. & Health).
  - **Special Programs (JHS) = Homeroom Guidance · SAP** only (no Computer/Scouting/
    Foreign Language). Elementary Gr1-3 = Computer/Homeroom/SAP; Gr4-6 = Homeroom/SAP/Scouting.
  - Deportment, Attendance, Certificate of Transfer, Cancellation, Descriptors: identical.
- **Grades 11–12 (SHS)** — numeric, same two-column SF9 but with SHS differences
  (official Grade XI PDFs: adviser MR. MATTHEW MARK D. MABESA):
  - Left table header is **"SUBJECTS"** (not "LEARNING AREAS"). Subjects are per-strand,
    fully data-driven; some are one-semester so they carry only Term 1 or Term 2 grades.
  - **No SPECIAL PROGRAMS section** — the right column starts directly with DEPORTMENT.
  - **TRACK (SHS only)** is filled with the strand; **Grade** shows the roman only (XI/XII).
    Strand is derived from the grade code suffix: `XI-STEM-ENG`→STEM - ENGINEERING,
    `XI-STEM-HA`→STEM - HEALTH ALLIED, `XI-ASSH`→ASSH (also HUMSS/ABM).
  - Strand samples: STEM-Engineering (adds Finite Math 1/2, General Physics 1), STEM-Health
    Allied (General Biology 1/2, General Physics 1), ASSH (Contemporary Lit 1/2, Intro to
    Philosophy). Common core across strands: Effective Communication/Mabisang Komunikasyon,
    General Mathematics, General Science, Pag-aaral ng Kasaysayan at Lipunang Filipino,
    Life and Career Skills, Bicol Church History.
  - **Grade XII** has ~16 subjects (semester-spread across Term 1/2/3) and
    **Eligible for Admission to Grade: College** (not a next roman). Tracks seen:
    HUMSS, GAS (+ STEM/ABM). Adviser MR. MARVIN A. ALMARIO. Because of the 16-row
    subject list, Grade XII fits a full long-bond portrait page (8.5×13), NOT ½
    crosswise short — the ½-crosswise size only suits the shorter elementary card.

Signatory: Class Adviser (per section) + **MRS. ROSARIO B. OLALIA**, School Principal.
