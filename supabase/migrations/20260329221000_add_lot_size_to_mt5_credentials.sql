alter table public.mt5_credentials
  add column if not exists lot_size numeric not null default 0.02 check (lot_size > 0);
