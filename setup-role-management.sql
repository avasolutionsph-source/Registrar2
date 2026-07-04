-- ─────────────────────────────────────────────────────────────────────────
-- Let the REGISTRAR (and admin) manage account roles from Setup ▸ Accounts &
-- Roles. Run once in the Supabase SQL editor. Additive — existing policies
-- (e.g. each user reading their own role at login) are left in place.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_roles enable row level security;

drop policy if exists "registrar admin manage roles" on public.user_roles;
create policy "registrar admin manage roles" on public.user_roles
  for all to authenticated
  using (public.is_role('admin') or public.is_role('registrar'))
  with check (public.is_role('admin') or public.is_role('registrar'));
