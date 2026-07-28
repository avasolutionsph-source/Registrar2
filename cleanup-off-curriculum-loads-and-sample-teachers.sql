-- ============================================================================
--  CLEANUP 2026-07-28
--  (1) Mga teaching load na WALA sa Setup ▸ Subjects order ng grade/strand —
--      lahat ng level N1–G12 (dating N–G10 lang ang nilinis ng
--      setup-curriculum-guard.sql PART C; kasama na ngayon ang SHS).
--  (2) Mga SAMPLE teacher record na idinagdag noon para sa demo/testing.
--
--  SAAN I-PASTE: Supabase ▸ SQL Editor ▸ New query.
--  Sundan ang mga STEP sa pagkakasunod — laging PREVIEW muna bago DELETE.
--  Bawat step ay safe i-re-run.
--
--  HINDI ginagalaw:
--   • Mga na-encode nang grades ng learners (nasa reg_students.grades JSON).
--   • Mga section, order lists, at mga load sa LUMANG school years (history) —
--     ang active SY lang ang nililinis ng PART 1.
-- ============================================================================


-- ═══ PART 1 — mga load na wala sa grade's Setup ▸ Subjects order ═════════════

-- ▶ STEP 1A (PREVIEW — walang binubura): bawat row sa ACTIVE school year na ang
--   subject ay WALA sa order list ng grade/strand nito. Ang grade na WALANG
--   naka-configure na order list ay hindi ginagalaw.
--   FINAL na ang Setup ▸ Subjects order (kumpirmado ng Registrar 2026-07-28),
--   kaya lahat ng lalabas dito ay buburahin sa STEP 1B — silipin lang para
--   may record ka ng mga aalisin.
select c.grade_level, c.section_name, c.sy, cs.subject_code,
       cs.teacher_id,
       trim(coalesce(t.family_name, '') || ', ' || coalesce(t.first_name, '')) as teacher,
       cs.assigned_by, cs.term
from reg_class_subjects cs
join reg_classes c on c.id = cs.class_id
left join reg_teachers t on t.id = cs.teacher_id
where c.sy in (select code from reg_school_years where is_active)
  and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
  and not exists (select 1 from reg_grade_subjects gs
                  where gs.grade_level = c.grade_level
                    and gs.subject_code = cs.subject_code)
order by c.grade_level, c.section_name, cs.subject_code;

-- ▶ STEP 1B (DELETE — patakbuhin lang pagkatapos basahin ang preview).
--   Sa SHS, tinatanggal din nito ang stale na term offering ng section (hal.
--   lumang code na wala na sa strand order list) — hindi na ito maiaassign ng
--   coordinator dahil sa curriculum guard, kaya basura na ang row.
delete from reg_class_subjects cs
using reg_classes c
where c.id = cs.class_id
  and c.sy in (select code from reg_school_years where is_active)
  and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
  and not exists (select 1 from reg_grade_subjects gs
                  where gs.grade_level = c.grade_level
                    and gs.subject_code = cs.subject_code);

-- ▶ STEP 1C (VERIFY — dapat 0):
select count(*) as stale_rows
from reg_class_subjects cs
join reg_classes c on c.id = cs.class_id
where c.sy in (select code from reg_school_years where is_active)
  and exists (select 1 from reg_grade_subjects gs where gs.grade_level = c.grade_level)
  and not exists (select 1 from reg_grade_subjects gs
                  where gs.grade_level = c.grade_level
                    and gs.subject_code = cs.subject_code);


-- ═══ PART 2 — mga SAMPLE teacher record ══════════════════════════════════════

-- ▶ STEP 2A (PREVIEW 1): mga teacher na mukhang sample base sa email
--   (nagsisimula sa sample / demo / test), kasama ang bilang ng loads nila.
select t.id,
       trim(coalesce(t.family_name, '') || ', ' || coalesce(t.first_name, '')) as name,
       t.email, t.created_at,
       (select count(*) from reg_class_subjects cs where cs.teacher_id = t.id) as loads
from reg_teachers t
where t.email ilike 'sample%' or t.email ilike 'demo%' or t.email ilike 'test%'
order by t.id;

-- ▶ STEP 2A (PREVIEW 2): ang 30 pinakabagong teacher records. Kung may makita
--   kang HINDI totoong teacher na hindi nahuli ng email pattern sa itaas,
--   itala ang ID at ilagay sa v_extra sa STEP 2B.
select t.id,
       trim(coalesce(t.family_name, '') || ', ' || coalesce(t.first_name, '')) as name,
       t.email, t.created_at,
       (select count(*) from reg_class_subjects cs where cs.teacher_id = t.id) as loads
from reg_teachers t
order by t.created_at desc nulls last, t.id desc
limit 30;

-- ▶ STEP 2B (DELETE — patakbuhin lang pagkatapos ng preview). Ginagawa nito,
--   sa tamang pagkakasunod:
--     a. inaalis ang sample IDs sa per-term teacher maps (rotating/combination);
--     b. ina-UNASSIGN ang kanilang mga load (HINDI binubura ang row — sa SHS
--        ang row ay ang term offering ng Registrar; kung combination row na may
--        natitirang co-teacher, ang co-teacher ang nagiging lead);
--     c. binubura ang kanilang review states (sas_grade_reviews);
--     d. inaalis sila sa level rosters ng mga coordinator;
--     e. nililinis ang MAPEH pair-switch pointer;
--     f. binubura ang kanilang login roles — PERO PINANANATILI ang
--        sampleteacher1@gmail.com dahil ito ang aktibong test login mo
--        (coordinator access);
--     g. binubura ang mismong reg_teachers rows (ang adviser_id ng section ay
--        awtomatikong nagiging blank — on delete set null).
do $$
declare
  -- ← DAGDAG NA IDs mula sa PREVIEW 2 (hal. '{201,202}'); hayaang '{}' kung wala.
  v_extra  bigint[] := '{}';
  v_ids    bigint[];
  v_emails text[];
begin
  select coalesce(array_agg(id), '{}') into v_ids
  from reg_teachers
  where email ilike 'sample%' or email ilike 'demo%' or email ilike 'test%'
     or id = any(v_extra);

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise notice 'Walang sample teacher na tumugma - walang binura.';
    return;
  end if;

  select coalesce(array_agg(distinct lower(email)), '{}') into v_emails
  from reg_teachers
  where id = any(v_ids) and coalesce(email, '') <> '';

  -- (a) i-strip ang sample IDs sa per-term teacher maps
  update reg_class_subjects cs
     set term_teachers = nullif(
           (select coalesce(jsonb_object_agg(t.k, t.v), '{}'::jsonb)
            from jsonb_each(cs.term_teachers) as t(k, v)
            where not (jsonb_typeof(t.v) in ('number', 'string')
                       and (t.v #>> '{}') ~ '^\d+$'
                       and (t.v #>> '{}')::bigint = any(v_ids))),
           '{}'::jsonb),
         updated_at = now()
   where cs.term_teachers is not null
     and exists (select 1 from jsonb_each(cs.term_teachers) as t(k, v)
                 where jsonb_typeof(t.v) in ('number', 'string')
                   and (t.v #>> '{}') ~ '^\d+$'
                   and (t.v #>> '{}')::bigint = any(v_ids));

  -- (b) i-unassign ang kanilang mga load (co-teacher ang bagong lead kung meron)
  update reg_class_subjects cs
     set teacher_id = (select (t.v #>> '{}')::bigint
                       from jsonb_each(cs.term_teachers) as t(k, v)
                       where jsonb_typeof(t.v) in ('number', 'string')
                         and (t.v #>> '{}') ~ '^\d+$'
                       order by t.k limit 1),
         assigned_by = case when cs.term_teachers is null then null else cs.assigned_by end,
         updated_at = now()
   where cs.teacher_id = any(v_ids);

  -- (c) review states
  delete from sas_grade_reviews where teacher_id = any(v_ids);

  -- (d) coordinator level rosters
  if to_regclass('public.acad_added_teachers') is not null then
    execute 'delete from public.acad_added_teachers where teacher_id = any($1)' using v_ids;
  end if;

  -- (e) MAPEH pair-switch pointer
  update reg_pair_switch set switched_by = null where switched_by = any(v_ids);

  -- (f) login roles — maliban sa sampleteacher1 (aktibong test login).
  --     Kapag handa nang iretiro pati ang login na iyon, burahin ang
  --     "and lower(user_email) <> ..." na linya at i-re-run ang block.
  delete from user_roles
  where lower(user_email) = any(v_emails)
    and lower(user_email) <> 'sampleteacher1@gmail.com';

  -- (g) ang mismong teacher records
  delete from reg_teachers where id = any(v_ids);

  raise notice 'Tinanggal: % sample teacher record(s).', array_length(v_ids, 1);
end $$;

-- ▶ STEP 2C (VERIFY — dapat 0):
select count(*) as sample_teachers_left
from reg_teachers
where email ilike 'sample%' or email ilike 'demo%' or email ilike 'test%';


-- ═══ PART 3 (OPTIONAL, pero inirerekomenda) — naiwang review states ══════════
-- Ang sas_grade_reviews ay naka-key sa teacher × subject; kapag natanggal ang
-- load (tulad ng PART 1), naiiwan ang review row. Hindi na ito lumalabas sa
-- approval UI, pero basura sa table. Ligtas itong burahin: hindi nito ginagalaw
-- ang reviews ng mga load na buhay pa (kahit sa lumang SY, hangga't nariyan pa
-- ang class row nito).

-- ▶ STEP 3A (PREVIEW — bilang lang):
select count(*) as orphan_reviews
from sas_grade_reviews r
where not exists (
  select 1 from reg_class_subjects cs
  where cs.subject_code = r.subject_code
    and (cs.teacher_id = r.teacher_id
         or (cs.term_teachers is not null and exists (
              select 1 from jsonb_each(cs.term_teachers) as t(k, v)
              where jsonb_typeof(t.v) in ('number', 'string')
                and (t.v #>> '{}') ~ '^\d+$'
                and (t.v #>> '{}')::bigint = r.teacher_id))));

-- ▶ STEP 3B (DELETE):
delete from sas_grade_reviews r
where not exists (
  select 1 from reg_class_subjects cs
  where cs.subject_code = r.subject_code
    and (cs.teacher_id = r.teacher_id
         or (cs.term_teachers is not null and exists (
              select 1 from jsonb_each(cs.term_teachers) as t(k, v)
              where jsonb_typeof(t.v) in ('number', 'string')
                and (t.v #>> '{}') ~ '^\d+$'
                and (t.v #>> '{}')::bigint = r.teacher_id))));
