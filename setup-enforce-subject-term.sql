-- ============================================================================
--  ANG SUBJECT AY MAY GRADE SHEET LANG SA MGA TERM NA INIAALOK ITO (2026-07-30)
--  Paste-run sa Supabase ▸ SQL Editor. Safe to re-run.
--
--  ANG BUTAS: kapag itinakda ng Registrar na ang isang subject ay "Term 1 lang"
--  para sa isang section (reg_class_subjects.term = 'q1'), inaasahan nating
--  Term 1 lang ang may grade sheet. Pero ang teacher_save_grades ay nagtatanong
--  lang ng "ikaw ba ang naka-assign na guro?" — HINDI nito tinitingnan ang term
--  coverage. Kaya kaya pa ring mag-encode at mag-save sa Term 2 at 3, at
--  pumapasok iyon sa final grade.
--
--  Ang v_term ay nakukuha na pala ng function — ginagamit lang ito sa lock loop,
--  hindi sa awtorisasyon. Ito ang idinadagdag dito.
--
--  HINDI ito humahawak sa rotating at MAPEH pair: sila ay may per-term owner na
--  (term_teachers) at may sariling guard na dati pa. Ang bagong tseke ay para
--  sa ORDINARYONG subject na may term coverage.
--
--  ⚠ BAGO PATAKBUHIN: tiyaking TAMA ang term ng mga section ninyo. Kapag may
--    subject na naka-'q1' pero buong taon naman talagang tinuturo, hindi na
--    makakapag-save ang guro sa Term 2 at 3 hangga't hindi naitatama ang term
--    sa Classes ▸ Subjects & Teachers. May pang-tingin na query sa dulo.
-- ============================================================================

do $$
declare
  v_def text;
  v_from text := '    raise exception ''Not authorized to grade this subject for this learner'';';
  v_add  text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'teacher_save_grades'
  limit 1;

  if v_def is null then
    raise exception 'Walang teacher_save_grades sa database na ito';
  end if;

  -- Idempotent: kapag naka-apply na, wala nang gagawin.
  if position('is not offered in' in v_def) > 0 then
    raise notice 'Naka-apply na ang term-coverage guard - walang binago.';
    return;
  end if;

  if position(v_from in v_def) = 0 then
    raise exception
      'Hindi nakita ang authorization block sa live na teacher_save_grades - huwag ituloy nang hindi ito tinitingnan';
  end if;

  -- Isinisingit kaagad pagkatapos ng umiiral nang authorization check. Ang
  -- rotating (term_teachers) ay laktawan: ang mapa mismo ang nagsasabi kung
  -- sino ang may hawak ng bawat term, at may guard na ito sa itaas.
  v_add := v_from || '
  end if;

  if v_tt is null and v_term is not null
     and not (p_period = any (string_to_array(v_term, '','')))
  then
    raise exception ''% is not offered in this term for this section.'', p_subject_code;';

  -- Palitan ang unang pagkakataon lang, tapos isara ulit ang orihinal na if.
  v_def := replace(v_def, v_from, v_add);
  execute v_def;
  raise notice 'Na-apply ang term-coverage guard sa teacher_save_grades.';
end $$;

notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' ═════════════════════════════════════════════════
select 'term coverage enforced' as item,
       (pg_get_functiondef('public.teacher_save_grades(text,text,text,jsonb)'::regprocedure)
        like '%is not offered in this term%')::text as ok;


-- ═══ ROLLBACK — kung may na-lock out habang nagte-test ════════════════════
-- Patakbuhin LANG ang block na ito kung may guro na hindi makapag-save sa term
-- na totoo namang tinuturo nila, at wala kang oras itama ang term ngayon.
-- Inaalis nito ang bagong tseke at ibinabalik ang function sa dating asal.
-- Ang natitirang guard (may-ari ng row, lock ng naipasa nang term) ay buo pa rin.
--
-- do $$
-- declare v_def text; v_added text; v_from text :=
--   '    raise exception ''Not authorized to grade this subject for this learner'';';
-- begin
--   select pg_get_functiondef(p.oid) into v_def
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'teacher_save_grades' limit 1;
--   if position('is not offered in' in v_def) = 0 then
--     raise notice 'Wala namang term guard - walang inalis.'; return;
--   end if;
--   v_added := v_from || '
--   end if;
--
--   if v_tt is null and v_term is not null
--      and not (p_period = any (string_to_array(v_term, '','')))
--   then
--     raise exception ''% is not offered in this term for this section.'', p_subject_code;';
--   execute replace(v_def, v_added, v_from);
--   raise notice 'Inalis ang term-coverage guard.';
-- end $$;
-- notify pgrst, 'reload schema';


-- ═══ TINGNAN MUNA: sinong maaapektuhan ═════════════════════════════════════
-- Bawat subject na may term coverage, at may naka-encode nang grado SA LABAS
-- ng coverage nito. Ito ang mga sisita ng bagong guard.
select c.grade_level, c.section_name, cs.subject_code, cs.term as coverage,
       count(*) as learners_na_may_grado_sa_labas
from reg_class_subjects cs
join reg_classes c on c.id = cs.class_id
join reg_students_data s on s.current_class_id = c.id
cross join lateral jsonb_array_elements(coalesce(s.grades -> c.sy, '[]'::jsonb)) e
cross join lateral (values ('q1'),('q2'),('q3')) as t(pk)
where cs.term is not null
  and cs.term_teachers is null
  and e ->> 'subjectCode' = cs.subject_code
  and (e -> t.pk) is not null
  and jsonb_typeof(e -> t.pk) = 'number'
  and not (t.pk = any (string_to_array(cs.term, ',')))
group by c.grade_level, c.section_name, cs.subject_code, cs.term
order by 1, 2, 3;
