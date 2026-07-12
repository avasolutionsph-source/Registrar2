-- ════════════════════════════════════════════════════════════════════════
--  Adviser class-record RPCs (portal Teacher ▸ Adviser pages)
--
--  A class adviser (reg_classes.adviser_id = the teacher) reads/writes the
--  section's CONDUCT — special programs, deportment (core values), and
--  attendance — which live in reg_students_data.conduct (JSONB, keyed by SY).
--  These mirror the existing teacher_* SECURITY DEFINER pattern so an adviser
--  only ever touches their own advisory section.
--
--  ALREADY APPLIED to the live DB via MCP (migration adviser_conduct_rpcs).
--  Kept here as the versioned source.
-- ════════════════════════════════════════════════════════════════════════

-- 1) The section(s) this teacher advises.
create or replace function public.teacher_my_advisory()
returns table(class_id uuid, sy text, grade_level text, section_name text)
language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.sy, c.grade_level, c.section_name
  from reg_classes c
  where public.current_teacher_id() is not null
    and c.adviser_id = public.current_teacher_id();
$$;

-- 2) Roster of an advised section, incl. grades AND conduct.
create or replace function public.teacher_advisory_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text,
              extension text, gender text, grades jsonb, conduct jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if public.current_teacher_id() is null
     or not exists (
       select 1 from reg_classes c
       where c.id = p_class_id and c.adviser_id = public.current_teacher_id()
     ) then
    raise exception 'Not the adviser of this class';
  end if;
  return query
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension,
           st.gender, st.grades, st.conduct
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

-- 3) Save one learner's conduct for a SY (adviser only). Shallow-merges at the
-- SY level so saving one sub-object (attendance / values / programs) keeps the
-- others intact.
create or replace function public.teacher_save_conduct(p_lrn text, p_sy text, p_conduct jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_class uuid;
  v_conduct jsonb;
  v_year jsonb;
begin
  if public.current_teacher_id() is null then
    raise exception 'Not a teacher';
  end if;
  select current_class_id, conduct into v_class, v_conduct
  from reg_students_data where lrn = p_lrn;
  if v_class is null then
    raise exception 'Learner not found or not enrolled in a class';
  end if;
  if not exists (
    select 1 from reg_classes c
    where c.id = v_class and c.adviser_id = public.current_teacher_id()
  ) then
    raise exception 'Not the adviser of this learner''s class';
  end if;
  v_conduct := coalesce(v_conduct, '{}'::jsonb);
  v_year := coalesce(v_conduct -> p_sy, '{}'::jsonb) || coalesce(p_conduct, '{}'::jsonb);
  v_conduct := jsonb_set(v_conduct, array[p_sy], v_year, true);
  update reg_students_data set conduct = v_conduct where lrn = p_lrn;
end;
$$;

grant execute on function public.teacher_my_advisory() to authenticated;
grant execute on function public.teacher_advisory_roster(uuid) to authenticated;
grant execute on function public.teacher_save_conduct(text, text, jsonb) to authenticated;
