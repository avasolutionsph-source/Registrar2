-- ============================================================================
--  Subject Area Supervisor (SAS) — subject-scoped, VIEW-ONLY.
--  Paste-run this whole file in the Supabase SQL editor.
--
--  Mirrors the Academic Coordinator RPCs, but scoped by SUBJECT instead of by
--  level, and read-only (no assign/remove counterpart is ever exposed to SAS).
--
--  Scope rules:
--   • A SAS sees teachers who have a teaching load in ANY subject of their area,
--     across ALL levels (GS + JHS + SHS) — no level filter.
--   • The teachers come from what the Academic Coordinator assigned
--     (reg_class_subjects) — this is read/reference only.
--   • The SAS never sees THEMSELVES (the coordinator checks them). Fellow
--     supervisors and teaching coordinators still appear.
-- ============================================================================

-- ── Which subjects belong to which supervisor area ──────────────────────────
-- Seeded from the live subject catalog. This is a plain table on purpose: the
-- registrar can add/remove rows later without a code change.
create table if not exists public.sas_subject_areas (
  role text not null check (role in (
    'sas_clve','sas_english','sas_math','sas_science','sas_ap',
    'sas_filipino','sas_mapeh','sas_ict','sas_epp_tle'
  )),
  subject_code text not null references public.reg_subjects(code) on delete cascade,
  primary key (role, subject_code)
);
alter table public.sas_subject_areas enable row level security;

insert into public.sas_subject_areas (role, subject_code)
select v.role, v.code
from (values
  -- Christian Living and Values Education
  ('sas_clve','CLE'),('sas_clve','CLV'),('sas_clve','CES'),('sas_clve','ESP'),
  ('sas_clve','CGM'),('sas_clve','VEC'),('sas_clve','GMC'),('sas_clve','RCT'),('sas_clve','RBC'),
  -- Communication Arts / English
  ('sas_english','ENG'),('sas_english','REA'),('sas_english','LAN'),('sas_english','RAL'),
  ('sas_english','LAG'),('sas_english','OCC'),('sas_english','RWS'),('sas_english','LPW'),
  ('sas_english','EAP'),('sas_english','CWR'),('sas_english','CNF'),('sas_english','MIL'),
  -- Mathematics
  ('sas_math','MAT'),('sas_math','GEM'),('sas_math','SAP'),('sas_math','PCA'),('sas_math','BCA'),
  -- Science
  ('sas_science','SCI'),('sas_science','SAH'),('sas_science','ELS'),('sas_science','ESC'),
  ('sas_science','PHS'),('sas_science','GEC'),('sas_science','GCH'),('sas_science','CHE'),
  ('sas_science','GEB'),('sas_science','BIO'),('sas_science','GPH'),('sas_science','PHY'),
  ('sas_science','DRR'),('sas_science','DIS'),
  -- Araling Panlipunan / Social Sciences
  ('sas_ap','APN'),('sas_ap','HEK'),('sas_ap','SIB'),('sas_ap','MAK'),('sas_ap','MKF'),
  ('sas_ap','UCS'),('sas_ap','PPG'),('sas_ap','DSS'),('sas_ap','DAS'),('sas_ap','APE'),
  ('sas_ap','TNC'),('sas_ap','CSC'),('sas_ap','IPH'),('sas_ap','IWB'),
  -- Filipino
  ('sas_filipino','FIL'),('sas_filipino','MOT'),('sas_filipino','KPK'),
  ('sas_filipino','PPP'),('sas_filipino','PFP'),
  -- MAPEH
  ('sas_mapeh','MAP'),('sas_mapeh','MUS'),('sas_mapeh','ART'),('sas_mapeh','PED'),
  ('sas_mapeh','HEA'),('sas_mapeh','MUA'),('sas_mapeh','PDA'),('sas_mapeh','PEH'),
  ('sas_mapeh','HDE'),('sas_mapeh','PHE'),('sas_mapeh','PHH'),('sas_mapeh','PDH'),
  ('sas_mapeh','PHD'),('sas_mapeh','CPA'),
  -- Information and Communication Technology
  ('sas_ict','TLC'),('sas_ict','EPC'),('sas_ict','ECT'),('sas_ict','EMT'),
  -- EPP / TLE
  ('sas_epp_tle','EPP'),('sas_epp_tle','TLE'),('sas_epp_tle','ENT'),('sas_epp_tle','WIM')
) as v(role, code)
where exists (select 1 from public.reg_subjects s where s.code = v.code)
on conflict (role, subject_code) do nothing;

-- ── Caller helpers ──────────────────────────────────────────────────────────
-- The caller's Subject Area Supervisor roles (empty if none).
create or replace function public.sas_my_roles()
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce(array_agg(role), '{}')
  from user_roles
  where lower(user_email) = lower(auth.jwt() ->> 'email')
    and role like 'sas\_%';
$$;

-- Every subject code the caller supervises (union of all their SAS roles).
create or replace function public.sas_my_subject_codes()
returns table(subject_code text) language sql stable security definer set search_path to 'public'
as $$
  select distinct a.subject_code
  from sas_subject_areas a
  where a.role = any (public.sas_my_roles());
$$;

-- ── Teachers in the caller's subject area (ALL levels), excluding self ───────
create or replace function public.sas_teacher_loads()
returns table(
  teacher_id bigint, teacher_name text,
  class_id uuid, sy text, grade_level text, section_name text,
  subject_code text, subject_name text
)
language sql stable security definer set search_path to 'public'
as $$
  select cs.teacher_id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as teacher_name,
         c.id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code) as subject_name
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  join reg_teachers t on t.id = cs.teacher_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.teacher_id is not null
    and array_length(public.sas_my_roles(), 1) is not null
    and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
    -- exclude self: the supervisor is checked by the coordinator, not themselves
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  order by teacher_name, c.grade_level, c.section_name, subject_name;
$$;

-- ── Read-only roster for a class that carries one of the caller's subjects ───
create or replace function public.sas_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text, extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.class_id = p_class_id
      and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
  ) then
    raise exception 'Not authorized for this section';
  end if;
  return query
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension, st.gender, st.grades
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

-- ── For the coordinator's [ALL] / [SUPERVISORS] filter ──────────────────────
-- Teacher ids that hold ANY Subject Area Supervisor role (matched by email).
-- Level scoping stays with the coordinator's existing list; this only marks who
-- is a supervisor.
create or replace function public.acad_supervisor_teacher_ids()
returns table(teacher_id bigint)
language sql stable security definer set search_path to 'public'
as $$
  select distinct t.id
  from reg_teachers t
  join user_roles r on lower(r.user_email) = lower(t.email)
  where r.role like 'sas\_%';
$$;

grant execute on function public.sas_my_roles() to authenticated;
grant execute on function public.sas_my_subject_codes() to authenticated;
grant execute on function public.sas_teacher_loads() to authenticated;
grant execute on function public.sas_class_roster(uuid) to authenticated;
grant execute on function public.acad_supervisor_teacher_ids() to authenticated;

-- ── Sanity checks (optional) ────────────────────────────────────────────────
--   select role, count(*) from public.sas_subject_areas group by role order by role;
--   -- subjects with no supervisor area yet (add rows above if needed):
--   select s.code, s.full_name from public.reg_subjects s
--   where not exists (select 1 from public.sas_subject_areas a where a.subject_code = s.code)
--   order by s.code;
