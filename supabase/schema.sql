-- T4Cash - Schéma Supabase
-- Exécuter dans l'éditeur SQL du dashboard Supabase

-- Table profils (étend auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text,
  avatar_url text,
  address text,
  email text,
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

-- RLS
alter table public.profiles enable row level security;
alter table public.versements enable row level security;

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
