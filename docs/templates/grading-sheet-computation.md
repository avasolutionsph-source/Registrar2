# Official Subject Grading Sheet — Columns & Computation

Source: **SAMPLE-GRADING-SHEETS-SY-2026-2027.pdf** (provided by Registrar Marites C.
Ramos). Two worked samples: **GMRC-CLE** and **TLE-ICT**. Same structure, different
component weights per subject type.

This is the per-term subject grading sheet a **subject teacher** encodes. One sheet =
one class × one subject × one term. The far-right **ATTITUDE** column is encoded here too.

## Three components (DepEd, transmuted)

| Component | Abbrev | GMRC-CLE weight | TLE-ICT weight |
|-----------|--------|-----------------|----------------|
| Written Works & Oral Works | **WW** | 20% | 20% |
| Product / Performance Tasks | **PT** | 50% | 60% |
| Summative Tests & Term Exam | **STE** | 30% | 20% |

> Weights vary by subject/subject-type — must be data-driven per subject (see
> `app/src/lib/grading.ts` AREA_WEIGHTS). MAPEH area & others each declare their own.

## Column layout (left → right)

1. **NAME OF STUDENTS**
2. **WW block** — raw-score input columns per WW item, then:
   - `Total WW` (sum of raw), `Percentage Score` = TotalWW / HighestPossible × 100,
     `WW & Oral Works` = PS × weight
3. **PT block** — raw-score input columns per PT item, then:
   - `Total PT`, `Percentage Score`, `Performance Tasks` = PS × weight
4. **STE block**:
   - `Summative Test 1` → `ST1 Percentage Score` → `ST1 Weighted Score`
   - `Summative Test 2` → `ST2 Percentage Score` → `ST2 Weighted Score`
   - `Term Examination` → `TE Percentage Score` → `Exam Weighted Score`
   - `Percentage Score (STTE)` = ST1w + ST2w + TEw, `Summative Tests & Term Exam` = STTE% × weight
5. **INITIAL GRADE** = WW + PT + STE weighted scores (summed)
6. **FINAL GRADE** (= TERM GRADE) = transmutation of INITIAL GRADE
7. **ATTITUDE** — encoded by the subject teacher (rightmost column)

### Encoding rule (from Marites)
> Open **10 columns for the teachers to encode the raw score for WW and PTs**.
> For the **Exam, the columns are exact/fixed** (ST1, ST2, Term Exam — not open-ended).

So: WW = up to 10 open raw-score columns · PT = up to 10 open raw-score columns ·
STE = fixed (ST1, ST2, Term Exam).

## Worked example — GMRC-CLE (student: Aya-ay, Owen)

Highest possible: WW total 125, PT total 135, ST1 30, ST2 30, Term Exam 50.

- **WW:** raw 106 → 106/125 = 0.848 → **84.8%** → × 0.20 = **16.96**
- **PT:** raw 119 → 119/135 = 0.881 → **88.1%** → × 0.50 = **44.05**
- **STE:**
  - ST1 25/30 = 83.3% → × 0.30 = 24.99
  - ST2 28/30 = 93.3% → × 0.30 = 27.99
  - Term Exam 45/50 = 90% → × 0.40 = 36
  - STTE% = 24.99 + 27.99 + 36 = **88.98** → × 0.30 = **26.69**
- **INITIAL GRADE** = 16.96 + 44.05 + 26.69 = **87.7**
- **TRANSMUTATION:** 87.7 → **90**
- **FINAL / TERM GRADE = 90** · ATTITUDE = 88

## Worked example — TLE-ICT (same raw scores, different weights)

PT weight 60%, STE weight 20%: PT 88.1% × 0.60 = 52.86; STTE 88.98% × 0.20 = 19.6;
Initial = 16.96 + 52.86 + 19.6 = **89.4** → transmute → **91**. ATTITUDE = 88.

## Steps (as printed on the sheet)

1. Determine total raw score.
2. Percentage Score PS = RawScore / HighestPossibleScore × 100%.
3. Weighted Score WS = PS × Weight(%), per component.
4. INITIAL GRADE = WW + PT + STE weighted scores.
5. Apply the **transmutation table** → FINAL / TERM GRADE.

> Cross-reference: this matches [07-grading-rubrics.md](../legacy-catalog/07-grading-rubrics.md)
> and the rules engine in `app/src/lib/grading.ts` (WW/PT/ST weights + transmute()).

## Final sheet (end of SY) — derived, not encoded

The **subject grade sheet's final sheet** shows, per student, the TERM GRADE for each
term plus the **average across terms to 2 decimals** → used to find the **top-1 per
subject**. The **class grade sheet's final sheet** (adviser's) shows each student's
term grade per subject and the **General Average per term (decimal + whole number)** →
where **Academic Excellence Award** qualification is read (GA ≥ 90, no subject grade
below 80). Attitude likewise: per-term attitude marks → averaged to 2 decimals →
whole number. See `memory/grading-sheets-spec.md`.
