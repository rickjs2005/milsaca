-- =================================================================
-- Milsaca — trava de overselling: 1 proposta aceita por lead/lote (P6)
-- Data: 2026-06-62 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Escopo: DENTRO da corretora. Hoje nada impede que duas propostas do mesmo
-- lead (ou do mesmo lote) sejam marcadas `aceita`, o que significaria vender
-- o mesmo café duas vezes. Estes índices únicos parciais garantem no máximo
-- UMA proposta aceita por lead e UMA por lote.
--
-- O app trata o 23505 resultante (updatePropostaStatus) com mensagem
-- amigável "Já existe uma proposta aceita para este lead.".
--
-- TODO: reserva de estoque central cross-corretora — o modelo de estoque
-- central (uma saca só pode ser vendida uma vez ENTRE corretoras diferentes)
-- fica FORA deste escopo. Aqui a trava é só intra-corretora, por lead/lote.
--
-- Idempotente: create unique index if not exists.
-- =================================================================

create unique index if not exists propostas_uma_aceita_por_lead
  on public.propostas (lead_id)
  where status = 'aceita' and lead_id is not null;

create unique index if not exists propostas_uma_aceita_por_lote
  on public.propostas (lote_id)
  where status = 'aceita' and lote_id is not null;

comment on index public.propostas_uma_aceita_por_lead is
  'Trava de overselling intra-corretora: no máximo 1 proposta aceita por lead.';
comment on index public.propostas_uma_aceita_por_lote is
  'Trava de overselling intra-corretora: no máximo 1 proposta aceita por lote.';
