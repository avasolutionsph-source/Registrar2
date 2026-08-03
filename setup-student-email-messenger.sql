-- ============================================================================
--  STUDENT CONTACT: email + messenger account  (2026-07-31)
--  Paste-run ang BUONG file sa Supabase ▸ SQL Editor. Safe to re-run.
--  Kailangan muna ang encrypt-student-pii.sql (ang enc schema, ang view, at
--  ang INSTEAD OF triggers).
--
--  BAKIT: hinihingi ng Form 1 ang EMAIL (parent/guardian) at MESSENGER ACCOUNT,
--  pero wala pang ganitong field ang learner record.
--
--  Sinusunod nito ang KAPAREHONG pattern ng ibang PII: naka-encrypt sa
--  reg_students_data (email_enc / messenger_enc), dinedecrypt ng reg_students
--  view, at ini-encrypt ng INSTEAD OF triggers sa bawat write. Walang plain-text
--  na kopya ng contact ng magulang na nakahiga sa database.
--
--  ⚠ Ang dalawang bagong column ay nasa DULO ng view — kailangan ito ng
--  `create or replace view` (bawal baguhin ang pagkakasunod ng mga luma).
-- ============================================================================

-- ═══ 1. Ang mga column ══════════════════════════════════════════════════════
alter table public.reg_students_data
  add column if not exists email_enc bytea,
  add column if not exists messenger_enc bytea;


-- ═══ 2. Ang view — dagdag na email + messenger sa dulo ══════════════════════
create or replace view public.reg_students
with (security_invoker = false) as
select
  lrn, student_no, first_name, middle_name, last_name, extension, gender,
  enc.decrypt(birthdate_enc)::date          as birthdate,
  religion,
  enc.decrypt(address_enc)                  as address,
  enc.decrypt(contact_number_enc)           as contact_number,
  enc.decrypt(father_name_enc)              as father_name,
  enc.decrypt(mother_maiden_name_enc)       as mother_maiden_name,
  guardian_relation, current_sy, current_class_id, curriculum, status,
  elem_school_graduated_from, school_type, loyalty_years,
  enrolment_history, grades, credentials, ncae, nat,
  created_at, updated_at, conduct, photo_url,
  enc.decrypt(email_enc)                    as email,
  enc.decrypt(messenger_enc)                as messenger
from public.reg_students_data
where public.is_registrar();

alter view public.reg_students owner to postgres;
grant select, insert, update, delete on public.reg_students to authenticated, service_role;


-- ═══ 3. Isulat sila sa mga trigger ══════════════════════════════════════════
create or replace function public.reg_students_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_registrar() then raise exception 'not authorized'; end if;
  insert into public.reg_students_data (
    lrn, student_no, first_name, middle_name, last_name, extension, gender,
    religion, guardian_relation, current_sy, current_class_id, curriculum, status,
    elem_school_graduated_from, school_type, loyalty_years,
    enrolment_history, grades, conduct, credentials, ncae, nat, photo_url,
    address_enc, contact_number_enc, father_name_enc, mother_maiden_name_enc, birthdate_enc,
    email_enc, messenger_enc,
    created_at, updated_at
  ) values (
    NEW.lrn, NEW.student_no, NEW.first_name, NEW.middle_name, NEW.last_name, NEW.extension, NEW.gender,
    NEW.religion, NEW.guardian_relation, NEW.current_sy, NEW.current_class_id, NEW.curriculum,
    coalesce(NEW.status, 'Active'),
    NEW.elem_school_graduated_from, NEW.school_type, NEW.loyalty_years,
    coalesce(NEW.enrolment_history, '[]'::jsonb), coalesce(NEW.grades, '{}'::jsonb),
    coalesce(NEW.conduct, '{}'::jsonb), coalesce(NEW.credentials, '{}'::jsonb),
    NEW.ncae, NEW.nat, NEW.photo_url,
    enc.encrypt(nullif(NEW.address, '')), enc.encrypt(nullif(NEW.contact_number, '')),
    enc.encrypt(nullif(NEW.father_name, '')), enc.encrypt(nullif(NEW.mother_maiden_name, '')),
    enc.encrypt(NEW.birthdate::text),
    enc.encrypt(nullif(NEW.email, '')), enc.encrypt(nullif(NEW.messenger, '')),
    coalesce(NEW.created_at, now()), now()
  );
  return NEW;
end; $$;

create or replace function public.reg_students_upd()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_registrar() then raise exception 'not authorized'; end if;
  update public.reg_students_data set
    lrn = NEW.lrn, student_no = NEW.student_no, first_name = NEW.first_name,
    middle_name = NEW.middle_name, last_name = NEW.last_name, extension = NEW.extension,
    gender = NEW.gender, religion = NEW.religion, guardian_relation = NEW.guardian_relation,
    current_sy = NEW.current_sy, current_class_id = NEW.current_class_id, curriculum = NEW.curriculum,
    status = NEW.status, elem_school_graduated_from = NEW.elem_school_graduated_from,
    school_type = NEW.school_type, loyalty_years = NEW.loyalty_years,
    enrolment_history = NEW.enrolment_history, grades = NEW.grades, conduct = NEW.conduct,
    credentials = NEW.credentials, ncae = NEW.ncae, nat = NEW.nat, photo_url = NEW.photo_url,
    address_enc            = enc.encrypt(nullif(NEW.address, '')),
    contact_number_enc     = enc.encrypt(nullif(NEW.contact_number, '')),
    father_name_enc        = enc.encrypt(nullif(NEW.father_name, '')),
    mother_maiden_name_enc = enc.encrypt(nullif(NEW.mother_maiden_name, '')),
    birthdate_enc          = enc.encrypt(NEW.birthdate::text),
    email_enc              = enc.encrypt(nullif(NEW.email, '')),
    messenger_enc          = enc.encrypt(nullif(NEW.messenger, ''))
  where lrn = OLD.lrn;
  return NEW;
end; $$;


-- ═══ VERIFY — dapat 'true' lahat ═══════════════════════════════════════════
select 'email column sa view' as item,
       exists (select 1 from information_schema.columns
               where table_name = 'reg_students' and column_name = 'email')::text as ok
union all
select 'messenger column sa view',
       exists (select 1 from information_schema.columns
               where table_name = 'reg_students' and column_name = 'messenger')::text
union all
select 'encrypted sa base table',
       (exists (select 1 from information_schema.columns
                where table_name = 'reg_students_data' and column_name = 'email_enc')
        and exists (select 1 from information_schema.columns
                    where table_name = 'reg_students_data' and column_name = 'messenger_enc'))::text;
