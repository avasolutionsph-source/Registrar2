-- ============================================================================
--  Student delete guard — block ONLY when the learner has encoded grades.
--  Paste-run this whole file in the Supabase SQL editor.
--
--  Why: the delete guard must be enforced server-side, not just in the UI, so a
--  learner with real academic records can never be destroyed — even by another
--  client or a stale browser tab.
--
--  Rules implemented here:
--   • BLOCK the delete if the learner has an actually-encoded score/grade in ANY
--     school year (current or past). `grades` is a JSONB object keyed by SY, so
--     every year is scanned — the check is never scoped to the active SY.
--   • ALLOW the delete when there is no encoded grade in any year, even if the
--     learner has enrolment history (enrolled but never studied). Enrolment
--     history lives on the learner's own row, so it goes with them — nothing is
--     orphaned and no other data is touched.
--   • A blank grade-sheet row does NOT count: a QuarterGrade entry is created for
--     every enrolled subject, so we look for real VALUES, not the row's existence.
-- ============================================================================

-- Does this learner have an actually-encoded score/grade in ANY school year?
create or replace function public.student_has_grades(p_lrn text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.reg_students_data s
    cross join lateral jsonb_each(
      case when jsonb_typeof(s.grades) = 'object' then s.grades else '{}'::jsonb end
    ) as y(sy, entries)
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(y.entries) = 'array' then y.entries else '[]'::jsonb end
    ) as e(entry)
    where s.lrn = p_lrn
      and (
        -- a transmuted quarterly / final grade
        exists (
          select 1
          from unnest(array['q1','q2','q3','q4','final']) as k
          where jsonb_typeof(e.entry -> k) = 'number'
        )
        -- or a raw encoded item score, e.g. items.q1[] = [{earned, total}]
        or exists (
          select 1
          from jsonb_each(
            case when jsonb_typeof(e.entry -> 'items') = 'object'
                 then e.entry -> 'items' else '{}'::jsonb end
          ) as it(pk, arr)
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(it.arr) = 'array' then it.arr else '[]'::jsonb end
          ) as itm(v)
          where jsonb_typeof(itm.v -> 'earned') = 'number'
        )
        -- or an encoded attitude rating
        or exists (
          select 1
          from jsonb_each(
            case when jsonb_typeof(e.entry -> 'attitude') = 'object'
                 then e.entry -> 'attitude' else '{}'::jsonb end
          ) as a(pk, v)
          where jsonb_typeof(a.v) = 'number'
        )
      )
  );
$$;

grant execute on function public.student_has_grades(text) to authenticated;

-- Re-check server-side on every delete through the reg_students view. Same body
-- as before plus the grade guard; enrolment history is NOT a reason to block.
create or replace function public.reg_students_del()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_registrar() then
    raise exception 'not authorized';
  end if;
  if public.student_has_grades(OLD.lrn) then
    raise exception 'Cannot delete: this learner has existing grade records. Set them to Transferred Out or Dropped instead.';
  end if;
  delete from public.reg_students_data where lrn = OLD.lrn;
  return OLD;
end;
$function$;

-- ── Sanity checks (optional) ────────────────────────────────────────────────
-- How many learners would be blocked vs deletable:
--   select count(*) filter (where public.student_has_grades(lrn))     as blocked,
--          count(*) filter (where not public.student_has_grades(lrn)) as deletable
--   from public.reg_students_data;
--
-- Spot-check one learner:
--   select lrn, public.student_has_grades(lrn) from public.reg_students_data where lrn = 'REPLACE_ME';
