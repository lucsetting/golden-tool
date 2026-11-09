-- Golden Tool: run once in the Supabase SQL editor.

-- 1) Whole app state per user, as JSON.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own state" on public.user_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Purchases, written by the Digistore24 webhook (service role) and read by the buyer (by email).
create table if not exists public.entitlements (
  id bigserial primary key,
  email text not null,
  product text not null check (product in ('all','debts','goals','reports','lifetime')),
  status text not null default 'active' check (status in ('active','refunded')),
  order_id text,
  created_at timestamptz not null default now(),
  unique (email, product, order_id)
);
create index if not exists entitlements_email on public.entitlements (lower(email));
alter table public.entitlements enable row level security;
create policy "read own entitlements" on public.entitlements for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- No insert/update policy for users: only the service role (webhook) writes.
