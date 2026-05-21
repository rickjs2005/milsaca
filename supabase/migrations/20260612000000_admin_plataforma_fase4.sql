-- =================================================================
-- Milsaca — Fase 4 da Plataforma: nudge entregas + worker HTTP
-- Data: 2026-05-21
-- =================================================================
-- Fecha o ciclo "operar sozinho":
--   - nudge_delivery_late: avisa corretora de entrega atrasada
--   - process_pending_dispatches: tenta entregar via HTTP se setting
--     dispatch_worker_url estiver setada, senão marca como failed/
--     no_provider (comportamento atual).
--   - 2 settings novas: dispatch_worker_url + dispatch_worker_secret
--
-- Pré-requisito: extensão `net` (pg_net) já vem habilitada em Supabase
-- por padrão. Usamos `net.http_post` fire-and-forget — a edge function
-- (template em supabase/functions/send-dispatch) é quem atualiza o
-- message_dispatches depois de tentar enviar.
-- =================================================================

-- -----------------------------------------------------------------
-- 0. Schema patch — coluna `attempts` em message_dispatches
-- -----------------------------------------------------------------
-- Adicionada agora pra suportar retry budget no process_pending_dispatches.
alter table public.message_dispatches
  add column if not exists attempts integer not null default 0;

create index if not exists message_dispatches_status_attempts_idx
  on public.message_dispatches (status, attempts);

-- -----------------------------------------------------------------
-- 1. Seeds: settings novas + template novo
-- -----------------------------------------------------------------
insert into public.platform_settings (key, value, description) values
  ('dispatch_worker_url', '""',
   'URL HTTP da edge function/worker que envia dispatches. Vazio = stub local marca como no_provider. Ex: https://<ref>.supabase.co/functions/v1/send-dispatch'),
  ('dispatch_worker_secret', '""',
   'Bearer secret enviado pro worker no header Authorization. Deve casar com SEND_DISPATCH_SECRET na edge function.')
on conflict (key) do nothing;

insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'entrega_atrasada',
   'Entrega atrasada — corretora',
   'Oi {{corretora_nome}}, a entrega #{{sequencia}} do contrato {{contrato_code}} ({{produtor_nome}}) era pra {{data_prevista}} mas ainda não foi confirmada. Vale conferir status.',
   null,
   '["corretora_nome","sequencia","contrato_code","produtor_nome","data_prevista"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 2. nudge_delivery_late — entregas com data_prevista passada
-- -----------------------------------------------------------------
-- Critério: status='programada' (ou em_transito) E data_prevista < now()::date
--           E data_realizada IS NULL.
-- Dedup: não cria novo dispatch se já houver um pro mesmo entrega_id
-- nos últimos 7 dias (semana).
-- -----------------------------------------------------------------
create or replace function public.nudge_delivery_late() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_count integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'entrega_atrasada' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-delivery-late.run',
      'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with late as (
    select e.id            as entrega_id,
           e.corretora_id,
           e.contrato_id,
           e.sequencia,
           e.data_prevista,
           c.phone          as corretora_phone,
           c.name           as corretora_name,
           ctr.code         as contrato_code,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.entregas e
      join public.corretoras c   on c.id = e.corretora_id
      join public.contratos  ctr on ctr.id = e.contrato_id
      left join public.profiles p on p.id = e.produtor_id
     where e.status in ('programada','em_transito')
       and e.data_prevista is not null
       and e.data_prevista < (now()::date)
       and e.data_realizada is null
       and c.phone is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'entrega_id')::uuid = e.id
            and d.created_at > now() - interval '7 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', late.corretora_phone,
             jsonb_build_object(
               'entrega_id', late.entrega_id,
               'corretora_nome', late.corretora_name,
               'sequencia', late.sequencia,
               'contrato_code', late.contrato_code,
               'produtor_nome', late.produtor_nome,
               'data_prevista', to_char(late.data_prevista, 'DD/MM/YYYY')
             ),
             late.corretora_id
        from late
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-delivery-late.run',
    'success',
    jsonb_build_object('dispatched_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-delivery-late.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

grant execute on function public.nudge_delivery_late() to authenticated;

-- -----------------------------------------------------------------
-- 3. process_pending_dispatches REESCRITA — HTTP se configurado
-- -----------------------------------------------------------------
-- Comportamento:
--   - Se setting `dispatch_worker_url` estiver vazia: marca todos
--     pending > 1min como failed/no_provider (comportamento Fase 3).
--   - Se setiver setada: pra cada pending > 30s, dispara
--     net.http_post fire-and-forget com {id, dispatch_id} no body.
--     O worker (edge function) é quem UPDATE status pra sent|failed.
--     Função aqui só conta dispatches "enviados pra worker".
--
-- Dedup: usa attempts++. Se attempts > 5, marca failed permanente.
-- -----------------------------------------------------------------
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
  -- Settings
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

  -- 2. Sem provider configurado → stub Fase 3
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

    perform public.fn_log_system_event(
      'cron.process-dispatches.run',
      'success',
      jsonb_build_object(
        'mode', 'stub',
        'skipped_count', v_count,
        'too_many_attempts', v_too_many
      )
    );
    return v_count;
  end if;

  -- 3. Provider configurado → dispara HTTP fire-and-forget pra cada
  -- pending > 30s + attempts < 5. O worker é quem atualiza status.
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

  perform public.fn_log_system_event(
    'cron.process-dispatches.run',
    'success',
    jsonb_build_object(
      'mode', 'http',
      'dispatched_count', v_count,
      'too_many_attempts', v_too_many,
      'worker_url', v_worker_url
    )
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

-- (grant já dado na Fase 2 — replace mantém)

-- -----------------------------------------------------------------
-- 4. pg_cron — agenda nudge-delivery-late
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-nudge-delivery-late') then
    perform cron.unschedule('milsaca-nudge-delivery-late');
  end if;
end $$;

select cron.schedule(
  'milsaca-nudge-delivery-late',
  '0 10 * * *',                   -- 07:00 BRT
  $$select public.nudge_delivery_late();$$
);
