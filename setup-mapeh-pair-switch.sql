-- ============================================================================
--  MAPEH PAIR — JHS case: MAGKAIBANG teacher ang dalawang subject + SWITCH
--  Paste-run sa Supabase SQL editor. Safe to re-run. (Patakbuhin PAGKATAPOS
--  ng setup-mapeh-pair.sql at setup-mapeh-pda-code.sql.)
--
--  Sa JHS, ang Music & Arts at PE & Health ay hawak ng MAGKAIBANG teacher
--  (kanya-kanyang account at kanya-kanyang grade sheet). Sa gitnang term na
--  pareho sila (Term 2), ang UNANG teacher sa rotation ang nagsisimula; kapag
--  lumipat na ang klase sa ikalawang subject, ang unang teacher ang
--  magpi-pindot ng "Ilipat na" sa kanyang grade sheet — saka pa lang bubukas
--  ang Term 2 encoding ng ikalawang teacher. Ang average ng dalawang Term 2
--  grade ang MAPEH (gaya ng dati — walang binago sa computation).
--
--  Laman:
--   • reg_pair_switch — tala kung nailipat na ang klase (per class + term)
--   • teacher_pair_info — ang pares ng isang sheet: sino ang kapareha, sino
--     ang nauna, at ang switch status (basehan ng grade sheet UI)
--   • teacher_pair_switch — ang mismong "Ilipat na" (at pag-bawi nito);
--     ang UNANG teacher lang ng rotation ang makakatawag
-- ============================================================================

-- ═══ PART 1 — ang switch log ════════════════════════════════════════════════

create table if not exists public.reg_pair_switch (
  class_id uuid not null references public.reg_classes(id) on delete cascade,
  term text not null,                -- ang SHARED term ng pares (hal. 'q2')
  subject_code text not null,        -- ang subject na BINUKSAN (ang pangalawa)
  switched_by bigint,                -- teacher id ng nag-lipat (ang una)
  switched_at timestamptz not null default now(),
  primary key (class_id, term, subject_code)
);
comment on table public.reg_pair_switch is
  'MAPEH pair (JHS): nailipat na ang klase sa ikalawang subject ng rotation sa shared term — bubuksan nito ang encoding ng ikalawang teacher.';
alter table public.reg_pair_switch enable row level security;
-- Walang policies — ang gated RPCs (security definer) lang ang daanan.

-- ═══ PART 2 — pair info para sa grade sheet ═════════════════════════════════
-- Ibinabalik ang kapareha ng isang (class, subject): sino ito at kaninong
-- teacher, ang term coverage ng bawat panig, ang SHARED term, kung ang caller
-- ang NAUNA sa rotation, at kung nailipat na. Walang row = hindi pares (o wala
-- kang karapatang makita).

drop function if exists public.teacher_pair_info(uuid, text);

create function public.teacher_pair_info(p_class_id uuid, p_subject_code text)
returns table(
  partner_code text, partner_name text, partner_term text,
  partner_teacher_id bigint, partner_teacher_name text,
  my_term text, shared_term text, i_am_first boolean,
  switched boolean, switched_at timestamptz
)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_me bigint := public.current_teacher_id();
  v_partner_code text;
  r_me reg_class_subjects%rowtype;
  r_p reg_class_subjects%rowtype;
  v_grade text;
  v_shared text;
  v_first boolean;
  v_later text;
  v_sw timestamptz;
begin
  select s.paired_with into v_partner_code
    from reg_subjects s where upper(s.code) = upper(p_subject_code);
  if v_partner_code is null then return; end if;

  select * into r_me from reg_class_subjects cs
   where cs.class_id = p_class_id and upper(cs.subject_code) = upper(p_subject_code);
  select * into r_p from reg_class_subjects cs
   where cs.class_id = p_class_id and upper(cs.subject_code) = upper(v_partner_code);
  if r_me.subject_code is null or r_p.subject_code is null then return; end if;

  select c.grade_level into v_grade from reg_classes c where c.id = p_class_id;
  -- Makikita lang ng teacher ng alinman sa pares, o ng acad coordinator ng level.
  if not (coalesce(r_me.teacher_id = v_me, false)
          or coalesce(r_p.teacher_id = v_me, false)
          or public.is_acad_for(v_grade)) then
    return;
  end if;

  -- Ang SHARED term = common key ng dalawang coverage ('q1,q2' ∩ 'q2,q3' = q2).
  select min(x.k) into v_shared
  from (
    select unnest(string_to_array(coalesce(r_me.term, ''), ',')) as k
    intersect
    select unnest(string_to_array(coalesce(r_p.term, ''), ',')) as k
  ) x
  where x.k <> '';

  -- Ang NAUNA = ang subject na mas maagang term ang simula (q1 < q2 < q3).
  v_first := coalesce(
    (select min(a.v) from unnest(string_to_array(coalesce(r_me.term, ''), ',')) a(v) where a.v <> '')
      < (select min(b.v) from unnest(string_to_array(coalesce(r_p.term, ''), ',')) b(v) where b.v <> ''),
    false);
  v_later := case when v_first then r_p.subject_code else r_me.subject_code end;

  if v_shared is not null then
    select w.switched_at into v_sw
      from reg_pair_switch w
     where w.class_id = p_class_id and w.term = v_shared
       and upper(w.subject_code) = upper(v_later);
  end if;

  return query
  select r_p.subject_code,
         coalesce((select s2.full_name from reg_subjects s2 where s2.code = r_p.subject_code),
                  r_p.subject_code),
         r_p.term,
         r_p.teacher_id,
         (select nullif(trim(coalesce(t.title, '') || ' ' || coalesce(t.first_name, '') || ' ' ||
                             coalesce(t.family_name, '')), '')
            from reg_teachers t where t.id = r_p.teacher_id),
         r_me.term,
         v_shared,
         v_first,
         v_sw is not null,
         v_sw;
end;
$function$;

grant execute on function public.teacher_pair_info(uuid, text) to authenticated;

-- ═══ PART 3 — ang "Ilipat na" (at pag-bawi) ═════════════════════════════════
-- Tinatawag ng UNANG teacher mula sa KANYANG subject: binubuksan (o isinasara
-- ulit kapag p_undo) ang shared-term encoding ng IKALAWANG subject.

drop function if exists public.teacher_pair_switch(uuid, text, boolean);

create function public.teacher_pair_switch(
  p_class_id uuid, p_subject_code text, p_undo boolean default false)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me bigint := public.current_teacher_id();
  v_partner_code text;
  r_me reg_class_subjects%rowtype;
  r_p reg_class_subjects%rowtype;
  v_shared text;
  v_first boolean;
begin
  select s.paired_with into v_partner_code
    from reg_subjects s where upper(s.code) = upper(p_subject_code);
  if v_partner_code is null then
    raise exception '% is not a rotating pair subject', p_subject_code;
  end if;

  select * into r_me from reg_class_subjects cs
   where cs.class_id = p_class_id and upper(cs.subject_code) = upper(p_subject_code);
  select * into r_p from reg_class_subjects cs
   where cs.class_id = p_class_id and upper(cs.subject_code) = upper(v_partner_code);
  if r_me.subject_code is null or r_p.subject_code is null then
    raise exception 'The pair is not set up in this section';
  end if;

  if not coalesce(r_me.teacher_id = v_me, false) then
    raise exception 'You are not the teacher of % in this section', r_me.subject_code;
  end if;

  select min(x.k) into v_shared
  from (
    select unnest(string_to_array(coalesce(r_me.term, ''), ',')) as k
    intersect
    select unnest(string_to_array(coalesce(r_p.term, ''), ',')) as k
  ) x
  where x.k <> '';
  if v_shared is null then
    raise exception 'The pair has no shared term — the Registrar must save this section''s rotation first';
  end if;

  v_first := coalesce(
    (select min(a.v) from unnest(string_to_array(coalesce(r_me.term, ''), ',')) a(v) where a.v <> '')
      < (select min(b.v) from unnest(string_to_array(coalesce(r_p.term, ''), ',')) b(v) where b.v <> ''),
    false);
  if not v_first then
    raise exception 'Only the first teacher in the rotation may hand the class over';
  end if;

  if p_undo then
    delete from reg_pair_switch w
     where w.class_id = p_class_id and w.term = v_shared
       and upper(w.subject_code) = upper(r_p.subject_code);
  else
    insert into reg_pair_switch (class_id, term, subject_code, switched_by)
    values (p_class_id, v_shared, r_p.subject_code, v_me)
    on conflict (class_id, term, subject_code) do nothing;
  end if;
end;
$function$;

grant execute on function public.teacher_pair_switch(uuid, text, boolean) to authenticated;


-- ═══ VERIFY — dapat makita ang 3 rows, lahat true ═══════════════════════════
select 'reg_pair_switch table' as item,
       exists (select 1 from information_schema.tables
               where table_name = 'reg_pair_switch')::text as value
union all
select 'teacher_pair_info fn',
       exists (select 1 from pg_proc where proname = 'teacher_pair_info')::text
union all
select 'teacher_pair_switch fn',
       exists (select 1 from pg_proc where proname = 'teacher_pair_switch')::text;
