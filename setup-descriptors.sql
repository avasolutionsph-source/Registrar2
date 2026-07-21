-- ============================================================================
--  Configurable descriptor scales + descriptive/numerical toggle, per SY
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Display / rating layer ONLY -- computation is untouched.
--
--  Two configurable things, per school year:
--    reg_descriptor_scales   -- the bands of each named scale
--    reg_descriptive_levels  -- which levels render descriptive vs numerical
--
--  Preschool (C/D/B) and Grades 1-3 (A/B/C/D/E) are SEPARATE scales on purpose:
--  the same letter means different things (preschool B = Beginning 70-79; Grades
--  1-3 B = Benchmarking 80-89), so they must never be merged.
--
--  Bands match high -> low on `min`. A preschool score below 70 matches NO band
--  and must be FLAGGED, never guessed and never given the Grades 1-3 "E".
--
--  Seed for SY 2026-2027: Nursery/Kinder = preschool scale, Grade 1 = g1_3
--  scale, Grades 2-12 numerical.
--
--  NOTE: already applied via MCP as migration `configurable_descriptor_scales`.
-- ============================================================================
-- (full DDL is in that migration; this file is the record + re-run seed)

insert into public.reg_descriptor_scales (sy, scale_key, letter, label, min, sort_order) values
  ('2026-2027','preschool','C','Consistent', 90,1),
  ('2026-2027','preschool','D','Developing', 80,2),
  ('2026-2027','preschool','B','Beginning',  70,3),
  ('2026-2027','g1_3','A','Advancing',    90,1),
  ('2026-2027','g1_3','B','Benchmarking', 80,2),
  ('2026-2027','g1_3','C','Connecting',   75,3),
  ('2026-2027','g1_3','D','Developing',   65,4),
  ('2026-2027','g1_3','E','Emerging',      0,5)
on conflict (sy, scale_key, letter) do nothing;
