-- ============================================================================
--  SAS SCOPE: alisin ang SENIOR HIGH sa Subject Area Supervisor
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  ANG BUG (iniulat 2026-08-08 ng SAS—Science):
--    "si sir matthew abesa po tchr sa science sa senior high. Dae ko po sya
--     under. Tapos po ang mga senior high subjects nina tchr leanne, mar and
--     Laire kasali pa po dyan"
--
--  ANG SANHI:
--    Ang routing ay matagal nang nagsasabing ang LAHAT ng SHS teacher grade
--    sheets ay kay Academic Coordinator—SHS (setup-routing-teacher-shs.sql:
--    teacher · shs → fixed · acad_shs, at ang leveled rule ay nananaig sa
--    "Every level → SAS of subject"). Pero ang sas_* listing RPCs ay
--    NAG-SCOPE LANG SA SUBJECT CODE, walang level filter — kaya nakikita ng
--    SAS ang mga SHS teacher na HINDI naman nila kayang aprubahan.
--
--    Ginawa na ang eksaktong ayos na ito para sa PRESCHOOL noon
--    (setup-preschool-approval.sql) sa parehong dahilan. Hindi lang nagawa
--    para sa SHS.
--
--  EPEKTO:
--    • Ang teacher na PURO SHS ang hawak (hal. Sir Matthew) ay mawawala na sa
--      listahan ng SAS.
--    • Ang teacher na may JHS/GS AT SHS (Leanne, Mar, Laire) ay mananatili,
--      pero ang SHS sections nila ay hindi na kasama sa bilang.
--    • WALANG grado, review, o assignment na nabubura — pagpapakita lang ang
--      binabago.
-- ============================================================================

-- ── PART A: sas_teacher_loads — walang preschool AT walang SHS ──────────────
-- Kapareho ng bersyon sa setup-preschool-approval.sql; ang tanging pagbabago
-- ay `<> 'preschool'` → `not in ('preschool','shs')` sa DALAWANG branch.
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
    and public.reg_dept_of(c.grade_level) not in ('preschool', 'shs')
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
    and public.reg_dept_of(c.grade_level) not in ('preschool', 'shs')
    and array_length(public.sas_my_roles(), 1) is not null
    and cs.subject_code in (select subject_code from public.sas_my_subject_codes())
    and lower(coalesce(t.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  order by 2, 5, 6, 8;
$$;

grant execute on function public.sas_teacher_loads() to authenticated;


-- ── PART B: sas_class_roster — tinatanggihan din ang SHS sections ───────────
-- Ang listahan lang ang inaayos ng PART A. Ito ang pinto: kung may direktang
-- link o naka-bookmark na SHS sheet, dito ito huhurangin.
create or replace function public.sas_class_roster(p_class_id uuid)
returns table(lrn text, last_name text, first_name text, middle_name text, extension text, gender text, grades jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_dept text;
begin
  select public.reg_dept_of(c.grade_level) into v_dept
  from reg_classes c where c.id = p_class_id;

  if v_dept = 'preschool' then
    raise exception 'Preschool grade sheets are checked by the Preschool Academic Coordinator';
  end if;
  if v_dept = 'shs' then
    raise exception 'Senior High grade sheets are checked by the Academic Coordinator for Senior High';
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


-- ── PART C: sas_can_review — isang pinagmumulan ng scope ───────────────────
-- Dati ay subject-code + hindi-sarili lang ang tsek nito, kaya kayang aprubahan
-- ng SAS ang teacher na hindi naman nila nakikita. Ngayon ay ang MISMONG
-- listahan na ang tinatanong, kaya imposibleng magkaiba ang nakikita at ang
-- kayang gawin — kahit anong level rule ang idagdag sa hinaharap.
create or replace function public.sas_can_review(p_teacher_id bigint, p_subject_code text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.sas_teacher_loads() l
    where l.teacher_id = p_teacher_id
      and l.subject_code = p_subject_code
  );
$$;

grant execute on function public.sas_can_review(bigint, text) to authenticated;


-- ═══ VERIFY 1 — ANO ANG MAWAWALA sa mga SAS listahan ═══════════════════════
-- Ito ang mga SHS assignment na dati ay lumalabas sa SAS. Dapat nandito si Sir
-- Matthew (Science, SHS) at ang SHS sections nina Leanne, Mar, at Laire.
-- Pagkatapos i-run ang migration, ito na ang eksaktong hindi na nila makikita.
select a.role as sas_area, c.grade_level, c.section_name, cs.subject_code,
       trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')) as teacher
from reg_class_subjects cs
join reg_classes c on c.id = cs.class_id
join public.sas_subject_areas a on a.subject_code = cs.subject_code
left join reg_teachers t on t.id = cs.teacher_id
where public.reg_dept_of(c.grade_level) = 'shs'
order by a.role, teacher, c.grade_level, c.section_name, cs.subject_code;


-- ═══ VERIFY 2 — may naiwan bang review row na hindi na maaabot ng SAS? ══════
-- Kung may lumabas dito, ang teacher na iyon ay PURO SHS ang hawak sa subject
-- na iyon, kaya hindi na ito kayang bawiin ng SAS. Ipakita mo sa akin ang
-- resulta bago tayo maglinis — walang binubura ang migration na ito.
select r.teacher_id,
       trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')) as teacher,
       r.subject_code, r.sy, r.period, r.status
from public.sas_grade_reviews r
join public.reg_teachers t on t.id = r.teacher_id
where not exists (
  select 1
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  where cs.subject_code = r.subject_code
    and public.reg_dept_of(c.grade_level) not in ('preschool', 'shs')
    and (
      cs.teacher_id = r.teacher_id
      or exists (
        select 1 from jsonb_each_text(coalesce(cs.term_teachers, '{}'::jsonb)) e
        where e.value = r.teacher_id::text
      )
    )
)
order by teacher, r.subject_code, r.sy, r.period;
