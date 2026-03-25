-- 05: Admin users table for Stanford SSO access control

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  stanford_uid text not null unique,
  email text not null,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  approved_by text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "anyone can read admin_users"
  on public.admin_users for select using (true);

-- For upserts from the SAML callback (anon key needs insert)
create policy "anyone can insert admin_users"
  on public.admin_users for insert with check (true);

-- For approvals/denials (anon key needs update — we verify admin status in app code)
create policy "anyone can update admin_users"
  on public.admin_users for update using (true);
