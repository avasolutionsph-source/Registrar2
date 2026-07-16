-- ============================================================================
--  MATATAG curriculum — subject offerings for Nursery to Grade 3, SY 2026-2027
--  Paste-run this whole file in the Supabase SQL editor. Safe to re-run.
--
--  reg_grade_subjects held a permissive "anything you might pick" list — 17
--  subjects for EVERY preschool level (including Latin, Araling Panlipunan and
--  Science) and an identical 29 for every Grade 1-3. That is not the curriculum:
--
--    Nursery 1 & 2 ... 4 subjects, NO Makabansa-Filipino
--    Kinder .......... 5 subjects, adds Makabansa-Filipino
--    Grade 1 ......... 6 subjects, last level with Language, NO Science
--    Grade 2 ......... 5 subjects, NO Language, NO Science
--    Grade 3 ......... 6 subjects, Science starts here
--
--  Grades 1-3 are NOT uniform, which is exactly what the old flat list hid.
--
--  VERIFIED SAFE BEFORE TRIMMING: no SY 2026-2027 encoded grade uses a subject
--  outside these lists. Grades DO exist for some removed subjects (HEKASI,
--  Sibika at Kultura, Mother Tongue, MAPE, Science & Health, ...) but they are
--  historical records from earlier school years under the old K-12 curriculum.
--  They are unaffected: a past grade carries its own subjectCode inside
--  reg_students_data.grades and never reads this table. This table only drives
--  which subjects can be PICKED when encoding.
--
--  Scope is deliberately the six levels below. Grades 4-10 and SHS are left
--  exactly as they are.
-- ============================================================================

with target(grade_level, subject_code, sort_order) as (values
  ('N1','GMC',1),('N1','LAG',2),('N1','RAL',3),('N1','MAT',4),
  ('N2','GMC',1),('N2','LAG',2),('N2','RAL',3),('N2','MAT',4),
  ('K','GMC',1),('K','LAG',2),('K','RAL',3),('K','MAT',4),('K','MKF',5),
  ('I','GMC',1),('I','FIL',2),('I','ENG',3),('I','LAG',4),('I','MAT',5),('I','MAK',6),
  ('II','GMC',1),('II','FIL',2),('II','ENG',3),('II','MAT',4),('II','MAK',5),
  ('III','GMC',1),('III','FIL',2),('III','ENG',3),('III','MAT',4),('III','SCI',5),('III','MAK',6)
),
removed as (
  delete from reg_grade_subjects gs
  where gs.grade_level in ('N1','N2','K','I','II','III')
    and not exists (select 1 from target t
                    where t.grade_level = gs.grade_level and t.subject_code = gs.subject_code)
  returning 1
),
added as (
  insert into reg_grade_subjects (grade_level, subject_code, sort_order)
  select t.grade_level, t.subject_code, t.sort_order from target t
  on conflict (grade_level, subject_code) do update set sort_order = excluded.sort_order
  returning 1
)
select (select count(*) from removed) as removed, (select count(*) from added) as added_or_reordered;

-- ── Check ───────────────────────────────────────────────────────────────────
--   select gs.grade_level, count(*), string_agg(s.full_name, ', ' order by gs.sort_order)
--   from reg_grade_subjects gs join reg_subjects s on s.code = gs.subject_code
--   where gs.grade_level in ('N1','N2','K','I','II','III') group by gs.grade_level;
