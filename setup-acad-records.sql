-- ============================================================================
--  Coordinator read access: ESC / NCAE / NAT per section
--  Paste-run in the Supabase SQL editor. Safe to re-run.
--
--  Three read-only SECURITY DEFINER RPCs for the Academic Coordinator portal
--  (Records page). Each is gated by is_acad_for(the section's grade level), so
--  a coordinator only ever reads sections of their own level — the same guard
--  as the teaching-load RPCs. Only the LRN plus the record fields are
--  returned; learner names come from the existing acad_class_roster RPC and
--  are joined client-side.
-- ============================================================================

-- ESC grantees of one section (matched on the section's SY).
create or replace function public.acad_class_esc(p_class_id uuid)
returns table(lrn text, grantee boolean, esc_no text)
language sql stable security definer set search_path to 'public' as $$
  select s.lrn, coalesce(e.grantee, false), coalesce(e.esc_no, '')
    from reg_classes c
    join reg_students_data s on s.current_class_id = c.id
    left join reg_esc_grants e on e.lrn = s.lrn and e.sy = c.sy
   where c.id = p_class_id
     and public.is_acad_for(c.grade_level);
$$;

-- NCAE scores of one section (stored on the student record).
create or replace function public.acad_class_ncae(p_class_id uuid)
returns table(lrn text, ncae jsonb)
language sql stable security definer set search_path to 'public' as $$
  select s.lrn, s.ncae
    from reg_classes c
    join reg_students_data s on s.current_class_id = c.id
   where c.id = p_class_id
     and public.is_acad_for(c.grade_level);
$$;

-- NAT scores of one section (matched on the section's SY).
create or replace function public.acad_class_nat(p_class_id uuid)
returns table(lrn text, english numeric, filipino numeric, math numeric, science numeric, ap numeric)
language sql stable security definer set search_path to 'public' as $$
  select s.lrn, n.english, n.filipino, n.math, n.science, n.ap
    from reg_classes c
    join reg_students_data s on s.current_class_id = c.id
    left join reg_nat_scores n on n.lrn = s.lrn and n.sy = c.sy
   where c.id = p_class_id
     and public.is_acad_for(c.grade_level);
$$;

grant execute on function
  public.acad_class_esc(uuid),
  public.acad_class_ncae(uuid),
  public.acad_class_nat(uuid)
to authenticated;

-- ── Verification: dapat 3 rows na acad_class_% ──
select proname from pg_proc
 where pronamespace = 'public'::regnamespace and proname like 'acad_class_%'
 order by proname;
