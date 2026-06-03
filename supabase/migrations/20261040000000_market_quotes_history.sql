-- =================================================================
-- Milsaca — Histórico de cotações de mercado (2026-06-03)
-- =================================================================
-- market_quotes guarda só o ÚLTIMO valor por (source, symbol) (upsert).
-- Pra gráfico/tendência (7-30 dias) precisamos de série temporal.
--
-- Abordagem: um TRIGGER captura 1 snapshot por DIA em market_quotes_history
-- toda vez que o sync (Edge Function) faz upsert em market_quotes. Não muda
-- a Edge Function — o histórico passa a acumular sozinho a cada sync.
--
-- captured_date = dia (UTC) de quoted_at → dedup por publicação; reruns no
-- mesmo dia atualizam a mesma linha (último valor do dia vence).
--
-- Idempotente: pode reaplicar sem efeito colateral.
-- =================================================================

create table if not exists public.market_quotes_history (
  source           text        not null,
  symbol           text        not null,
  captured_date    date        not null,
  price_brl_cents  bigint,
  price_usd_cents  bigint,
  variation_pct    numeric(6,2),
  quoted_at        timestamptz not null,
  updated_at       timestamptz not null default now(),
  primary key (source, symbol, captured_date)
);

create index if not exists market_quotes_history_lookup_idx
  on public.market_quotes_history (source, symbol, captured_date desc);

-- RLS: leitura pública (dado de mercado), igual market_quotes.
alter table public.market_quotes_history enable row level security;

drop policy if exists "market_quotes_history_public_read" on public.market_quotes_history;
create policy "market_quotes_history_public_read"
  on public.market_quotes_history for select
  using (true);

grant select on public.market_quotes_history to anon, authenticated;

-- =================================================================
-- Trigger: snapshot diário a partir do market_quotes (latest)
-- =================================================================
create or replace function public.capture_market_quote_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.market_quotes_history (
    source, symbol, captured_date,
    price_brl_cents, price_usd_cents, variation_pct, quoted_at, updated_at
  ) values (
    new.source, new.symbol, (new.quoted_at at time zone 'UTC')::date,
    new.price_brl_cents, new.price_usd_cents, new.variation_pct, new.quoted_at, now()
  )
  on conflict (source, symbol, captured_date) do update set
    price_brl_cents = excluded.price_brl_cents,
    price_usd_cents = excluded.price_usd_cents,
    variation_pct   = excluded.variation_pct,
    quoted_at       = excluded.quoted_at,
    updated_at      = now();
  return new;
end;
$$;

drop trigger if exists trg_market_quotes_history on public.market_quotes;
create trigger trg_market_quotes_history
  after insert or update on public.market_quotes
  for each row execute function public.capture_market_quote_history();

-- =================================================================
-- Backfill: o snapshot atual vira o 1º ponto do histórico
-- =================================================================
insert into public.market_quotes_history (
  source, symbol, captured_date,
  price_brl_cents, price_usd_cents, variation_pct, quoted_at, updated_at
)
select
  source, symbol, (quoted_at at time zone 'UTC')::date,
  price_brl_cents, price_usd_cents, variation_pct, quoted_at, now()
from public.market_quotes
on conflict (source, symbol, captured_date) do nothing;
