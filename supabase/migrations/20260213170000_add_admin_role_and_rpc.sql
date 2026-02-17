do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
end $$;

alter table public.profiles
  add column if not exists role public.app_role not null default 'user';

create index if not exists idx_profiles_role on public.profiles(role);

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
