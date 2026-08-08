-- ============================================================================
--  SAS SCOPE, ITINATAKDA NA SA SETUP (hindi na naka-hardcode)
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  ANO ANG BINABAGO:
--    Dati, ang sakop ng bawat Subject Area Supervisor ay:
--      • mga SUBJECT — nasa `sas_subject_areas`, pero walang UI (SQL lang)
--      • mga LEVEL   — NAKA-HARDCODE sa loob ng sas_teacher_loads
--                      (`not in ('preschool','shs')`, mula setup-sas-exclude-shs)
--
--    Ngayon, PAREHO ay itinatakda ng Registrar sa Setup ▸ Subject Area
--    Supervisors. Ang bagong `sas_area_depts` ang nagsasabi kung anong level ang
--    sakop ng bawat area.
--
--  WALANG MABABAGO SA KASALUKUYANG ASAL:
--    Ang seed ay Grade School + Junior High para sa lahat ng siyam na area —
--    eksaktong kapareho ng hardcoded na tuntunin na pinapalitan nito. Ang
--    Preschool at Senior High ay nananatiling nasa sariling Academic
--    Coordinator hangga't hindi tinatakda ng Registrar.
--
--  KAILANGAN MUNA: setup-subject-area-supervisor.sql at setup-sas-exclude-shs.sql
-- ============================================================================

-- ── Anong LEVEL ang sakop ng bawat area ─────────────────────────────────────
create table if not exists public.sas_area_depts (
  role text not null check (role in (
    'sas_clve','sas_english','sas_math','sas_science','sas_ap',
    'sas_filipino','sas_mapeh','sas_ict','sas_epp_tle'
  )),
  dept text not null check (dept in ('preschool','gs','jhs','shs')),
  primary key (role, dept)
);
alter table public.sas_area_depts enable row level security;

-- Seed = ang eksaktong hardcoded na tuntunin na pinapalitan nito. Ang
-- `on conflict do nothing` ang nagsisiguro na hindi nito binubura ang mga
-- pagbabagong ginawa ng Registrar kapag muling pinatakbo ang file.
insert into public.sas_area_depts (role, dept)
select r.role, d.dept
from (values ('sas_clve'),('sas_english'),('sas_math'),('sas_science'),('sas_ap'),
             ('sas_filipino'),('sas_mapeh'),('sas_ict'),('sas_epp_tle')) as r(role)
cross join (values ('gs'),('jhs')) as d(dept)
on conflict do nothing;

-- ── Ang Setup page ang tanging sumusulat dito ───────────────────────────────
-- Ang dalawang table ay may RLS na naka-on pero WALANG policy noon, kaya
-- hindi sila mabasa ng kahit sino sa PostgREST (ang SECURITY DEFINER na
-- sas_* functions ay dumaraan sa RLS, kaya gumagana pa rin sila). Kailangan
-- ng policy para makita at ma-edit ito ng Registrar sa Setup.
drop policy if exists "registrar only" on public.sas_area_depts;
create policy "registrar only" on public.sas_area_depts for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

drop policy if exists "registrar only" on public.sas_subject_areas;
create policy "registrar only" on public.sas_subject_areas for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());


-- ── Ang sakop ng TUMATAWAG: subject × level ─────────────────────────────────
-- Isang lugar lang ang nagsasabi kung ano ang nakikita ng SAS. Ang subject at
-- ang level ay PINAGSASAMA kada role: kung ang SAS—Science ay Grade School
-- lang, ang Science subjects sa JHS ay wala sa sakop niya.
create or replace function public.sas_my_scope()
returns table(subject_code text, dept text)
language sql stable security definer set search_path to 'public'
as $$
  select distinct a.subject_code, d.dept
  from sas_subject_areas a
  join sas_area_depts d on d.role = a.role
  where a.role = any (public.sas_my_roles());
$$;

grant execute on function public.sas_my_scope() to authenticated;


-- ── sas_teacher_loads — hinihimay na ang scope sa config ────────────────────
-- Kapareho ng bersyon sa setup-sas-exclude-shs.sql; ang subject filter at ang
-- hardcoded na level filter ay pinalitan ng IISANG tsek laban sa sas_my_scope.
--
-- Sinasadyang row-constructor IN (hindi correlated EXISTS): isang beses lang
-- ito sinusuri para sa buong query, sa halip na kada row ng reg_class_subjects.
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
    and (cs.subject_code, public.reg_dept_of(c.grade_level))
        in (select sc.subject_code, sc.dept from public.sas_my_scope() sc)
    -- exclude self: the supervisor is checked by the coordinator, not themselves
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
    and (cs.subject_code, public.reg_dept_of(c.grade_level))
        in (select sc.subject_code, sc.dept from public.sas_my_scope() sc)
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  order by 2, 5, 6, 8;
$$;

grant execute on function public.sas_teacher_loads() to authenticated;


-- ── sas_class_roster — parehong config ang pinto ────────────────────────────
-- Ang listahan lang ang inaayos sa itaas. Ito ang huhurang sa direktang link o
-- naka-bookmark na sheet na wala na sa sakop.
create or replace function public.sas_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text, extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not exists (
    select 1
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    where cs.class_id = p_class_id
      and (cs.subject_code, public.reg_dept_of(c.grade_level))
          in (select sc.subject_code, sc.dept from public.sas_my_scope() sc)
  ) then
    raise exception 'This section is outside your subject area or the levels you supervise';
  end if;

  return query
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension, st.gender, st.grades
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

grant execute on function public.sas_class_roster(uuid) to authenticated;


-- ═══ VERIFY 1 — ang bagong config (dapat 9 na area × gs,jhs = 18 rows) ══════
select role, string_agg(dept, ', ' order by
         case dept when 'preschool' then 1 when 'gs' then 2
                   when 'jhs' then 3 else 4 end) as levels
from public.sas_area_depts
group by role
order by role;


-- ═══ VERIFY 2 — naka-patch na ba? dapat TRUE lahat ═════════════════════════
select 'sas_my_scope exists' as check,
       (to_regprocedure('public.sas_my_scope()') is not null)::text as ok
union all
select 'sas_teacher_loads uses config',
       (pg_get_functiondef('public.sas_teacher_loads()'::regprocedure) like '%sas_my_scope%')::text
union all
select 'sas_class_roster uses config',
       (pg_get_functiondef('public.sas_class_roster(uuid)'::regprocedure) like '%sas_my_scope%')::text;
