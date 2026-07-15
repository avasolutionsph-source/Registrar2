-- ============================================================================
--  SAS review loop — Return for Revision / Submit to Registrar.
--  Paste-run this whole file in the Supabase SQL editor.
--
--  This is the BACKEND the already-written UI calls. Without it these RPCs are
--  missing and the review buttons / teacher notices fail (the teacher's portal
--  degrades quietly — RevisionNotices swallows the error and renders nothing).
--
--  Scope is per TEACHER x SUBJECT x SY x TERM, so a teacher supervised by two
--  areas gets an independent review, note and lock for each.
--
--  status flow:
--    in_progress    (no row) -- teacher is encoding
--    needs_revision  SAS returned it with a note (re-arms the teacher's pop-up)
--    for_rechecking  teacher marked it resolved -> back to the SAS
--    submitted       SAS handed it to the Registrar -> read-only for the teacher
--
--  The SAS stays VIEW-ONLY on grades: these writes only move a status and carry
--  a note. No function here can read or change a single score.
-- ============================================================================

create table if not exists public.sas_grade_reviews (
  teacher_id   bigint not null references public.reg_teachers(id) on delete cascade,
  subject_code text   not null references public.reg_subjects(code) on delete cascade,
  sy           text   not null,
  period       text   not null,
  status       text   not null default 'in_progress'
                 check (status in ('in_progress','needs_revision','for_rechecking','submitted')),
  note         text,
  returned_at   timestamptz,
  submitted_at  timestamptz,
  popup_seen   boolean not null default false,
  reviewer_email text,
  updated_at   timestamptz not null default now(),
  primary key (teacher_id, subject_code, sy, period)
);
alter table public.sas_grade_reviews enable row level security;

-- Is the caller the Subject Area Supervisor for this subject (and not acting on
-- themselves)? Mirrors the self-exclusion already in sas_teacher_loads().
create or replace function public.sas_can_review(p_teacher_id bigint, p_subject_code text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.sas_my_subject_codes() c where c.subject_code = p_subject_code)
     and exists (
       select 1 from reg_teachers t
       where t.id = p_teacher_id
         and lower(coalesce(t.email,'')) <> lower(coalesce(auth.jwt() ->> 'email',''))
     );
$$;

-- ── SAS side ────────────────────────────────────────────────────────────────
create or replace function public.sas_review_states()
returns table(teacher_id bigint, subject_code text, sy text, period text,
              status text, note text, returned_at timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.teacher_id, r.subject_code, r.sy, r.period, r.status, r.note, r.returned_at, r.submitted_at
  from sas_grade_reviews r
  where r.subject_code in (select subject_code from public.sas_my_subject_codes());
$$;

create or replace function public.sas_return_for_revision(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text, p_note text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.sas_can_review(p_teacher_id, p_subject_code) then
    raise exception 'Not authorized to review this subject';
  end if;
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'A note is required when returning a grade sheet';
  end if;
  insert into sas_grade_reviews (teacher_id, subject_code, sy, period, status, note,
                                 returned_at, submitted_at, popup_seen, reviewer_email, updated_at)
  values (p_teacher_id, p_subject_code, p_sy, p_period, 'needs_revision', p_note,
          now(), null, false, auth.jwt() ->> 'email', now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'needs_revision',
        note = excluded.note,
        returned_at = now(),
        submitted_at = null,
        popup_seen = false,          -- re-arm the teacher's pop-up
        reviewer_email = excluded.reviewer_email,
        updated_at = now();
end;
$$;

create or replace function public.sas_submit_to_registrar(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.sas_can_review(p_teacher_id, p_subject_code) then
    raise exception 'Not authorized to review this subject';
  end if;
  insert into sas_grade_reviews (teacher_id, subject_code, sy, period, status,
                                 submitted_at, popup_seen, reviewer_email, updated_at)
  values (p_teacher_id, p_subject_code, p_sy, p_period, 'submitted',
          now(), true, auth.jwt() ->> 'email', now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'submitted',
        submitted_at = now(),
        reviewer_email = excluded.reviewer_email,
        updated_at = now();
end;
$$;

-- ── Teacher side ────────────────────────────────────────────────────────────
create or replace function public.teacher_my_revisions()
returns table(subject_code text, subject_name text, sy text, period text,
              note text, returned_at timestamptz, needs_popup boolean)
language sql stable security definer set search_path to 'public'
as $$
  select r.subject_code, coalesce(s.full_name, r.subject_code), r.sy, r.period,
         r.note, r.returned_at, (not r.popup_seen) as needs_popup
  from sas_grade_reviews r
  left join reg_subjects s on s.code = r.subject_code
  where r.teacher_id = public.current_teacher_id()
    and r.status = 'needs_revision'
  order by r.returned_at desc;
$$;

create or replace function public.teacher_ack_revision_popup(
  p_subject_code text, p_sy text, p_period text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  update sas_grade_reviews
     set popup_seen = true, updated_at = now()
   where teacher_id = public.current_teacher_id()
     and subject_code = p_subject_code and sy = p_sy and period = p_period;
end;
$$;

create or replace function public.teacher_mark_resolved(
  p_subject_code text, p_sy text, p_period text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  update sas_grade_reviews
     set status = 'for_rechecking', popup_seen = true, updated_at = now()
   where teacher_id = public.current_teacher_id()
     and subject_code = p_subject_code and sy = p_sy and period = p_period
     and status = 'needs_revision';
  if not found then
    raise exception 'No pending revision for this subject/term';
  end if;
end;
$$;

create or replace function public.teacher_locked_terms()
returns table(subject_code text, sy text, period text, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.subject_code, r.sy, r.period, r.submitted_at
  from sas_grade_reviews r
  where r.teacher_id = public.current_teacher_id()
    and r.status = 'submitted';
$$;

grant execute on function public.sas_can_review(bigint, text) to authenticated;
grant execute on function public.sas_review_states() to authenticated;
grant execute on function public.sas_return_for_revision(bigint, text, text, text, text) to authenticated;
grant execute on function public.sas_submit_to_registrar(bigint, text, text, text) to authenticated;
grant execute on function public.teacher_my_revisions() to authenticated;
grant execute on function public.teacher_ack_revision_popup(text, text, text) to authenticated;
grant execute on function public.teacher_mark_resolved(text, text, text) to authenticated;
grant execute on function public.teacher_locked_terms() to authenticated;

-- ── Sanity checks (optional) ────────────────────────────────────────────────
--   select * from public.sas_grade_reviews order by updated_at desc limit 20;
--   -- as a SAS, what does the review list look like:
--   select * from public.sas_review_states();
