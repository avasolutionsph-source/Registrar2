-- ════════════════════════════════════════════════════════════════════════
--  Academic-coordinator teaching-load RPCs
--
--  Let an Academic Coordinator (user_roles: acad_gs / acad_jhs / acad_shs, or
--  admin) assign which teacher teaches each subject in a section of THEIR level,
--  from the portal. Writes land in reg_class_subjects — the same table the
--  registrar uses and the teacher gradebook reads via teacher_my_load — so an
--  assignment shows up in the teacher's account (subjects + section class list).
--
--  Scope is enforced by is_acad_for(grade_level). Subjects come from the grade
--  curriculum (reg_grade_subjects), so they appear in the right order.
--
--  ALREADY APPLIED to the live DB via MCP (migration acad_teaching_load_rpcs).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.acad_stage(gl text)
returns text language sql immutable as $$
  select case
    when gl like 'XI-%' or gl like 'XII-%' or gl in ('XI','XII') then 'shs'
    when gl in ('VII','VIII','IX','X') then 'jhs'
    when gl in ('I','II','III','IV','V','VI','S') then 'elem'
    else 'preschool' end;
$$;

create or replace function public.is_acad_for(gl text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from user_roles r
    where lower(r.user_email) = lower(auth.jwt() ->> 'email')
      and (
        r.role = 'admin'
        or (r.role = 'acad_gs'  and public.acad_stage(gl) in ('preschool','elem'))
        or (r.role = 'acad_jhs' and public.acad_stage(gl) = 'jhs')
        or (r.role = 'acad_shs' and public.acad_stage(gl) = 'shs')
      )
  );
$$;

create or replace function public.acad_sections()
returns table(class_id uuid, sy text, grade_level text, section_name text, adviser text)
language sql stable security definer set search_path to 'public' as $$
  select c.id, c.sy, c.grade_level, c.section_name,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '')
  from reg_classes c
  left join reg_teachers t on t.id = c.adviser_id
  where public.is_acad_for(c.grade_level)
  order by c.sy desc, c.grade_level, c.section_name;
$$;

create or replace function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order int, teacher_id bigint)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from reg_classes c where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;
  return query
    select gs.subject_code, s.full_name, gs.sort_order, cs.teacher_id
    from reg_classes c
    join reg_grade_subjects gs on gs.grade_level = c.grade_level
    left join reg_subjects s on s.code = gs.subject_code
    left join reg_class_subjects cs on cs.class_id = c.id and cs.subject_code = gs.subject_code
    where c.id = p_class_id
    order by gs.sort_order, gs.subject_code;
end;
$$;

create or replace function public.acad_teachers()
returns table(id bigint, name text)
language sql stable security definer set search_path to 'public' as $$
  select t.id, (coalesce(t.family_name,'') || ', ' || coalesce(t.first_name,''))
  from reg_teachers t
  where coalesce(t.year_ended, 0) = 0
  order by t.family_name, t.first_name;
$$;

create or replace function public.acad_assign_subject(p_class_id uuid, p_subject_code text, p_teacher_id bigint)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from reg_classes c where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;
  insert into reg_class_subjects(class_id, subject_code, teacher_id)
  values (p_class_id, p_subject_code, p_teacher_id)
  on conflict (class_id, subject_code) do update set teacher_id = excluded.teacher_id, updated_at = now();
end;
$$;

grant execute on function public.acad_sections() to authenticated;
grant execute on function public.acad_section_subjects(uuid) to authenticated;
grant execute on function public.acad_teachers() to authenticated;
grant execute on function public.acad_assign_subject(uuid, text, bigint) to authenticated;
