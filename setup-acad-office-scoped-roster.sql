-- ============================================================================
--  Office-scoped teacher roster RPCs — fix para sa multi-role/admin accounts.
--  Paste-run ang BUONG file sa Supabase SQL editor. Safe to re-run.
--
--  PROBLEMA (2026-07-28, kaso ni Ms. Berdin): ang "+ Add Teacher" picker
--  (acad_available_teachers) ay nag-e-exclude ng teacher na may load sa KAHIT
--  ALING level na sakop ng caller. Sa admin o multi-role coordinator (hal.
--  sabay na acad_gs at acad_jhs), ang GS teacher na may GS load ay HINDI
--  lumalabas sa JHS picker — kahit wala pa siyang kahit ano sa JHS.
--
--  AYOS: ang buong roster family (available/add/added/remove) ay tumatanggap
--  na ng p_role — ang role NG OFFICE na pinaggagamitan (hal. 'acad_jhs').
--  Ang exclusion at ang insert/delete ay saklaw na LANG ng office na iyon.
--  p_role null = lumang gawi (union ng roles ng caller) para compatible ang
--  lumang portal build; ang bagong portal ay laging nagpapasa ng p_role.
--
--  Guards: ang p_role ay dapat isa sa acad roles NG CALLER, o admin ang
--  caller (sa apat na kilalang office roles lang). Hindi mapapasukan ng GS
--  coordinator ang JHS roster sa pamamagitan ng pagpasa ng ibang role.
-- ============================================================================

-- ── Ang saklaw na roles ng isang office request ─────────────────────────────
create or replace function public.acad_scope_roles(p_role text default null)
returns text[]
language sql stable security definer set search_path to 'public'
as $$
  select case
    -- May hinihinging office: tanggapin lang kung role ito ng caller, o
    -- admin ang caller (at kilalang office role ang hinihingi).
    when p_role is not null then
      case
        when p_role = any (public.acad_my_roles())
          or (p_role in ('acad_pre','acad_gs','acad_jhs','acad_shs')
              and exists (select 1 from user_roles r
                          where lower(r.user_email) = lower(auth.jwt() ->> 'email')
                            and r.role = 'admin'))
          then array[p_role]
        else '{}'::text[]
      end
    -- Walang hiniling: lumang gawi — lahat ng acad roles ng caller.
    else public.acad_my_roles()
  end;
$$;
grant execute on function public.acad_scope_roles(text) to authenticated;

-- ── Picker: sino ang pwedeng idagdag sa OFFICE na ito ───────────────────────
drop function if exists public.acad_available_teachers();
create or replace function public.acad_available_teachers(p_role text default null)
returns table(id bigint, name text, email text)
language sql stable security definer set search_path to 'public'
as $$
  select t.id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as name,
         t.email
  from reg_teachers t
  where coalesce(t.year_ended, 0) = 0
    and array_length(public.acad_scope_roles(p_role), 1) is not null
    -- Itago lang kung may load na siya SA OFFICE NA ITO MISMO — ang load sa
    -- IBANG level (hal. GS load ni Ms. Berdin) ay hindi na hadlang sa JHS.
    and not exists (
      select 1 from reg_class_subjects cs
      join reg_classes c on c.id = cs.class_id
      where cs.teacher_id = t.id
        and public.reg_ac_role_for(c.grade_level) = any (public.acad_scope_roles(p_role))
    )
    and not exists (
      select 1 from acad_level_teachers lt
      where lt.teacher_id = t.id
        and lt.role = any (public.acad_scope_roles(p_role))
    )
  order by name;
$$;
grant execute on function public.acad_available_teachers(text) to authenticated;

-- ── Add: sa roster LANG ng office na hiniling ───────────────────────────────
drop function if exists public.acad_add_teacher(bigint);
create or replace function public.acad_add_teacher(p_teacher_id bigint, p_role text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_roles text[];
begin
  v_roles := public.acad_scope_roles(p_role);
  if array_length(v_roles, 1) is null then
    raise exception 'Not an academic coordinator for this office';
  end if;
  if not exists (select 1 from reg_teachers t
                 where t.id = p_teacher_id and coalesce(t.year_ended, 0) = 0) then
    raise exception 'Teacher not found or no longer active';
  end if;
  insert into acad_level_teachers (teacher_id, role)
  select p_teacher_id, r from unnest(v_roles) as r
  on conflict do nothing;
end;
$function$;
grant execute on function public.acad_add_teacher(bigint, text) to authenticated;

-- ── List: ang roster ng office na hiniling ──────────────────────────────────
drop function if exists public.acad_added_teachers();
create or replace function public.acad_added_teachers(p_role text default null)
returns table(teacher_id bigint, teacher_name text)
language sql stable security definer set search_path to 'public'
as $$
  select distinct lt.teacher_id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as teacher_name
  from acad_level_teachers lt
  join reg_teachers t on t.id = lt.teacher_id
  where lt.role = any (public.acad_scope_roles(p_role))
  order by teacher_name;
$$;
grant execute on function public.acad_added_teachers(text) to authenticated;

-- ── Remove: sa roster LANG ng office na hiniling ────────────────────────────
drop function if exists public.acad_remove_teacher(bigint);
create or replace function public.acad_remove_teacher(p_teacher_id bigint, p_role text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_roles text[];
begin
  v_roles := public.acad_scope_roles(p_role);
  if array_length(v_roles, 1) is null then
    raise exception 'Not an academic coordinator for this office';
  end if;

  -- Tumatanggi habang may subject assignments pa SA OFFICE NA ITO (kasama ang
  -- per-term rotating loads sa term_teachers) — hindi maulila ang totoong
  -- loads sa isang mis-click.
  if exists (
    select 1
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    where public.reg_ac_role_for(c.grade_level) = any (v_roles)
      and (cs.teacher_id = p_teacher_id
           or (cs.term_teachers is not null and exists (
                 select 1 from jsonb_each_text(cs.term_teachers) e
                 where (case when e.value ~ '^\d+$' then e.value::bigint end) = p_teacher_id)))
  ) then
    raise exception 'This teacher still has subject assignments in your level. Remove those first.';
  end if;

  delete from acad_level_teachers a
   where a.teacher_id = p_teacher_id
     and a.role = any (v_roles);
end;
$function$;
grant execute on function public.acad_remove_teacher(bigint, text) to authenticated;


-- ═══ VERIFY — dapat '5' ang value ═══════════════════════════════════════════
select 'office-scoped roster fns' as item,
       (select count(*)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and ((p.proname = 'acad_scope_roles'        and p.pronargs = 1)
            or (p.proname = 'acad_available_teachers' and p.pronargs = 1)
            or (p.proname = 'acad_add_teacher'        and p.pronargs = 2)
            or (p.proname = 'acad_added_teachers'     and p.pronargs = 1)
            or (p.proname = 'acad_remove_teacher'     and p.pronargs = 2)))::text as value;
