-- ============================================================================
--  ROLLBACK: alisin ang sirang term-coverage guard  (2026-07-30)
--  Paste-run sa Supabase ▸ SQL Editor. Safe to re-run.
--
--  ANG PAGKAKAMALI: ang setup-enforce-subject-term.sql (tanggal na sa repo)
--  ay nagsingit ng tseke na tumutukoy sa `p_period`. WALANG ganoong parameter
--  ang teacher_save_grades — ang lagda nito ay (p_lrn, p_sy, p_subject_code,
--  p_entry), at BUONG subject entry ang sine-save nito, hindi isang term.
--  Kaya bawat pagsave ng guro ay bumabagsak sa:
--      column "p_period" does not exist
--
--  Bakit hindi ito nahuli ng VERIFY ng file na iyon: tumitingin lang iyon kung
--  NANDOON ANG TEKSTO sa function definition, hindi kung TUMATAKBO ito. Isang
--  tseke na hindi kayang mabigo.
--
--  Inaalis nito ang idinagdag na block at ibinabalik ang function sa dating
--  asal. Buo pa rin ang ibang guard: may-ari ng row, per-term owner ng rotating
--  subject, at ang lock ng naipasa nang term.
--
--  ANG PROTEKSYON SA TERM AY NANDIYAN PA RIN sa portal: ang term na hindi
--  iniaalok ay view-only pa rin at naka-block ang Save. UI lang ito ngayon,
--  wala nang kandado sa database — at iyon muna ang tama hangga't hindi
--  nalilinis ang SHS curriculum.
-- ============================================================================

do $$
declare
  v_def   text;
  v_added text;
  v_from  text := '    raise exception ''Not authorized to grade this subject for this learner'';';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'teacher_save_grades'
  limit 1;

  if v_def is null then
    raise exception 'Walang teacher_save_grades sa database na ito';
  end if;

  if position('is not offered in' in v_def) = 0 then
    raise notice 'Wala namang term guard - walang inalis.';
    return;
  end if;

  v_added := v_from || '
  end if;

  if v_tt is null and v_term is not null
     and not (p_period = any (string_to_array(v_term, '','')))
  then
    raise exception ''% is not offered in this term for this section.'', p_subject_code;';

  execute replace(v_def, v_added, v_from);
  raise notice 'Inalis ang term-coverage guard.';
end $$;

notify pgrst, 'reload schema';


-- ═══ VERIFY ════════════════════════════════════════════════════════════════
-- guard_pa_rin dapat FALSE, at ang smoke test dapat walang error.
select (pg_get_functiondef('public.teacher_save_grades(text,text,text,jsonb)'::regprocedure)
        like '%is not offered in this term%')::text as guard_pa_rin;
