-- ============================================================================
--  MAPEH PAIR (Grade School) — Music & Arts + PE & Health bilang magkapareha
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  Ang kaso sa Grade School: isang teacher ang humahawak ng dalawang MAPEH
--  component na naka-rotate per term — hal. Music & Arts sa Term 1, PE & Health
--  sa Term 3, at PAREHO sa Term 2 (ang average ng dalawa ang MAPEH grade ng
--  Term 2). Maaaring magpalit ang pagkakasunod per section.
--
--  Ano ang ginagawa ng file na ito:
--   • PART 1 — reg_subjects.paired_with: ang "rotation button" ng pares. Kapag
--     naka-set (MUA ↔ PEH), ang dalawang subject ay lalabas na IISANG "MAPEH"
--     block sa Classes ▸ Subjects & Teachers (isang teacher + term boxes), at
--     iisang "MAPEH" option sa coordinator's Teaching Assignments.
--     Ang mismong SCHEDULE (alin ang mauuna) ay nasa reg_class_subjects.term
--     ng bawat section ('q1,q2' / 'q2,q3') — WALANG bagong column doon.
--   • PART 2 — acad_section_subjects RPC: isinasama na ang paired_with para
--     makita ng coordinator portal ang pares.
--   • PART 3 — bug fix: wala ang 'PEH' sa mapeh list ng
--     reg_default_subject_type, kaya ang PE & Health ay napupunta sa core
--     weights (20/50/30) sa halip na MAPEH weights (20/60/20). Idinaragdag na,
--     at itinatama ang mga na-save nang PEH row.
--
--  ⚠ ORDERING: PART 2 nito ay SUPERSEDES sa acad_section_subjects ng
--  setup-rotating-subjects.sql. Kapag pinatakbo ulit ang lumang file,
--  patakbuhin ULIT ito pagkatapos.
-- ============================================================================

-- ═══ PART 1 — ang pares sa subject catalog ══════════════════════════════════

alter table public.reg_subjects
  add column if not exists paired_with text;
comment on column public.reg_subjects.paired_with is
  'Rotating pair (MAPEH GS): code ng kaparehang subject (MUA ↔ PEH). Ang dalawa ay iisang MAPEH block sa class load — isang teacher, naka-rotate per term; ang schedule ay nasa reg_class_subjects.term ng bawat section.';

-- Seed: ipares ang Music & Arts (MUA) at PE & Health (PEH) kung parehong nasa
-- catalog. (Case-insensitive ang hanap; ang canonical code ang isinusulat.)
update public.reg_subjects a
   set paired_with = b.code
  from public.reg_subjects b
 where upper(a.code) = 'MUA' and upper(b.code) = 'PEH'
   and a.paired_with is distinct from b.code;
update public.reg_subjects a
   set paired_with = b.code
  from public.reg_subjects b
 where upper(a.code) = 'PEH' and upper(b.code) = 'MUA'
   and a.paired_with is distinct from b.code;


-- ═══ PART 2 — ipakita ang pares sa coordinator portal ═══════════════════════
-- acad_section_subjects + bagong paired_with column. Return type changes →
-- drop muna. (Kopya ng setup-rotating-subjects.sql na definition + paired_with.)

drop function if exists public.acad_section_subjects(uuid);

create function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer,
              teacher_id bigint, term text, term_labels jsonb, term_teachers jsonb,
              is_combo boolean, paired_with text)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_grade text;
  has_own_curriculum boolean;
begin
  select c.grade_level into v_grade
  from reg_classes c
  where c.id = p_class_id and public.is_acad_for(c.grade_level);
  if v_grade is null then
    raise exception 'Not authorized for this section';
  end if;

  select public.reg_dept_of(v_grade) = 'shs'
         and exists (select 1 from reg_class_subjects cs
                     where cs.class_id = p_class_id and cs.term is not null)
    into has_own_curriculum;

  if has_own_curriculum then
    return query
      select cs.subject_code, coalesce(s.full_name, cs.subject_code),
             coalesce(s.sort_order, 0), cs.teacher_id, cs.term,
             cs.term_labels, cs.term_teachers, coalesce(s.is_rotating, false),
             s.paired_with
      from reg_class_subjects cs
      left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id
      order by cs.term nulls first, coalesce(s.sort_order, 0), cs.subject_code;
  else
    return query
      select gs.subject_code, coalesce(s.full_name, gs.subject_code),
             gs.sort_order, cs.teacher_id, cs.term,
             cs.term_labels, cs.term_teachers, coalesce(s.is_rotating, false),
             s.paired_with
      from reg_classes c
      join reg_grade_subjects gs on gs.grade_level = c.grade_level
      left join reg_subjects s on s.code = gs.subject_code
      left join reg_class_subjects cs
             on cs.class_id = c.id and cs.subject_code = gs.subject_code
      where c.id = p_class_id
      order by gs.sort_order, gs.subject_code;
  end if;
end;
$function$;

grant execute on function public.acad_section_subjects(uuid) to authenticated;


-- ═══ PART 3 — PEH weights bug fix ═══════════════════════════════════════════
-- Ang 'PEH' (Physical Education & Health) ay WALA sa mapeh list, kaya core
-- weights (20/50/30) ang na-default dito sa halip na MAPEH (20/60/20).
-- (Kopya ng setup-ALL-2026-07-21.sql na definition; 'PEH' lang ang dagdag.)

create or replace function public.reg_default_subject_type(p_grade_level text, p_subject_code text)
returns text language sql immutable as $$
  select case
    when p_grade_level like 'XII%' then case
      when p_subject_code in ('MIL','IPH','PDE','PHD','DIS','PHS')            then 'g12-core'
      when p_subject_code in ('REP','ENT')                                    then 'g12-applied'
      when p_subject_code in ('PRA','PRE','WIM')                              then 'g12-wir'
      when p_subject_code in ('GEB','BIO','CHE','GPH','PHY','DAS','CWR',
                              'IWB','CNF','TNC','CSC','DRR','APE','ORM')      then 'g12-specialized'
      when p_subject_code in ('RCT')                                          then 'g12-elective'
    end
    when p_grade_level like 'XI%' then case
      when p_subject_code in ('GEM','EFC','GSC','PKL','LCS')                  then 'g11-core'
      when p_subject_code in ('GEB','BIO','GPH','RBC',
                              'CL1','CL2','INP','FM1','FM2')                  then 'g11-elective'
    end
    when p_subject_code in ('ECT','TLC','EPP','EPC','TLE','MAPEH','MAP',
                            'MUA','PEH','MUS','ART','PED','HEA')              then 'mapeh-g4-10'
    when p_grade_level in ('N1','N2')      then 'core-nursery'
    when p_grade_level = 'K'               then 'core-kinder'
    when p_grade_level in ('I','II','III') then 'core-g1-3'
    else 'core-g4-10'
  end;
$$;

-- Itama ang mga PEH row na napunta sa core dahil sa bug. Ang mga manual na
-- itinakda sa ibang type (hindi core default) ay hindi ginagalaw.
update public.reg_class_subjects cs
   set subject_type = 'mapeh-g4-10'
  from public.reg_classes c
 where c.id = cs.class_id
   and upper(cs.subject_code) = 'PEH'
   and c.grade_level not like 'XI%' and c.grade_level not like 'XII%'
   and (cs.subject_type is null
        or cs.subject_type in ('core','core-nursery','core-kinder','core-g1-3','core-g4-10'));


-- ═══ VERIFY — patakbuhin pagkatapos, dapat makita: ══════════════════════════
--  row 1: paired column ok = true
--  row 2: MUA↔PEH paired  = true
--  row 3: PEH rows na mali pa ang type = 0
select 'paired column ok' as item,
       exists (select 1 from information_schema.columns
               where table_name='reg_subjects' and column_name='paired_with')::text as value
union all
select 'MUA<->PEH paired',
       (exists (select 1 from reg_subjects where upper(code)='MUA' and upper(coalesce(paired_with,''))='PEH')
        and exists (select 1 from reg_subjects where upper(code)='PEH' and upper(coalesce(paired_with,''))='MUA'))::text
union all
select 'PEH rows na core pa (dapat 0)',
       count(*)::text
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
 where upper(cs.subject_code)='PEH'
   and c.grade_level not like 'XI%' and c.grade_level not like 'XII%'
   and cs.subject_type in ('core','core-nursery','core-kinder','core-g1-3','core-g4-10');
