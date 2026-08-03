-- ============================================================================
--  APPROVE = PAGKATAPOS LANG IPASA NG GURO  (2026-07-29)
--  Paste-run ang BUONG file sa Supabase ▸ SQL Editor. Safe to re-run.
--  Patakbuhin PAGKATAPOS ng setup-teacher-submit-for-checking.sql.
--
--  BUTAS NA INAAYOS: kahit "In Progress" pa ang sheet — ibig sabihin hindi pa
--  sinasabi ng guro na tapos na siya — pwede na itong i-Approve & Submit to
--  Registrar ng checker. Ang Approve ay NAGLA-LOCK, kaya ang isang maagang
--  pindot ay nagsasara ng term na kalagitnaan pa lang ng pag-e-encode.
--
--  AYOS: ang sas_submit_to_registrar ay tumatanggap na LANG kapag ang term ay
--  nasa 'for_rechecking' — ang estadong inilalagay ng guro kapag pinindot niya
--  ang "Ipasa para sa checking" (o kapag ni-resolve niya ang ibinalik na sheet).
--
--  HINDI ginagalaw ang Return for Revision: pwede pa ring magbalik ng puna ang
--  checker kahit In Progress pa — hindi naman ito nagla-lock, at iyon ang
--  paraan para sabihing may dapat ayusin bago pa ipasa.
--
--  KUNG NA-STUCK: walang override dito nang sadya. Kapag hindi maka-ipasa ang
--  guro (naka-leave, walang access), ang coordinator ay pwedeng magbigay ng
--  SUBSTITUTE ACCESS (Teacher Loads ▸ buksan ang guro ▸ Substitute access) at
--  ang substitute na ang magpapasa. Iisa pa rin ang record.
-- ============================================================================

create or replace function public.sas_submit_to_registrar(
  p_teacher_id bigint, p_subject_code text, p_sy text, p_period text)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_status text;
begin
  if not public.sas_can_review(p_teacher_id, p_subject_code) then
    raise exception 'Not authorized to review this subject';
  end if;

  if not exists (
    select 1 from reg_class_subjects cs
    where cs.subject_code = p_subject_code
      and ( (cs.term_teachers is null and cs.teacher_id = p_teacher_id
             and (cs.term is null or p_period = any(string_to_array(cs.term, ','))))
         or (case when (cs.term_teachers ->> p_period) ~ '^\d+$'
                  then (cs.term_teachers ->> p_period)::bigint end) = p_teacher_id )
  ) then
    raise exception 'Term % of % is not handled by this teacher', p_period, p_subject_code;
  end if;

  -- ── BAGONG GUARD: ipinasa na ba talaga ito ng guro? ──────────────────────
  select r.status into v_status
  from sas_grade_reviews r
  where r.teacher_id = p_teacher_id and r.subject_code = p_subject_code
    and r.sy = p_sy and r.period = p_period;

  if coalesce(v_status, 'in_progress') <> 'for_rechecking' then
    raise exception '%', case coalesce(v_status, 'in_progress')
      when 'submitted' then
        'Naipasa na ito sa Registrar.'
      when 'needs_revision' then
        'Ibinalik ito sa guro at hindi pa niya namamarkahang tapos na. Hintayin munang ipasa niya ulit bago i-approve.'
      else
        'Hindi pa ipinapasa ng guro ang term na ito para sa checking. Ang Approve ay nagla-lock, kaya hintayin munang pindutin niya ang Ipasa para sa checking.'
    end;
  end if;

  insert into sas_grade_reviews (teacher_id, subject_code, sy, period, status,
                                 submitted_at, popup_seen, reviewer_email, updated_at)
  values (p_teacher_id, p_subject_code, p_sy, p_period, 'submitted',
          now(), true, auth.jwt() ->> 'email', now())
  on conflict (teacher_id, subject_code, sy, period) do update
    set status = 'submitted',
        submitted_at = now(),
        reviewer_email = excluded.reviewer_email,
        updated_at = now();
end;
$function$;

grant execute on function public.sas_submit_to_registrar(bigint, text, text, text) to authenticated;


notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' ═════════════════════════════════════════════════
select 'approve requires for_rechecking' as item,
       (pg_get_functiondef('public.sas_submit_to_registrar(bigint,text,text,text)'::regprocedure)
        like '%Hindi pa ipinapasa ng guro%')::text as ok;
