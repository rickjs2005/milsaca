-- =================================================================
-- Milsaca — Fase 3 da Plataforma: routing + pg_cron + worker stub
-- Data: 2026-05-21
-- =================================================================
-- Liga o ciclo completo:
--   1. Trigger AFTER INSERT em whatsapp_leads aplicando
--      lead_distribution_rules — corretora vencida vira fallback.
--   2. pg_cron schedules pras 4 funções SQL da Fase 2.
--   3. process_pending_dispatches() — worker stub que marca pendentes
--      como skipped até o provider real (Meta/Resend) ser plugado.
--   4. Auxiliar pick_eligible_corretora(region, specie) — pra futuro
--      fluxo de "produtor sem escolha de corretora".
-- =================================================================

-- -----------------------------------------------------------------
-- 1. pick_eligible_corretora — escolhe corretora elegível pra um lead
-- -----------------------------------------------------------------
-- Regra simplificada (MVP):
--   - Status assinatura IN (trial, active) — não pode ser past_due/expired/canceled
--   - corretora.verified = true
--   - se p_region passado: corretora.state = region OU regioes_atendimento contém region
--   - se p_specie passado: corretora aceita (placeholder por enquanto — não há campo)
-- Retorna 1 random entre elegíveis ou null.
-- -----------------------------------------------------------------
create or replace function public.pick_eligible_corretora(
  p_region text default null,
  p_specie text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- p_specie ainda não filtra (sem campo no schema atual). Reservado.
  -- Justifica parâmetro pra signature estável.
  perform p_specie;

  select c.id into v_id
    from public.corretoras c
   inner join public.subscriptions s on s.corretora_id = c.id
   where c.verified = true
     and s.status in ('trial', 'active')
     and (
       p_region is null
       or c.state = p_region
       or (
         c.regioes_atendimento is not null
         and exists (
           select 1 from unnest(c.regioes_atendimento) as r
           where r::text ilike '%' || p_region || '%'
         )
       )
     )
   order by random()
   limit 1;

  return v_id;
end;
$$;

grant execute on function public.pick_eligible_corretora(text, text) to authenticated;

-- -----------------------------------------------------------------
-- 2. validate_whatsapp_lead — chamada por trigger AFTER INSERT
-- -----------------------------------------------------------------
-- Verifica se a corretora escolhida pelo produtor ainda está elegível.
-- Se elegível: registra system_event success.
-- Se não: cria registro em lead_waitlist + log skip event.
-- -----------------------------------------------------------------
create or replace function public.validate_whatsapp_lead(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead     record;
  v_eligible boolean := false;
begin
  select wl.id, wl.corretora_id, wl.produtor_id, wl.contato_email,
         wl.source, wl.message,
         c.name as corretora_name, c.verified,
         s.status as sub_status
    into v_lead
    from public.whatsapp_leads wl
    left join public.corretoras c on c.id = wl.corretora_id
    left join public.subscriptions s on s.corretora_id = wl.corretora_id
   where wl.id = p_lead_id;

  if not found then
    perform public.fn_log_system_event(
      'lead.validate',
      'failed',
      jsonb_build_object('lead_id', p_lead_id),
      'Lead não encontrado.'
    );
    return;
  end if;

  -- Elegível = corretora verificada + assinatura ativa/trial.
  v_eligible := coalesce(v_lead.verified, false)
            and coalesce(v_lead.sub_status, '') in ('trial', 'active');

  if v_eligible then
    perform public.fn_log_system_event(
      'lead.validate',
      'success',
      jsonb_build_object(
        'lead_id', p_lead_id,
        'corretora_id', v_lead.corretora_id,
        'corretora_name', v_lead.corretora_name,
        'sub_status', v_lead.sub_status
      )
    );
    return;
  end if;

  -- Não elegível → cria fallback em lead_waitlist.
  insert into public.lead_waitlist (source, payload, contact, notes)
  values (
    'whatsapp_lead_fallback',
    jsonb_build_object(
      'lead_id', p_lead_id,
      'corretora_id_intended', v_lead.corretora_id,
      'corretora_name_intended', v_lead.corretora_name,
      'sub_status', v_lead.sub_status,
      'verified', v_lead.verified,
      'source', v_lead.source,
      'message', v_lead.message,
      'produtor_id', v_lead.produtor_id
    ),
    v_lead.contato_email,
    'Corretora escolhida pelo produtor está sem assinatura ativa ou não-verificada. Suporte precisa tratar.'
  );

  perform public.fn_log_system_event(
    'lead.fallback',
    'skipped',
    jsonb_build_object(
      'lead_id', p_lead_id,
      'corretora_id', v_lead.corretora_id,
      'sub_status', v_lead.sub_status,
      'verified', v_lead.verified,
      'reason', 'corretora_not_eligible'
    )
  );
end;
$$;

-- -----------------------------------------------------------------
-- 3. Trigger AFTER INSERT — chama validate_whatsapp_lead
-- -----------------------------------------------------------------
create or replace function public.tg_whatsapp_lead_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Defer pra não bloquear o INSERT do anon — exception não tomba o lead.
  begin
    perform public.validate_whatsapp_lead(new.id);
  exception when others then
    perform public.fn_log_system_event(
      'lead.validate',
      'failed',
      jsonb_build_object('lead_id', new.id),
      sqlerrm
    );
  end;
  return new;
end;
$$;

drop trigger if exists whatsapp_lead_after_insert on public.whatsapp_leads;
create trigger whatsapp_lead_after_insert
  after insert on public.whatsapp_leads
  for each row execute function public.tg_whatsapp_lead_after_insert();

-- -----------------------------------------------------------------
-- 4. process_pending_dispatches — worker stub
-- -----------------------------------------------------------------
-- Marca todos dispatches `pending` como `skipped` com motivo
-- no_provider_configured. Quando o provider real (Meta/Resend) for
-- plugado, esta função é substituída por uma que chama o endpoint
-- HTTP do provider.
-- -----------------------------------------------------------------
create or replace function public.process_pending_dispatches() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with skipped as (
    update public.message_dispatches
       set status = 'failed',
           error = 'no_provider_configured',
           sent_at = null
     where status = 'pending'
       and created_at < now() - interval '1 minute'  -- dá tempo do processo real pegar
    returning id
  )
  select count(*) into v_count from skipped;

  perform public.fn_log_system_event(
    'cron.process-dispatches.run',
    'success',
    jsonb_build_object(
      'skipped_count', v_count,
      'reason', 'no_provider_configured',
      'note', 'Substituir esta função quando WhatsApp/Resend provider for plugado.'
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

grant execute on function public.process_pending_dispatches() to authenticated;

-- -----------------------------------------------------------------
-- 5. pg_cron schedules — 5 jobs novos
-- -----------------------------------------------------------------
-- Agenda em horários UTC. Hora local Brasília (UTC-3) ajustada
-- pra cair em horário comercial brasileiro.
-- Idempotente: unschedule antes de schedule.
-- -----------------------------------------------------------------
do $$
declare
  v_job_name text;
begin
  -- Cancela schedules antigos (idempotente)
  for v_job_name in
    select jobname from cron.job
     where jobname in (
       'milsaca-expire-trials',
       'milsaca-expire-subscriptions',
       'milsaca-nudge-trial-ending',
       'milsaca-nudge-stale-leads',
       'milsaca-process-dispatches'
     )
  loop
    perform cron.unschedule(v_job_name);
  end loop;
end $$;

-- Agenda novos. cron expression: minuto hora dia-mês mês dia-semana.
-- Brasília -3h → 09:00 BRT = 12:00 UTC, etc.
select cron.schedule(
  'milsaca-expire-trials',
  '0 9 * * *',                     -- 06:00 BRT
  $$select public.expire_trials();$$
);

select cron.schedule(
  'milsaca-expire-subscriptions',
  '15 9 * * *',                    -- 06:15 BRT
  $$select public.expire_subscriptions();$$
);

select cron.schedule(
  'milsaca-nudge-trial-ending',
  '0 13 * * *',                    -- 10:00 BRT
  $$select public.nudge_trial_ending();$$
);

select cron.schedule(
  'milsaca-nudge-stale-leads',
  '0 12 * * *',                    -- 09:00 BRT
  $$select public.nudge_stale_leads();$$
);

select cron.schedule(
  'milsaca-process-dispatches',
  '*/15 * * * *',                  -- a cada 15min
  $$select public.process_pending_dispatches();$$
);

-- =================================================================
-- Smoke esperado depois:
--   select jobname, schedule, active from cron.job where jobname like 'milsaca-%';
--   -- deve listar 5 jobs novos + milsaca-sync-cotacoes (se já estiver)
-- =================================================================
