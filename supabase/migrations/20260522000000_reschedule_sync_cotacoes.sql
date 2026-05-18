-- =================================================================
-- Milsaca — Reagenda sync-cotacoes
-- Data: 2026-05-18
-- =================================================================
-- O cron `milsaca-sync-cotacoes` foi cancelado em 20260520000000
-- quando a edge function ainda não estava deployada. Agora a function
-- foi deployada (sem API CEPEA oficial — usa scraping + Yahoo + Stooq
-- + BCB) e o cron volta a rodar 21:00 UTC (= 18:00 BRT) em dias úteis.
--
-- URL e CRON_SECRET hardcodados aqui porque `alter database postgres
-- set ...` requer superuser, que migrations no Supabase remoto não
-- têm. Pra rotacionar o secret no futuro: nova migration substitui
-- esta.
-- =================================================================

-- Idempotente: cancela antes (no-op se já não existe) e reagenda
do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-sync-cotacoes') then
    perform cron.unschedule('milsaca-sync-cotacoes');
  end if;
end $$;

select cron.schedule(
  'milsaca-sync-cotacoes',
  '0 21 * * 1-5',
  $$
  select
    net.http_post(
      url     := 'https://kulanbcyrfawlhrpqxtz.functions.supabase.co/sync-cotacoes',
      headers := jsonb_build_object(
        'content-type',  'application/json',
        'x-cron-secret', 'jDgPObDnSvoIUeaOlobBLsRv11XPIasaY83xfh2a'
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
