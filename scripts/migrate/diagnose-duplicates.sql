-- ════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC (read-only) — sagutin ang tanong: doble ba ang data sa reg_students?
-- I-paste lahat sa Supabase SQL editor at tingnan ang 4 na resulta.
-- Walang binabago / binubura — SELECT lang.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Ilang rows lahat vs. ilang NATATANGING estudyante (by student_no)?
--    Kung mas malaki ang total kaysa distinct → may duplicate (doble ang import).
select
  count(*)                              as total_rows,
  count(distinct student_no)            as distinct_student_no,
  count(distinct lrn)                   as distinct_lrn,
  count(*) - count(distinct student_no) as extra_rows_estimate
from reg_students;

-- 2) Pinakamaraming na-doble na estudyante (dapat 1 lang ang count kada isa).
--    Kung may lalabas dito na count > 1 → kumpirmadong doble.
select student_no,
       max(last_name)  as last_name,
       max(first_name) as first_name,
       count(*)        as row_count
from reg_students
group by student_no
having count(*) > 1
order by row_count desc
limit 25;

-- 3) Anong mga current_sy ang nasa table, ilang rows kada isa?
--    Sa TAMANG import: ~600–700 lang ang current_sy = '2025-2026' (active),
--    at lahat ng iba ay 'Graduated' (lumang taon). Kung pantay-pantay na malaki
--    kada taon → tanda ng one-row-per-enrolment (maling import).
select coalesce(current_sy, '(wala)') as current_sy,
       count(*) as rows
from reg_students
group by current_sy
order by current_sy;

-- 4) Ilang students ang may laman ang enrolment_history (>1 taon)?
--    Sa TAMANG import, marami dapat ang may history; sa maling import,
--    karamihan ay 1 taon lang ang laman.
select
  count(*) filter (where jsonb_array_length(coalesce(enrolment_history,'[]'::jsonb)) = 0) as zero_years,
  count(*) filter (where jsonb_array_length(coalesce(enrolment_history,'[]'::jsonb)) = 1) as one_year,
  count(*) filter (where jsonb_array_length(coalesce(enrolment_history,'[]'::jsonb)) > 1) as many_years
from reg_students;
