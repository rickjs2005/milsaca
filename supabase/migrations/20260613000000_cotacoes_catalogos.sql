-- =================================================================
-- Milsaca — Cotações: catálogos (tipos, praças, fontes) + view unificada
-- Data: 2026-05-22
-- =================================================================
-- Cria a fundação pro redesign do módulo de cotações:
--   1. coffee_types       — tipos de café/commodity (Arábica BD,
--                            Conillón T7, Robusta, Cacau, etc)
--   2. pracas             — praças/regiões (Manhuaçu, Varginha, etc)
--   3. quote_sources      — fontes (CEPEA, ICE, BCB, manual, etc)
--                            + status de última execução
--   4. FKs nullable em cotacoes pra apontar pros catálogos
--      (mantém colunas antigas pra compat — refactor incremental)
--   5. View unified_quotes (UNION ALL de market_quotes + cotacoes)
--
-- Idempotente. Não toca dados existentes (cotacoes tem 0 hoje).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. coffee_types
-- -----------------------------------------------------------------
create table if not exists public.coffee_types (
  id            uuid primary key default extensions.uuid_generate_v4(),
  slug          text not null unique,
  name          text not null,
  species       text not null
    check (species in ('arabica','conilon','robusta','cacau','pimenta','outro')),
  process       text check (process in (
    'natural','cereja_descascado','cd_desmucilado','despolpado','fermentacao_induzida','lavado','outro'
  )),
  default_unit  text not null
    check (default_unit in ('saca_60kg','kg','arroba','libra','tonelada'))
    default 'saca_60kg',
  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.coffee_types enable row level security;

create index if not exists coffee_types_active_idx
  on public.coffee_types (active, species);

drop policy if exists coffee_types_public_read on public.coffee_types;
create policy coffee_types_public_read
  on public.coffee_types for select
  using (active = true or public.is_admin());

drop policy if exists coffee_types_admin_write on public.coffee_types;
create policy coffee_types_admin_write
  on public.coffee_types for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_coffee_types on public.coffee_types;
create trigger tg_set_updated_at_coffee_types
  before update on public.coffee_types
  for each row execute function public.tg_set_updated_at();

-- Seeds
insert into public.coffee_types (slug, name, species, process, default_unit, notes) values
  ('arabica-bebida-dura', 'Arábica Bebida Dura', 'arabica', 'natural', 'saca_60kg', 'Padrão CEPEA — café de bebida dura, natural'),
  ('arabica-tipo-6', 'Arábica Tipo 6', 'arabica', 'natural', 'saca_60kg', 'Café Tipo 6 conforme classificação COB'),
  ('arabica-cd', 'Arábica Cereja Descascado', 'arabica', 'cereja_descascado', 'saca_60kg', 'Café especial, processo CD'),
  ('conilon-tipo-7', 'Conilon Tipo 7', 'conilon', 'natural', 'saca_60kg', 'Padrão Conilon brasileiro (ES/MG)'),
  ('robusta', 'Robusta', 'robusta', 'natural', 'saca_60kg', 'Robusta internacional — ICE EU / mercado global'),
  ('cacau', 'Cacau', 'cacau', null, 'arroba', 'Cacau em amêndoa (auxiliar — não foco do produto)'),
  ('pimenta-do-reino', 'Pimenta-do-reino', 'pimenta', null, 'kg', 'Auxiliar — produtores de café que também produzem pimenta')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------
-- 2. pracas
-- -----------------------------------------------------------------
create table if not exists public.pracas (
  id             uuid primary key default extensions.uuid_generate_v4(),
  slug           text not null unique,
  name           text not null,
  city           text,
  state          text not null check (length(state) = 2),
  region_group   text,
  active         boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.pracas enable row level security;

create index if not exists pracas_active_idx
  on public.pracas (active, state);

drop policy if exists pracas_public_read on public.pracas;
create policy pracas_public_read
  on public.pracas for select
  using (active = true or public.is_admin());

drop policy if exists pracas_admin_write on public.pracas;
create policy pracas_admin_write
  on public.pracas for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_pracas on public.pracas;
create trigger tg_set_updated_at_pracas
  before update on public.pracas
  for each row execute function public.tg_set_updated_at();

insert into public.pracas (slug, name, city, state, region_group) values
  ('manhuacu-mg', 'Manhuaçu', 'Manhuaçu', 'MG', 'Matas de Minas'),
  ('varginha-mg', 'Varginha', 'Varginha', 'MG', 'Sul de Minas'),
  ('patrocinio-mg', 'Patrocínio', 'Patrocínio', 'MG', 'Cerrado Mineiro'),
  ('guaxupe-mg', 'Guaxupé', 'Guaxupé', 'MG', 'Sul de Minas'),
  ('tres-pontas-mg', 'Três Pontas', 'Três Pontas', 'MG', 'Sul de Minas'),
  ('colatina-es', 'Colatina', 'Colatina', 'ES', 'Espírito Santo'),
  ('linhares-es', 'Linhares', 'Linhares', 'ES', 'Espírito Santo'),
  ('santos-sp', 'Santos', 'Santos', 'SP', 'Porto exportação'),
  ('londrina-pr', 'Londrina', 'Londrina', 'PR', 'Norte do Paraná'),
  ('vilhena-ro', 'Vilhena', 'Vilhena', 'RO', 'Rondônia')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------
-- 3. quote_sources
-- -----------------------------------------------------------------
create table if not exists public.quote_sources (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  slug                  text not null unique,
  name                  text not null,
  type                  text not null
    check (type in ('automatic','broker_manual','admin_manual','external_api','mock')),
  provider              text,
  active                boolean not null default true,
  update_frequency      text,
  last_success_at       timestamptz,
  last_error_at         timestamptz,
  last_error_message    text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.quote_sources enable row level security;

create index if not exists quote_sources_type_active_idx
  on public.quote_sources (type, active);

drop policy if exists quote_sources_public_read on public.quote_sources;
create policy quote_sources_public_read
  on public.quote_sources for select
  using (active = true or public.is_admin());

drop policy if exists quote_sources_admin_write on public.quote_sources;
create policy quote_sources_admin_write
  on public.quote_sources for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_quote_sources on public.quote_sources;
create trigger tg_set_updated_at_quote_sources
  before update on public.quote_sources
  for each row execute function public.tg_set_updated_at();

insert into public.quote_sources (slug, name, type, provider, update_frequency, notes) values
  ('cepea_esalq', 'CEPEA/ESALQ', 'automatic', 'cepea', 'daily', 'CEPEA Arábica — scraping Notícias Agrícolas + API oficial fallback'),
  ('ice_us', 'ICE NY (KC.F)', 'automatic', 'yahoo', 'daily', 'Arábica futuros Nova York via Yahoo Chart'),
  ('bcb_ptax', 'BCB PTAX (USD/BRL)', 'automatic', 'bcb', 'daily', 'Câmbio dólar oficial Banco Central'),
  ('ice_eu', 'ICE EU Robusta (RC.F)', 'automatic', 'wsj', 'daily', 'Robusta — fonte automática indisponível. Stooq quebrou em 2025. Aguarda API paga ou Admin/Corretora postar manualmente.'),
  ('admin_manual', 'Manual — Admin', 'admin_manual', 'manual', null, 'Cotação postada pelo admin em /admin/cotacoes/nova'),
  ('broker_manual', 'Manual — Corretora', 'broker_manual', 'manual', null, 'Cotação postada pela corretora no painel dela')
on conflict (slug) do nothing;

-- Marca Robusta como inativo (fonte indisponível honestamente)
update public.quote_sources
   set active = false,
       last_error_message = 'Provedor automático indisponível desde 2025. Use manual via admin/corretora.'
 where slug = 'ice_eu';

-- -----------------------------------------------------------------
-- 4. FKs nullable em cotacoes (mantém colunas antigas pra compat)
-- -----------------------------------------------------------------
alter table public.cotacoes
  add column if not exists product_id  uuid references public.coffee_types(id)   on delete set null,
  add column if not exists region_id   uuid references public.pracas(id)         on delete set null,
  add column if not exists source_id   uuid references public.quote_sources(id)  on delete set null,
  add column if not exists currency    text not null default 'BRL'
    check (currency in ('BRL','USD')),
  add column if not exists unit        text not null default 'saca_60kg'
    check (unit in ('saca_60kg','kg','arroba','libra','tonelada')),
  add column if not exists valid_until timestamptz,
  add column if not exists is_manual   boolean not null default true,
  add column if not exists status      text not null
    check (status in ('active','stale','error','hidden'))
    default 'active';

create index if not exists cotacoes_product_id_idx on public.cotacoes (product_id) where product_id is not null;
create index if not exists cotacoes_region_id_idx  on public.cotacoes (region_id)  where region_id  is not null;
create index if not exists cotacoes_status_idx     on public.cotacoes (status, reference_date desc);

-- Backfill best-effort: tenta linkar pelo slug das colunas antigas
update public.cotacoes c
   set product_id = ct.id
  from public.coffee_types ct
 where c.product_id is null
   and c.specie is not null
   and ct.species = c.specie::text
   and ct.process = coalesce(c.process::text, ct.process)
   and ct.active = true;

update public.cotacoes c
   set source_id = qs.id
  from public.quote_sources qs
 where c.source_id is null
   and qs.slug = 'admin_manual';

-- -----------------------------------------------------------------
-- 5. unified_quotes view — junta market_quotes + cotacoes
-- -----------------------------------------------------------------
-- Padroniza pra o produtor consumir uma estrutura única.
-- - source_type: 'market' | 'manual'
-- - origin_label: nome legível da fonte
-- - corretora_id null em market
-- -----------------------------------------------------------------
create or replace view public.unified_quotes as
select
  m.source || '|' || m.symbol                          as id,
  'market'                                             as source_type,
  m.source                                             as source_slug,
  null::uuid                                           as corretora_id,
  null::text                                           as corretora_name,
  null::uuid                                           as product_id,
  m.symbol                                             as product_label,
  null::uuid                                           as region_id,
  null::text                                           as region_label,
  case
    when m.price_brl_cents is not null then (m.price_brl_cents::numeric / 100)
    when m.price_usd_cents is not null then (m.price_usd_cents::numeric / 100)
    else null
  end                                                  as price,
  case
    when m.price_brl_cents is not null then 'BRL'
    when m.price_usd_cents is not null then 'USD'
    else null
  end                                                  as currency,
  'saca_60kg'                                          as unit,
  m.variation_pct                                      as variation_pct,
  m.quoted_at                                          as quote_date,
  m.fetched_at                                         as updated_at,
  m.source_url                                         as source_url,
  null::uuid                                           as id_raw_uuid
from public.market_quotes m

union all

select
  c.id::text                                           as id,
  'manual'                                             as source_type,
  coalesce(qs.slug, 'admin_manual')                    as source_slug,
  c.corretora_id                                       as corretora_id,
  cor.name                                             as corretora_name,
  c.product_id                                         as product_id,
  coalesce(ct.name, c.coffee_type)                     as product_label,
  c.region_id                                          as region_id,
  coalesce(pr.name, c.region)                          as region_label,
  c.price                                              as price,
  c.currency                                           as currency,
  c.unit                                               as unit,
  null::numeric                                        as variation_pct,
  (c.reference_date::timestamptz)                      as quote_date,
  c.created_at                                         as updated_at,
  null::text                                           as source_url,
  c.id                                                 as id_raw_uuid
from public.cotacoes c
left join public.corretoras    cor on cor.id = c.corretora_id
left join public.coffee_types  ct  on ct.id  = c.product_id
left join public.pracas        pr  on pr.id  = c.region_id
left join public.quote_sources qs  on qs.id  = c.source_id
where c.status = 'active';

comment on view public.unified_quotes is
  'View unificada: market_quotes (automáticas) + cotacoes (manuais ativas). source_type distingue. RLS herdada das tabelas base.';

-- =================================================================
-- Done. Smoke:
--   select count(*) from public.coffee_types;     -- 7
--   select count(*) from public.pracas;            -- 10
--   select count(*) from public.quote_sources;     -- 6
--   select source_type, count(*) from public.unified_quotes group by 1;
-- =================================================================
