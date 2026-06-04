-- =================================================================
-- Milsaca — Lote: flag de beneficiado (saca estimada) — Brief 4
-- Data: 2026-06-04
-- =================================================================
-- Café não beneficiado (coco/cereja) tem saca ESTIMADA; só vira número firme
-- após beneficiamento. Default false (conservador: estimada até confirmar).
-- Retro-marca beneficiado=true onde o lote já passou por classificação/venda
-- (café classificado/vendido é beneficiado), pra não rotular dado existente como
-- estimado à toa. Aditiva, idempotente.
-- =================================================================

alter table public.lotes
  add column if not exists beneficiado boolean not null default false;

update public.lotes
   set beneficiado = true
 where beneficiado = false
   and status in ('classificado', 'vendido', 'fora_de_tipo', 'rebeneficiar');

comment on column public.lotes.beneficiado is
  'Café beneficiado (pronto/descascado) = número de sacas firme. false = em coco/cereja, saca ESTIMADA até o beneficiamento.';
