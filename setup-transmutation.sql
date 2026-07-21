-- ============================================================================
--  Transmutation Table (Initial Grade -> transmuted grade), per SY
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  DepEd DO 15, s.2026. EVERY computed grade passes through this, so a bad edit
--  moves EVERY grade -- hence per-SY copies, hard validation in the app, a
--  confirmation gate, and an audit row on every save.
--
--  Matched high -> low: the first band whose minimum <= score wins. A band runs
--  from its minimum up to one below the next band's; the lowest band starts at 0
--  so every score is covered.
--
--  The seed is behaviour-identical to the previous hardcoded table for every
--  integer 0-100 (verified), so switching to it changes no existing grade.
--
--  NOTE: already applied via MCP as migration `configurable_transmutation`.
-- ============================================================================
insert into public.reg_transmutation (sy, min_score, grade) values
  ('2026-2027',100,100),('2026-2027',98,99),('2026-2027',96,98),('2026-2027',95,97),
  ('2026-2027',94,96),('2026-2027',93,95),('2026-2027',92,94),('2026-2027',91,93),
  ('2026-2027',90,92),('2026-2027',89,91),('2026-2027',88,90),('2026-2027',87,89),
  ('2026-2027',86,88),('2026-2027',85,87),('2026-2027',84,86),('2026-2027',83,85),
  ('2026-2027',82,84),('2026-2027',81,83),('2026-2027',80,82),('2026-2027',79,81),
  ('2026-2027',78,80),('2026-2027',77,79),('2026-2027',76,78),('2026-2027',75,77),
  ('2026-2027',73,76),('2026-2027',70,75),('2026-2027',68,74),('2026-2027',66,73),
  ('2026-2027',64,72),('2026-2027',62,71),('2026-2027',60,70),('2026-2027',58,69),
  ('2026-2027',56,68),('2026-2027',54,67),('2026-2027',52,66),('2026-2027',50,65),
  ('2026-2027',48,64),('2026-2027',46,63),('2026-2027',43,62),('2026-2027',40,61),
  ('2026-2027',25,60),('2026-2027',0,60)
on conflict (sy, min_score) do nothing;
