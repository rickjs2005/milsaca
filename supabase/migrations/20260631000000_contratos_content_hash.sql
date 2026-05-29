-- =================================================================
-- Milsaca — Fase 2: espelho de contrato verificável (3.1)
-- =================================================================
-- Adiciona coluna content_hash em contratos. Recebe o SHA-256 do
-- payload canônico do contrato no momento da assinatura (status=ativo),
-- gravado pelo server action updateContratoStatus. Serve de prova de
-- não-adulteração exibida no espelho e na página pública de verificação.
--
-- Idempotente: add column if not exists.
-- =================================================================

alter table public.contratos
  add column if not exists content_hash text;

comment on column public.contratos.content_hash is
  'SHA-256 (hex) do payload canônico do contrato, gravado na assinatura. Prova de integridade exibida no espelho e em /contratos/{id}/verificar.';
