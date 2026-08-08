-- ============================================================================
--  SAS SCOPE HARDENING — tatlong butas na natuklasan ng audit (2026-08-08)
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  WALANG MABABAGO SA KASALUKUYANG SETUP. Ang tatlong ayos na ito ay
--  NAGPAPASIKIP lang; sa kasalukuyang config (gs + jhs sa lahat ng area) ay
--  eksaktong pareho ang makikita ng bawat SAS bago at pagkatapos.
--
--  ANG INAAYOS:
--    A) sas_class_roster ay nagpapadala ng BUONG grades jsonb ng bawat learner
--       — lahat ng subject, lahat ng school year — kahit isang subject lang ang
--       hawak ng SAS. Sa browser lang ito sinasala, kaya nasa network response
--       na ang lahat. Nandiyan na ito mula pa sa kauna-unahang bersyon.
--    B) sas_review_states ay naka-filter sa SUBJECT lang (sas_my_subject_codes),
--       hindi sa level. Naiwan ito noong inilipat ng setup-sas-scope-config ang
--       ibang read path sa sas_my_scope. Nawala rin doon ang self-exclusion.
--    C) reg_resolve_approver ay pumipili ng SAS mula sa sas_subject_areas nang
--       WALANG level check, samantalang ang visibility ay may level na. Kapag
--       inalis mo ang isang level sa Setup, may sheet na maituturo sa
--       supervisor na hindi naman ito mabubuksan — walang makaka-approve.
--
--  KAILANGAN MUNA: setup-sas-scope-config.sql
-- ============================================================================

-- ── A) sas_class_roster — ang mga grado lang na sakop ng SAS ────────────────
-- Ang gate sa ibaba ay tungkol sa SECTION; hindi nito nililimitahan ang
-- ipinapadalang laman. Ang salaan ay dito na dapat, hindi sa browser:
--   • ang school year lang ng section na binubuksan
--   • ang subject codes lang na naka-tsek sa Setup para sa tumatawag
-- Nasuri: ang portal ay nagbabasa lang ng grades[meta.sy] na tinutugma sa
-- subject ng sheet (GradeSheet.jsx:408, 678, 773), at read-only ang SAS mode,
-- kaya walang kailangang baguhin sa client.
create or replace function public.sas_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text, extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_sy text;
begin
  select c.sy into v_sy from reg_classes c where c.id = p_class_id;

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
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension, st.gender,
           jsonb_build_object(v_sy, coalesce((
             select jsonb_agg(g)
             from jsonb_array_elements(
                    case when jsonb_typeof(st.grades -> v_sy) = 'array'
                         then st.grades -> v_sy
                         else '[]'::jsonb end) g
             where g ->> 'subjectCode' in (select sc.subject_code from public.sas_my_scope() sc)
           ), '[]'::jsonb)) as grades
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

grant execute on function public.sas_class_roster(uuid) to authenticated;


-- ── B) sas_review_states — parehong sakop ng listahan ───────────────────────
-- Tinatanong na nito ang mismong sas_teacher_loads, kaya imposibleng maghiwalay
-- ang nakikitang teacher at ang nakikitang review status. Bumabalik din ang
-- self-exclusion (nakapaloob na sa sas_teacher_loads).
create or replace function public.sas_review_states()
returns table(teacher_id bigint, subject_code text, sy text, period text,
              status text, note text, returned_at timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.teacher_id, r.subject_code, r.sy, r.period, r.status, r.note,
         r.returned_at, r.submitted_at
  from sas_grade_reviews r
  where (r.teacher_id, r.subject_code)
        in (select l.teacher_id, l.subject_code from public.sas_teacher_loads() l);
$$;

grant execute on function public.sas_review_states() to authenticated;


-- ── C) reg_resolve_approver — level-aware nang pagpili ng SAS ───────────────
-- Ang LIVE na definition ang pina-patch, hindi muling isinusulat: malaki ang
-- function at maaaring naiba na sa kopya sa repo. Kung wala ang inaasahang
-- linya, HUHUNTO ito nang may sigaw imbes na magtanim ng lumang bersyon.
do $$
declare
  v_def text;
  v_from text :=
    'select a.role into v_role from sas_subject_areas a where a.subject_code = p_subject_code limit 1;';
  v_to text :=
    'select a.role into v_role from sas_subject_areas a '
    || 'join sas_area_depts d on d.role = a.role and d.dept = v_dept '
    || 'where a.subject_code = p_subject_code order by a.role limit 1;';
  -- Pangalawa: sabihin ang LEVEL sa mensahe, dahil ang level na ngayon ang
  -- karaniwang dahilan kung bakit walang natagpuang supervisor.
  v_msg_from text := 'format(''No Subject Area Supervisor is assigned to %s.'', p_subject_code)';
  v_msg_to text :=
    'format(''No Subject Area Supervisor covers %s in %s. Set one in Setup - Subject Area Supervisors.'', p_subject_code, v_dept)';
  v_new text;
begin
  select pg_get_functiondef(p.oid) into strict v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'reg_resolve_approver';

  if position(v_from in v_def) = 0 then
    raise exception
      'Hindi natagpuan ang inaasahang linya sa live reg_resolve_approver. Huwag ituloy - ipakita muna ang pg_get_functiondef sa akin.';
  end if;

  v_new := replace(v_def, v_from, v_to);
  v_new := replace(v_new, v_msg_from, v_msg_to);  -- kosmetiko; ok lang kung wala
  execute v_new;
end $$;


-- ═══ VERIFY 1 — naka-patch na ba? dapat TRUE lahat ═════════════════════════
select 'roster filters grades' as check,
       (pg_get_functiondef('public.sas_class_roster(uuid)'::regprocedure) like '%jsonb_build_object%')::text as ok
union all
select 'review states use loads',
       (pg_get_functiondef('public.sas_review_states()'::regprocedure) like '%sas_teacher_loads%')::text
union all
select 'approver routing is level-aware',
       (pg_get_functiondef((select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname = 'public' and p.proname = 'reg_resolve_approver'))
        like '%sas_area_depts%')::text;


-- ═══ VERIFY 2 — kailangan ba ang PANG-APAT na ayos? ════════════════════════
-- Ang "Return" at "Submit" ng SAS ay naka-tala sa (teacher, subject, sy, term)
-- — WALANG section. Kaya kapag ang isang guro ay nagtuturo ng PAREHONG subject
-- code sa loob AT labas ng sakop ng SAS, ang pag-submit sa loob ay nagla-lock
-- din ng sheet sa labas (setup-combination-subjects.sql:677-686).
--
-- Ipakita mo sa akin ang resulta:
--   0 rows  → hindi ito naaabot ngayon; ligtas patakbuhin ang
--             setup-sas-review-lock-scope.sql para hindi na ito mangyari kailanman.
--   may row → sabihin mo muna sa akin. Kung basta-basta ipapatupad ang pag-ayos,
--             hindi na macheck ang mga gurong ito — kailangan ng ibang paraan.
with scope as (
  select distinct a.subject_code, d.dept
  from public.sas_subject_areas a
  join public.sas_area_depts d on d.role = a.role
),
loads as (
  select cs.subject_code,
         public.reg_dept_of(c.grade_level) as dept,
         coalesce(cs.teacher_id, (select (e.value)::bigint
                                  from jsonb_each_text(coalesce(cs.term_teachers,'{}'::jsonb)) e
                                  where e.value ~ '^\d+$' limit 1)) as teacher_id
  from public.reg_class_subjects cs
  join public.reg_classes c on c.id = cs.class_id
  where cs.teacher_id is not null or cs.term_teachers is not null
)
select trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')) as teacher,
       l.subject_code,
       string_agg(distinct l.dept, ', ' order by l.dept) as taught_in
from loads l
join public.reg_teachers t on t.id = l.teacher_id
group by 1, 2
having bool_or((l.subject_code, l.dept) in (select subject_code, dept from scope))
   and bool_or((l.subject_code, l.dept) not in (select subject_code, dept from scope))
order by 1, 2;
