-- =================================================================
-- Milsaca — Cadeia anomalia->alerta: dispatch loga falha real (auditoria #2)
-- Data: 2026-06-02
-- =================================================================
-- process_pending_dispatches marcava os despachos como 'failed' (sem provider
-- ou após 5 tentativas) mas logava system_event.status='success' — então
-- check_queue_failures (que conta system_events 'failed') NUNCA via a falha e
-- nunca alertava. Aqui o run deixa de mentir: se descartou/falhou despacho, o
-- evento vira 'failed'. O anti-flood horário + o limiar configurável
-- (queue_failure_alert_threshold) já evitam spam. create or replace — não
-- muda schema nem o agendamento do cron.
-- =================================================================

create or replace function public.process_pending_dispatches() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_url    text;
  v_worker_secret text;
  v_count         integer := 0;
  v_too_many      integer := 0;
  d               record;
begin
  select (value #>> '{}') into v_worker_url
    from public.platform_settings where key = 'dispatch_worker_url';
  select (value #>> '{}') into v_worker_secret
    from public.platform_settings where key = 'dispatch_worker_secret';

  -- 1. Falha permanente em quem já tentou 5+ vezes
  update public.message_dispatches
     set status = 'failed',
         error = coalesce(error, '') || ' | max_attempts'
   where status = 'pending'
     and attempts >= 5;
  get diagnostics v_too_many = row_count;

  -- 2. Sem provider configurado -> stub: descarta os pendentes
  if v_worker_url is null or v_worker_url = '' then
    with skipped as (
      update public.message_dispatches
         set status = 'failed',
             error = 'no_provider_configured'
       where status = 'pending'
         and created_at < now() - interval '1 minute'
      returning id
    )
    select count(*) into v_count from skipped;

    -- Honesto: descartar despacho NÃO é sucesso. Vira 'failed' pra
    -- check_queue_failures enxergar e alertar o admin.
    perform public.fn_log_system_event(
      'cron.process-dispatches.run',
      case when v_count > 0 or v_too_many > 0 then 'failed' else 'success' end,
      jsonb_build_object(
        'mode', 'stub',
        'skipped_count', v_count,
        'too_many_attempts', v_too_many,
        'reason', 'no_provider_configured'
      ),
      case
        when v_count > 0 or v_too_many > 0
          then format(
            '%s despacho(s) descartado(s) — sem provider de envio configurado',
            v_count + v_too_many
          )
        else null
      end
    );
    return v_count;
  end if;

  -- 3. Provider configurado -> dispara HTTP fire-and-forget; o worker atualiza.
  for d in
    select id from public.message_dispatches
     where status = 'pending'
       and attempts < 5
       and created_at < now() - interval '30 seconds'
     order by created_at asc
     limit 100
  loop
    begin
      perform net.http_post(
        url := v_worker_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(v_worker_secret, '')
        ),
        body := jsonb_build_object('dispatch_id', d.id)
      );

      update public.message_dispatches
         set attempts = attempts + 1,
             status = 'pending'
       where id = d.id;

      v_count := v_count + 1;
    exception when others then
      update public.message_dispatches
         set attempts = attempts + 1,
             error = sqlerrm
       where id = d.id;
    end;
  end loop;

  -- Falha permanente (5+ tentativas) também não é sucesso.
  perform public.fn_log_system_event(
    'cron.process-dispatches.run',
    case when v_too_many > 0 then 'failed' else 'success' end,
    jsonb_build_object(
      'mode', 'http',
      'dispatched_count', v_count,
      'too_many_attempts', v_too_many,
      'worker_url', v_worker_url
    ),
    case
      when v_too_many > 0
        then format('%s despacho(s) falharam após 5 tentativas', v_too_many)
      else null
    end
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.process-dispatches.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;
