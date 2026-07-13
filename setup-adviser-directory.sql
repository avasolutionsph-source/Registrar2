-- ════════════════════════════════════════════════════════════════════════
--  Adviser Directory / School Form 1 (SF1) details — VIEW ONLY
--
--  Lets a class adviser view their advisory section's parent-contact directory
--  and SF1 register. Decrypts the PII fields (contact number, parents, birthdate,
--  address) the same way the registrar reg_students view does. Adviser-scoped.
--
--  ALREADY APPLIED to the live DB via MCP (migration teacher_advisory_details_rpc).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.teacher_advisory_details(p_class_id uuid)
returns table(
  lrn text, last_name text, first_name text, middle_name text, extension text,
  gender text, birthdate text, religion text, address text, contact_number text,
  father_name text, mother_maiden_name text, guardian_relation text
)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if public.current_teacher_id() is null
     or not exists (select 1 from reg_classes c where c.id = p_class_id and c.adviser_id = public.current_teacher_id()) then
    raise exception 'Not the adviser of this class';
  end if;
  return query
    select st.lrn, st.last_name, st.first_name, st.middle_name, st.extension, st.gender,
           enc.decrypt(st.birthdate_enc)::date::text, st.religion,
           enc.decrypt(st.address_enc), enc.decrypt(st.contact_number_enc),
           enc.decrypt(st.father_name_enc), enc.decrypt(st.mother_maiden_name_enc),
           st.guardian_relation
    from reg_students_data st
    where st.current_class_id = p_class_id
    order by st.last_name, st.first_name;
end;
$$;

grant execute on function public.teacher_advisory_details(uuid) to authenticated;
