-- ============================================================================
--  Honor Criteria — Academic Excellence Award thresholds, per SY
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  A learner qualifies when the General Average reaches ga_min AND no
--  learning-area grade falls below grade_floor. School policy, editable per
--  school year with an audit row on each change. Award tiers and coverage
--  phase-in stay in code.
--
--  Defaults 90 / 80 (the current NPS Academic Excellence Award), so seeding
--  changes no result.
--
--  NOTE: already applied via MCP as migration `configurable_honor_criteria`.
-- ============================================================================
insert into public.reg_honor_criteria (sy, ga_min, grade_floor)
select code, 90, 80 from reg_school_years
on conflict (sy) do nothing;
