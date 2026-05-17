-- =================================================================
-- Milsaca — Snapshots de cotação automatizados (2026-05-16)
-- =================================================================
-- Espelha o padrão do Kavita News (Fase 10.4):
--   - PK natural (source, symbol) → upsert atômico
--   - Adapters externos rodam em Edge Function (Deno) agendada via pg_cron
--   - quoted_at = quando a fonte publicou; fetched_at = quando rodamos
--   - Frontend marca como "stale" se fetched_at > 48h
--
-- Convenção de unidades (NUNCA inventar preço):
--   cepea_esalq / arabica_bica_corrida_esalq  → price_brl_cents  (R$/saca 60kg × 100)
--   ice_us      / KC.F                        → price_usd_cents  (US¢/lb)
--   ice_eu      / RC.F                        → price_usd_cents  (USD/ton × 100)
--   bcb_ptax    / USDBRL                      → price_brl_cents  (R$/USD × 100)
-- =================================================================

create table public.market_quotes (
  source           text        not null,
  symbol           text        not null,
  price_brl_cents  bigint,
  price_usd_cents  bigint,
  variation_pct    numeric(6,2),
  quoted_at        timestamptz not null,
  fetched_at       timestamptz not null default now(),
  source_url       text,
  meta             jsonb       not null default '{}'::jsonb,
  primary key (source, symbol)
);

create index market_quotes_quoted_at_idx
  on public.market_quotes (quoted_at desc);

-- RLS: leitura aberta (indicador é dado público de mercado);
-- escrita só service_role (Edge Function usa SUPABASE_SERVICE_ROLE_KEY).
alter table public.market_quotes enable row level security;

create policy "market_quotes_public_read"
  on public.market_quotes for select
  using (true);

-- Sem policy de write — service_role bypassa RLS.

grant select on public.market_quotes to anon, authenticated;

-- =================================================================
-- Extensões pro cron job que invoca a Edge Function
-- =================================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- O agendamento concreto fica em 20260516030000_market_quotes_cron.sql
-- (depois do deploy da Edge Function), porque pg_cron precisa do
-- project_ref + service_role no banco — não dá pra hardcodar aqui.
