-- =================================================================
-- Milsaca — alerta proativo de fila de eventos (auditoria 4.9)
-- Data: 2026-06-55 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- system_events já registra falhas (status='failed'), mas ninguém é
-- avisado proativamente — só se um admin abrir /admin/fila-eventos. Esta
-- migration adiciona um cron pg_cron que, a cada 15min, conta falhas
-- recentes (última hora) e, se passar do limiar, registra UM system_event
-- de alerta (kind='alert.queue.failures'). O admin vê o alerta na própria
-- fila; integração com canal externo (email/WhatsApp) é follow-up.
--
-- Anti-flood: só dispara se NÃO houver alerta do mesmo kind nos últimos
-- 60min (evita um alerta a cada run de 15min enquanto a falha persiste).
--
-- NOTA OPERACIONAL: o ping externo de uptime (cron-job.org/Better Uptime
-- batendo numa health-check das edge functions) continua MANUAL — ver
-- docs/milsaca/backup-retencao.md. Este cron cobre só a fila interna.
--
-- Idempotente: create or replace + unschedule-if-exists antes do schedule.
-- =================================================================

-- Limiar configurável via platform_settings (default 3 falhas/hora).
insert into public.platform_settings (key, value, description)
values (
  'queue_failure_alert_threshold',
  '3'::jsonb,
  'Nº de system_events status=failed na última hora que dispara um alerta na fila (cron check_queue_failures).'
)
on conflict (key) do nothing;

create or replace function public.check_queue_failures()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold int;
  v_failures int;
  v_recent_alert boolean;
begin
  v_threshold := coalesce(
    (select (value #>> '{}')::int from public.platform_settings
      where key = 'queue_failure_alert_threshold'),
    3
  );

  -- Conta falhas recentes, ignorando o próprio kind de alerta pra não
  -- criar loop (alerta contando alerta).
  select count(*)
    into v_failures
    from public.system_events
   where status = 'failed'
     and kind <> 'alert.queue.failures'
     and created_at > now() - interval '1 hour';

  if v_failures < v_threshold then
    return v_failures;
  end if;

  -- Anti-flood: já alertou na última hora? Então não repete.
  select exists (
    select 1 from public.system_events
     where kind = 'alert.queue.failures'
       and created_at > now() - interval '60 minutes'
  ) into v_recent_alert;

  if v_recent_alert then
    return v_failures;
  end if;

  -- Registra o alerta na própria fila (admin vê em /admin/fila-eventos).
  perform public.fn_log_system_event(
    'alert.queue.failures',
    'failed',
    jsonb_build_object(
      'failures_last_hour', v_failures,
      'threshold', v_threshold,
      'note', 'Investigar /admin/fila-eventos. Ping de uptime externo é manual.'
    ),
    format('%s falhas na última hora (limiar %s)', v_failures, v_threshold)
  );

  return v_failures;
end;
$$;

revoke all on function public.check_queue_failures() from public;
grant execute on function public.check_queue_failures() to authenticated;

comment on function public.check_queue_failures is
  'Conta system_events status=failed na última hora; se >= limiar e sem alerta recente, registra alert.queue.failures na fila. Rodado por cron a cada 15min.';

-- Cron a cada 15min. Só agenda se pg_cron existir (schema cron).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-check-queue-failures') then
      perform cron.unschedule('milsaca-check-queue-failures');
    end if;
    perform cron.schedule(
      'milsaca-check-queue-failures',
      '*/15 * * * *',
      $cron$select public.check_queue_failures();$cron$
    );
  else
    raise notice 'pg_cron não instalado; check_queue_failures criado mas não agendado.';
  end if;
end $$;
