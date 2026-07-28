-- ============================================================================
--  ROUTING: lahat ng SHS teacher grade sheets → Academic Coordinator — SHS
--  Paste-run sa Supabase SQL editor. Safe to re-run.
--
--  Dinadagdag ang leveled rule na "Teacher · Senior High → acad_shs". Ang
--  leveled rule ay nananaig sa "Every level" na Teacher rule (→ SAS of
--  subject), kaya ang LAHAT ng SHS gradesheets ng mga teacher ay kay AC—SHS
--  na mapupunta para sa approval. (Ang SAS-role encoders sa SHS sections ay
--  dumadaan na rin kay AC—SHS via "AC of the SECTION's level", at ang sariling
--  sheets ni AC—SHS ay kay Principal — kumpleto na ang chain.)
--
--  Kapareho ito ng pagkakagawa ng "Teacher · Preschool" rule.
-- ============================================================================

do $$
begin
  if exists (select 1 from public.reg_approval_routing
              where source_role = 'teacher' and source_scope = 'shs') then
    update public.reg_approval_routing
       set approver_kind = 'fixed', approver_role = 'acad_shs', approver_derive = null
     where source_role = 'teacher' and source_scope = 'shs';
  else
    insert into public.reg_approval_routing
      (source_role, source_scope, approver_kind, approver_role, approver_derive)
    values ('teacher', 'shs', 'fixed', 'acad_shs', null);
  end if;
end $$;

-- ═══ VERIFY — dapat makita ang bagong row:
--  teacher | shs | fixed | acad_shs
select source_role, source_scope, approver_kind, approver_role, approver_derive
from public.reg_approval_routing
order by source_role, source_scope nulls first;
