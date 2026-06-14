-- =================================================================
-- Milsaca — alertas de falha também como NOTIFICAÇÃO IN-APP pros admins
--           (auditoria — pendência #d)
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- CONTEXTO:
--   Hoje os alertas de falha só gravam em system_events (visíveis em
--   /admin/fila-eventos). O operador não usa canal externo (email/WhatsApp)
--   por enquanto, então o alerta precisa chegar por um canal que já funciona:
--   a NOTIFICAÇÃO IN-APP (tabela notifications) pra cada admin (app_admins).
--
--   Duas funções de cron já detectam falhas e logam system_events com
--   anti-flood próprio:
--     - check_queue_failures()       (20260655000000) — fila com falhas.
--     - check_market_quotes_stale()  (20261290000000) — fonte de cotação velha.
--
--   Esta migration as REESCREVE (create or replace) pra, ALÉM de tudo que já
--   fazem, inserir uma notification pra CADA admin no MESMO ponto em que o
--   system_event de alerta é gravado. Como esse ponto já está protegido pelo
--   anti-flood existente (60min na fila; 6h/slug na cotação), as notificações
--   herdam o mesmo anti-flood — só são criadas quando um alerta NOVO dispara,
--   nunca duplicadas dentro da janela.
--
-- DECISÕES:
--   - kind da notificação = 'sistema' (valor JÁ existente no enum
--     notification_kind: lead/contrato/cotacao/sistema/entrega/pagamento/
--     price_alert/social). É o kind genérico de sistema — nenhum kind novo é
--     criado (evita o problema de "alter type add value" não poder ser usado
--     na mesma transação que usa o valor).
--   - notifications.user_id referencia profiles(id), e profiles.id = auth.users.id
--     (1:1). app_admins.user_id referencia auth.users(id). Logo
--     app_admins.user_id == profiles.id e pode ser usado direto como user_id.
--     Mesmo assim filtramos por profiles existentes (join defensivo) pra não
--     violar a FK caso um admin não tenha profile.
--
-- Tudo aditivo: comportamento atual (system_events, anti-flood, returns,
-- exception/log, grants, cron) é PRESERVADO. Só ADICIONA a notificação in-app.
-- security definer + set search_path = public. Idempotente (create or replace).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. check_queue_failures — agora também notifica os admins in-app
-- -----------------------------------------------------------------
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

  -- Notificação in-app pra CADA admin. No mesmo bloco do system_event acima,
  -- logo já protegido pelo anti-flood de 60min (não duplica na janela).
  insert into public.notifications (user_id, kind, title, body, data)
  select
    a.user_id,
    'sistema'::public.notification_kind,
    'Fila de mensagens com falhas',
    format('%s despachos falharam na última hora (limiar %s). Investigue em /admin/fila-eventos.',
           v_failures, v_threshold),
    jsonb_build_object(
      'alert', 'queue.failures',
      'failures_last_hour', v_failures,
      'threshold', v_threshold
    )
  from public.app_admins a
  join public.profiles p on p.id = a.user_id;

  return v_failures;
end;
$$;

-- Privilégios PRESERVADOS conforme hardening de 20261270000000:
-- authenticated NÃO pode executar (cron-only). create or replace mantém os
-- grants existentes; reafirmamos o estado desejado por idempotência.
revoke all on function public.check_queue_failures() from public;
revoke execute on function public.check_queue_failures() from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.check_queue_failures() to service_role;
  end if;
end $$;

comment on function public.check_queue_failures is
  'Conta system_events status=failed na última hora; se >= limiar e sem alerta '
  'recente, registra alert.queue.failures na fila E notifica cada admin in-app '
  '(kind sistema). Anti-flood 60min. Rodado por cron a cada 15min.';

-- -----------------------------------------------------------------
-- 2. check_market_quotes_stale — agora também notifica os admins in-app
-- -----------------------------------------------------------------
-- Corpo idêntico ao vigente (20261290000000), PRESERVANDO todo o
-- comportamento (skip de fim de semana, threshold, last_error_*, anti-flood
-- de 6h/slug, system_event de resumo, exception handler). Só ADICIONA a
-- notificação in-app pros admins no mesmo ponto onde o alerta por slug é
-- gravado — herdando o anti-flood de 6h/slug (não duplica na janela).
create or replace function public.check_market_quotes_stale() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours       int;
  v_cutoff      timestamptz;
  v_stale_count int := 0;
  v_dow         int;
  s             record;
  v_latest      timestamptz;
  v_recent_alert boolean;
begin
  -- Dia da semana em BRT (0=domingo .. 6=sábado). Pula fds.
  v_dow := extract(dow from (now() at time zone 'America/Sao_Paulo'))::int;
  if v_dow = 0 or v_dow = 6 then
    perform public.fn_log_system_event(
      'cron.check-market-quotes-stale.run', 'skipped',
      jsonb_build_object('reason', 'weekend'));
    return 0;
  end if;

  v_hours := coalesce(
    (select (value #>> '{}')::int from public.platform_settings
      where key = 'market_quotes_stale_hours'),
    30
  );
  v_cutoff := now() - make_interval(hours => v_hours);

  for s in
    select slug, name
      from public.quote_sources
     where type = 'automatic'
       and active = true
  loop
    select max(fetched_at) into v_latest
      from public.market_quotes
     where source = s.slug;

    -- Fresco o bastante? então segue.
    if v_latest is not null and v_latest >= v_cutoff then
      continue;
    end if;

    v_stale_count := v_stale_count + 1;

    -- Persiste o erro na fonte (pro painel /admin/cotacoes/fontes mostrar).
    update public.quote_sources
       set last_error_at = now(),
           last_error_message = case
             when v_latest is null
               then 'Sem cotação automática registrada (nunca coletou).'
             else format('Cotação automática velha: última coleta %s (limiar %sh).',
                         to_char(v_latest at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
                         v_hours)
           end
     where slug = s.slug;

    -- Anti-flood: já alertou desta fonte nas últimas 6h? então não repete.
    select exists (
      select 1 from public.system_events
       where kind = 'cotacao.source.stale'
         and (payload->>'slug') = s.slug
         and created_at > now() - interval '6 hours'
    ) into v_recent_alert;

    if v_recent_alert then
      continue;
    end if;

    perform public.fn_log_system_event(
      'cotacao.source.stale',
      'failed',
      jsonb_build_object(
        'slug', s.slug,
        'last_fetched_at', v_latest,
        'threshold_hours', v_hours
      ),
      format('Fonte de cotação "%s" sem dado fresco há mais de %sh.', s.name, v_hours)
    );

    -- Notificação in-app pra CADA admin. No mesmo ponto do system_event acima
    -- (após o anti-flood de 6h/slug), logo não duplica na janela.
    insert into public.notifications (user_id, kind, title, body, data)
    select
      a.user_id,
      'sistema'::public.notification_kind,
      'Cotação automática desatualizada',
      format('A fonte "%s" está sem dado fresco há mais de %sh. Verifique em /admin/cotacoes/fontes.',
             s.name, v_hours),
      jsonb_build_object(
        'alert', 'cotacao.source.stale',
        'slug', s.slug,
        'last_fetched_at', v_latest,
        'threshold_hours', v_hours
      )
    from public.app_admins a
    join public.profiles p on p.id = a.user_id;
  end loop;

  perform public.fn_log_system_event(
    'cron.check-market-quotes-stale.run',
    case when v_stale_count > 0 then 'failed' else 'success' end,
    jsonb_build_object('stale_sources', v_stale_count),
    case when v_stale_count > 0
         then format('%s fonte(s) automática(s) com cotação velha', v_stale_count)
         else null end
  );

  return v_stale_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.check-market-quotes-stale.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

comment on function public.check_market_quotes_stale is
  'Detecta fontes automáticas (quote_sources.type=automatic) sem market_quotes '
  'fresco há mais de market_quotes_stale_hours (default 30h). Marca '
  'last_error_* na fonte, loga system_event failed E notifica cada admin in-app '
  '(kind sistema), anti-flood 6h/slug. Roda em dia útil; pula fim de semana.';

-- Privilégios PRESERVADOS: só o cron (postgres/service_role) executa.
revoke all on function public.check_market_quotes_stale() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.check_market_quotes_stale() to service_role;
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: ambas as funções agora também criam notifications in-app
-- pros admins (kind 'sistema'), respeitando o anti-flood existente. Nada
-- destrutivo; system_events, returns, exception e cron inalterados.
-- =================================================================
