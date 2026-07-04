-- ─────────────────────────────────────────────────────────────────────────
-- Attitude scale: numerical attitude score → letter on the subject grade sheet.
-- Registrar-configurable (Setup → Grade Weights). Already applied to the live
-- DB via MCP; kept here for the repo record. Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.reg_attitude_scale (
  letter     text primary key,
  label      text not null default '',
  min        integer not null check (min between 0 and 100),
  updated_at timestamptz not null default now()
);

drop trigger if exists reg_attitude_scale_touch on public.reg_attitude_scale;
create trigger reg_attitude_scale_touch before update on public.reg_attitude_scale
  for each row execute function public.reg_touch_updated_at();

alter table public.reg_attitude_scale enable row level security;
drop policy if exists "registrar full access" on public.reg_attitude_scale;
create policy "registrar full access" on public.reg_attitude_scale
  for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

insert into public.reg_attitude_scale (letter, label, min) values
  ('O',  'Outstanding',         90),
  ('VS', 'Very Satisfactory',   85),
  ('S',  'Satisfactory',        80),
  ('FS', 'Fairly Satisfactory', 75),
  ('NI', 'Needs Improvement',    0)
on conflict (letter) do nothing;
