-- ============================================================================
--  Official DepEd transmutation table (decimal bands) for SY 2026-2027
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Replaces the integer approximation with the official 41-band decimal table
--  (99.50-100.00 -> 100 ... 0.00-4.67 -> 60). The app rounds the Initial Grade
--  to a whole number before the lookup, and every whole number 0-100 falls in
--  exactly one band, so the lookup stays total.
--
--  min_score becomes numeric(5,2) so the decimal band floors store exactly.
-- ============================================================================

alter table public.reg_transmutation
  alter column min_score type numeric(5,2) using min_score::numeric(5,2);

delete from public.reg_transmutation where sy = '2026-2027';

insert into public.reg_transmutation (sy, min_score, grade) values
  ('2026-2027', 99.50, 100),
  ('2026-2027', 98.32,  99),
  ('2026-2027', 97.14,  98),
  ('2026-2027', 95.96,  97),
  ('2026-2027', 94.78,  96),
  ('2026-2027', 93.60,  95),
  ('2026-2027', 92.42,  94),
  ('2026-2027', 91.24,  93),
  ('2026-2027', 90.06,  92),
  ('2026-2027', 88.88,  91),
  ('2026-2027', 87.70,  90),
  ('2026-2027', 86.52,  89),
  ('2026-2027', 85.34,  88),
  ('2026-2027', 84.16,  87),
  ('2026-2027', 82.98,  86),
  ('2026-2027', 81.80,  85),
  ('2026-2027', 80.62,  84),
  ('2026-2027', 79.44,  83),
  ('2026-2027', 78.26,  82),
  ('2026-2027', 77.08,  81),
  ('2026-2027', 75.90,  80),
  ('2026-2027', 74.72,  79),
  ('2026-2027', 73.54,  78),
  ('2026-2027', 72.36,  77),
  ('2026-2027', 71.18,  76),
  ('2026-2027', 70.00,  75),
  ('2026-2027', 65.34,  74),
  ('2026-2027', 60.67,  73),
  ('2026-2027', 56.01,  72),
  ('2026-2027', 51.34,  71),
  ('2026-2027', 46.67,  70),
  ('2026-2027', 42.01,  69),
  ('2026-2027', 37.34,  68),
  ('2026-2027', 32.68,  67),
  ('2026-2027', 28.01,  66),
  ('2026-2027', 23.35,  65),
  ('2026-2027', 18.68,  64),
  ('2026-2027', 14.01,  63),
  ('2026-2027',  9.35,  62),
  ('2026-2027',  4.68,  61),
  ('2026-2027',  0.00,  60);

insert into public.reg_transmutation_audit (sy, note)
  values ('2026-2027', 'Replaced with the official DepEd decimal table (41 bands)');

-- ── Verification: dapat 41 rows, 99.50->100 sa taas, 0.00->60 sa baba ──
select count(*) as bands from public.reg_transmutation where sy = '2026-2027';
select min_score, grade from public.reg_transmutation
 where sy = '2026-2027' order by min_score desc;
