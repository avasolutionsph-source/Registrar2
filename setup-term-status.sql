-- ─────────────────────────────────────────────────────────────────────────
-- Per-SY, per-term encoding switch (open/close grade encoding for teachers).
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- A row with is_open=false CLOSES encoding for that term; no row (or true) = OPEN.
-- The registrar opens after setup, closes to finalize honors, reopens for the
-- next term. The teacher gradebook reads this to show a "closed" banner and
-- disable saving. (App treats a missing table as "all open", so it keeps
-- working before this is run.)
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.reg_term_status (
  sy         text not null,
  term       text not null,          -- period key: q1 | q2 | q3 | q4
  is_open    boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (sy, term)
);

drop trigger if exists reg_term_status_touch on public.reg_term_status;
create trigger reg_term_status_touch before update on public.reg_term_status
  for each row execute function public.reg_touch_updated_at();

alter table public.reg_term_status enable row level security;

drop policy if exists "registrar full access" on public.reg_term_status;
create policy "registrar full access" on public.reg_term_status
  for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

drop policy if exists "teacher read term status" on public.reg_term_status;
create policy "teacher read term status" on public.reg_term_status
  for select to authenticated using (public.is_teacher());
