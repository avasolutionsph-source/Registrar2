-- reg_honor_exclusions — 2026-07-21
-- Manual derogatory-record screening for the Academic Excellence Award. A row
-- means the learner is excluded from that SY's award even if their grades
-- qualify. Toggled on the Honor Students report. Applied live via Supabase MCP;
-- this file is the documentation record and is idempotent.
create table if not exists public.reg_honor_exclusions (
  sy         text not null,
  lrn        text not null,
  reason     text not null default '',
  updated_at timestamptz not null default now(),
  primary key (sy, lrn)
);
alter table public.reg_honor_exclusions enable row level security;
drop policy if exists "registrar only" on public.reg_honor_exclusions;
create policy "registrar only" on public.reg_honor_exclusions for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
