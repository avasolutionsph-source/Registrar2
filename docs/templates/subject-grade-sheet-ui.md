# Subject Grade Sheet — Encode/View UI (legacy layout to reproduce)

Source: two screenshots of the legacy "Computerized System v2.3.9" subject grade sheet,
provided by Registrar Marites C. Ramos. This is the **subject teacher's per-quarter
encode screen**; the registrar and acad see the **same layout** (acad = read-only). One
sheet = one class × one subject × one quarter.

> Drop the originals here: `subject-grade-sheet-empty.png`, `subject-grade-sheet-encoded.png`.

## Top toolbar
`School Year` dropdown · `Quarter` dropdown · `select what to view` dropdown · then a
read-back strip: `SY: 2026-2027 · G/S: Grade III - St. Thomas More · Subject: English ·
Quarter: 1stQuarter`. A **`Close this section?`** button sits above the table.

## Left sidebar
Alphabetical **teacher list** (selected teacher highlighted green). Below it, the class/
subject label in red, e.g. `(ENG) Grade III: St. Thomas More`.

## Main table — three weighted components + attitude + quarterly grade
Row header: **`NAME`** (numbered list of students). Then three column groups separated by
**red vertical dividers**, followed by attitude + grade:

### Group 1 — Written Works (weight .3 = 30%)
- N **item columns**; each column header = the **highest possible score** for that item
  (e.g. `15 15 15 15 15`). Teacher first assigns the *number of items* (creates the
  columns), then encodes each student's raw score.
- `TS` · `Com` · `WW` · `.3 (%)`

### Group 2 — Performance Tasks (weight .5 = 50%)
- item columns (e.g. `35 35 40 30 15`)
- `TS` · `Com` · `PT` · `.5 (%)`

### Group 3 — Summative/Exam (weight .2 = 20%)
- item column(s) (e.g. `50`)
- `TS` · `Com` · `QA` · `.2 (%)`

### Trailing columns
- `Att` — **Attitude** (encoded here, right before the grade)
- `TG` — **Term Grade** (SY 2026-2027 uses 3 TERMS, not 4 quarters; the legacy screenshot
  labelled this `QG`/Quarterly Grade — it is now the **Term Grade**)

> The per-subject **weights are shown in the headers** (`.3`, `.5`, `.2`) and differ by
> subject — confirming weights are configured per subject (registrar/admin-managed).

## Two states
1. **Empty** — before the teacher assigns number of items / enters raw scores: item
   columns blank, TS/derived columns show `0`, `QG` empty.
2. **Encoded** — as the teacher types raw scores, TS/percentage/weighted/QG fill in live.
   Example row (Grade IV CLE-ESP, Q4): items `13 11 12 14` → `TS 50` · `Com 83.33` ·
   `WW 89` · `.3(%) 26.7`; exam group `0`; `QA`/`.2(%)` update from the exam item.

## OPEN QUESTIONS (confirm before building the compute engine)
Per component group there are FOUR derived columns (`TS`, `Com`, `<WW/PT/QA>`, `.N (%)`),
one more than the official PDF's three (Total → Percentage → Weighted). Need Marites to
confirm exactly what each computes:
1. **`TS`** = total raw score (sum of item scores)?
2. **`Com`** = percentage score (TS ÷ total highest-possible × 100)? (row shows 50 → 83.33)
3. **`WW` / `PT` / `QA`** = ? (row shows 89 while `Com`=83.33, and `.3(%)`=89×0.3=26.7 —
   so the weighted uses this column, not `Com`. What transform turns 83.33 into 89?)
4. **`QA`** label in the exam group — what does it stand for?
5. **`QG`** = the transmuted **Quarterly Grade** (initial grade → transmutation table)?
6. Where/how is the **number of items** per component assigned (a dialog? inline?).

Related: [[grading-sheet-computation.md]] (official PDF weights + transmutation),
`memory/grading-sheets-spec.md`.
