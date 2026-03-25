-- 03: Enable Row Level Security and create policies

alter table public.students enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.student_schedule_overrides enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.push_subscriptions enable row level security;

-- Public read access for participants
create policy "participants can read schedules"
  on public.schedule_slots for select using (true);

create policy "participants can read announcements"
  on public.announcements for select using (true);

create policy "participants can read their overrides"
  on public.student_schedule_overrides for select using (true);

create policy "participants can read announcement targets"
  on public.announcement_targets for select using (true);

-- Admin write access (authenticated users)
create policy "admins manage students"
  on public.students for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage schedules"
  on public.schedule_slots for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage overrides"
  on public.student_schedule_overrides for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage announcements"
  on public.announcements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage announcement targets"
  on public.announcement_targets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage push subscriptions"
  on public.push_subscriptions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
