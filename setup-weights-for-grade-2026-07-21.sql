-- reg_weights_for_grade — 2026-07-21
-- The registrar per-student grade encoder has no section (class_id), so it can't
-- use reg_weights_for. This resolves the OFFICIAL subject-type weights by grade
-- level + subject (same reg_default_subject_type mapping the auto-typing uses),
-- so a registrar-encoded Grade 12 grade matches the teacher portal (e.g. Core
-- 25/50/25, Specialized 25/45/30). Batched over subject codes. Applied live via
-- Supabase MCP; this file is the documentation record and is idempotent.
create or replace function public.reg_weights_for_grade(
  p_sy text, p_grade_level text, p_subject_codes text[]
)
returns table(subject_code text, type_key text, label text, ww integer, pt integer, ex integer)
language sql stable security definer set search_path to 'public'
as $$
  select c.code, w.type_key, w.label, w.ww, w.pt, w.ex
  from unnest(p_subject_codes) as c(code)
  join reg_weight_components w
    on w.sy = p_sy
   and w.type_key = reg_default_subject_type(p_grade_level, c.code);
$$;
