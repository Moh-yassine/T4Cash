create table if not exists public.mt5_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mt5_login text not null,
  mt5_server text,
  mt5_password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mt5_credentials enable row level security;

drop policy if exists "Users can read own mt5 credentials" on public.mt5_credentials;
create policy "Users can read own mt5 credentials"
  on public.mt5_credentials for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own mt5 credentials" on public.mt5_credentials;
create policy "Users can insert own mt5 credentials"
  on public.mt5_credentials for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own mt5 credentials" on public.mt5_credentials;
create policy "Users can update own mt5 credentials"
  on public.mt5_credentials for update
  using (auth.uid() = user_id);
