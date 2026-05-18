-- =================================================================
-- Milsaca — Cancela cron órfão milsaca-sync-cotacoes
-- Data: 2026-05-18
-- =================================================================
-- O job foi agendado em 20260516030000_market_quotes_cron.sql pra rodar
-- 21:00 UTC dias úteis chamando a edge function sync-cotacoes — mas a
-- função nunca foi deployada no projeto remoto. Resultado: cada run
-- gera erro silencioso em cron.job_run_details.
--
-- Cancelar agora. Quando contratar API CEPEA oficial e deployar a edge
-- function, basta re-rodar o schedule de 20260516030000.
-- =================================================================

do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-sync-cotacoes') then
    perform cron.unschedule('milsaca-sync-cotacoes');
    raise notice 'milsaca-sync-cotacoes cron cancelado';
  else
    raise notice 'milsaca-sync-cotacoes cron já não existia (no-op)';
  end if;
end $$;
