-- Le "reste à payer" = montant total dû au trader (30% du net)
-- Les anciens paiements ne réduisent pas ce montant : chaque versement est la somme complète due
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
    coalesce(d.total_due, 0)::numeric as remaining
  from public.profiles p
  left join due_by_user d on d.user_id = p.id
  left join paid_by_user pa on pa.user_id = p.id
  order by remaining desc, p.email nulls last;
end;
$$;
