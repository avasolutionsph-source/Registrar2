-- ============================================================================
--  CURRICULUM GUARD — coordinators can only load subjects the Registrar set
--  Paste-run in the Supabase SQL editor. PARTS A and B are safe to re-run.
--
--  Ano ang inaayos nito:
--  1) PART A — acad_assign_subject now REFUSES a subject that is not in the
--     Registrar's set for that section: N–G10 = the grade's Setup ▸ Subjects
--     order list (reg_grade_subjects); SHS = the section's own offerings
--     (reg_class_subjects) or the strand's order list. A grade with NO order
--     list configured yet is not blocked, so an unconfigured level keeps
--     working.
--  2) PART B — acad_section_subjects: the "section has its own curriculum"
--     branch now applies to SHS ONLY. Before, a Grade School section whose
--     MAPEH got term coverage (term = 'q1,q2') flipped into that branch and
--     the picker HID the rest of the grade's subjects. N–G10 now always
--     follows the grade's order list.
--  3) PART C — CLEANUP: delete existing (sample) coordinator loads whose
--     subject is NOT in the grade's order list. N–G10 only — SHS rows are the
--     Registrar's own per-term offerings and are never touched. Learners'
--     encoded grades live in reg_students.grades and are NOT affected.
-- ============================================================================


-- ═══ PART A — assignment guard (run this whole block) ═══════════════════════

create or replace function public.acad_assign_subject(
  p_class_id uuid, p_subject_code text, p_teacher_id bigint, p_terms text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_by text := auth.jwt() ->> 'email';
  v_grade text;
begin
  select c.grade_level into v_grade
  from reg_classes c
  where c.id = p_class_id and public.is_acad_for(c.grade_level);
  if v_grade is null then
    raise exception 'Not authorized for this section';
  end if;

  -- CURRICULUM GUARD — only subjects the Registrar put in this section's set.
  if public.reg_dept_of(v_grade) = 'shs' then
    -- SHS: the row must already exist (the Registrar's per-term offerings) or
    -- the subject must be in the strand's order list.
    if not exists (select 1 from reg_class_subjects cs
                   where cs.class_id = p_class_id and cs.subject_code = p_subject_code)
       and not exists (select 1 from reg_grade_subjects gs
                       where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in this section''s subject offerings — ask the Registrar to add it first (Setup - Subjects or Classes - Subjects & Teachers)', p_subject_code;
    end if;
  elsif exists (select 1 from reg_grade_subjects gs where gs.grade_level = v_grade) then
    -- N–G10 with a configured order list: the subject must be in it.
    if not exists (select 1 from reg_grade_subjects gs
                   where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in the Grade % subject set — ask the Registrar to add it in Setup - Subjects first', p_subject_code, v_grade;
    end if;
  end if;
  -- (a grade with NO order list configured is not blocked)

  insert into reg_class_subjects(class_id, subject_code, teacher_id, assigned_by, term)
  values (p_class_id, p_subject_code, p_teacher_id,
          case when p_teacher_id is null then null else v_by end,
          nullif(p_terms, ''))
  on conflict (class_id, subject_code) do update
    set teacher_id = excluded.teacher_id,
        assigned_by = case when excluded.teacher_id is null then null else v_by end,
        term = case when p_terms is null then reg_class_subjects.term else nullif(p_terms, '') end,
        updated_at = now();
end;
$function$;

grant execute on function public.acad_assign_subject(uuid, text, bigint, text) to authenticated;


-- ═══ PART B — picker follows the grade's order list for N–G10 ═══════════════

create or replace function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer,
              teacher_id bigint, term text)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_grade text;
  has_own_curriculum boolean;
begin
  select c.grade_level into v_grade
  from reg_classes c
  where c.id = p_class_id and public.is_acad_for(c.grade_level);
  if v_grade is null then
    raise exception 'Not authorized for this section';
  end if;

  -- Only an SHS section carries its OWN per-term curriculum. An N–G10 section
  -- may also have term values (coordinator term coverage, e.g. MAPEH q1,q2),
  -- so "has term rows" alone is NOT the signal — the department is.
  select public.reg_dept_of(v_grade) = 'shs'
         and exists (select 1 from reg_class_subjects cs
                     where cs.class_id = p_class_id and cs.term is not null)
    into has_own_curriculum;

  if has_own_curriculum then
    return query
      select cs.subject_code, coalesce(s.full_name, cs.subject_code),
             coalesce(s.sort_order, 0), cs.teacher_id, cs.term
      from reg_class_subjects cs
      left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id
      order by cs.term nulls first, coalesce(s.sort_order, 0), cs.subject_code;
  else
    return query
      select gs.subject_code, coalesce(s.full_name, gs.subject_code),
             gs.sort_order, cs.teacher_id, cs.term
      from reg_classes c
      join reg_grade_subjects gs on gs.grade_level = c.grade_level
      left join reg_subjects s on s.code = gs.subject_code
      left join reg_class_subjects cs
             on cs.class_id = c.id and cs.subject_code = gs.subject_code
      where c.id = p_class_id
      order by gs.sort_order, gs.subject_code;
  end if;
end;
$function$;

grant execute on function public.acad_section_subjects(uuid) to authenticated;


-- ═══ PART C — clean up loads whose subject is NOT in the grade's set ════════
-- Run STEP C1 first and READ the list; only then run STEP C2.

-- ▶ STEP C1 (PREVIEW — deletes nothing): every N–G10 load row whose subject is
--   not in the grade's Setup ▸ Subjects order list.
select c.grade_level, c.section_name, c.sy,
       cs.subject_code, cs.teacher_id, cs.assigned_by, cs.term
from reg_class_subjects cs
join reg_classes c on c.id = cs.class_id
where public.reg_dept_of(c.grade_level) <> 'shs'
  and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
  and not exists (select 1 from reg_grade_subjects gs
                  where gs.grade_level = c.grade_level
                    and gs.subject_code = cs.subject_code)
order by c.grade_level, c.section_name, cs.subject_code;

-- ▶ STEP C2 (DELETE — run only after checking the preview above):
-- delete from reg_class_subjects cs
-- using reg_classes c
-- where c.id = cs.class_id
--   and public.reg_dept_of(c.grade_level) <> 'shs'
--   and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
--   and not exists (select 1 from reg_grade_subjects gs
--                   where gs.grade_level = c.grade_level
--                     and gs.subject_code = cs.subject_code);

-- ▶ STEP C3 (VERIFY): must return 0 rows after the delete.
-- select count(*) as stale_rows
-- from reg_class_subjects cs
-- join reg_classes c on c.id = cs.class_id
-- where public.reg_dept_of(c.grade_level) <> 'shs'
--   and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
--   and not exists (select 1 from reg_grade_subjects gs
--                   where gs.grade_level = c.grade_level
--                     and gs.subject_code = cs.subject_code);
