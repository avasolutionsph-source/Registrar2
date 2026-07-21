-- ============================================================================
--  SAS Review Loop — Return for Revision + Submit to Registrar
--  Paste-run this whole file in the Supabase SQL editor. Safe to re-run.
--
--  Builds on setup-subject-area-supervisor.sql (sas_my_subject_codes, etc.).
--  ADD-ON ONLY: nothing here alters the existing teacher encoding flow, the
--  registrar, or the academic coordinator. A teacher with no review row behaves
--  exactly as before (default status = in_progress, nothing locked).
--
--  Scope unit: TEACHER x SUBJECT x SY x TERM.
--    • Per TERM (the school runs 3 terms for SY >= 2026 — see periodsForSy() in
--      packages/shared/src/lib/grading.js; the storage keys stay q1/q2/q3).
--    • Submitting Term 1 locks Term 1 ONLY — the teacher keeps encoding Term 2/3.
--    • A teacher supervised by two different SAS (two subjects) gets a separate
--      review row, note and notice for each.
--
--  Status model (Part C):
--    in_progress     — default, teacher is still encoding
--    needs_revision  — SAS returned it with a note
--    for_rechecking  — teacher marked the note resolved, waiting for the SAS
--    submitted       — final; the term's grade sheets are locked
-- ============================================================================

-- ── Review state, one row per teacher x subject x SY x term ─────────────────
create table if not exists public.sas_reviews (
  teacher_id     bigint not null references public.reg_teachers(id) on delete cascade,
  subject_code   text   not null references public.reg_subjects(code) on delete cascade,
  sy             text   not null,
  period         text   not null check (period in ('q1','q2','q3','q4')),
  status         text   not null default 'in_progress'
                   check (status in ('in_progress','needs_revision','for_rechecking','submitted')),
  -- Current SAS note. Kept as plain text on purpose: the note is written by the
  -- SAS and read by the teacher only — no PII, no grades.
  note           text,
  reviewer_email text,
  returned_at    timestamptz,   -- when the SAS last returned it (drives the pop-up)
  -- The teacher has seen the pop-up for THIS return. Null after every new
  -- return, so a fresh note pops up again on the next login.
  popup_seen_at  timestamptz,
  resolved_at    timestamptz,
  submitted_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (teacher_id, subject_code, sy, period)
);
alter table public.sas_reviews enable row level security;
-- No RLS policies on purpose: every read/write goes through the SECURITY
-- DEFINER rpcs below, which scope by the caller's SAS role or teacher identity.

create index if not exists sas_reviews_teacher_idx
  on public.sas_reviews (teacher_id, sy);

-- ── Caller helpers ─────────────────────────────────────────────────────────
-- The signed-in account's reg_teachers id comes from the EXISTING
-- public.current_teacher_id() (used by teacher_my_load / teacher_save_grades) —
-- deliberately not re-implemented here, so there is one source of truth.

-- Guard: the caller must supervise p_subject_code, and may not review self.
create or replace function public.sas_assert_can_review(p_teacher_id bigint, p_subject_code text)
returns void language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if p_subject_code not in (select subject_code from public.sas_my_subject_codes()) then
    raise exception 'Not authorized for this subject';
  end if;
  if p_teacher_id = public.current_teacher_id() then
    raise exception 'A supervisor cannot review their own grade sheets';
  end if;
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.teacher_id = p_teacher_id and cs.subject_code = p_subject_code
  ) then
    raise exception 'That teacher has no load in this subject';
  end if;
end;
$$;

-- ── SAS action: Return for Revision ────────────────────────────────────────
-- Sends the note to the teacher and re-arms the pop-up (popup_seen_at = null).
create or replace function public.sas_return_for_revision(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text, p_note text
) returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.sas_assert_can_review(p_teacher_id, p_subject_code);
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'A note is required when returning for revision';
  end if;
  insert into public.sas_reviews as r
    (teacher_id, subject_code, sy, period, status, note, reviewer_email,
     returned_at, popup_seen_at, resolved_at, submitted_at, updated_at)
  values
    (p_teacher_id, p_subject_code, p_sy, p_period, 'needs_revision', btrim(p_note),
     auth.jwt() ->> 'email', now(), null, null, null, now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'needs_revision',
        note = excluded.note,
        reviewer_email = excluded.reviewer_email,
        returned_at = now(),
        popup_seen_at = null,   -- a new note pops up again
        resolved_at = null,
        submitted_at = null,    -- returning un-submits, so the term unlocks
        updated_at = now();
end;
$$;

-- ── SAS action: Submit to Registrar (final; locks the term) ─────────────────
create or replace function public.sas_submit_to_registrar(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text
) returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.sas_assert_can_review(p_teacher_id, p_subject_code);
  insert into public.sas_reviews as r
    (teacher_id, subject_code, sy, period, status, note, reviewer_email,
     submitted_at, popup_seen_at, updated_at)
  values
    (p_teacher_id, p_subject_code, p_sy, p_period, 'submitted', null,
     auth.jwt() ->> 'email', now(), null, now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'submitted',
        note = null,            -- the revision loop is done
        reviewer_email = excluded.reviewer_email,
        submitted_at = now(),
        updated_at = now();
end;
$$;

-- ── SAS read: statuses for the caller's subjects ───────────────────────────
-- One row per teacher x subject x term that has any state. The UI merges this
-- over the teaching load, defaulting anything missing to 'in_progress'.
create or replace function public.sas_review_states()
returns table(
  teacher_id bigint, subject_code text, sy text, period text,
  status text, note text, returned_at timestamptz, submitted_at timestamptz
)
language sql stable security definer set search_path to 'public'
as $$
  select r.teacher_id, r.subject_code, r.sy, r.period,
         r.status, r.note, r.returned_at, r.submitted_at
  from public.sas_reviews r
  where r.subject_code in (select subject_code from public.sas_my_subject_codes())
    and r.teacher_id <> coalesce(public.current_teacher_id(), -1);
$$;

-- ── Teacher read: my pending revisions (drives the pop-up + the notice) ─────
-- Only 'needs_revision' rows are returned, so a teacher with nothing pending
-- sees NOTHING (Part B / non-destructive rule 3). One row per subject x term,
-- each with its own note — a teacher supervised by two SAS sees both.
create or replace function public.teacher_my_revisions()
returns table(
  subject_code text, subject_name text, sy text, period text,
  note text, returned_at timestamptz, needs_popup boolean
)
language sql stable security definer set search_path to 'public'
as $$
  select r.subject_code,
         coalesce(s.full_name, r.subject_code) as subject_name,
         r.sy, r.period, r.note, r.returned_at,
         (r.popup_seen_at is null) as needs_popup
  from public.sas_reviews r
  left join reg_subjects s on s.code = r.subject_code
  where r.teacher_id = public.current_teacher_id()
    and r.status = 'needs_revision'
  order by r.returned_at desc;
$$;

-- Teacher marks the pop-up as seen (the persistent notice stays until resolved).
create or replace function public.teacher_ack_revision_popup(
  p_subject_code text, p_sy text, p_period text
) returns void language sql security definer set search_path to 'public'
as $$
  update public.sas_reviews
     set popup_seen_at = now(), updated_at = now()
   where teacher_id = public.current_teacher_id()
     and subject_code = p_subject_code and sy = p_sy and period = p_period
     and status = 'needs_revision';
$$;

-- Teacher action: "Mark as resolved" → back to the SAS for rechecking.
create or replace function public.teacher_mark_resolved(
  p_subject_code text, p_sy text, p_period text
) returns void language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  update public.sas_reviews
     set status = 'for_rechecking', resolved_at = now(), updated_at = now()
   where teacher_id = public.current_teacher_id()
     and subject_code = p_subject_code and sy = p_sy and period = p_period
     and status = 'needs_revision';
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'No pending revision for that subject and term';
  end if;
end;
$$;

-- ── Lock read: which of MY (subject, term) pairs are submitted/locked ───────
-- The gradebook UI uses this to render a locked term read-only. Enforcement is
-- server-side too (see setup-sas-review-lock.sql).
create or replace function public.teacher_locked_terms()
returns table(subject_code text, sy text, period text, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.subject_code, r.sy, r.period, r.submitted_at
  from public.sas_reviews r
  where r.teacher_id = public.current_teacher_id()
    and r.status = 'submitted';
$$;

grant execute on function public.sas_return_for_revision(bigint, text, text, text, text) to authenticated;
grant execute on function public.sas_submit_to_registrar(bigint, text, text, text) to authenticated;
grant execute on function public.sas_review_states() to authenticated;
grant execute on function public.teacher_my_revisions() to authenticated;
grant execute on function public.teacher_ack_revision_popup(text, text, text) to authenticated;
grant execute on function public.teacher_mark_resolved(text, text, text) to authenticated;
grant execute on function public.teacher_locked_terms() to authenticated;

-- ── Sanity checks (optional) ───────────────────────────────────────────────
--   select * from public.sas_reviews order by updated_at desc limit 20;
--   select status, count(*) from public.sas_reviews group by status;
