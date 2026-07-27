-- ============================================================================
--  PDA — kilalanin bilang MAPEH component (Physical Edu. & Health)
--  Paste-run sa Supabase SQL editor. Safe to re-run. (Patakbuhin PAGKATAPOS
--  ng setup-mapeh-pair.sql.)
--
--  Ang live na code ng "Physical Edu. & Health" sa curriculum ay PDA (hindi
--  PEH), kaya idinaragdag ang PDA sa mapeh list ng reg_default_subject_type —
--  para MAPEH weights (20/60/20) ang makuha nito, hindi core (20/50/30) — at
--  itinatama ang mga na-save nang PDA row. Nananatiling kilala rin ang PEH
--  para sa legacy data.
-- ============================================================================

-- ═══ PART 1 — idagdag ang PDA sa auto-typing defaults ═══════════════════════

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
                            'MUA','PEH','PDA','MUS','ART','PED','HEA')        then 'mapeh-g4-10'
    when p_grade_level in ('N1','N2')      then 'core-nursery'
    when p_grade_level = 'K'               then 'core-kinder'
    when p_grade_level in ('I','II','III') then 'core-g1-3'
    else 'core-g4-10'
  end;
$$;

-- ═══ PART 2 — itama ang mga PDA row na napunta sa core ══════════════════════
-- Ang mga manual na itinakda sa ibang type ay hindi ginagalaw.

update public.reg_class_subjects cs
   set subject_type = 'mapeh-g4-10'
  from public.reg_classes c
 where c.id = cs.class_id
   and upper(cs.subject_code) = 'PDA'
   and c.grade_level not like 'XI%' and c.grade_level not like 'XII%'
   and (cs.subject_type is null
        or cs.subject_type in ('core','core-nursery','core-kinder','core-g1-3','core-g4-10'));


-- ═══ VERIFY — dapat makita: ═════════════════════════════════════════════════
--  row 1: MUA<->PDA paired    = true  (na-set mo na ito sa Edit ng catalog)
--  row 2: PDA rows na core pa = 0
select 'MUA<->PDA paired' as item,
       (exists (select 1 from reg_subjects where upper(code)='MUA' and upper(coalesce(paired_with,''))='PDA')
        and exists (select 1 from reg_subjects where upper(code)='PDA' and upper(coalesce(paired_with,''))='MUA'))::text as value
union all
select 'PDA rows na core pa (dapat 0)',
       count(*)::text
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
 where upper(cs.subject_code)='PDA'
   and c.grade_level not like 'XI%' and c.grade_level not like 'XII%'
   and cs.subject_type in ('core','core-nursery','core-kinder','core-g1-3','core-g4-10');
