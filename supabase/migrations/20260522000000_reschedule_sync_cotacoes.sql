-- =================================================================
-- Milsaca — Reagenda sync-cotacoes (placeholder — secret aplicado fora)
-- Data: 2026-05-18 (substituída em 2026-05-19 pra remover secret leak)
-- =================================================================
-- HISTÓRICO IMPORTANTE:
--   A versão original desta migration tinha o `x-cron-secret` da edge
--   function `sync-cotacoes` em texto plano. Como migrations ficam em
--   git pra sempre, o secret estava efetivamente comprometido.
--
-- AGORA:
--   Esta migration apenas garante que o job órfão antigo não exista
--   mais (idempotente). O agendamento real do cron é aplicado pelo
--   script `apps/web/scripts/apply-cron.mjs` que lê CRON_SECRET do
--   ambiente local e roda via Management API — o secret NUNCA passa
--   por git.
--
--   Pra reagendar (ou rotacionar o secret), o operador roda:
--     $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
--     $env:CRON_SECRET            = "novo-valor"
--     node apps/web/scripts/apply-cron.mjs
--
-- =================================================================

do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-sync-cotacoes') then
    perform cron.unschedule('milsaca-sync-cotacoes');
  end if;
end $$;
