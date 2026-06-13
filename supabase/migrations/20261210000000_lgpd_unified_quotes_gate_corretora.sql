-- =================================================================
-- Milsaca — LGPD: unified_quotes não expõe corretora soft-deleted
-- Data: 2026-06-13 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Extensão da decisão de 20261200 (gate por corretora) à 3ª superfície
-- pública apontada na auditoria. unified_quotes (20260613) é
-- security_invoker=off PROPOSITAL (a perna manual do UNION precisa
-- aparecer pro anônimo — ver 20260801). A perna manual projeta
-- cor.name as corretora_name + c.corretora_id, mas NÃO filtrava
-- deleted_at → cotação ativa de uma corretora apagada por LGPD seguia
-- pública com nome/id.
--
-- Fix: adiciona `(cor.id is null or cor.deleted_at is null)` ao WHERE da
-- perna manual. Cotações admin_manual (sem corretora) seguem visíveis.
-- Estrutura de colunas idêntica → create or replace view é seguro.
-- security_invoker = off preservado explicitamente (intenção documentada).
-- =================================================================

create or replace view public.unified_quotes
with (security_invoker = off) as
select
  (m.source || '|'::text) || m.symbol               as id,
  'market'::text                                     as source_type,
  m.source                                           as source_slug,
  null::uuid                                         as corretora_id,
  null::text                                         as corretora_name,
  null::uuid                                         as product_id,
  m.symbol                                           as product_label,
  null::uuid                                         as region_id,
  null::text                                         as region_label,
  case
    when m.price_brl_cents is not null then m.price_brl_cents::numeric / 100::numeric
    when m.price_usd_cents is not null then m.price_usd_cents::numeric / 100::numeric
    else null::numeric
  end                                                as price,
  case
    when m.price_brl_cents is not null then 'BRL'::text
    when m.price_usd_cents is not null then 'USD'::text
    else null::text
  end                                                as currency,
  'saca_60kg'::text                                  as unit,
  m.variation_pct,
  m.quoted_at                                        as quote_date,
  m.fetched_at                                       as updated_at,
  m.source_url,
  null::uuid                                         as id_raw_uuid
from public.market_quotes m
union all
select
  c.id::text                                         as id,
  'manual'::text                                     as source_type,
  coalesce(qs.slug, 'admin_manual'::text)            as source_slug,
  c.corretora_id,
  cor.name                                           as corretora_name,
  c.product_id,
  coalesce(ct.name, c.coffee_type)                   as product_label,
  c.region_id,
  coalesce(pr.name, c.region)                        as region_label,
  c.price,
  c.currency,
  c.unit,
  null::numeric                                      as variation_pct,
  c.reference_date::timestamp with time zone         as quote_date,
  c.created_at                                       as updated_at,
  null::text                                         as source_url,
  c.id                                               as id_raw_uuid
from public.cotacoes c
  left join public.corretoras cor on cor.id = c.corretora_id
  left join public.coffee_types ct on ct.id = c.product_id
  left join public.pracas pr on pr.id = c.region_id
  left join public.quote_sources qs on qs.id = c.source_id
where c.status = 'active'::text
  and (cor.id is null or cor.deleted_at is null);

comment on view public.unified_quotes is
  'View unificada: market_quotes (automáticas) + cotacoes (manuais ativas). SECURITY DEFINER (security_invoker=off) PROPOSITAL: cotacoes/corretoras bloqueiam anon na RLS; trocar p/ invoker zeraria a perna manual do UNION p/ visitantes. Projeta só colunas não-PII. Não expõe corretora soft-deleted (LGPD, fix 20261210). Advisor security_definer_view é falso-positivo aceito.';
