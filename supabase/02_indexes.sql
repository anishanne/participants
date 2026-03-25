-- 02: Create indexes
create index if not exists students_student_id_idx on public.students(student_id);
create index if not exists student_schedule_overrides_student_idx on public.student_schedule_overrides(student_id);
create index if not exists announcement_targets_student_idx on public.announcement_targets(student_id);
