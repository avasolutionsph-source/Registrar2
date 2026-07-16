-- ============================================================================
--  SHS Subject Offerings per Section and Term — SY 2026-2027
--  Paste-run this whole file in the Supabase SQL editor. Safe to re-run.
--
--  Three things, in order:
--    1. the nine Grade 11 subjects that had no row in the catalog at all
--    2. a TERM dimension on a section's subject list
--    3. the official distribution, per section, per term
--
--  WHY THE SECTION AND NOT THE GRADE LEVEL
--  ────────────────────────────────────────
--  reg_class_subjects is keyed (class_id, subject_code) — the SECTION, not the
--  grade level. That is what makes the two Grade 11 STEM sections work: St.
--  Carlo Acutis (Engineering) and St. Catherine of Siena (Health Allied) share
--  grade_level 'XI-STEM' but offer completely different electives. Nothing here
--  needs the grade_level labels renamed.
--
--  term NULL = offered in ALL terms. Every Nursery-Grade 10 subject and every
--  Grade 11 Core subject is that, so existing rows keep working untouched —
--  this column only narrows a row that explicitly sets a term.
--
--  The key stays (class_id, subject_code): a subject is offered once per
--  section. Verified against the official distribution — no section lists the
--  same subject in two terms. If that ever changes, the primary key has to grow.
-- ============================================================================

-- ── 1. The nine missing Grade 11 subjects (DO 15, s.2026) ───────────────────
-- Category is cosmetic for SHS now: the grade split comes from
-- reg_class_subjects.subject_type via reg_default_subject_type(), not from it.
insert into public.reg_subjects (code, full_name, abbreviation, category, level, sort_order) values
  ('EFC', 'Effective Communication / Mabisang Komunikasyon', 'Eff. Comm.', 'Core', 'shs', 610),
  ('GSC', 'General Science',                                  'Gen. Sci.',  'Core', 'shs', 611),
  ('PKL', 'Pag-aaral ng Kasaysayan at Lipunang Filipino',     'PKLF',       'Core', 'shs', 612),
  ('LCS', 'Life and Career Skills',                           'LCS',        'Core', 'shs', 613),
  ('CL1', 'Contemporary Literature 1',                        'Cont. Lit 1','Elective', 'shs', 620),
  ('CL2', 'Contemporary Literature 2',                        'Cont. Lit 2','Elective', 'shs', 621),
  ('INP', 'Introduction to Philosophy',                       'Intro Philo','Elective', 'shs', 622),
  ('FM1', 'Finite Mathematics 1',                             'Finite M1',  'Elective', 'shs', 623),
  ('FM2', 'Finite Mathematics 2',                             'Finite M2',  'Elective', 'shs', 624)
on conflict (code) do nothing;

-- Grade 11 Core and Academic Electives both take 20/50/30, but they stay
-- distinct types because the official tables list them separately and may
-- diverge in a later school year.
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
    else case
      when p_subject_code in ('ECT','TLC','EPP','EPC','TLE','MAPEH','MAP',
                              'MUA','MUS','ART','PED','HEA')                  then 'mapeh-tle'
      else 'core'
    end
  end;
$$;

-- ── 2. The term dimension ───────────────────────────────────────────────────
alter table public.reg_class_subjects add column if not exists term text;
alter table public.reg_class_subjects drop constraint if exists reg_class_subjects_term_valid;
alter table public.reg_class_subjects
  add constraint reg_class_subjects_term_valid
  check (term is null or term in ('q1','q2','q3','q4'));
comment on column public.reg_class_subjects.term is
  'Term the subject is offered in for this section (q1/q2/q3). NULL = all terms.';

-- ── 3. The official distribution ────────────────────────────────────────────
with sect(section_name, grade_level, class_id) as (
  select c.section_name, c.grade_level, c.id from reg_classes c
  where c.sy = '2026-2027' and c.grade_level like 'X%'
),
offering(section_name, subject_code, term) as (values
  -- GRADE 11 CORE — all three sections, every term
  ('St. Paul VI','EFC',null),('St. Paul VI','GEM',null),('St. Paul VI','GSC',null),
  ('St. Paul VI','PKL',null),('St. Paul VI','LCS',null),
  ('St. Carlo Acutis','EFC',null),('St. Carlo Acutis','GEM',null),('St. Carlo Acutis','GSC',null),
  ('St. Carlo Acutis','PKL',null),('St. Carlo Acutis','LCS',null),
  ('St. Catherine of Siena','EFC',null),('St. Catherine of Siena','GEM',null),
  ('St. Catherine of Siena','GSC',null),('St. Catherine of Siena','PKL',null),
  ('St. Catherine of Siena','LCS',null),
  -- GRADE 11 ELECTIVES — ASSH (St. Paul VI)
  ('St. Paul VI','CL1','q1'),('St. Paul VI','RBC','q1'),
  ('St. Paul VI','CL2','q2'),('St. Paul VI','INP','q3'),
  -- GRADE 11 ELECTIVES — STEM Engineering (St. Carlo Acutis)
  ('St. Carlo Acutis','GPH','q1'),('St. Carlo Acutis','RBC','q1'),
  ('St. Carlo Acutis','FM1','q2'),('St. Carlo Acutis','FM2','q3'),
  -- GRADE 11 ELECTIVES — STEM Health Allied (St. Catherine of Siena)
  ('St. Catherine of Siena','GEB','q1'),
  ('St. Catherine of Siena','GPH','q2'),('St. Catherine of Siena','BIO','q2'),
  ('St. Catherine of Siena','RBC','q3'),
  -- GRADE 12 — GAS (St. Teresa of Avila)
  ('St. Teresa of Avila','MIL','q1'),('St. Teresa of Avila','IPH','q1'),
  ('St. Teresa of Avila','PHD','q1'),('St. Teresa of Avila','PRA','q1'),
  ('St. Teresa of Avila','DAS','q1'),
  ('St. Teresa of Avila','PHS','q2'),('St. Teresa of Avila','APE','q2'),
  ('St. Teresa of Avila','IWB','q2'),('St. Teresa of Avila','ORM','q2'),
  ('St. Teresa of Avila','WIM','q2'),('St. Teresa of Avila','RCT','q2'),
  ('St. Teresa of Avila','PRE','q3'),('St. Teresa of Avila','REP','q3'),
  ('St. Teresa of Avila','ENT','q3'),('St. Teresa of Avila','DRR','q3'),
  ('St. Teresa of Avila','TNC','q3'),
  -- GRADE 12 — HUMSS (St. Clare of Assisi)
  ('St. Clare of Assisi','MIL','q1'),('St. Clare of Assisi','IPH','q1'),
  ('St. Clare of Assisi','PHD','q1'),('St. Clare of Assisi','PRA','q1'),
  ('St. Clare of Assisi','CWR','q1'),('St. Clare of Assisi','DAS','q1'),
  ('St. Clare of Assisi','PHS','q2'),('St. Clare of Assisi','CNF','q2'),
  ('St. Clare of Assisi','IWB','q2'),('St. Clare of Assisi','ORM','q2'),
  ('St. Clare of Assisi','WIM','q2'),('St. Clare of Assisi','RCT','q2'),
  ('St. Clare of Assisi','PRE','q3'),('St. Clare of Assisi','REP','q3'),
  ('St. Clare of Assisi','ENT','q3'),('St. Clare of Assisi','TNC','q3'),
  ('St. Clare of Assisi','CSC','q3'),
  -- GRADE 12 — STEM (St. Joan of Arc)
  ('St. Joan of Arc','MIL','q1'),('St. Joan of Arc','IPH','q1'),
  ('St. Joan of Arc','PDE','q1'),('St. Joan of Arc','PHD','q1'),
  ('St. Joan of Arc','PRA','q1'),('St. Joan of Arc','GEB','q1'),
  ('St. Joan of Arc','BIO','q2'),('St. Joan of Arc','CHE','q2'),
  ('St. Joan of Arc','GPH','q2'),('St. Joan of Arc','WIM','q2'),
  ('St. Joan of Arc','RCT','q2'),
  ('St. Joan of Arc','DIS','q3'),('St. Joan of Arc','PRE','q3'),
  ('St. Joan of Arc','REP','q3'),('St. Joan of Arc','ENT','q3'),
  ('St. Joan of Arc','PHY','q3')
)
insert into reg_class_subjects (class_id, subject_code, term, subject_type)
select s.class_id, o.subject_code, o.term,
       public.reg_default_subject_type(s.grade_level, o.subject_code)
from offering o join sect s on s.section_name = o.section_name
on conflict (class_id, subject_code) do update
  set term = excluded.term,
      subject_type = coalesce(reg_class_subjects.subject_type, excluded.subject_type);

-- ── Checks ──────────────────────────────────────────────────────────────────
--   -- the two XI-STEM sections must differ:
--   select c.section_name, cs.term, string_agg(cs.subject_code, ', ' order by cs.subject_code)
--   from reg_class_subjects cs join reg_classes c on c.id = cs.class_id
--   where c.grade_level = 'XI-STEM' and cs.term is not null
--   group by c.section_name, cs.term order by 1, 2;
--
--   -- nothing may be left without a type:
--   select * from public.reg_untyped_class_subjects();
