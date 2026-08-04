-- ============================================================================
--  DRY RUN — SNAPSHOT AT RESTORE  (2026-07-29)
--  Paste-run sa Supabase ▸ SQL Editor. Safe to re-run ang PART 1.
--
--  ANG IDEYA: huwag nating markahan ang test data. Sa halip, kumuha tayo ng
--  LARAWAN ng database BAGO ang dry run, tapos ibalik ito PAGKATAPOS. Ganito
--  kasi kalinis ang resulta: hindi mahalaga kung ano ang napindot ninyo o
--  kung nakalimutan ninyong markahan ang isang bagay — bumabalik ang lahat
--  sa eksaktong estado bago kayo nagsimula.
--
--  BAKIT HINDI "TAG THE TEST DATA": ang mga grado ay nakatago sa loob ng
--  isang JSON column kada learner, at ang mga review state, lock, at load ay
--  nasa iba't ibang table. Walang mamarkahan doon. At kailangan ng disiplina
--  habang nagte-test — at iyon ang laging pumapalya.
--
--  ANO ANG IBINABALIK (ito ang sinusulatan ng isang dry run):
--    • reg_students_data.grades   — mga na-encode na score
--    • reg_students_data.conduct  — attendance / values ng adviser
--    • sas_grade_reviews          — For Checking / Returned / Submitted + locks
--    • reg_class_subjects         — teaching loads at term coverage
--    • reg_substitutes            — substitute access
--    • acad_level_teachers        — roster ng bawat office
--    • reg_pair_switch            — MAPEH rotation switch
--    • reg_term_status            — bukas/sarado na term
--
--  ANO ANG HINDI GINAGALAW (setup ito, hindi output ng dry run — dapat manatili):
--    subject order, weight components, transmutation, honor criteria,
--    approval routing, school years, at ang PII ng mga learner.
--
--  ⚠ ANG PINAKA-MAHALAGANG PAALALA: ang restore ay nagbabalik sa oras ng
--    snapshot. Kung may TOTOONG data na naipasok PAGKATAPOS ng snapshot,
--    MABUBURA rin iyon. Kaya: kumuha ng snapshot bago ang dry run, at
--    i-restore agad pagkatapos — bago pa magsimula ang totoong paggamit.
--
--  ⚠ Ang mga function na ito ay SADYANG hindi ibinibigay sa app (walang grant
--    sa authenticated). Dito lang sa SQL Editor ito patatakbuhin.
-- ============================================================================


-- ═══ PART 1 — gawin ang kagamitan (isang beses lang; safe i-re-run) ═════════

create schema if not exists dryrun;

create table if not exists dryrun.snapshots (
  label     text primary key,
  taken_at  timestamptz not null default now(),
  taken_by  text,
  note      text
);

-- Isang hanay para sa lahat ng table: buong row bilang JSON, kaya hindi ito
-- masisira kapag nadagdagan ng column ang alinman sa kanila.
create table if not exists dryrun.rows (
  label text  not null references dryrun.snapshots(label) on delete cascade,
  src   text  not null,
  pk    text  not null,
  row   jsonb not null,
  primary key (label, src, pk)
);


-- ── KUMUHA NG SNAPSHOT ──────────────────────────────────────────────────────
create or replace function dryrun.take(p_label text, p_note text default null)
returns table(source text, rows_saved bigint)
language plpgsql
as $function$
begin
  delete from dryrun.snapshots where label = p_label;   -- cascade sa rows
  insert into dryrun.snapshots(label, taken_by, note)
  values (p_label, current_user, p_note);

  -- Mga learner: ang DALAWANG column lang na sinusulatan ng dry run. Hindi
  -- kinokopya ang PII (naka-encrypt iyon at wala namang gumagalaw dito).
  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_students_data', s.lrn,
         jsonb_build_object('lrn', s.lrn, 'grades', s.grades, 'conduct', s.conduct)
  from public.reg_students_data s;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'sas_grade_reviews',
         t.teacher_id || '|' || t.subject_code || '|' || t.sy || '|' || t.period,
         to_jsonb(t)
  from public.sas_grade_reviews t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_class_subjects', t.class_id || '|' || t.subject_code, to_jsonb(t)
  from public.reg_class_subjects t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_substitutes', t.id::text, to_jsonb(t)
  from public.reg_substitutes t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'acad_level_teachers', t.teacher_id || '|' || t.role, to_jsonb(t)
  from public.acad_level_teachers t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_pair_switch',
         t.class_id || '|' || t.term || '|' || t.subject_code, to_jsonb(t)
  from public.reg_pair_switch t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_term_status', t.sy || '|' || t.term, to_jsonb(t)
  from public.reg_term_status t;

  -- Pang-REPORT lang ang tatlo sa ibaba: ginagamit ng dryrun.extras() para
  -- ituro kung anong BAGO ang lumitaw. Hindi ito kailanman binubura ng
  -- restore — masyadong delikadong awtomatikong magbura ng learner o guro.
  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_classes', t.id::text,
         jsonb_build_object('id', t.id, 'sy', t.sy, 'grade_level', t.grade_level,
                            'section_name', t.section_name)
  from public.reg_classes t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'reg_teachers', t.id::text,
         jsonb_build_object('id', t.id, 'name',
           trim(coalesce(t.family_name,'') || ', ' || coalesce(t.first_name,'')),
           'email', t.email)
  from public.reg_teachers t;

  insert into dryrun.rows(label, src, pk, row)
  select p_label, 'user_roles', lower(t.user_email) || '|' || t.role,
         jsonb_build_object('email', t.user_email, 'role', t.role)
  from public.user_roles t;

  return query
    select r.src, count(*)::bigint
    from dryrun.rows r where r.label = p_label
    group by r.src order by r.src;
end;
$function$;


-- ── ANO ANG NAGBAGO MULA NANG KUNIN ANG SNAPSHOT ────────────────────────────
-- Patakbuhin ito PAGKATAPOS ng dry run para makita kung gaano kalaki ang
-- ibabalik — at BAGO mag-restore, para may nakita ka munang bilang.
create or replace function dryrun.diff(p_label text)
returns table(source text, changed_or_new bigint, missing_now bigint)
language sql stable
as $function$
  with snap as (select src, pk, row from dryrun.rows where label = p_label),
  live as (
    select 'reg_students_data' as src, s.lrn as pk,
           jsonb_build_object('lrn', s.lrn, 'grades', s.grades, 'conduct', s.conduct) as row
    from public.reg_students_data s
    union all select 'sas_grade_reviews',
           t.teacher_id || '|' || t.subject_code || '|' || t.sy || '|' || t.period, to_jsonb(t)
    from public.sas_grade_reviews t
    union all select 'reg_class_subjects', t.class_id || '|' || t.subject_code, to_jsonb(t)
    from public.reg_class_subjects t
    union all select 'reg_substitutes', t.id::text, to_jsonb(t)
    from public.reg_substitutes t
    union all select 'acad_level_teachers', t.teacher_id || '|' || t.role, to_jsonb(t)
    from public.acad_level_teachers t
    union all select 'reg_pair_switch', t.class_id || '|' || t.term || '|' || t.subject_code, to_jsonb(t)
    from public.reg_pair_switch t
    union all select 'reg_term_status', t.sy || '|' || t.term, to_jsonb(t)
    from public.reg_term_status t
  )
  select s.src,
         count(*) filter (where l.pk is null or l.row is distinct from s.row)::bigint,
         count(*) filter (where l.pk is null)::bigint
  from snap s
  full join live l on l.src = s.src and l.pk = s.pk
  where coalesce(s.src, l.src) in ('reg_students_data','sas_grade_reviews','reg_class_subjects',
                                   'reg_substitutes','acad_level_teachers','reg_pair_switch',
                                   'reg_term_status')
  group by s.src
  having count(*) filter (where l.pk is null or l.row is distinct from s.row) > 0
  order by s.src;
$function$;


-- ── IBALIK SA ESTADO NG SNAPSHOT ────────────────────────────────────────────
-- Isang transaction lang ito: kapag may pumalya kahit saan, WALANG mababago.
create or replace function dryrun.restore(p_label text)
returns table(source text, rows_restored bigint)
language plpgsql
as $function$
declare
  v_n   bigint;
  v_bad text;
begin
  if not exists (select 1 from dryrun.snapshots where label = p_label) then
    raise exception 'Walang snapshot na tinatawag na %', p_label;
  end if;

  create temp table _restored(src text, n bigint) on commit drop;

  -- 1) Mga grado at conduct — UPDATE lang, hindi kailanman delete, para
  --    hindi magalaw ang mga learner record mismo.
  --    nullif(...,'null') dahil ang JSON null ay dapat maging SQL NULL ulit.
  update public.reg_students_data s
     set grades  = nullif(r.row->'grades',  'null'::jsonb),
         conduct = nullif(r.row->'conduct', 'null'::jsonb)
  from dryrun.rows r
  where r.label = p_label and r.src = 'reg_students_data'
    and s.lrn = r.row->>'lrn'
    and (s.grades  is distinct from nullif(r.row->'grades',  'null'::jsonb)
      or s.conduct is distinct from nullif(r.row->'conduct', 'null'::jsonb));
  get diagnostics v_n = row_count;
  insert into _restored values ('reg_students_data (grades/conduct)', v_n);

  -- 2) Mga table na buong-buo ibinabalik: burahin lahat, tapos isauli ang
  --    naka-snapshot na laman. Eksakto ito — nawawala ang bagong gawa at
  --    bumabalik ang tinanggal.
  delete from public.sas_grade_reviews;
  insert into public.sas_grade_reviews
  select (jsonb_populate_record(null::public.sas_grade_reviews, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'sas_grade_reviews';
  get diagnostics v_n = row_count;
  insert into _restored values ('sas_grade_reviews', v_n);

  delete from public.reg_substitutes;
  insert into public.reg_substitutes
  select (jsonb_populate_record(null::public.reg_substitutes, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'reg_substitutes';
  get diagnostics v_n = row_count;
  insert into _restored values ('reg_substitutes', v_n);

  delete from public.reg_pair_switch;
  insert into public.reg_pair_switch
  select (jsonb_populate_record(null::public.reg_pair_switch, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'reg_pair_switch';
  get diagnostics v_n = row_count;
  insert into _restored values ('reg_pair_switch', v_n);

  delete from public.acad_level_teachers;
  insert into public.acad_level_teachers
  select (jsonb_populate_record(null::public.acad_level_teachers, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'acad_level_teachers';
  get diagnostics v_n = row_count;
  insert into _restored values ('acad_level_teachers', v_n);

  delete from public.reg_term_status;
  insert into public.reg_term_status
  select (jsonb_populate_record(null::public.reg_term_status, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'reg_term_status';
  get diagnostics v_n = row_count;
  insert into _restored values ('reg_term_status', v_n);

  -- Ang teaching loads ang huli, at may kailangang ingatan dito.
  --
  -- Ang reg_rotating_breakdown_guard ay pumuputok sa INSERT. Ang mga row na
  -- ibinabalik natin ay dumaan na sa guard na iyon noong unang naipasok, kaya
  -- alam nating tama sila. PERO ang guard ay tumitingin sa KASALUKUYANG
  -- reg_subjects.is_rotating — kung may nag-tick ng "rotating" sa isang subject
  -- habang tumatakbo ang dry run, tatanggihan nito ang lumang row at BIBIGO
  -- ang buong restore. Kaya pinapatay ito habang nagbabalik: hindi ito bagong
  -- input ng tao, kundi pagsasauli ng estadong pinatunayan na.
  -- Nasa loob ng transaction ang pagpatay, kaya kahit mag-error, bumabalik din
  -- ang trigger kasabay ng rollback.
  alter table public.reg_class_subjects disable trigger reg_rotating_breakdown_guard;
  delete from public.reg_class_subjects;
  insert into public.reg_class_subjects
  select (jsonb_populate_record(null::public.reg_class_subjects, r.row)).*
  from dryrun.rows r where r.label = p_label and r.src = 'reg_class_subjects';
  get diagnostics v_n = row_count;
  alter table public.reg_class_subjects enable trigger reg_rotating_breakdown_guard;
  insert into _restored values ('reg_class_subjects', v_n);

  -- ── HULING KANDADO: patunayan bago tapusin ───────────────────────────────
  -- Ang pagbabalik ay burahin-tapos-isauli. Kung sakaling may nabura pero
  -- hindi naisauli, ang bilang ay hindi magtutugma. Dahil IISANG transaction
  -- ang buong function, ang pagsabog dito ay nagbabalik ng LAHAT sa kung ano
  -- ito bago tayo nagsimula — kaya ang restore ay alinman sa eksakto, o wala
  -- talagang binago. Walang gitnang estado.
  select string_agg(c.src, ', ') into v_bad
  from (
    select 'sas_grade_reviews' as src,
           (select count(*) from public.sas_grade_reviews) as live
    union all select 'reg_substitutes',     (select count(*) from public.reg_substitutes)
    union all select 'reg_pair_switch',     (select count(*) from public.reg_pair_switch)
    union all select 'acad_level_teachers', (select count(*) from public.acad_level_teachers)
    union all select 'reg_term_status',     (select count(*) from public.reg_term_status)
    union all select 'reg_class_subjects',  (select count(*) from public.reg_class_subjects)
  ) c
  where c.live <> (select count(*) from dryrun.rows r
                   where r.label = p_label and r.src = c.src);

  if v_bad is not null then
    raise exception
      'Hindi tugma ang naibalik para sa: %. Isinauli ang lahat sa kung ano ito bago ang restore - WALANG nabago. Huwag ituloy; ipaalam ito.', v_bad;
  end if;

  return query select t.src, t.n from _restored t order by t.src;
end;
$function$;


-- ── ANONG BAGO ANG LUMITAW (hindi awtomatikong binubura) ────────────────────
-- Mga learner, section, guro at account na WALA pa noong kuhanan ng snapshot.
-- Ikaw ang magdedesisyon kung tatanggalin — masyadong delikado kung awtomatiko.
create or replace function dryrun.extras(p_label text)
returns table(kind text, identifier text, detail text)
language sql stable
as $function$
  select 'Bagong learner', s.lrn,
         trim(coalesce(s.last_name,'') || ', ' || coalesce(s.first_name,''))
  from public.reg_students_data s
  where not exists (select 1 from dryrun.rows r
                    where r.label = p_label and r.src = 'reg_students_data' and r.pk = s.lrn)
  union all
  select 'Bagong section', c.id::text,
         'Grade ' || c.grade_level || ' - ' || c.section_name || ' (SY ' || c.sy || ')'
  from public.reg_classes c
  where not exists (select 1 from dryrun.rows r
                    where r.label = p_label and r.src = 'reg_classes' and r.pk = c.id::text)
  union all
  select 'Bagong guro', t.id::text,
         trim(coalesce(t.family_name,'') || ', ' || coalesce(t.first_name,'')) ||
         coalesce(' <' || nullif(t.email,'') || '>', '')
  from public.reg_teachers t
  where not exists (select 1 from dryrun.rows r
                    where r.label = p_label and r.src = 'reg_teachers' and r.pk = t.id::text)
  union all
  select 'Bagong role', u.user_email, u.role
  from public.user_roles u
  where not exists (select 1 from dryrun.rows r
                    where r.label = p_label and r.src = 'user_roles'
                      and r.pk = lower(u.user_email) || '|' || u.role)
  order by 1, 2;
$function$;

-- SADYANG walang `grant execute ... to authenticated` dito. Ang mga function
-- na ito ay makakabura ng lahat ng grado — dapat hindi ito maabot ng app.
revoke all on function dryrun.take(text, text)  from public, anon, authenticated;
revoke all on function dryrun.diff(text)        from public, anon, authenticated;
revoke all on function dryrun.restore(text)     from public, anon, authenticated;
revoke all on function dryrun.extras(text)      from public, anon, authenticated;


-- ============================================================================
--  PAANO GAMITIN — apat na linya lang, isa-isang patakbuhin
-- ============================================================================

-- ▶ HAKBANG 1 — BAGO ang dry run. Kunin ang larawan.
--   (Palitan ang pangalan kung gusto mo; ito ang tatawagin mo mamaya.)
-- select * from dryrun.take('bago-dryrun', 'Dry run ng grades flow');

-- ▶ HAKBANG 2 — dito na kayo mag-dry run. Wala nang patatakbuhin dito.

-- ▶ HAKBANG 3 — PAGKATAPOS ng dry run. Tingnan muna kung gaano kalaki
--   ang ibabalik (walang binabago ang query na ito).
-- select * from dryrun.diff('bago-dryrun');

-- ▶ HAKBANG 4 — ibalik ang lahat sa dati.
-- select * from dryrun.restore('bago-dryrun');

-- ▶ HAKBANG 5 — tingnan kung may bagong learner / section / guro / account
--   na nagawa habang nagte-test. IKAW ang magbubura ng mga ito kung test lang.
-- select * from dryrun.extras('bago-dryrun');

-- ▶ HAKBANG 6 — kapag tapos na at hindi na kailangan ang larawan:
-- delete from dryrun.snapshots where label = 'bago-dryrun';

-- ── Listahan ng mga snapshot na hawak mo ngayon ─────────────────────────────
-- select s.label, s.taken_at, s.taken_by, s.note,
--        (select count(*) from dryrun.rows r where r.label = s.label) as rows_held
-- from dryrun.snapshots s order by s.taken_at desc;


-- ═══ VERIFY — dapat 'true' lahat ═══════════════════════════════════════════
select 'dryrun schema' as item, (to_regnamespace('dryrun') is not null)::text as ok
union all
select 'take()',    (to_regprocedure('dryrun.take(text,text)') is not null)::text
union all
select 'diff()',    (to_regprocedure('dryrun.diff(text)') is not null)::text
union all
select 'restore()', (to_regprocedure('dryrun.restore(text)') is not null)::text
union all
select 'extras()',  (to_regprocedure('dryrun.extras(text)') is not null)::text;
