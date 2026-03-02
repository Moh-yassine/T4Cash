alter table public.trader_payments
  add column if not exists stripe_payment_id text unique;
