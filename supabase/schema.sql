create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  phone_number text,
  phone_verified boolean not null default false,
  push_enabled boolean not null default false,
  home_screen_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  starts_at timestamptz not null,
  title text not null,
  location text not null,
  description text not null,
  track text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.student_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  schedule_slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  replacement_title text,
  replacement_location text,
  created_at timestamptz not null default now(),
  unique (student_id, schedule_slot_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_markdown text not null,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default true,
  audience_mode text not null check (audience_mode in ('all', 'students')),
  author_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  student_id text not null,
  created_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists students_student_id_idx on public.students(student_id);
create index if not exists student_schedule_overrides_student_idx on public.student_schedule_overrides(student_id);
create index if not exists announcement_targets_student_idx on public.announcement_targets(student_id);

alter table public.students enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.student_schedule_overrides enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "participants can read schedules"
  on public.schedule_slots
  for select
  using (true);

create policy "participants can read announcements"
  on public.announcements
  for select
  using (true);

create policy "participants can read their overrides"
  on public.student_schedule_overrides
  for select
  using (true);

create policy "participants can read announcement targets"
  on public.announcement_targets
  for select
  using (true);

create policy "admins manage students"
  on public.students
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage schedules"
  on public.schedule_slots
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage overrides"
  on public.student_schedule_overrides
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage announcements"
  on public.announcements
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage announcement targets"
  on public.announcement_targets
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admins manage push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
