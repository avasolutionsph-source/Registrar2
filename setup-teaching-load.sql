-- ─────────────────────────────────────────────────────────────────────────
-- Teaching load: which teacher teaches which subject in which section.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- One row per (class, subject). teacher_id may be null while a subject is
-- offered in a section but not yet assigned. Backs the acad "subject load"
-- assignment (Class ▸ Subjects & Teachers) and will scope the teacher grade
-- sheet.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.reg_class_subjects (
  class_id     uuid    not null references public.reg_classes(id) on delete cascade,
  subject_code text    not null references public.reg_subjects(code) on delete cascade,
  teacher_id   bigint  references public.reg_teachers(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (class_id, subject_code)
);

create index if not exists reg_class_subjects_class_idx   on public.reg_class_subjects (class_id);
create index if not exists reg_class_subjects_teacher_idx on public.reg_class_subjects (teacher_id);

-- keep updated_at fresh (reuses the shared trigger fn from setup-registrar.sql)
drop trigger if exists reg_class_subjects_touch on public.reg_class_subjects;
create trigger reg_class_subjects_touch before update on public.reg_class_subjects
  for each row execute function public.reg_touch_updated_at();

-- RLS: registrar + admin only for now (same shape as the other reg_* tables).
-- When the acad/teacher roles are added, extend this policy accordingly.
alter table public.reg_class_subjects enable row level security;
drop policy if exists "registrar full access" on public.reg_class_subjects;
create policy "registrar full access" on public.reg_class_subjects
  for all to authenticated
  using (public.is_registrar()) with check (public.is_registrar());
