-- ============================================================================
--  acad_assign_subject learns TERM COVERAGE — flexible per-subject terms
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Subjects like MAPEH and EPP/ICT–TLE run in different terms per school's
--  plan (e.g. Grade School MAPEH: Music & Arts in Term 1, both Music & Arts
--  and PE & Health in Term 2, PE & Health in Term 3). The coordinator now
--  picks the covered term(s) while assigning, and the choice is stored in
--  reg_class_subjects.term as comma-joined period keys ('q1,q2'); null still
--  means all year. One row per (class, subject) stays the PK — multi-term is
--  a value, not extra rows.
--
--  p_terms semantics (so every caller stays correct):
--    • null  → leave term untouched (SHS: the registrar's per-term curriculum
--              is authoritative; also what the pre-migration portal sends)
--    • ''    → clear to all-year
--    • 'q1,q3' → set exactly those terms
--
--  The 3-arg version is DROPPED (not overloaded) — two candidates would make
--  PostgREST named-argument calls ambiguous. Old 3-argument calls resolve to
--  this one through the default. assigned_by stamping is kept exactly as in
--  setup-assigned-by-2026-07-22.sql.
-- ============================================================================

drop function if exists public.acad_assign_subject(uuid, text, bigint);

create function public.acad_assign_subject(
  p_class_id uuid, p_subject_code text, p_teacher_id bigint, p_terms text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v_by text := auth.jwt() ->> 'email';
begin
  if not exists (select 1 from reg_classes c where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;
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
