-- ============================================================================
--  ROTATING SUBJECTS — the term breakdown moves to PER SECTION
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Bagong daloy (pinalitan ang lumang per-subject na T1/T2/T3):
--   • Sa subject catalog, isang CHECKBOX lang ang nagbubukas ng feature:
--     reg_subjects.is_rotating — "Rotating subject", iba ang itinuturo bawat
--     term (hal. EPP-ICT, TLE-ICT).
--   • Ang mismong TERM BREAKDOWN (ano ang laman ng Term 1/2/3) ay nasa BAWAT
--     SECTION: reg_class_subjects.term_labels — dahil maaaring magkaiba ang
--     pagkakasunod-sunod per section. Ise-set ito ng Registrar sa Classes ▸
--     Subjects & Teachers, at KAILANGAN itong kumpleto bago ma-save ang load.
--   • Ang reg_subjects.term_labels (lumang isahan setup) ay nananatili bilang
--     legacy na hindi na sinusulatan; ang laman nito ay ibinuhos na bilang
--     panimulang breakdown ng mga section na mayroon na ng subject.
--
--  ⚠ ORDERING: this file SUPERSEDES the acad_section_subjects definition in
--  setup-combination-subjects.sql. Kapag muling pinatakbo ang lumang file,
--  PATAKBUHIN ULIT ITO PAGKATAPOS para bumalik ang per-section breakdown.
-- ============================================================================

-- ═══ PART 1 — columns + data carry-over ═════════════════════════════════════

alter table public.reg_subjects
  add column if not exists is_rotating boolean not null default false;
comment on column public.reg_subjects.is_rotating is
  'Rotating subject: different content per term (EPP-ICT, TLE-ICT). The per-term breakdown lives PER SECTION in reg_class_subjects.term_labels.';

-- Anything marked through the old per-subject flow stays marked.
update public.reg_subjects
   set is_rotating = true
 where term_labels is not null
   and is_rotating = false;

alter table public.reg_class_subjects
  add column if not exists term_labels jsonb;
comment on column public.reg_class_subjects.term_labels is
  'Rotating subject term breakdown FOR THIS SECTION, e.g. {"q1":"EPP","q2":"EPP","q3":"ICT"}. Sections may differ.';

-- Seed each section that already carries the subject with the old catalog
-- labels, so nothing set through the previous flow is lost. (Case-insensitive
-- join: legacy rows may differ in code casing.)
update public.reg_class_subjects cs
   set term_labels = s.term_labels
  from public.reg_subjects s
 where upper(s.code) = upper(cs.subject_code)
   and s.term_labels is not null
   and cs.term_labels is null;

-- ═══ PART 1b — DB-side enforcement: BAWAL ang walang breakdown ══════════════
-- Every write path (registrar save, the Teacher page, the coordinator RPCs)
-- funnels through this trigger: NOBODY can be assigned to a rotating subject
-- in a section whose Term breakdown is not complete. An unassigned/offered
-- row may exist (the registrar UI requires the breakdown before saving one),
-- but a teacher can never be attached to an unlabeled term.
create or replace function public.reg_rotating_breakdown_guard()
returns trigger
language plpgsql
as $function$
declare
  v_rot boolean;
  v_periods text[];
  v_pk text;
begin
  select s.is_rotating into v_rot
  from reg_subjects s
  where upper(s.code) = upper(new.subject_code);

  if coalesce(v_rot, false)
     and (new.teacher_id is not null or new.term_teachers is not null) then
    -- The breakdown must name every period of the class's school year.
    select case when c.sy >= '2026' then array['q1','q2','q3']
                else array['q1','q2','q3','q4'] end
      into v_periods
    from reg_classes c
    where c.id = new.class_id;
    v_periods := coalesce(v_periods, array['q1','q2','q3']);
    foreach v_pk in array v_periods loop
      if new.term_labels is null
         or coalesce(btrim(new.term_labels ->> v_pk), '') = '' then
        raise exception
          '% is a rotating subject — set its complete Term breakdown for this section first (Classes - Subjects & Teachers)',
          new.subject_code;
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists reg_rotating_breakdown_guard on public.reg_class_subjects;
create trigger reg_rotating_breakdown_guard
  before insert or update on public.reg_class_subjects
  for each row execute function public.reg_rotating_breakdown_guard();


-- ═══ PART 2 — the coordinator picker reads the SECTION's breakdown ══════════
-- acad_section_subjects: term_labels now comes from the SECTION row
-- (cs.term_labels) and a new is_combo column carries the subject's rotating
-- flag. Return type changes → drop first.

drop function if exists public.acad_section_subjects(uuid);

create function public.acad_section_subjects(p_class_id uuid)
returns table(subject_code text, subject_name text, sort_order integer,
              teacher_id bigint, term text, term_labels jsonb, term_teachers jsonb,
              is_combo boolean)
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
             cs.term_labels, cs.term_teachers, coalesce(s.is_rotating, false)
      from reg_class_subjects cs
      left join reg_subjects s on s.code = cs.subject_code
      where cs.class_id = p_class_id
      order by cs.term nulls first, coalesce(s.sort_order, 0), cs.subject_code;
  else
    return query
      select gs.subject_code, coalesce(s.full_name, gs.subject_code),
             gs.sort_order, cs.teacher_id, cs.term,
             cs.term_labels, cs.term_teachers, coalesce(s.is_rotating, false)
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


-- ═══ VERIFY (optional) ══════════════════════════════════════════════════════
-- select 'is_rotating column' as item,
--        exists (select 1 from information_schema.columns
--                where table_name='reg_subjects' and column_name='is_rotating') as ok
-- union all
-- select 'section term_labels column',
--        exists (select 1 from information_schema.columns
--                where table_name='reg_class_subjects' and column_name='term_labels');
-- → dapat 2 rows, parehong true.
