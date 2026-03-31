alter table public.bot_requests
  add column if not exists mt5_server text not null default 'VTMarkets-Live 6';

alter table public.bot_requests
  add column if not exists mt5_password text not null default '';
