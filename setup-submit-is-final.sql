-- ============================================================================
--  ANG PAGPASA PARA SA CHECKING AY PINAL NA  (2026-07-29)
--  Paste-run ang BUONG file sa Supabase ▸ SQL Editor. Safe to re-run.
--  Patakbuhin PAGKATAPOS ng setup-teacher-submit-for-checking.sql.
--
--  DATI: pagkatapos pindutin ng teacher ang "Ipasa para sa checking"
--  ('for_rechecking'), nakaka-edit pa rin siya ng grado at pwede pang BAWIIN
--  ang pagpapasa. Ibig sabihin, maaaring magbago ang sheet HABANG o
--  PAGKATAPOS itong tingnan ng checker — walang katiyakan kung ano ba talaga
--  ang inaprubahan.
--
--  NGAYON: ang pagpasa ay PINAL. Hindi na mababago ang grado at hindi na
--  mababawi ng teacher. Ang checker lang ang makakapagbukas nito ulit sa
--  pamamagitan ng RETURN (needs_revision) — na siyang tamang landas dahil
--  naitatala ang dahilan at nakikita ito ng teacher.
--
--  Dalawang bahagi:
--   • PART 1 — hindi na tumatanggap ng undo ang teacher_submit_for_checking
--   • PART 2 — sakop na rin ng edit-lock ng teacher_save_grades ang
--     'for_rechecking' (dati ay 'submitted' lang)
-- ============================================================================


-- ═══ PART 1 — tanggalin ang pagbawi ════════════════════════════════════════
-- Pinapanatili ang parameter na p_undo (para hindi masira ang mga umiiral na
-- tawag at hindi kailanganin ng bagong schema reload) — tinatanggihan na lang
-- ito nang may malinaw na paliwanag.

create or replace function public.teacher_submit_for_checking(
  p_subject_code text, p_sy text, p_period text, p_undo boolean default false)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_target bigint;
  v_status text;
begin
  if p_subject_code is null or p_sy is null or p_period is null then
    raise exception 'Missing arguments';
  end if;

  -- Ang pagpasa ay PINAL: ang checker lang ang makakapagbukas nito ulit.
  if p_undo then
    raise exception 'Hindi na mababawi ang naipasa. Kung may aayusin, hilingin sa checker na ibalik (Return) ang term na ito.';
  end if;

  v_target := public.teacher_sheet_owner(p_subject_code);
  if v_target is null then
    raise exception 'Hindi mo hawak ang subject na ito';
  end if;

  -- Ang term ay dapat talagang sakop ng may-ari sa kahit isang section —
  -- kapareho ng guard ng sas_submit_to_registrar.
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and ( (cs.term_teachers is null and cs.teacher_id = v_target
             and (cs.term is null or p_period = any (string_to_array(cs.term, ','))))
         or (case when (cs.term_teachers ->> p_period) ~ '^\d+$'
                  then (cs.term_teachers ->> p_period)::bigint end) = v_target )
  ) then
    raise exception 'Ang % ng % ay hindi mo hawak', p_period, p_subject_code;
  end if;

  select r.status into v_status
  from sas_grade_reviews r
  where r.teacher_id = v_target and r.subject_code = p_subject_code
    and r.sy = p_sy and r.period = p_period;

  if v_status = 'submitted' then
    raise exception 'Naipasa na ito sa Registrar - hindi na ito mababago';
  end if;
  if v_status = 'for_rechecking' then
    raise exception 'Naipasa na ang term na ito para sa checking';
  end if;

  insert into sas_grade_reviews (teacher_id, subject_code, sy, period,
                                 status, popup_seen, updated_at)
  values (v_target, p_subject_code, p_sy, p_period, 'for_rechecking', true, now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'for_rechecking',
        popup_seen = true,
        updated_at = now();
end;
$function$;
grant execute on function public.teacher_submit_for_checking(text, text, text, boolean) to authenticated;


-- ═══ PART 2 — sakop na ng edit-lock ang 'for_rechecking' ════════════════════
-- Ang teacher_save_grades ay mahaba at APAT na migration file ang humipo rito
-- (sas-review, sas-review-lock, combination-subjects, substitute-teacher), kaya
-- HINDI ito muling isinusulat dito — baka mag-iba sa live. Sa halip, kinukuha
-- ang KASALUKUYANG definition mula sa katalogo at isang target na palitan lang
-- ang ginagawa: ang status filter ng lock loop. Kapag hindi tumama ang hanap,
-- SUMASABOG ito sa halip na tahimik na walang gawin.

do $$
declare
  v_def  text;
  v_new  text;
  v_from text := 'and r.status = ''submitted''';
  v_to   text := 'and r.status in (''submitted'', ''for_rechecking'')';
  v_msg_from text := 'Term % of % was submitted to the Registrar and can no longer be edited.';
  v_msg_to   text := 'Naipasa na ang % ng % - hindi na ito mababago. Hilingin sa checker na ibalik ito kung may aayusin.';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'teacher_save_grades'
  limit 1;

  if v_def is null then
    raise exception 'Walang teacher_save_grades sa database na ito';
  end if;

  -- Idempotent: kapag naka-apply na, wala nang gagawin.
  if position(v_to in v_def) > 0 then
    raise notice 'Naka-apply na ang for_rechecking lock - walang binago.';
    return;
  end if;

  if position(v_from in v_def) = 0 then
    raise exception 'Hindi nakita ang lock filter (%) sa live na teacher_save_grades - huwag ituloy nang hindi ito tinitingnan', v_from;
  end if;

  v_new := replace(v_def, v_from, v_to);
  v_new := replace(v_new, v_msg_from, v_msg_to);
  execute v_new;
  raise notice 'Na-apply ang for_rechecking lock sa teacher_save_grades.';
end $$;

notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' pareho ══════════════════════════════════════════
select 'save_grades lock kasama ang for_rechecking' as item,
       (pg_get_functiondef('public.teacher_save_grades(text,text,text,jsonb)'::regprocedure)
        like '%for_rechecking%')::text as ok
union all
select 'submit_for_checking tinatanggihan ang undo',
       (pg_get_functiondef('public.teacher_submit_for_checking(text,text,text,boolean)'::regprocedure)
        like '%Hindi na mababawi%')::text;
