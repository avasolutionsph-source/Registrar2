-- ============================================================================
--  Descriptors and Range — consolidate all five scales, per SY
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Attitude used to live in reg_attitude_scale (single-setting), separate from
--  the other four descriptor scales (per-SY, in reg_descriptor_scales). This
--  brings Attitude into reg_descriptor_scales as scale_key='attitude', per SY,
--  so all five scales are configurable in one place, per school year:
--    preschool | g1_3 | attitude | deportment | special_program
--
--  reg_attitude_scale is KEPT as a fallback so any reader not yet passing a SY
--  still works. Values are unchanged.
--
--  NOTE: applied via MCP as migration `attitude_into_descriptor_scales`.
-- ============================================================================
insert into public.reg_descriptor_scales (sy, scale_key, letter, label, min, sort_order)
select y.code, 'attitude', a.letter, a.label, a.min,
       row_number() over (order by a.min desc)
from reg_school_years y
cross join reg_attitude_scale a
on conflict (sy, scale_key, letter) do nothing;

insert into public.reg_descriptor_scales (sy, scale_key, letter, label, min, sort_order)
select y.code, 'attitude', v.letter, v.label, v.min, v.so
from reg_school_years y
cross join (values
  ('MO','Most Outstanding',95,1),('O','Outstanding',90,2),('S','Satisfactory',85,3),
  ('F','Fair',80,4),('NI','Needs Improvement',75,5)) v(letter,label,min,so)
where not exists (select 1 from reg_descriptor_scales d where d.sy=y.code and d.scale_key='attitude')
on conflict (sy, scale_key, letter) do nothing;
