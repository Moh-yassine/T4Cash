do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    begin
      alter type public.app_role add value if not exists 'manager';
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

do $$
declare
  role_data_type text;
begin
  select data_type
  into role_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'role';

  if role_data_type = 'text' then
    alter table public.profiles drop constraint if exists profiles_role_check;
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin', 'manager'));
  end if;
end $$;

create or replace function public.is_manager_or_admin(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role::text in ('admin', 'manager')
  );
$$;

create table if not exists public.bot_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  mt5_login text not null,
  mt5_server text not null default 'VTMarkets-Live 6',
  mt5_password text not null,
  status text not null default 'pending' check (status in ('pending', 'configured')),
  bot_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bot_requests enable row level security;

drop policy if exists "Users can read own bot requests" on public.bot_requests;
create policy "Users can read own bot requests"
  on public.bot_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own bot requests" on public.bot_requests;
create policy "Users can insert own bot requests"
  on public.bot_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bot requests" on public.bot_requests;
create policy "Users can update own bot requests"
  on public.bot_requests for update
  using (auth.uid() = user_id);

drop policy if exists "Managers can read all bot requests" on public.bot_requests;
create policy "Managers can read all bot requests"
  on public.bot_requests for select
  using (public.is_manager_or_admin(auth.uid()));

drop policy if exists "Managers can update all bot requests" on public.bot_requests;
create policy "Managers can update all bot requests"
  on public.bot_requests for update
  using (public.is_manager_or_admin(auth.uid()));
