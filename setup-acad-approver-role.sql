-- ============================================================================
--  acad_sheet_status + approver_role — para office-scoped ang "For your
--  approval". Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  PROBLEMA: ang `mine` flag ay galing sa reg_can_approve na tumitingin sa
--  LAHAT ng roles ng account. Sa multi-role accounts (hal. coordinator na may
--  sas_clve din), lumalabas ang "For your approval" sa COORDINATOR office
--  kahit ang sheet ay naka-ruta sa SAS role — nakakalito.
--
--  AYOS: ibinabalik na rin ang RESOLVED APPROVER ROLE ng bawat sheet
--  (mula sa reg_resolve_approver — hal. 'sas_clve', 'acad_gs', 'principal').
--  Sa portal, ang "For your approval" sa isang coordinator office ay lalabas
--  LANG kapag ang approver_role = acad role NG OFFICE na 'yon; ang ibang
--  sheets ay makikita pa rin (status/transparency) na may "Approver: ..."
--  na label sa halip.
--
--  ⚠ ORDERING: SUPERSEDES ang acad_sheet_status ng setup-combination-subjects
--  .sql (na siyang pinagbasehan — kasama ang per-term owner expansion at
--  `term` column). Kapag ni-re-run ang lumang file, patakbuhin ULIT ito.
-- ============================================================================

drop function if exists public.acad_sheet_status(text, text);

create function public.acad_sheet_status(p_dept text, p_sy text)
returns table(teacher_id bigint, teacher_name text, subject_code text, class_id uuid,
              grade_level text, section_name text, period text, status text, note text,
              mine boolean, flag text, term text, approver_role text)
language sql stable security definer set search_path to 'public' as $$
  select o.tid, t.family_name || ', ' || t.first_name, cs.subject_code, c.id, c.grade_level, c.section_name,
         r.period, coalesce(r.status,'in_progress'), r.note,
         public.reg_can_approve(o.tid, cs.subject_code, c.id),
         (select a.flag from public.reg_resolve_approver(o.tid, cs.subject_code, c.id) a),
         o.terms,
         (select a.approver_role from public.reg_resolve_approver(o.tid, cs.subject_code, c.id) a)
  from reg_class_subjects cs
  join reg_classes c on c.id = cs.class_id
  cross join lateral (
    select cs.teacher_id as tid, cs.term as terms
    where cs.term_teachers is null and cs.teacher_id is not null
    union all
    select (e.value)::bigint, string_agg(e.key, ',' order by e.key)
    from jsonb_each_text(cs.term_teachers) e
    where cs.term_teachers is not null and e.value ~ '^\d+$'
    group by (e.value)::bigint
  ) o
  join reg_teachers t on t.id = o.tid
  left join sas_grade_reviews r
         on r.teacher_id = o.tid and r.subject_code = cs.subject_code and r.sy = c.sy
        and (o.terms is null or r.period = any(string_to_array(o.terms, ',')))
  where c.sy = p_sy and public.reg_dept_of(c.grade_level) = p_dept
    and p_dept in (select dept from public.acad_my_depts())
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code; $$;

grant execute on function public.acad_sheet_status(text, text) to authenticated;


-- ═══ VERIFY — dapat true ═══════════════════════════════════════════════════
select 'acad_sheet_status may approver_role' as item,
       (pg_get_function_result('public.acad_sheet_status(text,text)'::regprocedure)
        like '%approver_role%')::text as value;
