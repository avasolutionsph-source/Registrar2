-- ============================================================================
--  TEACHER: "IPASA PARA SA CHECKING"  (2026-07-29)
--  Paste-run ang BUONG file sa Supabase ▸ SQL Editor. Safe to re-run.
--  Mainam patakbuhin PAGKATAPOS ng setup-substitute-teacher.sql (hindi naman
--  ito babagsak kung nauna — may exception handler sa substitute lookup).
--
--  ANO ANG KULANG DATI: pagkatapos mag-encode, WALANG paraan ang teacher para
--  sabihing tapos na siya. Ang approver lang ang may aksyon (Approve/Return),
--  kaya nakaupo ang sheet sa "In Progress" at hulaan kung kailan ito titingnan.
--
--  ANO ANG IDINADAGDAG: isang aksyon ng teacher na naglilipat ng term mula
--  'in_progress' → 'for_rechecking' (= "For Checking" sa UI). Ito rin ang
--  ESTADONG hinahanap ng approver, kaya lumalabas agad ang sheet sa Grade
--  Approval na may malinaw na "hinihintay na ako". Pwede ring BAWIIN ng
--  teacher hangga't hindi pa ito na-approve.
--
--  SAKLAW: teacher × SUBJECT × TERM — lahat ng section ng subject na iyon sa
--  term na iyon, KAPAREHO ng saklaw ng Approve ng approver. Hindi ito
--  humahawak ng grado at hindi ito nagla-lock — ang approver pa rin ang
--  nagla-lock kapag na-submit na sa Registrar.
-- ============================================================================


-- ═══ PART 1 — kaninong sheet ang hawak ng caller ════════════════════════════
-- Ibinabalik ang teacher id na dapat pagpatungan ng review row: SARILI kung
-- siya ang may hawak ng subject, o ang MAY-ARI kung siya ay substitute nito.
-- NULL kung wala siyang karapatan (o hindi matukoy dahil marami siyang
-- pinapalitan sa iisang subject).
create or replace function public.teacher_sheet_owner(p_subject_code text)
returns bigint
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_me     bigint := public.current_teacher_id();
  v_owners bigint[] := '{}';
begin
  if v_me is null then
    return null;
  end if;

  -- Sariling load muna — ito ang karaniwang kaso.
  if exists (
    select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and (cs.teacher_id = v_me
           or (cs.term_teachers is not null and exists (
                 select 1 from jsonb_each_text(cs.term_teachers) e
                 where (case when e.value ~ '^\d+$' then e.value::bigint end) = v_me)))
  ) then
    return v_me;
  end if;

  -- Hiram na sheet (substitute). Hindi babagsak kung wala pa ang
  -- setup-substitute-teacher.sql.
  begin
    v_owners := public.sub_owners_of_subject(p_subject_code);
  exception when undefined_function then
    v_owners := '{}';
  end;

  if coalesce(array_length(v_owners, 1), 0) = 1 then
    return v_owners[1];
  end if;
  return null;
end;
$function$;
grant execute on function public.teacher_sheet_owner(text) to authenticated;


-- ═══ PART 2 — estado ng sariling sheet, kada term ═══════════════════════════
-- Para makita ng teacher kung saan na ang sheet niya (In Progress / For
-- Checking / Needs Revision / Submitted) nang hindi kailangang maging approver.
create or replace function public.teacher_review_states(p_subject_code text, p_sy text)
returns table(period text, status text, note text,
              returned_at timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select r.period, r.status, r.note, r.returned_at, r.submitted_at
  from sas_grade_reviews r
  where r.subject_code = p_subject_code
    and r.sy = p_sy
    and r.teacher_id = public.teacher_sheet_owner(p_subject_code);
$$;
grant execute on function public.teacher_review_states(text, text) to authenticated;


-- ═══ PART 3 — ang aksyon: ipasa (o bawiin) ══════════════════════════════════
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

  v_target := public.teacher_sheet_owner(p_subject_code);
  if v_target is null then
    raise exception 'Hindi mo hawak ang subject na ito';
  end if;

  -- Ang term ay dapat talagang sakop ng may-ari sa kahit isang section —
  -- kapareho ng guard ng sas_submit_to_registrar, kaya walang maipapasang
  -- term na hindi naman kanya (hal. term ng kapareha sa rotating subject).
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

  -- Na-approve na = hindi na mababago ninuman maliban sa approver.
  if v_status = 'submitted' then
    raise exception 'Naipasa na ito sa Registrar - hindi na ito mababawi';
  end if;

  if p_undo then
    if coalesce(v_status, 'in_progress') <> 'for_rechecking' then
      raise exception 'Walang naipasang term na mababawi';
    end if;
    update sas_grade_reviews
       set status = 'in_progress', updated_at = now()
     where teacher_id = v_target and subject_code = p_subject_code
       and sy = p_sy and period = p_period;
    return;
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


notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' lahat ═══════════════════════════════════════════
select 'teacher_sheet_owner' as item,
       (to_regprocedure('public.teacher_sheet_owner(text)') is not null)::text as ok
union all
select 'teacher_review_states',
       (to_regprocedure('public.teacher_review_states(text,text)') is not null)::text
union all
select 'teacher_submit_for_checking',
       (to_regprocedure('public.teacher_submit_for_checking(text,text,text,boolean)') is not null)::text;
