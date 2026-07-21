-- Setup ▸ Promotion & Grading Rules (reg_grading_policy) — 2026-07-21
-- Makes the last hardcoded grading constants configurable per school year.
-- Every column defaults to its previous in-code value, so an unseeded year
-- grades identically. Already applied to the live DB via Supabase MCP; this
-- file is the documentation record and is idempotent.

create table if not exists reg_grading_policy (
  sy                        text primary key,
  passing_grade             integer not null default 75,   -- Passed/Failed + promotion cutoff
  remedial_max_fails        integer not null default 2,    -- fails allowed for remedial (else retained)
  ga_decimals               integer not null default 0,    -- decimals on the displayed General Average
  tiebreak_decimals         integer not null default 2,    -- decimals kept for ranking tiebreak (gaExact)
  round_ig_before_transmute boolean not null default true, -- round Initial Grade before transmutation lookup
  numerical_floor           integer not null default 2,    -- first NUMBERED grade that is numerical (below = descriptive)
  honor_min_grade           integer not null default 4,    -- lowest honor-eligible grade level
  honor_regime              text    not null default 'excellence', -- 'excellence' | 'tiered'
  tier_with                 integer not null default 90,   -- tiered regime: With Honors GA
  tier_high                 integer not null default 95,   -- tiered regime: With High Honors GA
  tier_highest              integer not null default 98,   -- tiered regime: With Highest Honors GA
  updated_at                timestamptz not null default now()
);

-- RLS: everyone signed in may read; only the registrar may change it.
alter table public.reg_grading_policy enable row level security;
drop policy if exists "read all authed" on public.reg_grading_policy;
create policy "read all authed" on public.reg_grading_policy for select to authenticated using (true);
drop policy if exists "registrar writes" on public.reg_grading_policy;
create policy "registrar writes" on public.reg_grading_policy for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());

insert into reg_grading_policy
  (sy, passing_grade, remedial_max_fails, ga_decimals, tiebreak_decimals,
   round_ig_before_transmute, numerical_floor, honor_min_grade, honor_regime,
   tier_with, tier_high, tier_highest)
values
  ('2026-2027', 75, 2, 0, 2, true, 2, 2, 'excellence', 90, 95, 98)
on conflict (sy) do nothing;
