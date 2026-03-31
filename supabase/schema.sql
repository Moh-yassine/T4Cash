-- T4Cash - Schéma Supabase
-- Exécuter dans l'éditeur SQL du dashboard Supabase

-- Table profils (étend auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text,
  avatar_url text,
  address text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin', 'manager')),
  updated_at timestamptz default now()
);

-- Table versements (gains/pertes quotidiens)
create table if not exists public.versements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  gains numeric not null default 0,
  pertes numeric not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.trader_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  paid_at date not null default (now()::date),
  created_at timestamptz default now()
);

create table if not exists public.mt5_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mt5_login text not null,
  mt5_server text,
  mt5_password text not null,
  lot_size numeric not null default 0.02 check (lot_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- RLS
alter table public.profiles enable row level security;
alter table public.versements enable row level security;
alter table public.trader_payments enable row level security;
alter table public.mt5_credentials enable row level security;
alter table public.bot_requests enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can read own versements"
  on public.versements for select
  using (auth.uid() = user_id);

create policy "Users can insert own versements"
  on public.versements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own versements"
  on public.versements for update
  using (auth.uid() = user_id);

create policy "Users can read own trader payments"
  on public.trader_payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own trader payments"
  on public.trader_payments for insert
  with check (auth.uid() = user_id);

create policy "Users can read own mt5 credentials"
  on public.mt5_credentials for select
  using (auth.uid() = user_id);

create policy "Users can insert own mt5 credentials"
  on public.mt5_credentials for insert
  with check (auth.uid() = user_id);

create policy "Users can update own mt5 credentials"
  on public.mt5_credentials for update
  using (auth.uid() = user_id);

create policy "Users can read own bot requests"
  on public.bot_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own bot requests"
  on public.bot_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bot requests"
  on public.bot_requests for update
  using (auth.uid() = user_id);

create or replace function public.is_admin(target_user_id uuid)
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
      and p.role = 'admin'
  );
$$;

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
      and p.role in ('admin', 'manager')
  );
$$;

create policy "Managers can read all bot requests"
  on public.bot_requests for select
  using (public.is_manager_or_admin(auth.uid()));

create policy "Managers can update all bot requests"
  on public.bot_requests for update
  using (public.is_manager_or_admin(auth.uid()));

create or replace function public.admin_list_user_trader_balances()
returns table (
  user_id uuid,
  email text,
  username text,
  total_due numeric,
  total_paid numeric,
  remaining numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  with due_by_user as (
    select
      v.user_id,
      round(sum(greatest(v.gains - v.pertes, 0) * 0.3), 2) as total_due
    from public.versements v
    group by v.user_id
  ),
  paid_by_user as (
    select
      tp.user_id,
      round(sum(tp.amount), 2) as total_paid
    from public.trader_payments tp
    group by tp.user_id
  )
  select
    p.id,
    p.email,
    p.username,
    coalesce(d.total_due, 0)::numeric as total_due,
    coalesce(pa.total_paid, 0)::numeric as total_paid,
    greatest(coalesce(d.total_due, 0) - coalesce(pa.total_paid, 0), 0)::numeric as remaining
  from public.profiles p
  left join due_by_user d on d.user_id = p.id
  left join paid_by_user pa on pa.user_id = p.id
  order by remaining desc, p.email nulls last;
end;
$$;

create or replace function public.admin_get_user_payment_history(target_user_id uuid)
returns table (
  payment_id uuid,
  paid_at date,
  amount numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  select
    tp.id as payment_id,
    tp.paid_at,
    tp.amount,
    tp.created_at
  from public.trader_payments tp
  where tp.user_id = target_user_id
  order by tp.paid_at desc, tp.created_at desc;
end;
$$;

-- Trigger: créer un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stockage avatars (optionnel) : créer un bucket "avatars" dans Storage avec policy pour auth.uid()
