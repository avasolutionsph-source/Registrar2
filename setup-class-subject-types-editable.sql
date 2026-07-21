-- ============================================================================
--  Subject types per section — list ALL, re-assignable (not only untyped)
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  The split follows a section x subject's TYPE (reg_class_subjects.subject_type
--  -> reg_weight_components). The Setup page could only assign a type to rows
--  that had NONE; a type set by the seed could not be changed. This function
--  lists every section x subject for a year with its current type so the
--  registrar can re-assign any of them. `configured` is false when the type is
--  unset or has no weights for the year -- the rows that still block a sheet.
--  Registrar-only.
--
--  NOTE: applied via MCP as migration `reg_all_class_subject_types`.
-- ============================================================================
create or replace function public.reg_all_class_subject_types(p_sy text)
returns table(class_id uuid, grade_level text, section_name text,
              subject_code text, subject_name text,
              type_key text, configured boolean)
language sql stable security definer set search_path to 'public' as $$
  select cs.class_id, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         cs.subject_type,
         (cs.subject_type is not null
          and exists (select 1 from reg_weight_components w
                      where w.sy = c.sy and w.type_key = cs.subject_type))
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  left join reg_subjects s on s.code = cs.subject_code
  where c.sy = p_sy and public.is_registrar()
  order by (cs.subject_type is null) desc, c.grade_level, c.section_name, cs.subject_code;
$$;
grant execute on function public.reg_all_class_subject_types(text) to authenticated;
