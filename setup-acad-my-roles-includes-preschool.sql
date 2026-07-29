-- ============================================================================
--  acad_my_roles — isama ang PRESCHOOL. Paste-run sa Supabase SQL editor.
--  Safe to re-run.
--
--  PROBLEMA (natukoy 2026-07-28 sa pamamagitan ng JWT simulation): ang
--  acad_my_roles() ay nagbabalik lang ng acad_gs / acad_jhs / acad_shs. Wala
--  ang acad_pre, kahit ito ay nasa user_roles ng account. Ang listahan sa
--  loob ng function ay ginawa noong wala pang sariling Preschool office at
--  hindi na na-update nang idagdag ito.
--
--  EPEKTO: bawat RPC na dumadaan sa acad_my_roles ay tahimik na blangko para
--  sa Preschool — kabilang ang buong roster family (+ Add Teacher picker,
--  Add, roster list, Remove). Kaya kailanman ay walang naidagdag na teacher
--  sa Preschool office. Ang mga hindi dumadaan dito (hal. acad_teacher_loads,
--  na gumagamit ng is_acad_for) ay gumagana kaya hindi agad napansin.
--
--  AYOS: kasama na ang apat na office roles. Sarado pa rin ang listahan sa
--  apat na kilalang coordinator roles — hindi lahat ng nagsisimula sa 'acad'.
-- ============================================================================

create or replace function public.acad_my_roles()
returns text[]
language sql stable security definer set search_path to 'public'
as $$
  select coalesce(array_agg(r.role order by r.role), '{}'::text[])
  from user_roles r
  where lower(r.user_email) = lower(auth.jwt() ->> 'email')
    and r.role in ('acad_pre', 'acad_gs', 'acad_jhs', 'acad_shs');
$$;

grant execute on function public.acad_my_roles() to authenticated;

notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' ══════════════════════════════════════════════════
select 'acad_my_roles covers all four offices' as item,
       (pg_get_functiondef('public.acad_my_roles()'::regprocedure) like '%acad_pre%'
        and pg_get_functiondef('public.acad_my_roles()'::regprocedure) like '%acad_gs%'
        and pg_get_functiondef('public.acad_my_roles()'::regprocedure) like '%acad_jhs%'
        and pg_get_functiondef('public.acad_my_roles()'::regprocedure) like '%acad_shs%')::text as value;
