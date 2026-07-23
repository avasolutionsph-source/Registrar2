-- ============================================================================
--  FIX: acad_teacher_loads must return ONLY the caller's level(s)
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  BUG: the JHS (and Preschool) coordinator's Teacher Loads listed SHS loads —
--  the whole school's assignments, in fact. acad_teacher_loads (applied live
--  via MCP without a doc file) returns every reg_class_subjects row; only the
--  per-section RPCs (acad_sections / acad_section_subjects / acad_assign_subject)
--  were scoped by is_acad_for. This feeds the coordinator roster, the
--  per-teacher page AND the coordinator grade-sheet lookup, so the leak showed
--  everywhere in the office (read-only — writes were always level-guarded).
--
--  This recreates it with the row-level scope: a coordinator gets rows only
--  for sections whose grade_level passes is_acad_for. Same shape and name
--  convention as sas_teacher_loads. Dropped first in case the live signature
--  differs from this reconstruction.
--
--  Related check while you are here (same applied-via-MCP batch, no doc file):
--  make sure the roster helpers are also level-scoped —
--    select p.proname, pg_get_functiondef(p.oid)
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('acad_added_teachers','acad_available_teachers','acad_add_teacher');
-- ============================================================================

drop function if exists public.acad_teacher_loads();

create function public.acad_teacher_loads()
returns table(
  teacher_id bigint, teacher_name text,
  class_id uuid, sy text, grade_level text, section_name text,
  subject_code text, subject_name text, term text
)
language sql stable security definer set search_path to 'public'
as $$
  select cs.teacher_id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as teacher_name,
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code) as subject_name,
         cs.term  -- term coverage ('q1,q2' comma keys or null = all year), for the load badges
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  join reg_teachers t on t.id = cs.teacher_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.teacher_id is not null
    and public.is_acad_for(c.grade_level)   -- the fix: rows limited to the caller's level(s)
  order by teacher_name, c.grade_level, c.section_name, subject_name;
$$;

grant execute on function public.acad_teacher_loads() to authenticated;

-- ── Check (run while signed in as each coordinator) ─────────────────────────
--   select distinct grade_level from public.acad_teacher_loads() order by 1;
--   • acad_pre must list only N1/N2/K-type levels
--   • acad_gs  must list only I–VI (and S/SNED)
--   • acad_jhs must list only VII–X
--   • acad_shs must list only XI-*/XII-*
