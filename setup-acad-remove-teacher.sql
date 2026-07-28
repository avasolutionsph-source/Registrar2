-- ============================================================================
--  acad_remove_teacher — undo "+ Add Teacher" (tanggalin ang teacher sa level
--  roster). Ito ang RPC sa likod ng Remove button sa coordinator's Teacher
--  Loads. Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  DISCOVERY (2026-07-28, via pg_get_functiondef ng acad_add_teacher): ang
--  roster table ay `acad_level_teachers (teacher_id, role)` — keyed sa ROLE ng
--  coordinator (hal. 'acad_pre'), HINDI sa grade_level. Ang add ay nag-i-insert
--  ng isang row per role ng caller (acad_my_roles), on conflict do nothing.
--  Ang remove sa ibaba ay salamin nito.
--
--  Guards:
--   • caller must be an academic coordinator (acad_my_roles);
--   • tumatanggi habang may subject assignments pa ang teacher sa level ng
--     caller (kasama ang per-term combo loads sa term_teachers) — para hindi
--     maulila ang totoong loads sa isang mis-click;
--   • ang DELETE ay saklaw lang ng mga role ng caller — hindi magagalaw ang
--     roster ng ibang level.
-- ============================================================================

create or replace function public.acad_remove_teacher(p_teacher_id bigint)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  roles text[];
begin
  roles := public.acad_my_roles();
  if array_length(roles, 1) is null then
    raise exception 'Not an academic coordinator';
  end if;

  if exists (
    select 1
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    where public.is_acad_for(c.grade_level)
      and (cs.teacher_id = p_teacher_id
           or (cs.term_teachers is not null and exists (
                 select 1 from jsonb_each_text(cs.term_teachers) e
                 where (case when e.value ~ '^\d+$' then e.value::bigint end) = p_teacher_id)))
  ) then
    raise exception 'This teacher still has subject assignments in your level. Remove those first.';
  end if;

  delete from acad_level_teachers a
   where a.teacher_id = p_teacher_id
     and a.role = any(roles);
end;
$function$;

grant execute on function public.acad_remove_teacher(bigint) to authenticated;


-- ═══ VERIFY — dapat true ═══════════════════════════════════════════════════
select 'acad_remove_teacher fn' as item,
       exists (select 1 from pg_proc where proname = 'acad_remove_teacher')::text as value;
