-- =================================================================
-- Milsaca — Agendamento pg_cron pra Edge Function sync-cotacoes
-- =================================================================
-- Roda 18:00 America/Sao_Paulo (= 21:00 UTC) em dias úteis (seg-sex),
-- pós-fechamento CEPEA (publica até ~17h BRT). Mesmo horário do Kavita.
--
-- Pré-requisitos:
--   1. Edge Function `sync-cotacoes` deployada (`supabase functions deploy`)
--   2. Secrets configurados:
--        supabase secrets set CRON_SECRET=<token-aleatorio>
--   3. As constantes abaixo precisam ser setadas via:
--        select set_config('app.supabase_project_ref',  '<PROJECT_REF>', false);
--        select set_config('app.functions_cron_secret', '<CRON_SECRET>', false);
--      ou hardcodadas direto na schedule (ver bloco PROD abaixo).
--
-- Como rodar manualmente pra testar:
--   select extensions.http_post(
--     'https://<ref>.functions.supabase.co/sync-cotacoes',
--     '{}',
--     'application/json',
--     ARRAY[net.http_header('x-cron-secret', '<CRON_SECRET>')]
--   );
-- =================================================================

-- Schedule no fuso UTC (pg_cron sempre UTC).
-- 21:00 UTC = 18:00 America/Sao_Paulo (sem horário de verão desde 2019).
-- Dom 0, Seg 1 … Sex 5, Sáb 6 → 1-5 = dias úteis.
select cron.schedule(
  'milsaca-sync-cotacoes',
  '0 21 * * 1-5',
  $$
  select
    net.http_post(
      url     := current_setting('app.functions_base_url', true)
                 || '/sync-cotacoes',
      headers := jsonb_build_object(
        'content-type',    'application/json',
        'x-cron-secret',   current_setting('app.functions_cron_secret', true)
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- Para configurar os settings persistentes (sobrevivem a restarts):
-- (execute uma única vez, com seus valores)
--
--   alter database postgres set app.functions_base_url    = 'https://<PROJECT_REF>.functions.supabase.co';
--   alter database postgres set app.functions_cron_secret = '<CRON_SECRET>';
--
-- Pra cancelar o agendamento:
--   select cron.unschedule('milsaca-sync-cotacoes');
--
-- Pra inspecionar o histórico:
--   select * from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'milsaca-sync-cotacoes')
--   order by start_time desc limit 20;
