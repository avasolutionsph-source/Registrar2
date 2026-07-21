-- reg_school_profile — 2026-07-21
-- School identity printed on every official form (Form 137/138/SF9/SF10). Single
-- row, registrar-editable in Setup ▸ School Profile. Seeded with the values that
-- were previously hardcoded in forms.ts SCHOOL. Applied live via Supabase MCP;
-- this file is the documentation record and is idempotent.
create table if not exists public.reg_school_profile (
  id       text primary key default 'main',
  name     text not null,
  school_id text not null,
  address  text not null default '',
  district text not null default '',
  division text not null default '',
  region   text not null default '',
  type     text not null default 'Private',
  updated_at timestamptz not null default now()
);
alter table public.reg_school_profile enable row level security;
drop policy if exists "read all authed" on public.reg_school_profile;
create policy "read all authed" on public.reg_school_profile for select to authenticated using (true);
drop policy if exists "registrar writes" on public.reg_school_profile;
create policy "registrar writes" on public.reg_school_profile for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

insert into public.reg_school_profile (id, name, school_id, address, district, division, region, type)
values ('main','Naga Parochial School','403875','Caceres St., Naga City','Naga City','Naga City','Region V (Bicol)','Private')
on conflict (id) do nothing;
