-- ─────────────────────────────────────────────────────────────────────────
-- Add an education-level tag to subjects so the catalog can be grouped into
-- Pre-School / Elementary / Junior High / Senior High. Run once in the Supabase
-- SQL editor. Safe to re-run (idempotent). Nullable, so the app keeps working
-- before this is applied (untagged subjects show under "Uncategorized").
-- ─────────────────────────────────────────────────────────────────────────

alter table public.reg_subjects
  add column if not exists level text;  -- 'preschool' | 'elem' | 'jhs' | 'shs'
