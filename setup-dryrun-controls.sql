-- ============================================================================
--  DRY RUN — START / STOP BUTTON  (2026-07-30)
--  Paste-run sa Supabase ▸ SQL Editor. Safe to re-run.
--
--  ⚠ PATAKBUHIN MUNA ANG `dryrun-snapshot-and-restore.sql` BAGO ITO.
--    Doon nakatira ang dryrun.take / dryrun.restore / dryrun.extras na
--    ginagamit dito. Kapag hindi pa, may malinaw na error sa PART 0.
--
--  ANO ITO: tatlong maliit na wrapper sa `public` schema para magamit ng
--  Registrar app ang dry-run tooling mula sa isang button — Setup ▸ Dry Run.
--  Ang `dryrun` schema mismo ay HINDI nakalantad sa API; ito lang ang pintuan,
--  at bawat isa ay nakakandado sa registrar.
--
--  ANG PAGKAKAIBA SA MANUAL NA PARAAN: iisang naka-fix na label ('ui-dryrun')
--  ang gamit, kaya laging magkapares ang Start at Stop. Hindi na kailangang
--  matandaan ang pangalan ng snapshot.
--
--  ⚠ ANG PANGANIB, SABIHIN NATIN NANG DIRETSO: ang Stop ay nagbabalik sa
--    estado noong Start. LAHAT ng naipasok pagkatapos ng Start ay mabubura —
--    kasama ang totoong data kung may nakapasok. Kaya:
--      • may 48-oras na hadlang ang server (kailangan ng sadyang pag-ulit
--        bago tumuloy kapag matanda na ang snapshot), at
--      • hindi binubura ang snapshot pagkatapos ng Stop — nananatili ito
--        hanggang sa susunod na Start, kung sakaling kailanganing ulitin.
-- ============================================================================


-- ═══ PART 0 — tiyakin na naunang na-run ang base file ═══════════════════════
do $$
begin
  if to_regprocedure('dryrun.take(text,text)') is null then
    raise exception
      'Patakbuhin muna ang dryrun-snapshot-and-restore.sql - wala pa ang dryrun.take() dito.';
  end if;
end $$;

-- Pinapanatili ang snapshot pagkatapos ng Stop (para maulit kung kailangan);
-- ang stopped_at ang nagsasabing hindi na ito aktibo.
alter table dryrun.snapshots add column if not exists stopped_at timestamptz;


-- ═══ PART 1 — nasa gitna ba tayo ng dry run? ════════════════════════════════
create or replace function public.dryrun_status()
returns table(active boolean, label text, taken_at timestamptz,
              taken_by text, note text, hours_elapsed numeric)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.is_registrar() then
    raise exception 'Not authorized';
  end if;
  return query
    select true, s.label, s.taken_at, s.taken_by, s.note,
           round(extract(epoch from (now() - s.taken_at)) / 3600.0, 1)
    from dryrun.snapshots s
    where s.label = 'ui-dryrun' and s.stopped_at is null;
end;
$function$;


-- ═══ PART 2 — SIMULAN: kunin ang larawan ════════════════════════════════════
create or replace function public.dryrun_start(p_note text default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_saved jsonb;
  v_bad   text;
begin
  if not public.is_registrar() then
    raise exception 'Not authorized';
  end if;
  if exists (select 1 from dryrun.snapshots
             where label = 'ui-dryrun' and stopped_at is null) then
    raise exception 'May tumatakbo nang dry run. I-Stop muna ito bago magsimula ulit.';
  end if;

  -- Pinapalitan ang naunang natapos nang snapshot — isa lang ang hawak natin.
  delete from dryrun.snapshots where label = 'ui-dryrun';
  perform dryrun.take('ui-dryrun', coalesce(p_note, 'Started from Setup - Dry Run'));

  -- ── KUMPLETO BA ANG LARAWAN? ────────────────────────────────────────────
  -- Ang restore ay BUMUBURA muna bago ibalik. Kaya kung may hindi nakuha ang
  -- snapshot, ang restore ay hindi pagbabalik kundi pagbura. Binibilang dito
  -- ang bawat table laban sa buhay na laman nito; kapag hindi tugma, sumasabog
  -- ito at — dahil iisang transaction — WALANG dry run na masisimulan. Mas
  -- mabuting hindi makapagsimula kaysa magsimula nang may sirang balikan.
  select string_agg(c.src, ', ') into v_bad
  from (
    select 'reg_students_data' as src,
           (select count(*) from public.reg_students_data) as live
    union all select 'sas_grade_reviews',   (select count(*) from public.sas_grade_reviews)
    union all select 'reg_class_subjects',  (select count(*) from public.reg_class_subjects)
    union all select 'reg_substitutes',     (select count(*) from public.reg_substitutes)
    union all select 'acad_level_teachers', (select count(*) from public.acad_level_teachers)
    union all select 'reg_pair_switch',     (select count(*) from public.reg_pair_switch)
    union all select 'reg_term_status',     (select count(*) from public.reg_term_status)
    union all select 'reg_classes',         (select count(*) from public.reg_classes)
    union all select 'reg_teachers',        (select count(*) from public.reg_teachers)
    union all select 'user_roles',          (select count(*) from public.user_roles)
  ) c
  where c.live <> (select count(*) from dryrun.rows r
                   where r.label = 'ui-dryrun' and r.src = c.src);

  if v_bad is not null then
    raise exception
      'Hindi kumpleto ang snapshot para sa: %. Walang sinimulang dry run - hindi ligtas ang balikan. Ipaalam ito bago ituloy.', v_bad;
  end if;

  select coalesce(jsonb_object_agg(t.src, t.n), '{}'::jsonb) into v_saved
  from (select r.src, count(*) as n from dryrun.rows r
        where r.label = 'ui-dryrun' group by r.src) t;

  return jsonb_build_object('started_at', now(), 'saved', v_saved);
end;
$function$;


-- ═══ PART 3 — ITIGIL: ibalik ang lahat sa dati ══════════════════════════════
-- p_force: kailangan kapag mahigit 48 oras na ang snapshot. Ginawa itong
-- hadlang dahil ang pagpindot ng Stop makalipas ang ilang araw ay magbubura ng
-- lahat ng totoong naipasok sa mga araw na iyon.
create or replace function public.dryrun_stop(p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_taken timestamptz;
  v_hours numeric;
  v_extras jsonb;
  v_restored jsonb;
begin
  if not public.is_registrar() then
    raise exception 'Not authorized';
  end if;

  select s.taken_at into v_taken from dryrun.snapshots s
  where s.label = 'ui-dryrun' and s.stopped_at is null;
  if v_taken is null then
    raise exception 'Walang tumatakbong dry run.';
  end if;

  v_hours := round(extract(epoch from (now() - v_taken)) / 3600.0, 1);
  if v_hours > 48 and not p_force then
    raise exception
      'Nagsimula ang dry run na ito % oras na ang nakalipas. Ang pagbalik ay buburahin ang LAHAT ng naipasok mula noon. Kumpirmahin ulit kung sadya ito.', v_hours;
  end if;

  -- Ang bago (learner/section/guro/account) ay hindi ibinabalik ng restore —
  -- kinukuha bago pa ang restore para may maiuulat sa gumagamit.
  select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) into v_extras
  from dryrun.extras('ui-dryrun') e;

  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_restored
  from dryrun.restore('ui-dryrun') r;

  update dryrun.snapshots set stopped_at = now() where label = 'ui-dryrun';

  return jsonb_build_object('hours', v_hours, 'restored', v_restored, 'extras', v_extras);
end;
$function$;


-- Registrar lang ang makakatawag — at ang guard ay nasa LOOB ng bawat function,
-- hindi lang sa grant, kaya hindi ito malulusutan.
revoke all on function public.dryrun_status()        from public, anon;
revoke all on function public.dryrun_start(text)     from public, anon;
revoke all on function public.dryrun_stop(boolean)   from public, anon;
grant execute on function public.dryrun_status()      to authenticated;
grant execute on function public.dryrun_start(text)   to authenticated;
grant execute on function public.dryrun_stop(boolean) to authenticated;

notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' lahat ═══════════════════════════════════════════
select 'dryrun_status' as item, (to_regprocedure('public.dryrun_status()') is not null)::text as ok
union all
select 'dryrun_start',  (to_regprocedure('public.dryrun_start(text)') is not null)::text
union all
select 'dryrun_stop',   (to_regprocedure('public.dryrun_stop(boolean)') is not null)::text
union all
select 'stopped_at column',
       (exists (select 1 from information_schema.columns
                where table_schema='dryrun' and table_name='snapshots'
                  and column_name='stopped_at'))::text;
