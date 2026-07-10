-- ════════════════════════════════════════════════════════════════════════
--  Fix: "Failed to assign the role" (PostgREST 400 on upsert)
--
--  The staff-portal `user_roles` table had only a PRIMARY KEY on `id` (uuid)
--  and NO unique constraint on `user_email`. The app assigned roles with
--  upsert(..., { onConflict: 'user_email' }), which requires a unique/exclusion
--  constraint on that column — without it PostgREST returns 400:
--    "there is no unique or exclusion constraint matching the ON CONFLICT ..."
--
--  This adds the missing constraint (one role per email). No duplicate emails
--  existed, so it applies cleanly. ALREADY APPLIED to the live DB via MCP on
--  2026-07-10 — kept here for the record / other environments.
-- ════════════════════════════════════════════════════════════════════════

alter table public.user_roles
  add constraint user_roles_user_email_key unique (user_email);
