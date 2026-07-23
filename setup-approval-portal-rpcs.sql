-- ============================================================================
--  Approval portal RPCs — the UI side of Grade Approval Routing
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  The routing engine already exists (setup-ALL §7): reg_approval_routing is
--  edited by the Registrar in Setup ▸ Grade Approval Routing, and
--  reg_resolve_approver / reg_can_approve decide WHO approves each sheet by
--  the ENCODER's highest role. sas_can_review already delegates to it, so the
--  existing actions (sas_return_for_revision / sas_submit_to_registrar) work
--  for ANY resolved approver — SAS, Academic Coordinator, or Principal.
--
--  What was missing is the read side for the non-SAS approvers, which this
--  file adds. Nothing here re-implements routing — every guard goes through
--  reg_can_approve, so whatever the Registrar changes in Setup applies to the
--  portal immediately.
-- ============================================================================

-- ── Review state of ONE teacher × subject, for whoever its approver is ──────
-- The grade-sheet review bar reads this. sas_review_states only serves SAS
-- accounts; this serves any caller that routing names as the approver.
create or replace function public.approver_review_states(
  p_teacher_id bigint, p_subject_code text, p_sy text)
returns table(period text, status text, note text,
              returned_at timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.period, r.status, r.note, r.returned_at, r.submitted_at
  from sas_grade_reviews r
  where r.teacher_id = p_teacher_id and r.subject_code = p_subject_code and r.sy = p_sy
    and exists (
      select 1 from reg_class_subjects cs
      where cs.teacher_id = p_teacher_id and cs.subject_code = p_subject_code
        and public.reg_can_approve(p_teacher_id, p_subject_code, cs.class_id)
    );
$$;

-- ── Principal worklist — every sheet routing sends to the caller ────────────
-- Same shape idea as acad_sheet_status, but school-wide and filtered to rows
-- the CALLER can approve (so the Principal sees exactly their queue, including
-- self-approval escalations). p_sy null = all years.
create or replace function public.principal_sheet_status(p_sy text default null)
returns table(teacher_id bigint, teacher_name text,
              subject_code text, subject_name text,
              class_id uuid, sy text, grade_level text, section_name text,
              period text, status text, note text)
language sql stable security definer set search_path to 'public'
as $$
  select t.id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), ''),
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         c.id, c.sy, c.grade_level, c.section_name,
         r.period, coalesce(r.status, 'in_progress'), r.note
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  join reg_teachers t on t.id = cs.teacher_id
  left join reg_subjects s on s.code = cs.subject_code
  left join sas_grade_reviews r
         on r.teacher_id = t.id and r.subject_code = cs.subject_code and r.sy = c.sy
  where cs.teacher_id is not null
    and (p_sy is null or c.sy = p_sy)
    and public.reg_can_approve(t.id, cs.subject_code, c.id)
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code;
$$;

-- ── Roster for a sheet the caller approves (VIEW-only gradebook) ────────────
-- Lets the resolved approver (Principal or a Coordinator outside their SAS/AC
-- scoped rosters) open the grade sheet they are asked to approve.
create or replace function public.approver_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text,
              extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.class_id = p_class_id and cs.teacher_id is not null
      and public.reg_can_approve(cs.teacher_id, cs.subject_code, cs.class_id)
  ) then
    raise exception 'Not an approver for any subject in this section';
  end if;
  return query
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension, st.gender, st.grades
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

grant execute on function public.approver_review_states(bigint, text, text) to authenticated;
grant execute on function public.principal_sheet_status(text) to authenticated;
grant execute on function public.approver_class_roster(uuid) to authenticated;

-- ── Checks ──────────────────────────────────────────────────────────────────
--   as the principal:  select * from public.principal_sheet_status(null);
--   as a coordinator:  select * from public.acad_sheet_status('jhs','2026-2027');
--   Both follow whatever Setup ▸ Grade Approval Routing currently says.
