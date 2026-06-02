-- =================================================================
-- Milsaca — Vínculo lote -> contrato (opção 2 da auditoria)
-- Data: 2026-06-02
-- =================================================================
-- Fecha o caminho lote->oferta->contrato: o contrato passa a referenciar o
-- lote de origem. Ao gerar contrato a partir de um lote, o app marca o lote
-- como 'vendido' (não dá pra propor de novo no mesmo café). `on delete set
-- null` pra não derrubar o contrato se o lote for apagado. RLS de contratos
-- já cobre o acesso. lote_id NÃO entra no content_hash (é proveniência, não
-- termo do documento). Idempotente.
-- =================================================================

alter table public.contratos
  add column if not exists lote_id uuid
    references public.lotes(id) on delete set null;

create index if not exists contratos_lote_id_idx
  on public.contratos (lote_id);

comment on column public.contratos.lote_id is
  'Lote de origem quando o contrato nasce do caminho lote->oferta->contrato (auditoria 2026-06-02). Gerar o contrato marca o lote vendido.';
