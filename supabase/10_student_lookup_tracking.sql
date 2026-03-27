-- 10: Track when students look up their schedule
alter table public.student_metadata add column if not exists last_looked_up timestamptz;
