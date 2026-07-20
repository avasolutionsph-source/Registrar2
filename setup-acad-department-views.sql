-- ============================================================================
--  Academic Coordinator department views — monitoring, grades, below-80
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  All READ-ONLY. Every one is scoped to the caller's department, and a
--  department is the level of the SECTION — never the teacher's own roles. A
--  teacher with loads in two levels is seen by each level's coordinator only
--  for the sections in that level.
--
--  Departments have no overlap (see reg_dept_of in setup-approval-routing):
--    Preschool = N1, N2, K | Grade School = Grades 1-6 | JHS = 7-10 | SHS = 11-12
--
--  acad_sheet_status covers the WHOLE department, including sheets this
--  coordinator does not approve — `mine` marks the ones that are theirs to act
--  on, resolved through the routing rules, and `flag` carries the reason when
--  no rule applies. A stuck sheet is therefore visible rather than missing.
--
--  acad_below_80 is per SUBJECT and per TERM, deliberately not the general
--  average and not the final: a learner with an 85 average still appears for a
--  78 in one subject in one term.
--
--  NOTE: already applied via MCP as migration `acad_department_views_v2`.
--  For the full bodies see that migration in the Supabase dashboard.
-- ============================================================================

-- Departments this caller coordinates (admin sees all).
create or replace function public.acad_my_depts()
returns table(dept text)
language sql stable security definer set search_path to 'public' as $$
  select d from unnest(array['preschool','gs','jhs','shs']) d
  where exists (
    select 1 from user_roles r
    where lower(r.user_email) = lower(auth.jwt() ->> 'email')
      and (r.role = 'admin' or r.role = case d
             when 'preschool' then 'acad_pre' when 'gs' then 'acad_gs'
             when 'jhs' then 'acad_jhs' else 'acad_shs' end)
  );
$$;

-- Then: acad_sheet_status(p_dept, p_sy), acad_student_grades(p_dept, p_sy),
--       acad_below_80(p_dept, p_sy)  — see the applied migration.
