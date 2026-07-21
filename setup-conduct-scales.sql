-- ============================================================================
--  Conduct scales — Deportment and Special Program (per SY, configurable)
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Both are score -> letter scales, the same shape as the academic descriptor
--  scales (a letter, a label, a minimum, matched high -> low), so they live in
--  reg_descriptor_scales too and get the same per-SY editing and audit. They
--  differ only in what feeds them: a directly-encoded conduct score, not a
--  computed grade. Encoded by the class adviser.
--
--    Deportment (75-99): AO / SO / RO / NO. Below 75 matches NO band, so it is
--    blocked at encoding, never guessed.
--    Special Program (0-99): MO / O / VS / S / FS / DM. DM (min 0) catches
--    everything below 75; 100 is still blocked at encoding (there is no 100).
--
--  NOTE: already applied via MCP as migration `seed_conduct_scales`.
-- ============================================================================
insert into public.reg_descriptor_scales (sy, scale_key, letter, label, min, sort_order) values
  ('2026-2027','deportment','AO','Always Observed',    91,1),
  ('2026-2027','deportment','SO','Sometimes Observed', 86,2),
  ('2026-2027','deportment','RO','Rarely Observed',    80,3),
  ('2026-2027','deportment','NO','Not Observed',       75,4),
  ('2026-2027','special_program','MO','Most Outstanding',       95,1),
  ('2026-2027','special_program','O', 'Outstanding',            90,2),
  ('2026-2027','special_program','VS','Very Satisfactory',      85,3),
  ('2026-2027','special_program','S', 'Satisfactory',           80,4),
  ('2026-2027','special_program','FS','Fairly Satisfactory',    75,5),
  ('2026-2027','special_program','DM','Did not Meet Expectations',0,6)
on conflict (sy, scale_key, letter) do nothing;
