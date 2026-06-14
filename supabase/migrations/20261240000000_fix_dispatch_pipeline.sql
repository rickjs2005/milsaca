-- =================================================================
-- Milsaca — Fix do pipeline de entrega de dispatches (auditoria entrega)
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Três bugs do pipeline de message_dispatches:
--   1. Entrega DUPLICADA: process_pending_dispatches disparava o worker
--      fire-and-forget deixando status='pending'; a próxima rodada do cron
--      repegava o MESMO despacho e reenviava.
--   2. Falha TEMPORÁRIA virava morte permanente (tratado na edge
--      send-dispatch/index.ts — fora desta migration).
--   3. Variável de template faltando ia crua (tratado na edge).
--
-- Esta migration resolve (1) introduzindo um estado intermediário 'sending':
--   - process_pending_dispatches marca 'sending' (e attempts++) ANTES de
--     chamar o worker. Como o select só pega status='pending', a próxima
--     rodada NÃO repega o que já está em voo.
--   - O worker, no fim, move 'sending' → 'sent' | 'failed' | (volta a
--     'pending' em falha temporária pra retry).
--   - Reaper: 'sending' preso há > 10min (worker morreu / net.http_post
--     nunca chegou) volta pra 'pending' pra ser repegado.
--
-- Pré-requisito: coluna `updated_at` em message_dispatches — NÃO existia
-- (só created_at/sent_at/attempts). Adicionada aqui (com trigger) pra o
-- reaper ter sinal confiável de "há quanto tempo está em sending".
--
-- Idempotente: add column/constraint guarded (drop/add), create or replace.
-- Não altera o agendamento do cron (milsaca-process-dispatches, */15).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Coluna updated_at + trigger (reaper precisa dela)
-- -----------------------------------------------------------------
alter table public.message_dispatches
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists tg_set_updated_at_message_dispatches on public.message_dispatches;
create trigger tg_set_updated_at_message_dispatches
  before update on public.message_dispatches
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------
-- 2. Status: adiciona 'sending' ao check constraint (drop/add guarded)
-- -----------------------------------------------------------------
-- O constraint inline criado em 20260609 ganhou nome auto-gerado
-- `message_dispatches_status_check`. Drop IF EXISTS + re-add com o set
-- completo (inclui 'sending' agora). Idempotente.
alter table public.message_dispatches
  drop constraint if exists message_dispatches_status_check;
alter table public.message_dispatches
  add constraint message_dispatches_status_check
  check (status in ('pending','sending','sent','failed','retried'));

-- -----------------------------------------------------------------
-- 3. process_pending_dispatches REESCRITA — sem duplicar entrega
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
  v_recovered     integer := 0;
  d               record;
begin
  -- Settings
  select (value #>> '{}') into v_worker_url
    from public.platform_settings where key = 'dispatch_worker_url';
  select (value #>> '{}') into v_worker_secret
    from public.platform_settings where key = 'dispatch_worker_secret';

  -- 0. Reaper: despacho preso em 'sending' há > 10min (worker morreu ou
  -- o net.http_post nunca chegou) volta pra 'pending' pra ser repegado.
  -- attempts NÃO é incrementado aqui (já foi no flip pra 'sending');
  -- o teto de attempts<5 protege contra loop infinito.
  update public.message_dispatches
     set status = 'pending'
   where status = 'sending'
     and updated_at < now() - interval '10 minutes';
  get diagnostics v_recovered = row_count;

  -- 1. Falha permanente em quem já tentou 5+ vezes
  update public.message_dispatches
     set status = 'failed',
         error = coalesce(error, '') || ' | max_attempts'
   where status = 'pending'
     and attempts >= 5;
  get diagnostics v_too_many = row_count;

  -- 2. Sem provider configurado → MODO STUB (intacto): descarta os
  -- pendentes como failed/no_provider_configured e loga 'failed' pra
  -- check_queue_failures enxergar (igual ao comportamento vigente).
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
      case when v_count > 0 or v_too_many > 0 then 'failed' else 'success' end,
      jsonb_build_object(
        'mode', 'stub',
        'skipped_count', v_count,
        'too_many_attempts', v_too_many,
        'recovered_stuck', v_recovered,
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

  -- 3. Provider configurado → pra cada pending elegível:
  --    a) trava a linha (for update skip locked) pra evitar corrida com
  --       outra rodada concorrente;
  --    b) ANTES do http_post: status='sending', attempts++. Assim a
  --       próxima rodada (que só pega 'pending') NÃO repega este;
  --    c) dispara o worker. O worker é quem finaliza o status.
  for d in
    select id from public.message_dispatches
     where status = 'pending'
       and attempts < 5
       and created_at < now() - interval '30 seconds'
     order by created_at asc
     limit 100
     for update skip locked
  loop
    begin
      -- Marca em-voo ANTES de chamar o worker (anti-duplicação).
      update public.message_dispatches
         set status = 'sending',
             attempts = attempts + 1
       where id = d.id;

      perform net.http_post(
        url := v_worker_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(v_worker_secret, '')
        ),
        body := jsonb_build_object('dispatch_id', d.id)
      );

      v_count := v_count + 1;
    exception when others then
      -- Falhou ao enfileirar o http_post: volta pra 'pending' (attempts
      -- já foi incrementado) pra o reaper/próxima rodada tentarem de novo,
      -- em vez de deixar preso em 'sending'.
      update public.message_dispatches
         set status = 'pending',
             error = sqlerrm
       where id = d.id;
    end;
  end loop;

  perform public.fn_log_system_event(
    'cron.process-dispatches.run',
    case when v_too_many > 0 then 'failed' else 'success' end,
    jsonb_build_object(
      'mode', 'http',
      'dispatched_count', v_count,
      'too_many_attempts', v_too_many,
      'recovered_stuck', v_recovered,
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

-- (grant já dado na Fase 2 — create or replace mantém)
