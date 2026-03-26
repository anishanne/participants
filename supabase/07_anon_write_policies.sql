-- 07: Allow anon key to write to tables managed by the app
-- Auth is handled by Stanford SSO in application code, not Supabase Auth.
-- These policies allow the anon key to insert/update/delete.

-- Announcements
create policy "anon can insert announcements"
  on public.announcements for insert with check (true);

create policy "anon can update announcements"
  on public.announcements for update using (true);

create policy "anon can delete announcements"
  on public.announcements for delete using (true);

-- Schedule slots
create policy "anon can insert schedule_slots"
  on public.schedule_slots for insert with check (true);

create policy "anon can update schedule_slots"
  on public.schedule_slots for update using (true);

create policy "anon can delete schedule_slots"
  on public.schedule_slots for delete using (true);

-- Student schedule overrides
create policy "anon can insert student_schedule_overrides"
  on public.student_schedule_overrides for insert with check (true);

create policy "anon can update student_schedule_overrides"
  on public.student_schedule_overrides for update using (true);

create policy "anon can delete student_schedule_overrides"
  on public.student_schedule_overrides for delete using (true);
