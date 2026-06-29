-- ─────────────────────────────────────────────────────────────────────────
-- NPS Registrar v2 — SY 2026-2027 grading update (paste into Supabase SQL Editor)
--
-- 1) Makes SY 2026-2027 the active school year (3-term grading).
-- 2) Replaces the single "MAPEH" subject with its two graded components,
--    "Music & Arts" (MUA) and "Physical Education & Health" (PEH). The app
--    derives the MAPEH line from these automatically — do NOT re-add a MAPEH
--    subject. Historical MAPEH grades already stored are not touched.
--
-- Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- 1. Active school year ----------------------------------------------------
insert into reg_school_years (code, label, start_date, end_date, is_active) values
  ('2026-2027', 'SY 2026–2027', '2026-06-01', '2027-03-31', true)
on conflict (code) do update set is_active = true;

update reg_school_years set is_active = false where code <> '2026-2027';

-- 2. MAPEH components ------------------------------------------------------
insert into reg_subjects (code, full_name, abbreviation, category) values
  ('MUA', 'Music & Arts',                 'MAPEH', 'Core'),
  ('PEH', 'Physical Education & Health',  'MAPEH', 'Core')
on conflict (code) do nothing;

-- Retire the directly-graded MAPEH subject (now a derived line).
delete from reg_subjects where code = 'MAPEH';

commit;
