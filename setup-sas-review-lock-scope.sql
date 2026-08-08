-- ============================================================================
--  SAS REVIEW LOCK — huwag hayaang tumawid ang Submit sa labas ng sakop
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  ⚠️  HUWAG MUNA ITONG PATAKBUHIN hangga't hindi mo nakikita ang VERIFY 2 ng
--      setup-sas-scope-hardening.sql. Kung may lumabas doong kahit isang row,
--      ipakita mo muna sa akin — ang mga gurong nakalista doon ay hindi na
--      macheck ng SAS pagkatapos nito, at iba ang kailangang solusyon.
--      Kung 0 rows, walang mababago ngayon at protektado ka na sa hinaharap.
--
--  ANG BUG:
--    Ang "Return for revision" at "Submit to Registrar" ng SAS ay naitatala sa
--    sas_grade_reviews na naka-key sa (teacher_id, subject_code, sy, period) —
--    WALANG section, walang level. Ang lock sa teacher_save_grades ay tumitingin
--    din sa subject + sy + period lang (setup-combination-subjects.sql:677-686).
--
--    Ang sas_can_review ay `exists` sa sas_teacher_loads. Naka-filter na sa
--    level ang sas_teacher_loads, PERO pinapatag ito ng `exists`: sapat na ang
--    ISANG row sa loob ng sakop para pahintulutan ang aksyon sa buong
--    teacher+subject — pati sa labas.
--
--    Halimbawa: Grade School lang ang naka-tsek sa sas_science. Nagtuturo si
--    Teacher X ng SCI sa Grade VI (sakop) at Grade VIII (sadyang wala sa
--    sakop). Sinasabi ng bar na "covers all 1 section", pero DALAWANG sheet
--    ang nala-lock. Hindi na makapag-save si Teacher X sa Grade VIII, at
--    nakikita ito ng acad_jhs bilang submitted na.
--
--  ANG AYOS:
--    Tumatanggi na ang aksyon kapag ang teacher+subject ay may kahit isang
--    section sa LABAS ng sakop ng tumatawag — dahil ang row na isusulat ay
--    walang paraan para sabihing "itong section lang".
-- ============================================================================

create or replace function public.sas_can_review(p_teacher_id bigint, p_subject_code text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  -- May hawak ba ako sa teacher+subject na ito?
  select exists (
    select 1 from public.sas_teacher_loads() l
    where l.teacher_id = p_teacher_id
      and l.subject_code = p_subject_code
  )
  -- ...at WALA bang bahagi nito sa labas ng sakop ko? Kung meron, aabot ang
  -- lock doon nang hindi ko nakikita, kaya hindi ako dapat pumindot.
  and not exists (
    select 1
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    where cs.subject_code = p_subject_code
      and (
        cs.teacher_id = p_teacher_id
        or exists (
          select 1 from jsonb_each_text(coalesce(cs.term_teachers, '{}'::jsonb)) e
          where e.value = p_teacher_id::text
        )
      )
      and (cs.subject_code, public.reg_dept_of(c.grade_level))
          not in (select sc.subject_code, sc.dept from public.sas_my_scope() sc)
  );
$$;

grant execute on function public.sas_can_review(bigint, text) to authenticated;


-- ═══ VERIFY — naka-patch na ba? dapat TRUE ═════════════════════════════════
select (pg_get_functiondef('public.sas_can_review(bigint,text)'::regprocedure)
        like '%not in (select sc.subject_code, sc.dept%')::text as patched;
