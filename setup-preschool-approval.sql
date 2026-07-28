-- ============================================================================
--  Preschool approval — LAHAT ng preschool gradesheets (anuman ang subject) ay
--  ang PRESCHOOL Academic Coordinator ang nagchecheck, hindi kailanman ang SAS.
--  Paste-run ang BUONG file sa Supabase SQL editor. Safe to re-run.
--
--  PART A — routing rule: teacher/preschool -> FIXED acad_pre. Ang lumang
--  seeded rule ay acad_gs (petsa pa bago naitayo ang sariling Preschool
--  office); kung na-edit man ito o nawala, ang update+insert sa ibaba ay
--  magko-converge sa tamang rule anuman ang kasalukuyang laman.
--
--  PART B — sas_teacher_loads: alisin ang preschool sections. Dati, kapag ang
--  subject code ng preschool ay nasa area ng isang SAS (hal. CLE sa sas_clve),
--  lumalabas ang preschool teacher sa SAS pages. Ang approval mismo ay gated
--  na ng routing (Part A), pero ang listahan ay nililinis din dito.
--
--  PART C — sas_class_roster: hindi lang sa listahan — pati ang DIREKTANG
--  pagbukas ng preschool gradesheet ng isang SAS (via URL) ay tinatanggihan na.
--  Ang coordinators ay hindi apektado: approver_class_roster ang gamit nila.
--
--  ORDERING NOTE: ang sas_teacher_loads dito ay pinapalitan ang bersyon ng
--  setup-combination-subjects.sql, at ang sas_class_roster ay ang bersyon ng
--  setup-subject-area-supervisor.sql — kapag ni-re-run ang alinman sa dalawa,
--  i-re-run ITO pagkatapos para bumalik ang preschool exclusions.
-- ============================================================================

-- ── PART A: teacher/preschool -> Preschool Academic Coordinator ─────────────
update reg_approval_routing
   set approver_kind   = 'fixed',
       approver_role   = 'acad_pre',
       approver_derive = null
 where source_role = 'teacher'
   and source_scope = 'preschool';

insert into reg_approval_routing (source_role, source_scope, approver_kind, approver_role, approver_derive)
select 'teacher', 'preschool', 'fixed', 'acad_pre', null
 where not exists (
   select 1 from reg_approval_routing
   where source_role = 'teacher' and source_scope = 'preschool'
 );

-- ── PART B: sas_teacher_loads — walang preschool sections ───────────────────
-- Kapareho ng bersyon sa setup-combination-subjects.sql (per-term expansion,
-- subject-area scope, exclude-self) + preschool exclusion sa DALAWANG branch.
-- Drop muna: kapag luma pa ang naka-install (walang `term` column), tatanggi
-- ang plain na create-or-replace dahil sa iba ang return type.
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
    and public.reg_dept_of(c.grade_level) <> 'preschool'
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
    and public.reg_dept_of(c.grade_level) <> 'preschool'
    and array_length(public.sas_my_roles(), 1) is not null
    and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  order by 2, 5, 6, 8;
$$;

grant execute on function public.sas_teacher_loads() to authenticated;

-- ── PART C: sas_class_roster — tinatanggihan ang preschool sections ─────────
-- Kapareho ng bersyon sa setup-subject-area-supervisor.sql + preschool guard.
create or replace function public.sas_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text, extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  -- Ang preschool ay sa Preschool Academic Coordinator lang — kahit hawak ng
  -- SAS ang subject code, hindi nila binubuksan ang preschool sheets.
  if exists (
    select 1 from reg_classes c
    where c.id = p_class_id and public.reg_dept_of(c.grade_level) = 'preschool'
  ) then
    raise exception 'Preschool grade sheets are checked by the Preschool Academic Coordinator';
  end if;
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

grant execute on function public.sas_class_roster(uuid) to authenticated;


-- ═══ VERIFY — tatlong row, dapat 'fixed:acad_pre' at dalawang 'true' ════════
select 'preschool routing rule' as item,
       coalesce((select approver_kind || ':' || coalesce(approver_role, '?')
                 from reg_approval_routing
                 where source_role = 'teacher' and source_scope = 'preschool'), 'WALA') as value
union all
select 'sas list excludes preschool',
       (pg_get_functiondef('public.sas_teacher_loads()'::regprocedure) like '%preschool%')::text
union all
select 'sas roster blocks preschool',
       (pg_get_functiondef('public.sas_class_roster(uuid)'::regprocedure) like '%preschool%')::text;
