-- reg_nat_scores — 2026-07-21
-- National Achievement Test scores, entered by the registrar in Classes ▸ (a NAT
-- grade) ▸ NAT tab. One row per learner per SY; the five DepEd NAT learning areas
-- (0–100). NAT is administered at the exit grades (6, 10, 12). Applied live via
-- Supabase MCP; this file is the documentation record and is idempotent.
create table if not exists public.reg_nat_scores (
  sy         text not null,
  lrn        text not null,
  english    numeric,
  filipino   numeric,
  math       numeric,
  science    numeric,
  ap         numeric,
  updated_at timestamptz not null default now(),
  primary key (sy, lrn)
);
alter table public.reg_nat_scores enable row level security;
drop policy if exists "read all authed" on public.reg_nat_scores;
create policy "read all authed" on public.reg_nat_scores for select to authenticated using (true);
drop policy if exists "registrar writes" on public.reg_nat_scores;
create policy "registrar writes" on public.reg_nat_scores for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
