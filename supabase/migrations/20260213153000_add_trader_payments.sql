create table if not exists public.trader_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  paid_at date not null default (now()::date),
  created_at timestamptz default now()
);

alter table public.trader_payments enable row level security;

drop policy if exists "Users can read own trader payments" on public.trader_payments;
create policy "Users can read own trader payments"
  on public.trader_payments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own trader payments" on public.trader_payments;
create policy "Users can insert own trader payments"
  on public.trader_payments for insert
  with check (auth.uid() = user_id);
