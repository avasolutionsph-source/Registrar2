-- ============================================================================
--  Backfill reg_class_subjects.assigned_by for assignments made BEFORE the
--  2026-07-22 stamping migration (setup-assigned-by-2026-07-22.sql).
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Nothing recorded who assigned before that date, so this is ATTRIBUTION BY
--  INFERENCE: each old assignment is credited to the account holding the
--  section's Academic Coordinator role (reg_ac_role_for → acad_pre / acad_gs /
--  acad_jhs / acad_shs) — the people who assign from the portal. To avoid
--  recording a wrong name, a level is backfilled ONLY when exactly one
--  account holds its role; levels with zero or several holders stay blank.
--  (An admin account could also have assigned — that cannot be told apart,
--  which is another reason single-holder inference is the safest available.)
--
--  Only rows with a teacher and no assigned_by are touched; stamps written by
--  acad_assign_subject (or by the Registrar app) are never overwritten.
-- ============================================================================

update public.reg_class_subjects cs
set assigned_by = one.holder
from public.reg_classes c,
     lateral (
       select min(r.user_email) as holder
       from public.user_roles r
       where r.role = public.reg_ac_role_for(c.grade_level)
       having count(*) = 1
     ) one
where c.id = cs.class_id
  and cs.teacher_id is not null
  and cs.assigned_by is null
  and one.holder is not null;

-- ── Check ───────────────────────────────────────────────────────────────────
-- 1) What got attributed to whom:
--      select assigned_by, count(*) from reg_class_subjects
--      where assigned_by is not null group by 1 order by 2 desc;
-- 2) Rows still blank (their level has no single coordinator account):
--      select c.grade_level, count(*)
--      from reg_class_subjects cs join reg_classes c on c.id = cs.class_id
--      where cs.teacher_id is not null and cs.assigned_by is null
--      group by 1 order by 1;
