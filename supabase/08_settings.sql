-- 08: App settings table (key-value store for tournament config)
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed tournament date
insert into public.settings (key, value) values
  ('tournament_date', '2026-04-18T07:00:00-07:00')
on conflict (key) do nothing;
