-- =================================================================
-- Milsaca — fix billing (grace period) + retenção de notificações
--           não-lidas + hardening de funções de cron
-- Data: 2026-12-70 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Três correções pontuais, todas idempotentes (create or replace) e
-- preservando o corpo vigente das funções:
--
--   1. expire_subscriptions — GRACE PERIOD de 1 dia. Hoje uma assinatura
--      active vira past_due no instante em que current_period_end passa.
--      Isso bloqueia cliente adimplente cuja renovação do gateway chega
--      horas depois (webhook atrasado). Passamos a só marcar past_due
--      quando current_period_end < now() - interval '1 day'.
--
--   2. cleanup_old_notifications — PRESERVAR NÃO-LIDAS. O delete atual
--      apaga TUDO com 90+ dias, inclusive notificação importante que o
--      usuário nunca abriu. Passamos a apagar só read_at is not null
--      (lidas) com 90+ dias. Não-lidas nunca são removidas por idade.
--
--   3. Hardening — cleanup_old_notifications() e check_queue_failures()
--      são jobs de cron; não devem ser disparáveis por usuário logado.
--      Revogamos execute de authenticated. postgres/service_role (donos
--      e quem o pg_cron usa) seguem podendo executar.
--
-- NÃO mexe em check_price_targets (outro agente cuida).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. expire_subscriptions — active com current_period_end vencido
--    há mais de 1 dia (grace period) → past_due
-- -----------------------------------------------------------------
create or replace function public.expire_subscriptions() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.subscriptions
       set status = 'past_due'
     where status = 'active'
       and current_period_end is not null
       -- GRACE PERIOD: 1 dia de tolerância pra renovação atrasada do
       -- gateway (webhook chega horas depois do vencimento). Sem isso,
       -- cliente adimplente é bloqueado indevidamente.
       and current_period_end < now() - interval '1 day'
    returning id
  )
  select count(*) into v_count from updated;

  perform public.fn_log_system_event(
    'cron.expire-subscriptions.run',
    'success',
    jsonb_build_object('past_due_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.expire-subscriptions.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 2. cleanup_old_notifications — apaga só notificações LIDAS com 90+
--    dias. Não-lidas (read_at is null) são preservadas indefinidamente
--    por idade — podem ser algo importante que o usuário nunca viu.
-- -----------------------------------------------------------------
create or replace function public.cleanup_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.notifications
   where created_at < now() - interval '90 days'
     and read_at is not null;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.cleanup_old_notifications is
  'Apaga notifications LIDAS (read_at is not null) com created_at > 90 dias. Não-lidas são preservadas. Rodada por cron diariamente às 04:00 UTC. Retorna nº de linhas removidas.';

-- -----------------------------------------------------------------
-- 3. Hardening — revogar execute de authenticated nos jobs de cron.
--    São disparados por postgres/service_role via pg_cron; usuário
--    logado não tem motivo legítimo pra chamá-los.
--    Não revogamos do owner nem de postgres, então os crons seguem
--    funcionando.
-- -----------------------------------------------------------------
revoke execute on function public.cleanup_old_notifications() from authenticated;
revoke execute on function public.check_queue_failures() from authenticated;

-- =================================================================
-- Done.
-- =================================================================
