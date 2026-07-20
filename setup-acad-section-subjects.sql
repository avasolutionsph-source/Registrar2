-- ============================================================================
--  acad_section_subjects — load a section's OWN subjects, not the grade's
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  The Academic Coordinator's teaching-load page listed the GRADE-LEVEL catalog
--  (reg_grade_subjects), so it showed every subject the grade could ever offer
--  instead of what the section actually teaches. For Grade 11 that was all 54
--  catalog rows instead of the section's 9 — and it made the two XI-STEM
--  sections look identical, when St. Carlo Acutis (Engineering) and St.
--  Catherine of Siena (Health Allied) teach different electives.
--
--  A section whose curriculum is explicitly defined has per-term offerings in
--  reg_class_subjects; that is the SHS case (see setup-shs-offerings-by-term).
--  Nursery–Grade 10 has no per-section curriculum yet — its reg_class_subjects
--  rows are only teacher assignments — so those sections keep falling back to
--  the grade catalog and are unchanged.
--
--  The signal is `term is not null`, NOT merely "has rows": every section gets
--  rows once a teacher is assigned, but only an explicitly defined curriculum
--  carries terms. Using "has rows" would have shown a Grade 1 section just the
--  two subjects that happen to have a teacher.
--
--  Dropped first because the return type gains a `term` column.
-- ============================================================================

drop function if exists public.acad_section_subjects(uuid);

create function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer,
              teacher_id bigint, term text)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  has_own_curriculum boolean;
begin
  if not exists (select 1 from reg_classes c
                 where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;

  select exists (select 1 from reg_class_subjects cs
                 where cs.class_id = p_class_id and cs.term is not null)
    into has_own_curriculum;

  if has_own_curriculum then
    return query
      select cs.subject_code, coalesce(s.full_name, cs.subject_code),
             coalesce(s.sort_order, 0), cs.teacher_id, cs.term
      from reg_class_subjects cs
      left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id
      -- all-year subjects first, then by term
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

-- ── Check (run as a coordinator; the guard rejects a tokenless session) ──────
--   the two XI-STEM sections must differ, and a Grade 1 section must still show
--   its full 6-subject catalog:
--   select * from public.acad_section_subjects('<class_id>');
