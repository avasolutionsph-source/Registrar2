-- ============================================================================
--  Weight Components — one independently-editable type PER LEVEL
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  The basic-ed core was a single shared type used by Nursery, Kinder, Grades
--  1-3 AND Grades 4-10, so those four levels could not be weighted
--  independently. This splits it into core-nursery / core-kinder / core-g1-3 /
--  core-g4-10, and renames mapeh-tle -> mapeh-g4-10, so every level's split
--  stands on its own. A level_group column tells the Setup page which per-level
--  table each type belongs to (rendered as six tables).
--
--  Values are unchanged (all basic-ed core stays 20/50/30, mapeh 20/60/20), so
--  no grade changes -- only the record each section points to. Verified: 0
--  sections left without weights; DRRR still resolves per strand; G8 core ->
--  core-g4-10 20/50/30, TLC -> mapeh-g4-10 20/60/20.
--
--  NOTE: applied via MCP as migrations `weight_components_per_level_split` and
--  `copy_weights_include_level_group`.
-- ============================================================================

alter table public.reg_weight_components add column if not exists level_group text;
alter table public.reg_weight_components add column if not exists group_order integer not null default 99;

insert into public.reg_weight_components (sy, type_key, label, ww, pt, ex, sort_order, level_group, group_order) values
  ('2026-2027','core-nursery','Core Subjects',            20,50,30,10,'nursery',1),
  ('2026-2027','core-kinder', 'Core Subjects',            20,50,30,10,'kinder', 2),
  ('2026-2027','core-g1-3',   'Core Subjects',            20,50,30,10,'g1-3',   3),
  ('2026-2027','core-g4-10',  'Core Subjects',            20,50,30,10,'g4-10',  4),
  ('2026-2027','mapeh-g4-10', 'MAPEH / EPP-ICT / TLE-ICT',20,60,20,20,'g4-10',  4)
on conflict (sy, type_key) do nothing;
update public.reg_weight_components set level_group='g11', group_order=5 where sy='2026-2027' and type_key like 'g11-%';
update public.reg_weight_components set level_group='g12', group_order=6 where sy='2026-2027' and type_key like 'g12-%';

update public.reg_class_subjects cs set subject_type =
  case
    when c.grade_level in ('N1','N2') then 'core-nursery'
    when c.grade_level = 'K'          then 'core-kinder'
    when c.grade_level in ('I','II','III') then 'core-g1-3'
    else 'core-g4-10'
  end
from public.reg_classes c
where c.id = cs.class_id and cs.subject_type = 'core';

update public.reg_class_subjects cs set subject_type = 'mapeh-g4-10'
from public.reg_classes c
where c.id = cs.class_id and cs.subject_type = 'mapeh-tle';

delete from public.reg_weight_components
where sy='2026-2027' and type_key in ('core','mapeh-tle')
  and not exists (select 1 from reg_class_subjects cs where cs.subject_type = reg_weight_components.type_key);

-- reg_default_subject_type + reg_copy_weights_to_sy were updated to match; see
-- the applied migrations for their full bodies.
