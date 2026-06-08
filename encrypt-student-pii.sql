-- ════════════════════════════════════════════════════════════════════════
--  REGISTRAR SYSTEM — column-level encryption of student PII
--
--  Applied to the live Supabase project on 2026-06-09 via the MCP migration
--  tooling. This file is the version-controlled record of that change.
--
--  WHAT IT DOES
--  ------------
--  The sensitive columns of reg_students (address, contact_number,
--  father_name, mother_maiden_name, birthdate) are encrypted at rest with
--  AES-256-CBC. The key lives in Supabase Vault (its master key is held
--  OUTSIDE the database), so a leaked DB dump — or even a leaked service_role
--  key — yields only ciphertext.
--
--  ARCHITECTURE (transparent to the app — db.ts is unchanged)
--  ----------------------------------------------------------
--      app ──.from('reg_students')──►  VIEW  public.reg_students
--                                        │  read  → enc.decrypt(col)   (gated)
--                                        │  write → INSTEAD OF triggers
--                                        │            → enc.encrypt(col)
--                                        ▼
--                               TABLE public.reg_students_data
--                               (sensitive cols = *_enc bytea ciphertext)
--
--  The view is SECURITY DEFINER with an explicit `WHERE is_registrar()` gate;
--  enc.decrypt() ALSO re-checks is_registrar(); the base table is revoked from
--  anon/authenticated so every access goes through the view. (Supabase's
--  linter will flag the SECURITY DEFINER view — that is intentional here.)
--
--  NOTE FOR BULK RE-IMPORTS: scripts/migrate/* write to `reg_students`, which
--  is now a view. The INSTEAD OF triggers require a registrar JWT, so a
--  service_role / Management-API bulk load will be rejected. Point such loads
--  at reg_students_data and wrap plaintext PII in enc.encrypt(), or run them as
--  a registrar. Normal day-to-day writes from the app are unaffected.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Encryption internals (private `enc` schema, not exposed to the API) ──
create schema if not exists enc;

-- One-time: generate an AES-256 key and store it in Vault.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'reg_pii_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'reg_pii_key',
      'AES-256-CBC key for reg_students PII columns'
    );
  end if;
end $$;

-- Caches the key in a transaction-local GUC so a bulk decrypt reads Vault ONCE
-- per query instead of once per row (the difference between ~1s and a few ms on
-- a 6k-row scan). Non-registrars never reach this (enc.decrypt guards first).
create or replace function enc.key_bytea()
returns bytea language plpgsql stable security definer set search_path = '' as $$
declare
  v_cached text := current_setting('enc.k', true);
  v_key    text;
begin
  if v_cached is not null and v_cached <> '' then
    return decode(v_cached, 'base64');
  end if;
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'reg_pii_key' limit 1;
  perform set_config('enc.k', v_key, true);   -- transaction-local, auto-cleared
  return decode(v_key, 'base64');
end;
$$;

create or replace function enc.encrypt(p_plain text)
returns bytea language plpgsql volatile security definer set search_path = '' as $$
declare v_iv bytea;
begin
  if p_plain is null then return null; end if;
  v_iv := extensions.gen_random_bytes(16);            -- random IV per value
  return v_iv || extensions.encrypt_iv(
    convert_to(p_plain, 'utf8'), enc.key_bytea(), v_iv, 'aes-cbc/pad:pkcs');
end; $$;

create or replace function enc.decrypt(p_cipher bytea)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if p_cipher is null then return null; end if;
  if not public.is_registrar() then return null; end if;   -- authorization gate
  return convert_from(
    extensions.decrypt_iv(
      substring(p_cipher from 17), enc.key_bytea(),
      substring(p_cipher from 1 for 16), 'aes-cbc/pad:pkcs'),
    'utf8');
end; $$;

revoke all on schema enc from public;
revoke all on all functions in schema enc from public;
-- The decrypting view runs enc.decrypt with the INVOKER's function privileges,
-- so authenticated needs EXECUTE on decrypt only (still gated internally).
grant usage on schema enc to authenticated;
grant execute on function enc.decrypt(bytea) to authenticated;

-- ── 2. ONE-TIME data migration (already applied — destructive, do NOT re-run) ──
-- alter table public.reg_students
--   add column address_enc bytea, add column contact_number_enc bytea,
--   add column father_name_enc bytea, add column mother_maiden_name_enc bytea,
--   add column birthdate_enc bytea;
--
-- update public.reg_students set
--   address_enc            = enc.encrypt(nullif(address, '')),
--   contact_number_enc     = enc.encrypt(nullif(contact_number, '')),
--   father_name_enc        = enc.encrypt(nullif(father_name, '')),
--   mother_maiden_name_enc = enc.encrypt(nullif(mother_maiden_name, '')),
--   birthdate_enc          = enc.encrypt(birthdate::text);
--   -- (verified: 0 missing, 0 decrypt mismatches across 5,992 rows)
--
-- alter table public.reg_students
--   drop column address, drop column contact_number, drop column father_name,
--   drop column mother_maiden_name, drop column birthdate;
-- alter table public.reg_students rename to reg_students_data;
-- revoke all on table public.reg_students_data from anon, authenticated;

-- ── 3. Decrypting view (gated) ──────────────────────────────────────────
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
  created_at, updated_at, conduct, photo_url
from public.reg_students_data
where public.is_registrar();

alter view public.reg_students owner to postgres;
grant select, insert, update, delete on public.reg_students to authenticated, service_role;

-- ── 4. INSTEAD OF triggers: encrypt on write, authorize every write ─────
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
    birthdate_enc          = enc.encrypt(NEW.birthdate::text)
  where lrn = OLD.lrn;
  return NEW;
end; $$;

create or replace function public.reg_students_del()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_registrar() then raise exception 'not authorized'; end if;
  delete from public.reg_students_data where lrn = OLD.lrn;
  return OLD;
end; $$;

drop trigger if exists reg_students_instead_ins on public.reg_students;
drop trigger if exists reg_students_instead_upd on public.reg_students;
drop trigger if exists reg_students_instead_del on public.reg_students;
create trigger reg_students_instead_ins instead of insert on public.reg_students
  for each row execute function public.reg_students_ins();
create trigger reg_students_instead_upd instead of update on public.reg_students
  for each row execute function public.reg_students_upd();
create trigger reg_students_instead_del instead of delete on public.reg_students
  for each row execute function public.reg_students_del();
