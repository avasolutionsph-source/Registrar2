-- reg_officials — 2026-07-21
-- School officials / signatories printed on Form 137/138/SF10 & the Tracking
-- Record. One row per position; free-text name + title so a signatory need not
-- be in the teachers table. Registrar-editable in Setup ▸ Admin. Applied live via
-- Supabase MCP; this file is the documentation record and is idempotent.
create table if not exists public.reg_officials (
  position_key text primary key,
  person_name  text not null default '',
  title        text not null default '',
  updated_at   timestamptz not null default now()
);
alter table public.reg_officials enable row level security;
drop policy if exists "read all authed" on public.reg_officials;
create policy "read all authed" on public.reg_officials for select to authenticated using (true);
drop policy if exists "registrar writes" on public.reg_officials;
create policy "registrar writes" on public.reg_officials for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

insert into public.reg_officials (position_key, person_name, title) values
  ('registrar','Marites C. Ramos','Registrar'),
  ('principal','','Principal')
on conflict (position_key) do nothing;
