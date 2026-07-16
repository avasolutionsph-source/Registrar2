-- ============================================================================
--  Weight Components per Learning Area (WWs / PTs / EXs-QA)
--  Paste-run this whole file in the Supabase SQL editor. Safe to re-run.
--
--  DepEd Order No. 15, s. 2026 — Nursery to Grade 10, and Grade 11
--  DepEd Order No.  8, s. 2015 — Grade 12 (still in force for SY 2026-2027)
--
--  WHY THIS REPLACES reg_grade_weights
--  ────────────────────────────────────
--  reg_grade_weights keyed the split on an "area group" GUESSED from the
--  subject's name (classifyArea() in grading.ts). That cannot express the real
--  rules, for two reasons found in the live catalog:
--
--    1. The same subject code is a different TYPE in a different grade.
--       GEB (General Biology 1) is a Grade 11 Academic Elective (20/50/30)
--       AND a Grade 12 Specialized subject (25/45/30).
--    2. The same type name carries different weights per grade.
--       Grade 11 Core = 20/50/30 but Grade 12 Core = 25/50/25.
--
--  So the type cannot live on reg_subjects (one row per code), and the weights
--  cannot be keyed on the type name alone. Instead:
--
--    reg_class_subjects.subject_type   -- the TYPE, per section x subject
--    reg_weight_components(sy, type)   -- the WEIGHTS, per school year x type
--
--  reg_class_subjects.class_id already carries the school year, the grade level
--  AND the strand (reg_classes.grade_level is e.g. 'XII-GAS' / 'XII-STEM'), so
--  keying there gets per-SY, per-grade and per-strand for free — including the
--  confirmed DRRR case, without a section-level special case.
--
--  NOTE ON DRRR: the catalog ALREADY models it as two codes, so nothing special
--  is needed — DIS = Core (STEM, 25/50/25), DRR = Specialized (GAS, 25/45/30).
--
--  NURSERY-GRADE 10 IS UNCHANGED. The existing core (20/50/30) and mapeh-tle
--  (20/60/20) splits already match DO 15 s.2026 exactly, so basic-ed grades
--  compute to the same numbers before and after this file.
--
--  NO GUESSING: only the subjects named in the official list are typed here. A
--  subject with no type does not compute — it is reported by
--  reg_untyped_class_subjects() so the Registrar can see and fix it.
-- ============================================================================

-- ── 1. The weights, per school year x subject type ──────────────────────────
create table if not exists public.reg_weight_components (
  sy         text    not null references public.reg_school_years(code) on delete cascade,
  type_key   text    not null,
  label      text    not null,
  ww         integer not null check (ww between 0 and 100),
  pt         integer not null check (pt between 0 and 100),
  ex         integer not null check (ex between 0 and 100),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (sy, type_key),
  -- PART E: the three components must always total 100.
  constraint reg_weight_components_sum_100 check (ww + pt + ex = 100)
);
alter table public.reg_weight_components enable row level security;
drop policy if exists "registrar full access" on public.reg_weight_components;
create policy "registrar full access" on public.reg_weight_components
  for all to authenticated using (public.is_registrar()) with check (public.is_registrar());
-- Everyone who encodes or views a grade must be able to READ the split.
drop policy if exists "authenticated read" on public.reg_weight_components;
create policy "authenticated read" on public.reg_weight_components
  for select to authenticated using (true);

-- ── 2. The type, per section x subject ──────────────────────────────────────
-- Nullable on purpose: NULL = "not configured yet" and BLOCKS computation
-- rather than falling back to a guessed default.
--
-- No FK to reg_weight_components: its key is (sy, type_key) and the sy lives on
-- reg_classes, so the reference can't be expressed as a column constraint. A
-- type with no weights row for the class's SY is caught at read time instead —
-- reg_weights_for() returns no row, and reg_untyped_class_subjects() lists it.
alter table public.reg_class_subjects
  add column if not exists subject_type text;

-- ── 3. Audit trail (PART C.5) ───────────────────────────────────────────────
create table if not exists public.reg_weight_audit (
  id          bigserial primary key,
  sy          text not null,
  type_key    text not null,
  old_ww integer, old_pt integer, old_ex integer,
  new_ww integer, new_pt integer, new_ex integer,
  changed_by  text,
  changed_at  timestamptz not null default now()
);
alter table public.reg_weight_audit enable row level security;
drop policy if exists "registrar read audit" on public.reg_weight_audit;
create policy "registrar read audit" on public.reg_weight_audit
  for select to authenticated using (public.is_registrar());

create or replace function public.reg_weight_components_audit()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' and (old.ww, old.pt, old.ex) is not distinct from (new.ww, new.pt, new.ex) then
    return new; -- label/sort touch only, not a weight change
  end if;
  insert into reg_weight_audit (sy, type_key, old_ww, old_pt, old_ex, new_ww, new_pt, new_ex, changed_by)
  values (new.sy, new.type_key,
          case when tg_op = 'UPDATE' then old.ww end,
          case when tg_op = 'UPDATE' then old.pt end,
          case when tg_op = 'UPDATE' then old.ex end,
          new.ww, new.pt, new.ex, auth.jwt() ->> 'email');
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists reg_weight_components_audit_t on public.reg_weight_components;
create trigger reg_weight_components_audit_t before insert or update on public.reg_weight_components
  for each row execute function public.reg_weight_components_audit();

-- ── 4. Seed SY 2026-2027 ────────────────────────────────────────────────────
-- Basic ed keeps the two splits it already had (DO 15 s.2026); SHS follows the
-- official list. The type_key carries the grade band because Grade 11 Core and
-- Grade 12 Core are genuinely different splits.
insert into public.reg_weight_components (sy, type_key, label, ww, pt, ex, sort_order) values
  ('2026-2027', 'core',            'Core Subjects (Nursery-Grade 10)',        20, 50, 30, 10),
  ('2026-2027', 'mapeh-tle',       'MAPEH / EPP-ICT / TLE-ICT (Gr. 4-10)',    20, 60, 20, 20),
  ('2026-2027', 'g11-core',        'Grade 11 - Core Subjects',                20, 50, 30, 30),
  ('2026-2027', 'g11-elective',    'Grade 11 - Academic Electives',           20, 50, 30, 40),
  ('2026-2027', 'g12-core',        'Grade 12 - Core Subjects',                25, 50, 25, 50),
  ('2026-2027', 'g12-applied',     'Grade 12 - Applied Subjects',             25, 45, 30, 60),
  ('2026-2027', 'g12-wir',         'Grade 12 - Work Immersion / Research',    35, 40, 25, 70),
  ('2026-2027', 'g12-specialized', 'Grade 12 - Specialized Subjects',         25, 45, 30, 80),
  ('2026-2027', 'g12-elective',    'Grade 12 - Elective Subject',             25, 45, 30, 90)
on conflict (sy, type_key) do nothing;  -- never clobber a registrar edit

-- ── 5. Which grade levels label the third component "QA" (PART D) ───────────
-- Display label ONLY. Same computation, same three sub-columns (Summative Test
-- 1, Summative Test 2, Term Examination). Configurable, not hardcoded.
create table if not exists public.reg_component_labels (
  sy          text not null references public.reg_school_years(code) on delete cascade,
  grade_level text not null,
  ex_label    text not null default 'EXs',
  primary key (sy, grade_level)
);
alter table public.reg_component_labels enable row level security;
drop policy if exists "registrar full access" on public.reg_component_labels;
create policy "registrar full access" on public.reg_component_labels
  for all to authenticated using (public.is_registrar()) with check (public.is_registrar());
drop policy if exists "authenticated read" on public.reg_component_labels;
create policy "authenticated read" on public.reg_component_labels
  for select to authenticated using (true);

-- Nursery..Grade 11 = "EXs", Grade 12 = "QA".
insert into public.reg_component_labels (sy, grade_level, ex_label)
select '2026-2027', c.grade_level,
       case when c.grade_level like 'XII%' then 'QA' else 'EXs' end
from (select distinct grade_level from reg_classes where sy = '2026-2027') c
on conflict (sy, grade_level) do nothing;

-- ── 6. Default the type for every EXISTING section x subject ────────────────
-- Only the subjects named in the official list are typed. Anything else stays
-- NULL and is surfaced as missing configuration.
create or replace function public.reg_default_subject_type(p_grade_level text, p_subject_code text)
returns text language sql immutable as $$
  select case
    -- ── Grade 12 (DO 8, s. 2015) ──
    when p_grade_level like 'XII%' then case
      when p_subject_code in ('MIL','IPH','PDE','PHD','DIS','PHS')            then 'g12-core'
      when p_subject_code in ('REP','ENT')                                    then 'g12-applied'
      when p_subject_code in ('PRA','PRE','WIM')                              then 'g12-wir'
      when p_subject_code in ('GEB','BIO','CHE','GPH','PHY','DAS','CWR',
                              'IWB','CNF','TNC','CSC','DRR')                  then 'g12-specialized'
      when p_subject_code in ('RCT')                                          then 'g12-elective'
    end
    -- ── Grade 11 (DO 15, s. 2026) ──
    when p_grade_level like 'XI%' then case
      when p_subject_code in ('GEM')                                          then 'g11-core'
      when p_subject_code in ('GEB','BIO','GPH','RBC')                        then 'g11-elective'
    end
    -- ── Nursery-Grade 10 (DO 15, s. 2026) ──
    -- EPP-ICT, TLE-ICT and the MAPEH components take 20/60/20; the rest 20/50/30.
    else case
      when p_subject_code in ('ECT','TLC','EPP','EPC','TLE','MAPEH','MAP',
                              'MUA','MUS','ART','PED','HEA')                  then 'mapeh-tle'
      else 'core'
    end
  end;
$$;

update public.reg_class_subjects cs
   set subject_type = public.reg_default_subject_type(c.grade_level, cs.subject_code)
  from public.reg_classes c
 where c.id = cs.class_id
   and cs.subject_type is null
   and public.reg_default_subject_type(c.grade_level, cs.subject_code) is not null;

-- ── 7. Resolve the weights for one section x subject ────────────────────────
-- Returns NO ROW when the type is unset or has no weights for that SY, so the
-- caller must block rather than guess.
create or replace function public.reg_weights_for(p_class_id uuid, p_subject_code text)
returns table(type_key text, label text, ww integer, pt integer, ex integer, ex_label text)
language sql stable security definer set search_path to 'public' as $$
  select w.type_key, w.label, w.ww, w.pt, w.ex,
         coalesce(l.ex_label, case when c.grade_level like 'XII%' then 'QA' else 'EXs' end)
  from reg_class_subjects cs
  join reg_classes c            on c.id = cs.class_id
  join reg_weight_components w  on w.sy = c.sy and w.type_key = cs.subject_type
  left join reg_component_labels l on l.sy = c.sy and l.grade_level = c.grade_level
  where cs.class_id = p_class_id and cs.subject_code = p_subject_code;
$$;

-- Every section x subject that cannot compute yet (PART B: flag, never guess).
create or replace function public.reg_untyped_class_subjects()
returns table(class_id uuid, sy text, grade_level text, section_name text,
              subject_code text, subject_name text)
language sql stable security definer set search_path to 'public' as $$
  select cs.class_id, c.sy, c.grade_level, c.section_name,
         cs.subject_code, coalesce(s.full_name, cs.subject_code)
  from reg_class_subjects cs
  join reg_classes c  on c.id = cs.class_id
  left join reg_subjects s on s.code = cs.subject_code
  where cs.subject_type is null
     or not exists (select 1 from reg_weight_components w
                    where w.sy = c.sy and w.type_key = cs.subject_type)
  order by c.grade_level, c.section_name, cs.subject_code;
$$;

grant execute on function public.reg_weights_for(uuid, text) to authenticated;
grant execute on function public.reg_untyped_class_subjects() to authenticated;
grant execute on function public.reg_default_subject_type(text, text) to authenticated;

-- ── 8. Roll the weights into a NEW school year (PART C.2) ───────────────────
-- Changes take effect on the NEXT school year: the registrar copies this year's
-- rows forward and edits the copy, leaving the current year's grades untouched.
create or replace function public.reg_copy_weights_to_sy(p_from_sy text, p_to_sy text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if not public.is_registrar() then raise exception 'Not authorized'; end if;
  insert into reg_weight_components (sy, type_key, label, ww, pt, ex, sort_order)
  select p_to_sy, type_key, label, ww, pt, ex, sort_order
  from reg_weight_components where sy = p_from_sy
  on conflict (sy, type_key) do nothing;
  get diagnostics n = row_count;
  insert into reg_component_labels (sy, grade_level, ex_label)
  select p_to_sy, grade_level, ex_label from reg_component_labels where sy = p_from_sy
  on conflict (sy, grade_level) do nothing;
  return n;
end;
$$;
grant execute on function public.reg_copy_weights_to_sy(text, text) to authenticated;

-- ── Sanity checks (optional) ────────────────────────────────────────────────
--   select * from public.reg_weight_components where sy = '2026-2027' order by sort_order;
--   select * from public.reg_untyped_class_subjects();
--   -- acceptance #7: DRRR in GAS must differ from DRRR in STEM
--   select public.reg_default_subject_type('XII-GAS','DRR'), public.reg_default_subject_type('XII-STEM','DIS');
