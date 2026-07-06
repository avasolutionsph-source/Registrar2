-- ─────────────────────────────────────────────────────────────────────────
-- School-year configuration: per-month school days + per-term encoding deadline.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Adds the storage the Setup > School Year page needs so "Save changes" persists:
--   • reg_school_years.school_days  — { "jun": 11, "jul": 19, ... } month → class days
--   • reg_term_status.deadline      — last encoding day per term (also opens the term)
-- Both are additive/nullable, so the app keeps working before this is applied.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.reg_school_years
  add column if not exists school_days jsonb not null default '{}'::jsonb;

alter table public.reg_term_status
  add column if not exists deadline date;
