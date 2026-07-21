-- ============================================================================
--  NPS Registrar — consolidated setup for the 2026-07 configurability work
--  Paste-run this WHOLE file in the Supabase SQL editor. Safe to re-run
--  (idempotent). Already applied to the live DB via MCP; run this only on a
--  database that does not yet have these changes (e.g. a fresh/other project).
--
--  Prerequisites (from earlier setup files — run those first if missing):
--    reg_weight_components, reg_class_subjects, reg_classes, reg_subjects,
--    reg_grade_subjects, reg_school_years, reg_students_data, reg_teachers,
--    reg_attitude_scale, user_roles, sas_subject_areas,
--    is_registrar(), current_teacher_id(), sas_my_subject_codes()
--
--  Bundles, in dependency order:
--    1. Weight components: per-level split (6 tables) + editable subject types
--    2. SHS subjects + term dimension + offerings
--    3. Descriptor scales (preschool, g1_3, attitude, deportment, special prog)
--    4. Descriptive vs numerical toggle
--    5. Transmutation table (per SY)
--    6. Honor criteria (per SY)
--    7. Grade approval routing + resolver
--    8. Academic-coordinator department views + section subjects
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1a. WEIGHT COMPONENTS — per-level split + level_group
-- ─────────────────────────────────────────────────────────────────────────
alter table public.reg_weight_components add column if not exists level_group text;
alter table public.reg_weight_components add column if not exists group_order integer not null default 99;

insert into public.reg_weight_components (sy, type_key, label, ww, pt, ex, sort_order, level_group, group_order) values
  ('2026-2027','core-nursery','Core Subjects',            20,50,30,10,'nursery',1),
  ('2026-2027','core-kinder', 'Core Subjects',            20,50,30,10,'kinder', 2),
  ('2026-2027','core-g1-3',   'Core Subjects',            20,50,30,10,'g1-3',   3),
  ('2026-2027','core-g4-10',  'Core Subjects',            20,50,30,10,'g4-10',  4),
  ('2026-2027','mapeh-g4-10', 'MAPEH / EPP-ICT / TLE-ICT',20,60,20,20,'g4-10',  4),
  ('2026-2027','g11-core',        'Grade 11 - Core Subjects',            20,50,30,30,'g11',5),
  ('2026-2027','g11-elective',    'Grade 11 - Academic Electives',       20,50,30,40,'g11',5),
  ('2026-2027','g12-core',        'Grade 12 - Core Subjects',            25,50,25,50,'g12',6),
  ('2026-2027','g12-applied',     'Grade 12 - Applied Subjects',         25,45,30,60,'g12',6),
  ('2026-2027','g12-wir',         'Grade 12 - Work Immersion / Research', 35,40,25,70,'g12',6),
  ('2026-2027','g12-specialized', 'Grade 12 - Specialized Subjects',     25,45,30,80,'g12',6),
  ('2026-2027','g12-elective',    'Grade 12 - Elective Subject',         25,45,30,90,'g12',6)
on conflict (sy, type_key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. SHS SUBJECTS + TERM DIMENSION
-- ─────────────────────────────────────────────────────────────────────────
insert into public.reg_subjects (code, full_name, abbreviation, category, level, sort_order) values
  ('EFC','Effective Communication / Mabisang Komunikasyon','Eff. Comm.','Core','shs',610),
  ('GSC','General Science','Gen. Sci.','Core','shs',611),
  ('PKL','Pag-aaral ng Kasaysayan at Lipunang Filipino','PKLF','Core','shs',612),
  ('LCS','Life and Career Skills','LCS','Core','shs',613),
  ('CL1','Contemporary Literature 1','Cont. Lit 1','Elective','shs',620),
  ('CL2','Contemporary Literature 2','Cont. Lit 2','Elective','shs',621),
  ('INP','Introduction to Philosophy','Intro Philo','Elective','shs',622),
  ('FM1','Finite Mathematics 1','Finite M1','Elective','shs',623),
  ('FM2','Finite Mathematics 2','Finite M2','Elective','shs',624)
on conflict (code) do nothing;

alter table public.reg_class_subjects add column if not exists subject_type text;
alter table public.reg_class_subjects add column if not exists term text;
alter table public.reg_class_subjects drop constraint if exists reg_class_subjects_term_valid;
alter table public.reg_class_subjects
  add constraint reg_class_subjects_term_valid check (term is null or term in ('q1','q2','q3','q4'));

-- Auto-typing default (per-level core, SHS by strand/subject).
create or replace function public.reg_default_subject_type(p_grade_level text, p_subject_code text)
returns text language sql immutable as $$
  select case
    when p_grade_level like 'XII%' then case
      when p_subject_code in ('MIL','IPH','PDE','PHD','DIS','PHS')            then 'g12-core'
      when p_subject_code in ('REP','ENT')                                    then 'g12-applied'
      when p_subject_code in ('PRA','PRE','WIM')                              then 'g12-wir'
      when p_subject_code in ('GEB','BIO','CHE','GPH','PHY','DAS','CWR',
                              'IWB','CNF','TNC','CSC','DRR','APE','ORM')      then 'g12-specialized'
      when p_subject_code in ('RCT')                                          then 'g12-elective'
    end
    when p_grade_level like 'XI%' then case
      when p_subject_code in ('GEM','EFC','GSC','PKL','LCS')                  then 'g11-core'
      when p_subject_code in ('GEB','BIO','GPH','RBC',
                              'CL1','CL2','INP','FM1','FM2')                  then 'g11-elective'
    end
    when p_subject_code in ('ECT','TLC','EPP','EPC','TLE','MAPEH','MAP',
                            'MUA','MUS','ART','PED','HEA')                    then 'mapeh-g4-10'
    when p_grade_level in ('N1','N2')      then 'core-nursery'
    when p_grade_level = 'K'               then 'core-kinder'
    when p_grade_level in ('I','II','III') then 'core-g1-3'
    else 'core-g4-10'
  end;
$$;

-- Repoint any legacy shared-type rows to the per-level types, then fill blanks.
update public.reg_class_subjects cs set subject_type =
  case when c.grade_level in ('N1','N2') then 'core-nursery'
       when c.grade_level = 'K'          then 'core-kinder'
       when c.grade_level in ('I','II','III') then 'core-g1-3'
       else 'core-g4-10' end
from public.reg_classes c where c.id = cs.class_id and cs.subject_type = 'core';
update public.reg_class_subjects cs set subject_type = 'mapeh-g4-10'
from public.reg_classes c where c.id = cs.class_id and cs.subject_type = 'mapeh-tle';
update public.reg_class_subjects cs set subject_type = public.reg_default_subject_type(c.grade_level, cs.subject_code)
from public.reg_classes c where c.id = cs.class_id and cs.subject_type is null
  and public.reg_default_subject_type(c.grade_level, cs.subject_code) is not null;
delete from public.reg_weight_components
where sy='2026-2027' and type_key in ('core','mapeh-tle')
  and not exists (select 1 from reg_class_subjects cs where cs.subject_type = reg_weight_components.type_key);

-- Official SHS distribution per section/term.
with sect(section_name, grade_level, class_id) as (
  select c.section_name, c.grade_level, c.id from reg_classes c
  where c.sy='2026-2027' and c.grade_level like 'X%'),
offering(section_name, subject_code, term) as (values
  ('St. Paul VI','EFC',null),('St. Paul VI','GEM',null),('St. Paul VI','GSC',null),('St. Paul VI','PKL',null),('St. Paul VI','LCS',null),
  ('St. Carlo Acutis','EFC',null),('St. Carlo Acutis','GEM',null),('St. Carlo Acutis','GSC',null),('St. Carlo Acutis','PKL',null),('St. Carlo Acutis','LCS',null),
  ('St. Catherine of Siena','EFC',null),('St. Catherine of Siena','GEM',null),('St. Catherine of Siena','GSC',null),('St. Catherine of Siena','PKL',null),('St. Catherine of Siena','LCS',null),
  ('St. Paul VI','CL1','q1'),('St. Paul VI','RBC','q1'),('St. Paul VI','CL2','q2'),('St. Paul VI','INP','q3'),
  ('St. Carlo Acutis','GPH','q1'),('St. Carlo Acutis','RBC','q1'),('St. Carlo Acutis','FM1','q2'),('St. Carlo Acutis','FM2','q3'),
  ('St. Catherine of Siena','GEB','q1'),('St. Catherine of Siena','GPH','q2'),('St. Catherine of Siena','BIO','q2'),('St. Catherine of Siena','RBC','q3'),
  ('St. Teresa of Avila','MIL','q1'),('St. Teresa of Avila','IPH','q1'),('St. Teresa of Avila','PHD','q1'),('St. Teresa of Avila','PRA','q1'),('St. Teresa of Avila','DAS','q1'),
  ('St. Teresa of Avila','PHS','q2'),('St. Teresa of Avila','APE','q2'),('St. Teresa of Avila','IWB','q2'),('St. Teresa of Avila','ORM','q2'),('St. Teresa of Avila','WIM','q2'),('St. Teresa of Avila','RCT','q2'),
  ('St. Teresa of Avila','PRE','q3'),('St. Teresa of Avila','REP','q3'),('St. Teresa of Avila','ENT','q3'),('St. Teresa of Avila','DRR','q3'),('St. Teresa of Avila','TNC','q3'),
  ('St. Clare of Assisi','MIL','q1'),('St. Clare of Assisi','IPH','q1'),('St. Clare of Assisi','PHD','q1'),('St. Clare of Assisi','PRA','q1'),('St. Clare of Assisi','CWR','q1'),('St. Clare of Assisi','DAS','q1'),
  ('St. Clare of Assisi','PHS','q2'),('St. Clare of Assisi','CNF','q2'),('St. Clare of Assisi','IWB','q2'),('St. Clare of Assisi','ORM','q2'),('St. Clare of Assisi','WIM','q2'),('St. Clare of Assisi','RCT','q2'),
  ('St. Clare of Assisi','PRE','q3'),('St. Clare of Assisi','REP','q3'),('St. Clare of Assisi','ENT','q3'),('St. Clare of Assisi','TNC','q3'),('St. Clare of Assisi','CSC','q3'),
  ('St. Joan of Arc','MIL','q1'),('St. Joan of Arc','IPH','q1'),('St. Joan of Arc','PDE','q1'),('St. Joan of Arc','PHD','q1'),('St. Joan of Arc','PRA','q1'),('St. Joan of Arc','GEB','q1'),
  ('St. Joan of Arc','BIO','q2'),('St. Joan of Arc','CHE','q2'),('St. Joan of Arc','GPH','q2'),('St. Joan of Arc','WIM','q2'),('St. Joan of Arc','RCT','q2'),
  ('St. Joan of Arc','DIS','q3'),('St. Joan of Arc','PRE','q3'),('St. Joan of Arc','REP','q3'),('St. Joan of Arc','ENT','q3'),('St. Joan of Arc','PHY','q3'))
insert into reg_class_subjects (class_id, subject_code, term, subject_type)
select s.class_id, o.subject_code, o.term, public.reg_default_subject_type(s.grade_level, o.subject_code)
from offering o join sect s on s.section_name = o.section_name
on conflict (class_id, subject_code) do update
  set term = excluded.term,
      subject_type = coalesce(reg_class_subjects.subject_type, excluded.subject_type);

-- reg_weights_for / reg_untyped_class_subjects / reg_all_class_subject_types
create or replace function public.reg_all_class_subject_types(p_sy text)
returns table(class_id uuid, grade_level text, section_name text, subject_code text,
              subject_name text, type_key text, configured boolean)
language sql stable security definer set search_path to 'public' as $$
  select cs.class_id, c.grade_level, c.section_name, cs.subject_code,
         coalesce(s.full_name, cs.subject_code), cs.subject_type,
         (cs.subject_type is not null and exists (select 1 from reg_weight_components w
            where w.sy = c.sy and w.type_key = cs.subject_type))
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  left join reg_subjects s on s.code = cs.subject_code
  where c.sy = p_sy and public.is_registrar()
  order by (cs.subject_type is null) desc, c.grade_level, c.section_name, cs.subject_code;
$$;
grant execute on function public.reg_all_class_subject_types(text) to authenticated;

-- Section subjects (section curriculum where defined, else grade catalog).
drop function if exists public.acad_section_subjects(uuid);
create function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer, teacher_id bigint, term text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare has_own_curriculum boolean;
begin
  if not exists (select 1 from reg_classes c where c.id = p_class_id and public.is_acad_for(c.grade_level)) then
    raise exception 'Not authorized for this section';
  end if;
  select exists (select 1 from reg_class_subjects cs where cs.class_id = p_class_id and cs.term is not null) into has_own_curriculum;
  if has_own_curriculum then
    return query select cs.subject_code, coalesce(s.full_name, cs.subject_code), coalesce(s.sort_order,0), cs.teacher_id, cs.term
      from reg_class_subjects cs left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id order by cs.term nulls first, coalesce(s.sort_order,0), cs.subject_code;
  else
    return query select gs.subject_code, coalesce(s.full_name, gs.subject_code), gs.sort_order, cs.teacher_id, cs.term
      from reg_classes c join reg_grade_subjects gs on gs.grade_level = c.grade_level
      left join reg_subjects s on s.code = gs.subject_code
      left join reg_class_subjects cs on cs.class_id = c.id and cs.subject_code = gs.subject_code
      where c.id = p_class_id order by gs.sort_order, gs.subject_code;
  end if;
end;
$function$;
grant execute on function public.acad_section_subjects(uuid) to authenticated;

-- Copy-weights-forward carries the new columns.
create or replace function public.reg_copy_weights_to_sy(p_from_sy text, p_to_sy text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if not public.is_registrar() then raise exception 'Not authorized'; end if;
  insert into reg_weight_components (sy, type_key, label, ww, pt, ex, sort_order, level_group, group_order)
  select p_to_sy, type_key, label, ww, pt, ex, sort_order, level_group, group_order
  from reg_weight_components where sy = p_from_sy on conflict (sy, type_key) do nothing;
  get diagnostics n = row_count;
  insert into reg_component_labels (sy, grade_level, ex_label)
  select p_to_sy, grade_level, ex_label from reg_component_labels where sy = p_from_sy
  on conflict (sy, grade_level) do nothing;
  return n;
end;
$$;
grant execute on function public.reg_copy_weights_to_sy(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3-4. DESCRIPTOR SCALES + DESCRIPTIVE/NUMERICAL TOGGLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reg_descriptor_scales (
  sy text not null references public.reg_school_years(code) on delete cascade,
  scale_key text not null, letter text not null, label text not null,
  min integer not null check (min between 0 and 100),
  sort_order integer not null default 0,
  primary key (sy, scale_key, letter));
alter table public.reg_descriptor_scales enable row level security;
drop policy if exists "registrar write" on public.reg_descriptor_scales;
create policy "registrar write" on public.reg_descriptor_scales for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
drop policy if exists "auth read" on public.reg_descriptor_scales;
create policy "auth read" on public.reg_descriptor_scales for select to authenticated using (true);

create table if not exists public.reg_descriptive_levels (
  sy text not null references public.reg_school_years(code) on delete cascade,
  grade_level text not null,
  mode text not null default 'numerical' check (mode in ('descriptive','numerical')),
  scale_key text,
  primary key (sy, grade_level),
  constraint descriptive_needs_scale check (mode = 'numerical' or scale_key is not null));
alter table public.reg_descriptive_levels enable row level security;
drop policy if exists "registrar write" on public.reg_descriptive_levels;
create policy "registrar write" on public.reg_descriptive_levels for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
drop policy if exists "auth read" on public.reg_descriptive_levels;
create policy "auth read" on public.reg_descriptive_levels for select to authenticated using (true);

-- Seed all five scales for SY 2026-2027.
insert into public.reg_descriptor_scales (sy, scale_key, letter, label, min, sort_order) values
  ('2026-2027','preschool','C','Consistent',90,1),('2026-2027','preschool','D','Developing',80,2),('2026-2027','preschool','B','Beginning',70,3),
  ('2026-2027','g1_3','A','Advancing',90,1),('2026-2027','g1_3','B','Benchmarking',80,2),('2026-2027','g1_3','C','Connecting',75,3),('2026-2027','g1_3','D','Developing',65,4),('2026-2027','g1_3','E','Emerging',0,5),
  ('2026-2027','attitude','MO','Most Outstanding',95,1),('2026-2027','attitude','O','Outstanding',90,2),('2026-2027','attitude','S','Satisfactory',85,3),('2026-2027','attitude','F','Fair',80,4),('2026-2027','attitude','NI','Needs Improvement',75,5),
  ('2026-2027','deportment','AO','Always Observed',91,1),('2026-2027','deportment','SO','Sometimes Observed',86,2),('2026-2027','deportment','RO','Rarely Observed',80,3),('2026-2027','deportment','NO','Not Observed',75,4),
  ('2026-2027','special_program','MO','Most Outstanding',95,1),('2026-2027','special_program','O','Outstanding',90,2),('2026-2027','special_program','VS','Very Satisfactory',85,3),('2026-2027','special_program','S','Satisfactory',80,4),('2026-2027','special_program','FS','Fairly Satisfactory',75,5),('2026-2027','special_program','DM','Did not Meet Expectations',0,6)
on conflict (sy, scale_key, letter) do nothing;

-- Nursery/Kinder descriptive (preschool), Grade 1 descriptive (g1_3), rest numerical.
insert into public.reg_descriptive_levels (sy, grade_level, mode, scale_key)
select '2026-2027', gl,
  case when gl in ('N1','N2','K') then 'descriptive' when gl = 'I' then 'descriptive' else 'numerical' end,
  case when gl in ('N1','N2','K') then 'preschool' when gl = 'I' then 'g1_3' else null end
from (select distinct grade_level gl from reg_classes where sy='2026-2027') s
on conflict (sy, grade_level) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. TRANSMUTATION TABLE (per SY)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reg_transmutation (
  sy text not null references public.reg_school_years(code) on delete cascade,
  min_score integer not null check (min_score between 0 and 100),
  grade integer not null check (grade between 0 and 100),
  primary key (sy, min_score));
alter table public.reg_transmutation enable row level security;
drop policy if exists "registrar write" on public.reg_transmutation;
create policy "registrar write" on public.reg_transmutation for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
drop policy if exists "auth read" on public.reg_transmutation;
create policy "auth read" on public.reg_transmutation for select to authenticated using (true);

insert into public.reg_transmutation (sy, min_score, grade) values
  ('2026-2027',100,100),('2026-2027',98,99),('2026-2027',96,98),('2026-2027',95,97),('2026-2027',94,96),('2026-2027',93,95),('2026-2027',92,94),('2026-2027',91,93),('2026-2027',90,92),('2026-2027',89,91),
  ('2026-2027',88,90),('2026-2027',87,89),('2026-2027',86,88),('2026-2027',85,87),('2026-2027',84,86),('2026-2027',83,85),('2026-2027',82,84),('2026-2027',81,83),('2026-2027',80,82),('2026-2027',79,81),
  ('2026-2027',78,80),('2026-2027',77,79),('2026-2027',76,78),('2026-2027',75,77),('2026-2027',73,76),('2026-2027',70,75),('2026-2027',68,74),('2026-2027',66,73),('2026-2027',64,72),('2026-2027',62,71),
  ('2026-2027',60,70),('2026-2027',58,69),('2026-2027',56,68),('2026-2027',54,67),('2026-2027',52,66),('2026-2027',50,65),('2026-2027',48,64),('2026-2027',46,63),('2026-2027',43,62),('2026-2027',40,61),('2026-2027',25,60),('2026-2027',0,60)
on conflict (sy, min_score) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. HONOR CRITERIA (per SY)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reg_honor_criteria (
  sy text primary key references public.reg_school_years(code) on delete cascade,
  ga_min integer not null default 90 check (ga_min between 0 and 100),
  grade_floor integer not null default 80 check (grade_floor between 0 and 100),
  updated_at timestamptz not null default now());
alter table public.reg_honor_criteria enable row level security;
drop policy if exists "registrar write" on public.reg_honor_criteria;
create policy "registrar write" on public.reg_honor_criteria for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
drop policy if exists "auth read" on public.reg_honor_criteria;
create policy "auth read" on public.reg_honor_criteria for select to authenticated using (true);
insert into public.reg_honor_criteria (sy, ga_min, grade_floor)
select code, 90, 80 from reg_school_years on conflict (sy) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. GRADE APPROVAL ROUTING + RESOLVER
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reg_dept_of(gl text)
returns text language sql immutable as $$
  select case when gl like 'XI-%' or gl like 'XII-%' or gl in ('XI','XII') then 'shs'
    when gl in ('VII','VIII','IX','X') then 'jhs'
    when gl in ('I','II','III','IV','V','VI','S') then 'gs' else 'preschool' end; $$;
create or replace function public.reg_ac_role_for(gl text)
returns text language sql immutable as $$
  select case public.reg_dept_of(gl) when 'preschool' then 'acad_pre' when 'gs' then 'acad_gs'
    when 'jhs' then 'acad_jhs' when 'shs' then 'acad_shs' end; $$;
create or replace function public.is_acad_for(gl text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from user_roles r where lower(r.user_email)=lower(auth.jwt() ->> 'email')
    and (r.role='admin' or r.role = public.reg_ac_role_for(gl))); $$;

create table if not exists public.reg_approval_routing (
  id bigserial primary key, source_role text not null, source_scope text,
  approver_kind text not null default 'unset' check (approver_kind in ('fixed','derived','unset')),
  approver_role text, approver_derive text, updated_at timestamptz not null default now(),
  unique (source_role, source_scope),
  constraint routing_shape check (
    (approver_kind='fixed' and approver_role is not null and approver_derive is null) or
    (approver_kind='derived' and approver_derive in ('sas_of_subject','ac_of_section_level') and approver_role is null) or
    (approver_kind='unset' and approver_role is null and approver_derive is null)),
  constraint routing_scope check (source_scope is null or source_scope in ('preschool','gs','jhs','shs')));
alter table public.reg_approval_routing enable row level security;
drop policy if exists "registrar only" on public.reg_approval_routing;
create policy "registrar only" on public.reg_approval_routing for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

create table if not exists public.reg_approval_routing_audit (
  id bigserial primary key, source_role text not null, source_scope text,
  old_rule text, new_rule text, changed_by text, changed_at timestamptz not null default now());
alter table public.reg_approval_routing_audit enable row level security;
drop policy if exists "registrar read" on public.reg_approval_routing_audit;
create policy "registrar read" on public.reg_approval_routing_audit for select to authenticated using (public.is_registrar());

create or replace function public.reg_routing_audit()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare fmt text := 'kind=%s role=%s derive=%s';
begin
  if tg_op='UPDATE' and (old.approver_kind,old.approver_role,old.approver_derive) is not distinct from (new.approver_kind,new.approver_role,new.approver_derive) then return new; end if;
  insert into reg_approval_routing_audit (source_role, source_scope, old_rule, new_rule, changed_by)
  values (new.source_role, new.source_scope,
    case when tg_op='UPDATE' then format(fmt, old.approver_kind, coalesce(old.approver_role,'-'), coalesce(old.approver_derive,'-')) end,
    format(fmt, new.approver_kind, coalesce(new.approver_role,'-'), coalesce(new.approver_derive,'-')), auth.jwt() ->> 'email');
  new.updated_at := now(); return new;
end; $$;
drop trigger if exists reg_routing_audit_t on public.reg_approval_routing;
create trigger reg_routing_audit_t before insert or update on public.reg_approval_routing
  for each row execute function public.reg_routing_audit();

-- The inline UNIQUE (source_role, source_scope) does NOT dedupe rows whose
-- source_scope is NULL (in SQL, NULL <> NULL), so a NULL-scope role would be
-- re-inserted on every run. This expression index makes NULL scopes collide,
-- and the insert below targets it — so re-running is now truly idempotent.
create unique index if not exists reg_approval_routing_uq
  on public.reg_approval_routing (source_role, coalesce(source_scope, ''));

insert into public.reg_approval_routing (source_role, source_scope, approver_kind, approver_role, approver_derive) values
  ('teacher',null,'derived',null,'sas_of_subject'),
  ('teacher','preschool','fixed','acad_gs',null),
  ('sas',null,'derived',null,'ac_of_section_level'),
  ('acad_pre',null,'fixed','principal',null),
  ('acad_shs',null,'fixed','principal',null),
  ('acad_gs',null,'unset',null,null),
  ('acad_jhs',null,'unset',null,null)
on conflict (source_role, coalesce(source_scope, '')) do nothing;

create or replace function public.reg_highest_role(p_email text)
returns text language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from user_roles r where lower(r.user_email)=lower(p_email) and r.role='principal') then 'principal'
    when exists (select 1 from user_roles r where lower(r.user_email)=lower(p_email) and r.role like 'acad\_%')
      then (select r.role from user_roles r where lower(r.user_email)=lower(p_email) and r.role like 'acad\_%' order by r.role limit 1)
    when exists (select 1 from user_roles r where lower(r.user_email)=lower(p_email) and r.role like 'sas\_%') then 'sas'
    else 'teacher' end; $$;

create or replace function public.reg_resolve_approver(p_teacher_id bigint, p_subject_code text, p_class_id uuid)
returns table(source_role text, approver_role text, flag text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_email text; v_src text; v_dept text; v_gl text; v_kind text; v_role text; v_derive text;
begin
  select lower(t.email) into v_email from reg_teachers t where t.id = p_teacher_id;
  select c.grade_level into v_gl from reg_classes c where c.id = p_class_id;
  if v_gl is null then return query select null::text, null::text, 'Section not found'; return; end if;
  v_dept := public.reg_dept_of(v_gl);
  v_src := public.reg_highest_role(coalesce(v_email,''));
  select r.approver_kind, r.approver_role, r.approver_derive into v_kind, v_role, v_derive
  from reg_approval_routing r
  where r.source_role = v_src and (r.source_scope = v_dept or r.source_scope is null)
  order by (r.source_scope is not null) desc limit 1;
  if v_kind is null then return query select v_src, null::text, format('No routing rule for %s in %s. Set one in Setup.', v_src, v_dept); return; end if;
  if v_kind = 'unset' then return query select v_src, null::text, format('Approver for %s is not set yet.', v_src); return; end if;
  if v_kind = 'derived' then
    if v_derive = 'sas_of_subject' then
      select a.role into v_role from sas_subject_areas a where a.subject_code = p_subject_code limit 1;
      if v_role is null then return query select v_src, null::text, format('No Subject Area Supervisor is assigned to %s.', p_subject_code); return; end if;
    else v_role := public.reg_ac_role_for(v_gl); end if;
  end if;
  if v_email is not null and exists (select 1 from user_roles r where lower(r.user_email) = v_email and r.role = v_role) then
    if exists (select 1 from user_roles r where r.role = 'principal') then
      return query select v_src, 'principal', format('Escalated: the %s here is the encoder.', v_role); return; end if;
    return query select v_src, null::text, 'Would approve their own sheet and there is no Principal to escalate to.'; return;
  end if;
  return query select v_src, v_role, null::text;
end; $$;

create or replace function public.reg_can_approve(p_teacher_id bigint, p_subject_code text, p_class_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.reg_resolve_approver(p_teacher_id, p_subject_code, p_class_id) a
    join user_roles r on r.role = a.approver_role
    where a.approver_role is not null and lower(r.user_email) = lower(auth.jwt() ->> 'email')); $$;

create or replace function public.sas_can_review(p_teacher_id bigint, p_subject_code text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code and cs.teacher_id = p_teacher_id
      and public.reg_can_approve(p_teacher_id, p_subject_code, cs.class_id)); $$;

grant execute on function public.reg_dept_of(text) to authenticated;
grant execute on function public.reg_ac_role_for(text) to authenticated;
grant execute on function public.reg_highest_role(text) to authenticated;
grant execute on function public.reg_resolve_approver(bigint, text, uuid) to authenticated;
grant execute on function public.reg_can_approve(bigint, text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. ACADEMIC-COORDINATOR DEPARTMENT VIEWS
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.acad_my_depts()
returns table(dept text) language sql stable security definer set search_path to 'public' as $$
  select d from unnest(array['preschool','gs','jhs','shs']) d
  where exists (select 1 from user_roles r where lower(r.user_email)=lower(auth.jwt() ->> 'email')
    and (r.role='admin' or r.role = case d when 'preschool' then 'acad_pre' when 'gs' then 'acad_gs' when 'jhs' then 'acad_jhs' else 'acad_shs' end)); $$;

create or replace function public.acad_sheet_status(p_dept text, p_sy text)
returns table(teacher_id bigint, teacher_name text, subject_code text, class_id uuid,
              grade_level text, section_name text, period text, status text, note text, mine boolean, flag text)
language sql stable security definer set search_path to 'public' as $$
  select t.id, t.family_name || ', ' || t.first_name, cs.subject_code, c.id, c.grade_level, c.section_name,
         r.period, coalesce(r.status,'in_progress'), r.note,
         public.reg_can_approve(t.id, cs.subject_code, c.id),
         (select a.flag from public.reg_resolve_approver(t.id, cs.subject_code, c.id) a)
  from reg_class_subjects cs join reg_classes c on c.id = cs.class_id join reg_teachers t on t.id = cs.teacher_id
  left join sas_grade_reviews r on r.teacher_id = t.id and r.subject_code = cs.subject_code and r.sy = c.sy
  where c.sy = p_sy and public.reg_dept_of(c.grade_level) = p_dept and p_dept in (select dept from public.acad_my_depts())
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code; $$;

create or replace function public.acad_student_grades(p_dept text, p_sy text)
returns table(lrn text, full_name text, grade_level text, section_name text, grades jsonb)
language sql stable security definer set search_path to 'public' as $$
  select st.lrn, st.last_name || ', ' || st.first_name || coalesce(' ' || nullif(left(st.middle_name,1),'') || '.', ''),
         c.grade_level, c.section_name, coalesce(st.grades -> p_sy, '[]'::jsonb)
  from reg_students_data st join reg_classes c on c.id = st.current_class_id
  where c.sy = p_sy and public.reg_dept_of(c.grade_level) = p_dept and p_dept in (select dept from public.acad_my_depts())
  order by c.grade_level, c.section_name, st.last_name, st.first_name; $$;

create or replace function public.acad_below_80(p_dept text, p_sy text)
returns table(lrn text, full_name text, grade_level text, section_name text, subject_code text, period text, grade numeric)
language sql stable security definer set search_path to 'public' as $$
  select st.lrn, st.last_name || ', ' || st.first_name, c.grade_level, c.section_name,
         g->>'subjectCode', p.key, (g->>p.key)::numeric
  from reg_students_data st join reg_classes c on c.id = st.current_class_id
  cross join lateral jsonb_array_elements(case when jsonb_typeof(st.grades -> p_sy)='array' then st.grades -> p_sy else '[]'::jsonb end) g
  cross join lateral (values ('q1'),('q2'),('q3'),('q4')) p(key)
  where c.sy = p_sy and public.reg_dept_of(c.grade_level) = p_dept and p_dept in (select dept from public.acad_my_depts())
    and g ? p.key and jsonb_typeof(g -> p.key)='number' and (g->>p.key)::numeric < 80
  order by c.grade_level, c.section_name, st.last_name, g->>'subjectCode', p.key; $$;

grant execute on function public.acad_my_depts() to authenticated;
grant execute on function public.acad_sheet_status(text, text) to authenticated;
grant execute on function public.acad_student_grades(text, text) to authenticated;
grant execute on function public.acad_below_80(text, text) to authenticated;

-- ── done ───────────────────────────────────────────────────────────────────
