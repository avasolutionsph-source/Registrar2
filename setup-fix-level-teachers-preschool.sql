-- ============================================================================
--  AYUSIN: hindi maka-Add Teacher ang Preschool coordinator  (2026-07-30)
--  Paste-run sa Supabase ▸ SQL Editor. Safe to re-run.
--
--  ANG ERROR NA NAKIKITA:
--    new row for relation "acad_level_teachers" violates check constraint
--    "acad_level_teachers_role_check"
--
--  ANG DAHILAN: ang acad_level_teachers (roster ng bawat office) ay ginawa
--  NOONG WALA PA ang Preschool office. Ang CHECK sa `role` column nito ay
--  nagpapapasok lang ng acad_gs / acad_jhs / acad_shs, kaya tinatanggihan ang
--  'acad_pre'. Kapareho itong uri ng naiwan sa acad_my_roles() na naayos na
--  sa setup-acad-my-roles-includes-preschool.sql — isa pang lugar na hindi
--  nakasabay noong naidagdag ang Preschool.
-- ============================================================================


-- ═══ PART 1 — TINGNAN MUNA (para may record ka ng dating anyo) ══════════════
select con.conname,
       pg_get_constraintdef(con.oid) as kasalukuyang_check
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'acad_level_teachers'
  and con.contype = 'c';


-- ═══ PART 2 — PALITAN ANG CHECK ════════════════════════════════════════════
-- Ang apat na Academic Coordinator role ang tanging tama rito: isa kada
-- office. Kung may ibang role na naipasok na dati (hindi dapat), ipapakita ito
-- ng PART 3 bago pa tayo magpatuloy.
do $$
declare v_bad int;
begin
  -- Huwag palitan ang constraint kung may laman nang hindi papasa — mas mabuting
  -- sumabog nang malinaw kaysa mag-iwan ng table na hindi tugma sa sarili nito.
  select count(*) into v_bad
  from acad_level_teachers
  where role not in ('acad_pre', 'acad_gs', 'acad_jhs', 'acad_shs');

  if v_bad > 0 then
    raise exception
      'May % row sa acad_level_teachers na hindi acad_pre/gs/jhs/shs. Tingnan muna ang PART 3 bago ituloy.', v_bad;
  end if;

  alter table public.acad_level_teachers
    drop constraint if exists acad_level_teachers_role_check;

  alter table public.acad_level_teachers
    add constraint acad_level_teachers_role_check
    check (role in ('acad_pre', 'acad_gs', 'acad_jhs', 'acad_shs'));

  raise notice 'Tumatanggap na ng acad_pre ang acad_level_teachers.';
end $$;


-- ═══ PART 3 — kung sumabog ang PART 2, ito ang tingnan ═════════════════════
select role, count(*) as rows
from acad_level_teachers
group by role
order by role;


-- ═══ VERIFY — dapat 'true' ═════════════════════════════════════════════════
select 'acad_pre tanggap na' as item,
       (pg_get_constraintdef(con.oid) like '%acad_pre%')::text as ok
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'acad_level_teachers'
  and con.conname = 'acad_level_teachers_role_check';
