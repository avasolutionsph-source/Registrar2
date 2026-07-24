-- ============================================================================
--  COMBINATION SUBJECTS — one subject, different content + teacher per term
--  (EPP-ICT: EPP sa Term 1-2, ICT sa Term 3; TLE-ICT; at katulad)
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Model: ISANG subject pa rin (isang row sa report card, isang grade per
--  term) — pero:
--   • reg_subjects.term_labels  = ano ang laman bawat term
--                                 {"q1":"EPP","q2":"EPP","q3":"ICT"}
--   • reg_class_subjects.term_teachers = sino ang guro bawat term
--                                 {"q1":160,"q2":160,"q3":161}
--  Kapag term_teachers ay null, eksaktong dating single-teacher behavior.
--  Ang teacher_id ay nananatili = guro ng PINAKAUNANG term (para sa mga lumang
--  consumer na isang pangalan lang ang kaya).
--
--  Bawat function dito ay pinalitan para: (1) makita ng BAWAT guro ang sheet
--  ng term niya, (2) tama ang coordinator/SAS/principal lists per term-owner,
--  (3) ang review/approval actions ay tumatama sa guro ng TERM na iyon,
--  (4) hindi mabago ng ibang guro ang term na hindi kanya, at hindi
--  malusutan ang lock ng naipasa nang term.
-- ============================================================================


-- ═══ PART 1 — columns + relaxed term check ══════════════════════════════════

alter table public.reg_subjects
  add column if not exists term_labels jsonb;
comment on column public.reg_subjects.term_labels is
  'Combination subject: per-term content labels, e.g. {"q1":"EPP","q2":"EPP","q3":"ICT"}. NULL = ordinary subject.';

alter table public.reg_class_subjects
  add column if not exists term_teachers jsonb;
comment on column public.reg_class_subjects.term_teachers is
  'Per-term teacher map for combination subjects, e.g. {"q1":160,"q3":161}. NULL = single teacher (teacher_id) all covered terms.';

-- The old check allowed only a SINGLE term key; term coverage stores comma
-- lists ('q1,q2'). Relax it to a validated comma-joined list.
alter table public.reg_class_subjects drop constraint if exists reg_class_subjects_term_valid;
alter table public.reg_class_subjects
  add constraint reg_class_subjects_term_valid
  check (term is null or term ~ '^q[1-4](,q[1-4])*$');


-- ═══ PART 2 — assignment RPCs ═══════════════════════════════════════════════

-- acad_assign_subject: unchanged behavior + it now CLEARS term_teachers —
-- a plain single-teacher assign (or unassign) overrides any per-term map.
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
    if not exists (select 1 from reg_class_subjects cs
                   where cs.class_id = p_class_id and cs.subject_code = p_subject_code)
       and not exists (select 1 from reg_grade_subjects gs
                       where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in this section''s subject offerings — ask the Registrar to add it first (Setup - Subjects or Classes - Subjects & Teachers)', p_subject_code;
    end if;
  elsif exists (select 1 from reg_grade_subjects gs where gs.grade_level = v_grade) then
    if not exists (select 1 from reg_grade_subjects gs
                   where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in the Grade % subject set — ask the Registrar to add it in Setup - Subjects first', p_subject_code, v_grade;
    end if;
  end if;

  insert into reg_class_subjects(class_id, subject_code, teacher_id, assigned_by, term, term_teachers)
  values (p_class_id, p_subject_code, p_teacher_id,
          case when p_teacher_id is null then null else v_by end,
          nullif(p_terms, ''), null)
  on conflict (class_id, subject_code) do update
    set teacher_id = excluded.teacher_id,
        assigned_by = case when excluded.teacher_id is null then null else v_by end,
        term = case when p_terms is null then reg_class_subjects.term else nullif(p_terms, '') end,
        term_teachers = null,
        updated_at = now();
end;
$function$;

grant execute on function public.acad_assign_subject(uuid, text, bigint, text) to authenticated;

-- acad_assign_combo: per-term teacher assignment for combination subjects.
-- p_term_teachers MERGES over the stored map: {"q1":160} sets Term 1 only;
-- {"q1":null} clears Term 1 only; keys not sent stay untouched. When the
-- merged map ends up empty the whole assignment is cleared.
create or replace function public.acad_assign_combo(
  p_class_id uuid, p_subject_code text, p_term_teachers jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_by text := auth.jwt() ->> 'email';
  v_grade text;
  v_map jsonb;
  v_terms text;
  v_first text;
  k text;
begin
  select c.grade_level into v_grade
  from reg_classes c
  where c.id = p_class_id and public.is_acad_for(c.grade_level);
  if v_grade is null then
    raise exception 'Not authorized for this section';
  end if;

  -- Same curriculum guard as acad_assign_subject.
  if public.reg_dept_of(v_grade) = 'shs' then
    if not exists (select 1 from reg_class_subjects cs
                   where cs.class_id = p_class_id and cs.subject_code = p_subject_code)
       and not exists (select 1 from reg_grade_subjects gs
                       where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in this section''s subject offerings — ask the Registrar to add it first', p_subject_code;
    end if;
  elsif exists (select 1 from reg_grade_subjects gs where gs.grade_level = v_grade) then
    if not exists (select 1 from reg_grade_subjects gs
                   where gs.grade_level = v_grade and gs.subject_code = p_subject_code) then
      raise exception '% is not in the Grade % subject set — ask the Registrar to add it in Setup - Subjects first', p_subject_code, v_grade;
    end if;
  end if;

  if p_term_teachers is null or jsonb_typeof(p_term_teachers) <> 'object' then
    raise exception 'term_teachers must be an object like {"q1": 160, "q3": null}';
  end if;
  for k in select jsonb_object_keys(p_term_teachers) loop
    if k not in ('q1','q2','q3','q4') then
      raise exception 'Invalid term key "%" (use q1..q4)', k;
    end if;
    if jsonb_typeof(p_term_teachers -> k) = 'null' then
      continue;
    end if;
    -- Only whole positive ids of EXISTING teachers may enter the map — the
    -- jsonb column has no FK, so this is where referential integrity lives.
    if jsonb_typeof(p_term_teachers -> k) <> 'number'
       or not ((p_term_teachers ->> k) ~ '^\d+$') then
      raise exception 'Term % must map to a whole teacher id or null', k;
    end if;
    if not exists (select 1 from reg_teachers t
                   where t.id = (p_term_teachers ->> k)::bigint) then
      raise exception 'Term %: teacher id % does not exist', k, p_term_teachers ->> k;
    end if;
  end loop;

  -- Merge over the stored map; null values CLEAR their term.
  select cs.term_teachers into v_map
  from reg_class_subjects cs
  where cs.class_id = p_class_id and cs.subject_code = p_subject_code;
  v_map := coalesce(v_map, '{}'::jsonb) || p_term_teachers;
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_map
  from jsonb_each(v_map) e
  where jsonb_typeof(e.value) = 'number';

  if v_map = '{}'::jsonb then
    -- Everything cleared. A NON-combination row keeps its `term` (that is the
    -- section's curriculum placement, same as the old unassign behavior);
    -- only a combination row's coverage is dropped with its map.
    insert into reg_class_subjects(class_id, subject_code, teacher_id, assigned_by, term, term_teachers)
    values (p_class_id, p_subject_code, null, null, null, null)
    on conflict (class_id, subject_code) do update
      set teacher_id = null, assigned_by = null,
          term = case when reg_class_subjects.term_teachers is null
                      then reg_class_subjects.term else null end,
          term_teachers = null, updated_at = now();
    return;
  end if;

  select string_agg(e.key, ',' order by e.key), min(e.key)
    into v_terms, v_first
  from jsonb_each(v_map) e;

  insert into reg_class_subjects(class_id, subject_code, teacher_id, assigned_by, term, term_teachers)
  values (p_class_id, p_subject_code, (v_map ->> v_first)::bigint, v_by, v_terms, v_map)
  on conflict (class_id, subject_code) do update
    set teacher_id = (v_map ->> v_first)::bigint,
        assigned_by = v_by,
        term = v_terms,
        term_teachers = v_map,
        updated_at = now();
end;
$function$;

grant execute on function public.acad_assign_combo(uuid, text, jsonb) to authenticated;


-- ═══ PART 3 — pickers + load lists know per-term teachers ═══════════════════

-- acad_section_subjects gains term_labels (is it a combination subject?) and
-- term_teachers (who holds each term). Return type changes → drop first.
drop function if exists public.acad_section_subjects(uuid);

create function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer,
              teacher_id bigint, term text, term_labels jsonb, term_teachers jsonb)
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

  -- Only an SHS section carries its OWN per-term curriculum (see
  -- setup-curriculum-guard.sql).
  select public.reg_dept_of(v_grade) = 'shs'
         and exists (select 1 from reg_class_subjects cs
                     where cs.class_id = p_class_id and cs.term is not null)
    into has_own_curriculum;

  if has_own_curriculum then
    return query
      select cs.subject_code, coalesce(s.full_name, cs.subject_code),
             coalesce(s.sort_order, 0), cs.teacher_id, cs.term, s.term_labels, cs.term_teachers
      from reg_class_subjects cs
      left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id
      order by cs.term nulls first, coalesce(s.sort_order, 0), cs.subject_code;
  else
    return query
      select gs.subject_code, coalesce(s.full_name, gs.subject_code),
             gs.sort_order, cs.teacher_id, cs.term, s.term_labels, cs.term_teachers
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

-- teacher_my_load: a teacher now also sees sheets where they hold ANY term of
-- a combination subject; `term` reports only THEIR covered terms.
-- (Return type gains `term` → drop first; the portal maps extra columns safely.)
drop function if exists public.teacher_my_load();

create function public.teacher_my_load()
returns table(class_id uuid, sy text, grade_level text, section_name text,
              subject_code text, subject_name text, term text, is_combo boolean)
language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code), cs.term, false
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is null and cs.teacher_id = public.current_teacher_id()
  union all
  select c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         (select string_agg(e.key, ',' order by e.key)
          from jsonb_each_text(cs.term_teachers) e
          where (case when e.value ~ '^\d+$' then e.value::bigint end) = public.current_teacher_id()),
         true
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is not null
    and exists (select 1 from jsonb_each_text(cs.term_teachers) e
                where (case when e.value ~ '^\d+$' then e.value::bigint end) = public.current_teacher_id())
  order by 3, 4, 6;
$$;

grant execute on function public.teacher_my_load() to authenticated;

-- acad_teacher_loads: combination rows expand into one row PER term-teacher,
-- with `term` = the terms THAT teacher covers.
drop function if exists public.acad_teacher_loads();

create function public.acad_teacher_loads()
returns table(
  teacher_id bigint, teacher_name text,
  class_id uuid, sy text, grade_level text, section_name text,
  subject_code text, subject_name text, term text
)
language sql stable security definer set search_path to 'public'
as $$
  select cs.teacher_id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as teacher_name,
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code) as subject_name,
         cs.term
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  join reg_teachers t on t.id = cs.teacher_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is null
    and cs.teacher_id is not null
    and public.is_acad_for(c.grade_level)
  union all
  select tt.tid,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), ''),
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         tt.terms
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  cross join lateral (
    select (e.value)::bigint as tid, string_agg(e.key, ',' order by e.key) as terms
    from jsonb_each_text(cs.term_teachers) e
    where e.value ~ '^\d+$'
    group by (e.value)::bigint
  ) tt
  join reg_teachers t on t.id = tt.tid
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is not null
    and public.is_acad_for(c.grade_level)
  order by 2, 5, 6, 8;
$$;

grant execute on function public.acad_teacher_loads() to authenticated;

-- sas_teacher_loads: same per-term expansion, keeping the subject-area scope
-- and the exclude-self rule. Gains a `term` column (the owner's covered
-- terms) so the grade sheet can put the review actions on the right teacher
-- per term. Return type changes → drop first.
drop function if exists public.sas_teacher_loads();

create function public.sas_teacher_loads()
returns table(
  teacher_id bigint, teacher_name text,
  class_id uuid, sy text, grade_level text, section_name text,
  subject_code text, subject_name text, term text
)
language sql stable security definer set search_path to 'public'
as $$
  select cs.teacher_id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as teacher_name,
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code) as subject_name,
         cs.term
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  join reg_teachers t on t.id = cs.teacher_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is null
    and cs.teacher_id is not null
    and array_length(public.sas_my_roles(), 1) is not null
    and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  union all
  select tt.tid,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), ''),
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         tt.terms
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  cross join lateral (
    select (e.value)::bigint as tid, string_agg(e.key, ',' order by e.key) as terms
    from jsonb_each_text(cs.term_teachers) e
    where e.value ~ '^\d+$'
    group by (e.value)::bigint
  ) tt
  join reg_teachers t on t.id = tt.tid
  left join reg_subjects s on s.code = cs.subject_code
  where cs.term_teachers is not null
    and array_length(public.sas_my_roles(), 1) is not null
    and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  order by 2, 5, 6, 8;
$$;

grant execute on function public.sas_teacher_loads() to authenticated;


-- ═══ PART 4 — approval worklists follow the TERM's owner ════════════════════

-- Shared shape: one (owner, terms) pair per assignment row. Single-teacher
-- rows keep their coverage; combination rows expand per term-teacher. The
-- review join is period-aware so a review row only attaches to the owner's
-- own terms.

-- acad_sheet_status gains `term` (the owner's covered terms) so the approval
-- page can judge done-ness per owner instead of expecting every term from
-- everyone. Return type changes → drop first.
drop function if exists public.acad_sheet_status(text, text);

create function public.acad_sheet_status(p_dept text, p_sy text)
returns table(teacher_id bigint, teacher_name text, subject_code text, class_id uuid,
              grade_level text, section_name text, period text, status text, note text, mine boolean, flag text,
              term text)
language sql stable security definer set search_path to 'public' as $$
  select o.tid, t.family_name || ', ' || t.first_name, cs.subject_code, c.id, c.grade_level, c.section_name,
         r.period, coalesce(r.status,'in_progress'), r.note,
         public.reg_can_approve(o.tid, cs.subject_code, c.id),
         (select a.flag from public.reg_resolve_approver(o.tid, cs.subject_code, c.id) a),
         o.terms
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  cross join lateral (
    select cs.teacher_id as tid, cs.term as terms
    where cs.term_teachers is null and cs.teacher_id is not null
    union all
    select (e.value)::bigint, string_agg(e.key, ',' order by e.key)
    from jsonb_each_text(cs.term_teachers) e
    where cs.term_teachers is not null and e.value ~ '^\d+$'
    group by (e.value)::bigint
  ) o
  join reg_teachers t on t.id = o.tid
  left join sas_grade_reviews r
         on r.teacher_id = o.tid and r.subject_code = cs.subject_code and r.sy = c.sy
        and (o.terms is null or r.period = any(string_to_array(o.terms, ',')))
  where c.sy = p_sy and public.reg_dept_of(c.grade_level) = p_dept
    and p_dept in (select dept from public.acad_my_depts())
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code; $$;

grant execute on function public.acad_sheet_status(text, text) to authenticated;

-- principal_sheet_status gains `term` (the owner's covered terms) so the
-- approver's grade sheet maps each period to its own teacher. Return type
-- changes → drop first.
drop function if exists public.principal_sheet_status(text);

create function public.principal_sheet_status(p_sy text default null)
returns table(teacher_id bigint, teacher_name text,
              subject_code text, subject_name text,
              class_id uuid, sy text, grade_level text, section_name text,
              period text, status text, note text, term text)
language sql stable security definer set search_path to 'public'
as $$
  select o.tid,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), ''),
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         c.id, c.sy, c.grade_level, c.section_name,
         r.period, coalesce(r.status, 'in_progress'), r.note, o.terms
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  cross join lateral (
    select cs.teacher_id as tid, cs.term as terms
    where cs.term_teachers is null and cs.teacher_id is not null
    union all
    select (e.value)::bigint, string_agg(e.key, ',' order by e.key)
    from jsonb_each_text(cs.term_teachers) e
    where cs.term_teachers is not null and e.value ~ '^\d+$'
    group by (e.value)::bigint
  ) o
  join reg_teachers t on t.id = o.tid
  left join reg_subjects s on s.code = cs.subject_code
  left join sas_grade_reviews r
         on r.teacher_id = o.tid and r.subject_code = cs.subject_code and r.sy = c.sy
        and (o.terms is null or r.period = any(string_to_array(o.terms, ',')))
  where (p_sy is null or c.sy = p_sy)
    and public.reg_can_approve(o.tid, cs.subject_code, c.id)
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code;
$$;

grant execute on function public.principal_sheet_status(text) to authenticated;

-- approver_review_states: ownership check now also matches combination terms.
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
      where cs.subject_code = p_subject_code
        and (cs.teacher_id = p_teacher_id
             or (cs.term_teachers is not null and exists (
                   select 1 from jsonb_each_text(cs.term_teachers) e
                   where (case when e.value ~ '^\d+$' then e.value::bigint end) = p_teacher_id)))
        and public.reg_can_approve(p_teacher_id, p_subject_code, cs.class_id)
    );
$$;

grant execute on function public.approver_review_states(bigint, text, text) to authenticated;


-- ═══ PART 5 — review ACTIONS hit the right teacher's term ═══════════════════

-- sas_can_review keeps its signature; ownership now includes combination terms.
create or replace function public.sas_can_review(p_teacher_id bigint, p_subject_code text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and (cs.teacher_id = p_teacher_id
           or (cs.term_teachers is not null and exists (
                 select 1 from jsonb_each_text(cs.term_teachers) e
                 where (case when e.value ~ '^\d+$' then e.value::bigint end) = p_teacher_id)))
      and public.reg_can_approve(p_teacher_id, p_subject_code, cs.class_id)); $$;

grant execute on function public.sas_can_review(bigint, text) to authenticated;

-- Both actions additionally require the TARGET teacher to actually handle the
-- ACTED-ON period — an approver can no longer return/lock a term under the
-- wrong teacher's key.
create or replace function public.sas_return_for_revision(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text, p_note text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.sas_can_review(p_teacher_id, p_subject_code) then
    raise exception 'Not authorized to review this subject';
  end if;
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and ( (cs.term_teachers is null and cs.teacher_id = p_teacher_id
             and (cs.term is null or p_period = any(string_to_array(cs.term, ','))))
         or (case when (cs.term_teachers ->> p_period) ~ '^\d+$'
                  then (cs.term_teachers ->> p_period)::bigint end) = p_teacher_id )
  ) then
    raise exception 'Term % of % is not handled by this teacher', p_period, p_subject_code;
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
        popup_seen = false,
        reviewer_email = excluded.reviewer_email,
        updated_at = now();
end;
$$;

grant execute on function public.sas_return_for_revision(bigint, text, text, text, text) to authenticated;

create or replace function public.sas_submit_to_registrar(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.sas_can_review(p_teacher_id, p_subject_code) then
    raise exception 'Not authorized to review this subject';
  end if;
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and ( (cs.term_teachers is null and cs.teacher_id = p_teacher_id
             and (cs.term is null or p_period = any(string_to_array(cs.term, ','))))
         or (case when (cs.term_teachers ->> p_period) ~ '^\d+$'
                  then (cs.term_teachers ->> p_period)::bigint end) = p_teacher_id )
  ) then
    raise exception 'Term % of % is not handled by this teacher', p_period, p_subject_code;
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

grant execute on function public.sas_submit_to_registrar(bigint, text, text, text) to authenticated;


-- ═══ PART 6 — teacher writes: own-term only, locks bind every co-teacher ════

create or replace function public.teacher_save_grades(
  p_lrn text, p_sy text, p_subject_code text, p_entry jsonb
) returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me bigint := public.current_teacher_id();
  v_class uuid;
  v_grades jsonb;
  v_arr jsonb;
  v_existing jsonb;
  v_entry jsonb;
  v_teacher bigint;   -- the row's single/primary teacher
  v_term text;        -- the row's term coverage
  v_tt jsonb;         -- the row's per-term teacher map (null = single teacher)
  v_pk text;
  v_found boolean;
  v_final numeric;
  v_n integer := 0;
  v_sum numeric := 0;
begin
  if v_me is null then
    raise exception 'Not a teacher';
  end if;
  -- Null arguments must never slip past the guards below (NULL comparisons
  -- would silently skip them AND the subject filter at the bottom would wipe
  -- the learner's whole year).
  if p_lrn is null or p_sy is null or p_subject_code is null or p_entry is null then
    raise exception 'Missing arguments';
  end if;
  if coalesce(p_entry->>'subjectCode', '') <> p_subject_code then
    raise exception 'Subject code mismatch';
  end if;
  select current_class_id, grades into v_class, v_grades
  from reg_students_data where lrn = p_lrn;
  if v_class is null then
    raise exception 'Learner not found or not enrolled in a class';
  end if;

  select true, cs.teacher_id, cs.term, cs.term_teachers
    into v_found, v_teacher, v_term, v_tt
  from reg_class_subjects cs
  where cs.class_id = v_class and cs.subject_code = p_subject_code;

  -- The subject must exist in the class AND have someone assigned — an
  -- unassigned subject is not gradable by anyone.
  if v_found is not true or (v_tt is null and v_teacher is null) then
    raise exception 'Subject % is not assigned in this class', p_subject_code;
  end if;

  -- Authorization: the caller owns the row, or holds ANY term of a
  -- combination subject. coalesce() so a NULL never reads as "allowed".
  if not coalesce(
       (v_tt is null and v_teacher = v_me)
    or (v_tt is not null and exists (
          select 1 from jsonb_each_text(v_tt) e
          where (case when e.value ~ '^\d+$' then e.value::bigint end) = v_me)),
    false) then
    raise exception 'Not authorized to grade this subject for this learner';
  end if;

  select e into v_existing
  from jsonb_array_elements(coalesce(coalesce(v_grades, '{}'::jsonb) -> p_sy, '[]'::jsonb)) e
  where e->>'subjectCode' = p_subject_code
  limit 1;

  -- ── Combination guard: a term handled by ANOTHER teacher must arrive
  --    unchanged (grades, raw, items, attitude, AND the KS1 letter) — each
  --    teacher can only move their own term's data. ──
  if v_tt is not null then
    foreach v_pk in array array['q1','q2','q3','q4'] loop
      if (case when (v_tt ->> v_pk) ~ '^\d+$' then (v_tt ->> v_pk)::bigint end)
         is distinct from v_me then
        if (p_entry -> v_pk)                is distinct from (v_existing -> v_pk)
        or (p_entry -> 'raw'      -> v_pk)  is distinct from (v_existing -> 'raw'      -> v_pk)
        or (p_entry -> 'items'    -> v_pk)  is distinct from (v_existing -> 'items'    -> v_pk)
        or (p_entry -> 'attitude' -> v_pk)  is distinct from (v_existing -> 'attitude' -> v_pk)
        or (p_entry -> 'letters'  -> v_pk)  is distinct from (v_existing -> 'letters'  -> v_pk)
        then
          raise exception
            'Term % of % is handled by another teacher and cannot be edited here.', v_pk, p_subject_code;
        end if;
      end if;
    end loop;
  end if;

  -- ── SAS lock: a term submitted to the Registrar (under ITS OWN teacher's
  --    key) must arrive unchanged — binding on EVERY co-teacher, not just the
  --    teacher who was locked. ──
  for v_pk in
    select r.period from sas_grade_reviews r
    where r.subject_code = p_subject_code
      and r.sy = p_sy
      and r.status = 'submitted'
      and ( (v_tt is null and r.teacher_id = v_teacher
             and (v_term is null or r.period = any(string_to_array(v_term, ','))))
         or (v_tt is not null
             and (case when (v_tt ->> r.period) ~ '^\d+$' then (v_tt ->> r.period)::bigint end)
                 = r.teacher_id) )
  loop
    if (p_entry -> v_pk)                is distinct from (v_existing -> v_pk)
    or (p_entry -> 'raw'      -> v_pk)  is distinct from (v_existing -> 'raw'      -> v_pk)
    or (p_entry -> 'items'    -> v_pk)  is distinct from (v_existing -> 'items'    -> v_pk)
    or (p_entry -> 'attitude' -> v_pk)  is distinct from (v_existing -> 'attitude' -> v_pk)
    or (p_entry -> 'letters'  -> v_pk)  is distinct from (v_existing -> 'letters'  -> v_pk)
    then
      raise exception
        'Term % of % was submitted to the Registrar and can no longer be edited.', v_pk, p_subject_code;
    end if;
  end loop;

  -- ── final is DERIVED, never trusted from the client: the rounded mean of
  --    the per-term grades that passed the guards above. A tampered final can
  --    therefore never overwrite a co-teacher's (or a locked term's) result on
  --    the printed report card. Letters-only entries (KS1) keep their stored
  --    final untouched. ──
  v_entry := p_entry;
  foreach v_pk in array array['q1','q2','q3','q4'] loop
    if jsonb_typeof(v_entry -> v_pk) = 'number' then
      v_n := v_n + 1;
      v_sum := v_sum + (v_entry ->> v_pk)::numeric;
    end if;
  end loop;
  if v_n > 0 then
    v_final := round(v_sum / v_n);
    v_entry := jsonb_set(v_entry, array['final'], to_jsonb(v_final), true);
  elsif v_existing ? 'final' then
    v_entry := jsonb_set(v_entry, array['final'], v_existing -> 'final', true);
  else
    v_entry := v_entry - 'final';
  end if;

  v_grades := coalesce(v_grades, '{}'::jsonb);
  v_arr := coalesce(v_grades -> p_sy, '[]'::jsonb);
  -- IS DISTINCT FROM: an entry with no subjectCode key (legacy/malformed) must
  -- be KEPT, not silently dropped by a NULL comparison.
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_arr
  from jsonb_array_elements(v_arr) e
  where e->>'subjectCode' is distinct from p_subject_code;
  v_arr := v_arr || jsonb_build_array(v_entry);
  v_grades := jsonb_set(v_grades, array[p_sy], v_arr, true);
  update reg_students_data set grades = v_grades where lrn = p_lrn;
end;
$function$;

-- teacher_locked_terms: locks now also SHOW to co-teachers of a combination
-- subject (the lock itself is enforced server-side above either way).
create or replace function public.teacher_locked_terms()
returns table(subject_code text, sy text, period text, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.subject_code, r.sy, r.period, r.submitted_at
  from sas_grade_reviews r
  where r.status = 'submitted'
    and ( r.teacher_id = public.current_teacher_id()
       or exists (
            select 1 from reg_class_subjects cs
            where cs.subject_code = r.subject_code
              and cs.term_teachers is not null
              and (case when (cs.term_teachers ->> r.period) ~ '^\d+$'
                        then (cs.term_teachers ->> r.period)::bigint end) = r.teacher_id
              and exists (select 1 from jsonb_each_text(cs.term_teachers) e
                          where (case when e.value ~ '^\d+$' then e.value::bigint end)
                                = public.current_teacher_id()) ) );
$$;

grant execute on function public.teacher_locked_terms() to authenticated;


-- ═══ VERIFY (optional) ══════════════════════════════════════════════════════
-- select column_name from information_schema.columns
--  where table_name in ('reg_subjects','reg_class_subjects')
--    and column_name in ('term_labels','term_teachers');
-- → dapat 2 rows.
