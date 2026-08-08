-- ════════════════════════════════════════════════════════════════════════
--  Preschool Progress Report inputs — adviser subject list
--
--  The Nursery & Kindergarten Progress Report prints per-area B/D/C letters
--  and per-statement deportment marks that the CLASS ADVISER encodes in the
--  portal (Adviser ▸ Progress Report / Deportment Marks). Those inputs are
--  stored in reg_students_data.conduct[sy].preScholarship / .preDeportment
--  through the EXISTING teacher_save_conduct RPC (adviser-guarded, shallow
--  merge — no schema change needed).
--
--  The only missing piece is READ access to the section's learning-area list
--  for the adviser (reg_class_subjects is registrar/coordinator-guarded), so
--  the Progress sheet shows the same areas, in the same order, as the card.
--
--  PASTE-RUN sa Supabase SQL editor. Walang tatanggaling data.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.teacher_advisory_subjects(p_class_id uuid)
returns table(subject_code text, full_name text, sort_order int)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if public.current_teacher_id() is null
     or not exists (
       select 1 from reg_classes c
       where c.id = p_class_id and c.adviser_id = public.current_teacher_id()
     ) then
    raise exception 'Not the adviser of this class';
  end if;
  return query
    select cs.subject_code,
           coalesce(s.full_name, cs.subject_code) as full_name,
           coalesce(gs.sort_order, 9999) as sort_order
    from reg_class_subjects cs
    join reg_classes c on c.id = cs.class_id
    left join reg_subjects s on upper(s.code) = upper(cs.subject_code)
    left join reg_grade_subjects gs
      on gs.grade_level = c.grade_level
     and upper(gs.subject_code) = upper(cs.subject_code)
    where cs.class_id = p_class_id
    order by 3, 2;
end;
$$;

grant execute on function public.teacher_advisory_subjects(uuid) to authenticated;

-- ── VERIFY (dapat may isang row na "ok") ──────────────────────────────────
select 'teacher_advisory_subjects ready' as check,
       exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'teacher_advisory_subjects'
       ) as ok;
