-- ============================================================================
--  Add Teacher picker — huwag kailanman magtago ng pangalan kapag hindi alam
--  kung aling office ang nagtatanong. Paste-run sa Supabase SQL editor.
--  Safe to re-run.
--
--  PROBLEMA (2026-07-28, Preschool office): 64 active teachers, 2 lang ang may
--  preschool load — dapat 62 ang lumalabas, pero WALA. Ang tawag ay napunta sa
--  p_role = null na landas (lumang naka-cache na bundle sa browser, o hindi pa
--  nare-refresh ang PostgREST schema cache pagkatapos ng bagong signature), at
--  doon ang load-based exclusion ay UNION ng lahat ng roles ng caller. Ang
--  account ay may apat (acad_gs, acad_jhs, acad_pre, acad_shs), kaya naaalis
--  ang bawat teacher na may load kahit saang level — 62 sa 64.
--
--  AYOS: ang load-based exclusion ("nasa listahan na siya ng office na ito")
--  ay may saysay LAMANG kapag alam kung aling office ang nagtatanong. Kapag
--  walang p_role, hindi na ito ginagamit — ang natitirang exclusion ay ang
--  roster row lang. Mas masama ang nawawalang pangalan kaysa sa isang pangalan
--  na nasa listahan na pala.
--
--  Kasama rin sa dulo ang `notify pgrst` para hindi na maulit ang stale-cache
--  na sanhi.
-- ============================================================================

create or replace function public.acad_available_teachers(p_role text default null)
returns table(id bigint, name text, email text)
language sql stable security definer set search_path to 'public'
as $$
  select t.id,
         nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.family_name,'')), '') as name,
         t.email
  from reg_teachers t
  where coalesce(t.year_ended, 0) = 0
    and array_length(public.acad_scope_roles(p_role), 1) is not null
    -- May office na hiniling: itago ang may load na SA OFFICE NA ITO — nasa
    -- Teacher Loads list na sila. Walang office na hiniling (fallback): huwag
    -- magtago kahit kanino batay sa load — hindi natin alam kung aling level
    -- ang tinatanong, at ang UNION ng lahat ng level ay nag-aalis ng halos
    -- lahat sa isang multi-role na account.
    and (p_role is null or not exists (
      select 1 from reg_class_subjects cs
      join reg_classes c on c.id = cs.class_id
      where cs.teacher_id = t.id
        and public.reg_ac_role_for(c.grade_level) = any (public.acad_scope_roles(p_role))
    ))
    and not exists (
      select 1 from acad_level_teachers lt
      where lt.teacher_id = t.id
        and lt.role = any (public.acad_scope_roles(p_role))
    )
  order by name;
$$;

grant execute on function public.acad_available_teachers(text) to authenticated;

-- Ipaalam agad sa API layer ang bagong kahulugan (ito ang nawawalang hakbang
-- na nagdulot ng tahimik na pagbagsak sa lumang landas).
notify pgrst, 'reload schema';


-- ═══ VERIFY — dapat 'true' ══════════════════════════════════════════════════
select 'picker never hides on the fallback path' as item,
       (pg_get_functiondef('public.acad_available_teachers(text)'::regprocedure)
        like '%p_role is null or not exists%')::text as value;
