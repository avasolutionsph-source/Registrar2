-- reg_class_subjects.assigned_by — 2026-07-22
-- Records which Academic Coordinator (email) assigned a teacher to a subject.
-- acad_assign_subject now stamps auth.jwt() email on assign, and clears it when
-- the teacher is removed. Applied live via Supabase MCP; documentation record.
alter table public.reg_class_subjects add column if not exists assigned_by text;

create or replace function public.acad_assign_subject(p_class_id uuid, p_subject_code text, p_teacher_id bigint)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v_by text := auth.jwt() ->> 'email';
begin
  if not exists (select 1 from reg_classes c where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;
  insert into reg_class_subjects(class_id, subject_code, teacher_id, assigned_by)
  values (p_class_id, p_subject_code, p_teacher_id, case when p_teacher_id is null then null else v_by end)
  on conflict (class_id, subject_code) do update
    set teacher_id = excluded.teacher_id,
        assigned_by = case when excluded.teacher_id is null then null else v_by end,
        updated_at = now();
end;
$function$;
