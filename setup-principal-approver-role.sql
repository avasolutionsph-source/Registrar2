-- ============================================================================
--  principal_sheet_status + approver_role — para ang Principal page ay
--  sumunod sa Grade Approval Routing ng Registrar. Paste-run sa Supabase SQL
--  editor. Safe to re-run.
--
--  PROBLEMA (2026-07-29): ang listahan ay naka-filter sa `reg_can_approve`,
--  na tumitingin sa LAHAT ng roles ng naka-login. Sa multi-role na account
--  (hal. principal na may sas_clve at acad_shs din), ang mga sheet ng
--  ORDINARYONG teacher ay lumalabas sa Principal page — kahit ang nakatakda
--  sa routing ay SAS ng subject o Academic Coordinator ng level. Mukhang
--  hindi sinusunod ng page ang setup ng Registrar.
--
--  AYOS: ibinabalik na rin ang RESOLVED APPROVER ROLE ng bawat sheet (mula sa
--  reg_resolve_approver — hal. 'sas_clve', 'acad_gs', 'principal'), tulad ng
--  ginawa sa acad_sheet_status. Ang portal ang magpapakita LANG ng mga sheet
--  na ang approver ay 'principal', at bibilangin ang iba bilang paalala.
--
--  Ang WHERE ay sinadyang hindi ginalaw: ang server ay hindi nagbabawal ng
--  access na dati nang mayroon — ang pagpili kung ano ang ipapakita ay
--  desisyon ng page, tulad din sa coordinator offices.
--
--  ⚠ ORDERING: SUPERSEDES ang principal_sheet_status ng
--  setup-combination-subjects.sql — kapag ni-re-run ang file na iyon,
--  i-re-run ITO pagkatapos.
-- ============================================================================

drop function if exists public.principal_sheet_status(text);

create function public.principal_sheet_status(p_sy text default null)
returns table(teacher_id bigint, teacher_name text,
              subject_code text, subject_name text,
              class_id uuid, sy text, grade_level text, section_name text,
              period text, status text, note text, term text,
              approver_role text)
language sql stable security definer set search_path to 'public'
as $$
  select o.tid,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), ''),
         cs.subject_code, coalesce(s.full_name, cs.subject_code),
         c.id, c.sy, c.grade_level, c.section_name,
         r.period, coalesce(r.status, 'in_progress'), r.note, o.terms,
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
  left join reg_subjects s on s.code = cs.subject_code
  left join sas_grade_reviews r
         on r.teacher_id = o.tid and r.subject_code = cs.subject_code and r.sy = c.sy
        and (o.terms is null or r.period = any(string_to_array(o.terms, ',')))
  where (p_sy is null or c.sy = p_sy)
    and public.reg_can_approve(o.tid, cs.subject_code, c.id)
  order by c.grade_level, c.section_name, t.family_name, cs.subject_code;
$$;

grant execute on function public.principal_sheet_status(text) to authenticated;

-- Bagong signature → kailangang makita agad ng API layer.
notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' ══════════════════════════════════════════════════
select 'principal_sheet_status may approver_role' as item,
       (pg_get_function_result('public.principal_sheet_status(text)'::regprocedure)
        like '%approver_role%')::text as value;
