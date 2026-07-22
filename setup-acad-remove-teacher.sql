-- ============================================================================
--  acad_remove_teacher — undo "+ Add Teacher" (take a teacher off the level
--  roster again). Backs the × button on the coordinator's Teacher Loads cards,
--  which is offered only for teachers with 0 assignments.
--
--  NOTE BEFORE RUNNING: the add-teacher migration (acad_add_teacher /
--  acad_added_teachers / acad_available_teachers) was applied live via MCP and
--  left no SQL file in this repo, so the roster table's exact name and level
--  column are not recorded here. Run STEP 1 first and check which table
--  acad_add_teacher inserts into; adjust the DELETE in STEP 2 if it differs.
-- ============================================================================

-- ── STEP 1 — discover the live definitions (read-only) ──────────────────────
-- select p.proname, pg_get_functiondef(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('acad_add_teacher', 'acad_added_teachers', 'acad_available_teachers');

-- ── STEP 2 — the remove RPC ─────────────────────────────────────────────────
-- Guards:
--  • refuses while the teacher still has subject assignments in the caller's
--    level(s) — unassign in Teacher Loads first, so a mis-click can never
--    orphan real loads;
--  • the DELETE itself is scoped to rows of the caller's level(s), mirroring
--    how acad_add_teacher scopes the insert.
create or replace function public.acad_remove_teacher(p_teacher_id bigint)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if exists (
    select 1
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    where cs.teacher_id = p_teacher_id
      and public.is_acad_for(c.grade_level)
  ) then
    raise exception 'This teacher still has subject assignments in your level. Remove those first.';
  end if;

  -- ADJUST HERE if STEP 1 shows a different table/level column: delete this
  -- teacher's roster row(s) for the level(s) the caller coordinates.
  delete from acad_added_teachers a
  where a.teacher_id = p_teacher_id
    and public.is_acad_for(a.grade_level);
end;
$function$;

grant execute on function public.acad_remove_teacher(bigint) to authenticated;
