-- ════════════════════════════════════════════════════════════════════════
--  Per-grade / per-strand ordered subject list  (reg_grade_subjects)
--
--  Drives the Report Card (SF9) and grade-encoding subject order. Curated in
--  Setup ▸ Subjects: pick a grade level (SHS = pick the strand) → the subjects
--  appear in order → drag to reorder / add / remove.
--
--  ALREADY APPLIED to the live DB via MCP (migrations grade_subjects_order and
--  grade_subjects_g12_strand_order). Kept here as the versioned source.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.reg_grade_subjects (
  grade_level text not null,
  subject_code text not null references public.reg_subjects(code) on delete cascade,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (grade_level, subject_code)
);

alter table public.reg_grade_subjects enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='reg_grade_subjects' and policyname='grade_subjects read') then
    create policy "grade_subjects read" on public.reg_grade_subjects for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reg_grade_subjects' and policyname='grade_subjects write') then
    create policy "grade_subjects write" on public.reg_grade_subjects for all using (public.is_registrar()) with check (public.is_registrar());
  end if;
end $$;

-- Default seed: every grade gets its stage-appropriate catalog subjects, in
-- catalog order (SHS strands start with the full SHS set, curated per strand).
with grades(gl, stage) as (values
  ('N1','preschool'),('N2','preschool'),('N','preschool'),('P','preschool'),('K','preschool'),
  ('I','elem'),('II','elem'),('III','elem'),('IV','elem'),('V','elem'),('VI','elem'),('S','elem'),
  ('VII','jhs'),('VIII','jhs'),('IX','jhs'),('X','jhs'),
  ('XI-STEM','shs'),('XI-HUMSS','shs'),('XI-GAS','shs'),('XI-ABM','shs'),
  ('XI-ASSH','shs'),('XI-STEM-ENG','shs'),('XI-STEM-HA','shs'),
  ('XII-STEM','shs'),('XII-HUMSS','shs'),('XII-GAS','shs'),('XII-ABM','shs'),
  ('XII-ASSH','shs'),('XII-STEM-ENG','shs'),('XII-STEM-HA','shs')
)
insert into public.reg_grade_subjects(grade_level, subject_code, sort_order)
select g.gl, s.code,
       row_number() over (partition by g.gl order by s.sort_order nulls last, s.code)
from grades g
join public.reg_subjects s on (
  case g.stage when 'shs' then s.level = 'shs'
               else (s.level = g.stage or s.level is null) end
)
on conflict (grade_level, subject_code) do nothing;

-- Exact SF9 order for the Grade-12 strands (codes mapped from the sample cards).
do $$
declare
  v_stem text[] := array['MIL','IPH','PDE','PHD','PRA','GEB','BIO','CHE','GPH','WIM','RCT','DRR','PRE','REP','ENT','PHY'];
  v_humss text[] := array['MIL','IPH','PHD','PRA','CWR','DAS','PHS','IWB','CNF','WIM','RCT','PRE','REP','ENT','TNC','CSC'];
  v_gas text[] := array['MIL','IPH','PHD','PRA','DAS','PHS','APE','IWB','WIM','ORM','RCT','PRE','REP','ENT','DRR','TNC'];
  v_gl text;
  v_codes text[];
begin
  foreach v_gl in array array['XII-STEM','XII-HUMSS','XII-GAS'] loop
    v_codes := case v_gl when 'XII-STEM' then v_stem when 'XII-HUMSS' then v_humss else v_gas end;
    delete from public.reg_grade_subjects where grade_level = v_gl;
    insert into public.reg_grade_subjects(grade_level, subject_code, sort_order)
    select v_gl, code, ord
    from unnest(v_codes) with ordinality as t(code, ord)
    where exists (select 1 from public.reg_subjects s where s.code = t.code)
    on conflict (grade_level, subject_code) do nothing;
  end loop;
end $$;
