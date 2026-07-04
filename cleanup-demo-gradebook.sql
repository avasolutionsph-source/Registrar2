-- ─────────────────────────────────────────────────────────────────────────
-- Remove the demo/sample gradebook data so the system is production-clean.
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- This deletes ONLY the sample section, its 3 demo learners, and their subject
-- assignments. Real data is untouched.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) demo teaching load (subject↔teacher for the demo class)
delete from public.reg_class_subjects
where class_id = 'a0000000-0000-4000-8000-000000000001';

-- 2) the 3 demo learners
delete from public.reg_students_data
where lrn in ('990000000001', '990000000002', '990000000003');

-- 3) the demo section itself
delete from public.reg_classes
where id = 'a0000000-0000-4000-8000-000000000001';

-- 4) OPTIONAL — remove the sample teacher record + its portal role.
--    Skip these two lines if you still want to log in as sampleteacher1@gmail.com
--    to test (with no demo data, the gradebook will simply show
--    "No subjects assigned" until you assign a real teaching load).
delete from public.reg_teachers
where id = 190 and email = 'sampleteacher1@gmail.com';

delete from public.user_roles
where user_email = 'sampleteacher1@gmail.com';
