-- SMT 2026 Participants App — Supabase Schema
-- RLS is disabled. All access via service key through API routes.

create extension if not exists "pgcrypto";

-- Schedule slots (tournament day events)
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

-- Student metadata (imported from CSV)
create table if not exists public.student_metadata (
  id uuid primary key default gen_random_uuid(),
  badge_number text not null unique,
  student_name text not null default '',
  name_abbreviated text not null default '',
  team_name text not null default '',
  team_number text not null default '',
  tests text not null default '',
  created_at timestamptz not null default now()
);

-- Per-student room/title overrides for schedule slots
create table if not exists public.student_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  schedule_slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  replacement_title text,
  replacement_location text,
  created_at timestamptz not null default now(),
  unique (student_id, schedule_slot_id)
);

-- Announcements (broadcast to all participants)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_markdown text not null,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default true,
  audience_mode text not null default 'all',
  author_name text not null,
  created_at timestamptz not null default now()
);

-- Admin users (Stanford SSO access control)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  stanford_uid text not null unique,
  email text not null,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  approved_by text,
  created_at timestamptz not null default now()
);

-- Push notification subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists student_metadata_badge_idx on public.student_metadata(badge_number);
create index if not exists student_schedule_overrides_student_idx on public.student_schedule_overrides(student_id);
