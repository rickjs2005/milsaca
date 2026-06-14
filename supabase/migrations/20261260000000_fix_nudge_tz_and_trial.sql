-- =================================================================
-- Milsaca — Fix: timezone BR nas datas dos nudges + cálculo de dias do trial
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- 1) nudge_proposta_expiring / nudge_payment_pending formatavam
--    to_char(<timestamptz>, 'DD/MM/YYYY') SEM AT TIME ZONE. Pro público BR
--    (UTC-3), uma validade às 21:30 BRT (= 00:30 UTC do dia seguinte) saía
--    com a data 1 dia adiantada. Fix: AT TIME ZONE 'America/Sao_Paulo'
--    antes do to_char em TODA data exibida (validade, data_prevista).
--    PRESERVA o fix de dinheiro BR (translate(to_char(..),'.,',',.')).
-- 2) nudge_trial_ending calculava "dias" com extract(day from interval),
--    que só pega o COMPONENTE de dias e trunca (mostrava "2" quando faltam
--    ~2,4 dias e o template promete 3). Fix: arredonda pra CIMA o total real
--    em segundos: greatest(0, ceil(extract(epoch from ...)/86400))::int.
-- Recria as 3 funções via create or replace. Idempotente, sem mudar cron,
-- filtros, dedup, payload nem exception/log.
-- =================================================================

create or replace function public.nudge_proposta_expiring() returns integer
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
   where channel = 'whatsapp' and kind = 'proposta_vencendo' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-proposta-expiring.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with expiring as (
    select pr.id          as proposta_id,
           pr.corretora_id,
           pr.lead_id,
           pr.preco_saca,
           pr.validade_ate,
           c.name          as corretora_name,
           coalesce(pd.whatsapp, p.phone) as produtor_phone,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.propostas pr
      join public.leads l       on l.id = pr.lead_id
      join public.corretoras c  on c.id = pr.corretora_id
      left join public.profiles p   on p.id = l.produtor_id
      left join public.produtores pd on pd.profile_id = l.produtor_id
     where pr.status = 'enviada'
       and pr.validade_ate is not null
       and pr.validade_ate >= now()
       and pr.validade_ate <= now() + interval '2 days'
       and coalesce(pd.whatsapp, p.phone) is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'proposta_id')::uuid = pr.id
            and d.created_at > now() - interval '5 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id, lead_id)
      select v_template_id, 'whatsapp', expiring.produtor_phone,
             jsonb_build_object(
               'proposta_id', expiring.proposta_id,
               'produtor_nome', expiring.produtor_nome,
               'corretora_nome', expiring.corretora_name,
               'preco_saca', translate(to_char(expiring.preco_saca, 'FM999G999G990D00'), '.,', ',.'),
               'validade', to_char(expiring.validade_ate at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
             ),
             expiring.corretora_id,
             expiring.lead_id
        from expiring
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-proposta-expiring.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-proposta-expiring.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

create or replace function public.nudge_payment_pending() returns integer
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
   where channel = 'whatsapp' and kind = 'pagamento_pendente' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-payment-pending.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with overdue as (
    select pg.id          as pagamento_id,
           pg.corretora_id,
           pg.valor_liquido,
           pg.data_prevista,
           c.phone          as corretora_phone,
           c.name           as corretora_name,
           coalesce(p.full_name, 'produtor') as produtor_nome,
           ctr.code         as contrato_code
      from public.produtor_pagamentos pg
      join public.corretoras c on c.id = pg.corretora_id
      left join public.profiles p on p.id = pg.produtor_id
      left join public.contratos ctr on ctr.id = pg.contrato_id
     where pg.status = 'pendente'
       and pg.data_prevista is not null
       and pg.data_prevista < now()::date
       and c.phone is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'pagamento_id')::uuid = pg.id
            and d.created_at > now() - interval '7 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', overdue.corretora_phone,
             jsonb_build_object(
               'pagamento_id', overdue.pagamento_id,
               'corretora_nome', overdue.corretora_name,
               'valor_liquido', translate(to_char(overdue.valor_liquido, 'FM999G999G990D00'), '.,', ',.'),
               'produtor_nome', overdue.produtor_nome,
               'contrato_sufixo', case when overdue.contrato_code is not null
                                       then ' (contrato ' || overdue.contrato_code || ')' else '' end,
               'data_prevista', to_char((overdue.data_prevista)::timestamptz at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
             ),
             overdue.corretora_id
        from overdue
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-payment-pending.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-payment-pending.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- nudge_trial_ending — corrige cálculo de "dias" (arredonda pra CIMA o
-- total real, em vez de extrair só o componente de dias do intervalo).
-- Mantém janela 2-4 dias, dedup, template e o resto da lógica.
-- -----------------------------------------------------------------
create or replace function public.nudge_trial_ending() returns integer
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
   where channel = 'email' and kind = 'trial_expira_3d' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-trial-ending.run',
      'skipped',
      jsonb_build_object('reason', 'template_not_found'),
      'Template email/trial_expira_3d não encontrado ou inativo.'
    );
    return 0;
  end if;

  with subs as (
    select s.id, s.corretora_id, s.trial_ends_at, c.email, c.name as corretora_name
      from public.subscriptions s
      join public.corretoras c on c.id = s.corretora_id
     where s.status = 'trial'
       and s.trial_ends_at between now() + interval '2 days' and now() + interval '4 days'
       and c.email is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.corretora_id = s.corretora_id
            and d.created_at > now() - interval '6 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'email', subs.email,
             jsonb_build_object(
               'nome', subs.corretora_name,
               'dias', greatest(0, ceil(extract(epoch from (subs.trial_ends_at - now())) / 86400))::int
             ),
             subs.corretora_id
        from subs
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-trial-ending.run',
    'success',
    jsonb_build_object('dispatched_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-trial-ending.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- =================================================================
-- Done. Só formatação/cálculo mudou; cron, filtros, dedup e logs intactos.
-- =================================================================
