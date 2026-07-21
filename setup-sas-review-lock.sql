-- ============================================================================
--  SAS Review Loop — server-side LOCK for submitted terms (Part D).
--  Run setup-sas-review.sql FIRST, then paste-run this file. Safe to re-run.
--
--  Why this file replaces teacher_save_grades instead of adding a trigger:
--  the client sends the WHOLE subject entry (all terms at once — see save() in
--  apps/portal/src/offices/gradebook/GradeSheet.jsx), so a blanket "reject the
--  write" would also block Term 2 encoding whenever Term 1 is locked. The guard
--  below instead rejects the write ONLY when a LOCKED term's own data actually
--  changed. Editing an unlocked term keeps working normally.
--
--  This is the EXACT body of the live public.teacher_save_grades(), with one
--  added guard block (marked below). Every original check is preserved verbatim.
--  The UI already hides the Save button for a locked term; this makes the rule
--  real (a locked term cannot be edited even by calling the RPC directly).
-- ============================================================================

create or replace function public.teacher_save_grades(
  p_lrn text, p_sy text, p_subject_code text, p_entry jsonb
) returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_class uuid;
  v_grades jsonb;
  v_arr jsonb;
  v_existing jsonb;   -- added: the currently stored entry for this subject
  v_pk text;          -- added: a locked term key ('q1'…'q4')
begin
  if public.current_teacher_id() is null then
    raise exception 'Not a teacher';
  end if;
  if coalesce(p_entry->>'subjectCode', '') <> p_subject_code then
    raise exception 'Subject code mismatch';
  end if;
  select current_class_id, grades into v_class, v_grades
  from reg_students_data where lrn = p_lrn;
  if v_class is null then
    raise exception 'Learner not found or not enrolled in a class';
  end if;
  if not exists (
    select 1 from reg_class_subjects cs
    where cs.class_id = v_class and cs.subject_code = p_subject_code
      and cs.teacher_id = public.current_teacher_id()
  ) then
    raise exception 'Not authorized to grade this subject for this learner';
  end if;

  -- ── ADDED: SAS lock ───────────────────────────────────────────────────────
  -- For every term of this subject already submitted to the Registrar, the
  -- incoming entry must carry that term UNCHANGED. Re-sending identical values
  -- is fine (that is what saving another term does); changing them is not.
  -- A teacher with no submitted terms never enters this loop.
  select e into v_existing
  from jsonb_array_elements(coalesce(coalesce(v_grades, '{}'::jsonb) -> p_sy, '[]'::jsonb)) e
  where e->>'subjectCode' = p_subject_code
  limit 1;

  for v_pk in
    select r.period from public.sas_reviews r
    where r.teacher_id = public.current_teacher_id()
      and r.subject_code = p_subject_code
      and r.sy = p_sy
      and r.status = 'submitted'
  loop
    if (p_entry -> v_pk)                is distinct from (v_existing -> v_pk)
    or (p_entry -> 'raw'      -> v_pk)  is distinct from (v_existing -> 'raw'      -> v_pk)
    or (p_entry -> 'items'    -> v_pk)  is distinct from (v_existing -> 'items'    -> v_pk)
    or (p_entry -> 'attitude' -> v_pk)  is distinct from (v_existing -> 'attitude' -> v_pk)
    then
      raise exception
        'Term % of % was submitted to the Registrar and can no longer be edited.', v_pk, p_subject_code;
    end if;
  end loop;
  -- ── end SAS lock ──────────────────────────────────────────────────────────

  v_grades := coalesce(v_grades, '{}'::jsonb);
  v_arr := coalesce(v_grades -> p_sy, '[]'::jsonb);
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_arr
  from jsonb_array_elements(v_arr) e
  where e->>'subjectCode' <> p_subject_code;
  v_arr := v_arr || jsonb_build_array(p_entry);
  v_grades := jsonb_set(v_grades, array[p_sy], v_arr, true);
  update reg_students_data set grades = v_grades where lrn = p_lrn;
end;
$function$;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- Re-running setup-sas-review.sql does NOT touch this function. To drop the
-- lock, re-create teacher_save_grades without the marked block above; the
-- sas_reviews rows and the rest of the review loop keep working.
