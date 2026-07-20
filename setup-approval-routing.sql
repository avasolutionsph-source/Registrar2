-- ============================================================================
--  Grade Approval Routing — whose grades each role checks, configurable
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  The approval chain was hardcoded, so changing the organisation meant
--  changing code. It now lives in reg_approval_routing, editable by the
--  Registrar in Setup, and it DRIVES ACCESS: assign a role as approver and
--  every account holding it can see and approve those sheets immediately.
--  There is no second permission list to keep in sync.
--
--  The flow does not change: Teacher -> (one approver) -> Registrar -> LOCK.
--
--  THE HOLE THIS CLOSES: sas_can_review() asked only "is the caller the SAS of
--  this subject, and not the encoder?". A SAS's OWN grade sheet therefore
--  excluded the only person who could approve it and had no approver at all.
--  A SAS's sheet now routes to the Academic Coordinator of the section's level.
--
--  Two departments have no approver yet (Grade School and Junior High
--  coordinators). Their sheets are FLAGGED and held, never skipped and never
--  guessed at -- see reg_resolve_approver's `flag` output.
--
--  NOTE: this file is a record of the migrations already applied via MCP:
--    grade_approval_routing, grade_approval_resolver,
--    sas_review_uses_approval_routing
--  Re-running is harmless; every statement is create-or-replace / if-not-exists.
--  For the full function bodies see those migrations in the Supabase dashboard.
-- ============================================================================

-- Department of a grade level (no overlap). Distinct from acad_stage(), which
-- lumps preschool under the Grade School coordinator.
--   Preschool = N1, N2, K | Grade School = Grades 1-6 | JHS = 7-10 | SHS = 11-12
create or replace function public.reg_dept_of(gl text)
returns text language sql immutable as $$
  select case
    when gl like 'XI-%' or gl like 'XII-%' or gl in ('XI','XII') then 'shs'
    when gl in ('VII','VIII','IX','X')                          then 'jhs'
    when gl in ('I','II','III','IV','V','VI','S')               then 'gs'
    else 'preschool' end;
$$;

create or replace function public.reg_ac_role_for(gl text)
returns text language sql immutable as $$
  select case public.reg_dept_of(gl)
    when 'preschool' then 'acad_pre' when 'gs'  then 'acad_gs'
    when 'jhs'       then 'acad_jhs' when 'shs' then 'acad_shs' end;
$$;

-- FIX: acad_gs no longer reaches preschool; acad_pre does.
create or replace function public.is_acad_for(gl text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from user_roles r
    where lower(r.user_email) = lower(auth.jwt() ->> 'email')
      and (r.role = 'admin' or r.role = public.reg_ac_role_for(gl))
  );
$$;

-- Seeded rules (Part C). Precedence: highest role wins; a scoped rule beats the
-- catch-all -- which is how a Preschool teacher lands on the Grade School
-- coordinator while every other teacher lands on the subject's SAS.
--   teacher  / all       -> DERIVED sas_of_subject
--   teacher  / preschool -> FIXED   acad_gs        (preschool has no SAS)
--   sas      / all       -> DERIVED ac_of_section_level
--   acad_pre / all       -> FIXED   principal
--   acad_shs / all       -> FIXED   principal
--   acad_gs  / all       -> UNSET   (flagged)
--   acad_jhs / all       -> UNSET   (flagged)
