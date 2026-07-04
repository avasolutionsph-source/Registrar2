-- ─────────────────────────────────────────────────────────────────────────
-- Registrar-configurable grade weights (WW / PT / Exam split per learning-area
-- group). Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- The app (Setup → Grade Weights) reads/writes this table. Any group without a
-- row falls back to the DepEd default baked into the app (grading.ts), so the
-- system keeps working even before this table is seeded.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.reg_grade_weights (
  area_group text primary key,
  ww         integer not null check (ww between 0 and 100),
  pt         integer not null check (pt between 0 and 100),
  st         integer not null check (st between 0 and 100),
  updated_at timestamptz not null default now(),
  -- the three components must always total 100
  constraint reg_grade_weights_sum_100 check (ww + pt + st = 100)
);

-- keep updated_at fresh (reuses the shared trigger fn from setup-registrar.sql)
drop trigger if exists reg_grade_weights_touch on public.reg_grade_weights;
create trigger reg_grade_weights_touch before update on public.reg_grade_weights
  for each row execute function public.reg_touch_updated_at();

-- RLS: registrar + admin only (same policy shape as the other reg_* tables)
alter table public.reg_grade_weights enable row level security;
drop policy if exists "registrar full access" on public.reg_grade_weights;
create policy "registrar full access" on public.reg_grade_weights
  for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

-- Seed the DepEd defaults (only inserts groups not already present; existing
-- registrar-edited rows are left untouched).
insert into public.reg_grade_weights (area_group, ww, pt, st) values
  ('core',          20, 50, 30),
  ('mapeh-tle',     20, 60, 20),
  ('shs-core',      20, 50, 30),
  ('shs-field',     15, 70, 15),
  ('shs-arts',      20, 60, 20),
  ('shs-research',  40, 60,  0),
  ('shs-techpro',   15, 65, 20),
  ('shs-immersion', 20, 80,  0)
on conflict (area_group) do nothing;
