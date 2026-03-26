-- 06: Add unique constraint on push_subscriptions.endpoint for upsert support
create unique index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions(endpoint);

-- Allow anonymous users to insert/update their own subscriptions
create policy "anyone can insert push subscriptions"
  on public.push_subscriptions for insert with check (true);

create policy "anyone can update push subscriptions"
  on public.push_subscriptions for update using (true);

-- Allow reading for sending pushes
create policy "anyone can read push subscriptions"
  on public.push_subscriptions for select using (true);
