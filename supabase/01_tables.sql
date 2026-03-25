-- 01: Create all tables
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
