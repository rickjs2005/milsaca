-- =================================================================
-- Milsaca — Automações: nudge de proposta vencendo + pagamento pendente
-- Data: 2026-06-13 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Completa as 2 automações que faltavam (as outras já existem e rodam:
-- check_price_targets, nudge_stale_leads, nudge_delivery_late).
--
--   1. nudge_proposta_expiring — proposta 'enviada' com validade_ate nas
--      próximas 48h → WhatsApp pro PRODUTOR responder antes de vencer.
--      (Hoje só há expiração lazy em v1_responder_proposta 20260950; não
--       havia aviso proativo.)
--   2. nudge_payment_pending — produtor_pagamento 'pendente' com
--      data_prevista vencida → WhatsApp pra CORRETORA acertar/registrar.
--
-- Mesmo padrão de nudge_delivery_late (20260612): template em
-- notification_templates, dedup via NOT EXISTS em message_dispatches,
-- insert de dispatch (entregue depois por process_pending_dispatches),
-- log em system_events via fn_log_system_event. SECURITY DEFINER.
-- Idempotente: create or replace + on conflict do nothing + cron.schedule
-- (upsert por jobname).
-- =================================================================

-- -----------------------------------------------------------------
-- Templates (on conflict (channel, kind) do nothing)
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'proposta_vencendo',
   'Proposta vencendo — produtor',
   'Oi {{produtor_nome}}, a {{corretora_nome}} te ofereceu R$ {{preco_saca}}/saca'
   || ' e a proposta vence em {{validade}}. Abra o app do Milsaca e responda antes de vencer.',
   null,
   '["produtor_nome","corretora_nome","preco_saca","validade"]'::jsonb),
  ('whatsapp', 'pagamento_pendente',
   'Pagamento pendente — corretora',
   'Oi {{corretora_nome}}, o pagamento de R$ {{valor_liquido}} pro produtor {{produtor_nome}}'
   || '{{contrato_sufixo}} estava previsto pra {{data_prevista}} e segue pendente. Vale acertar/registrar.',
   null,
   '["corretora_nome","valor_liquido","produtor_nome","contrato_sufixo","data_prevista"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 1. nudge_proposta_expiring — avisa o produtor (proposta vence em <=48h)
-- -----------------------------------------------------------------
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
               'validade', to_char(expiring.validade_ate, 'DD/MM/YYYY')
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

-- -----------------------------------------------------------------
-- 2. nudge_payment_pending — avisa a corretora (pagamento previsto venceu)
-- -----------------------------------------------------------------
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
               'data_prevista', to_char(overdue.data_prevista, 'DD/MM/YYYY')
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

grant execute on function public.nudge_proposta_expiring() to authenticated;
grant execute on function public.nudge_payment_pending() to authenticated;

-- -----------------------------------------------------------------
-- Schedules (cron.schedule é upsert por jobname). Horários espaçados dos
-- jobs existentes (stale-leads 12, delivery 10, trial 13 UTC).
-- -----------------------------------------------------------------
select cron.schedule('milsaca-nudge-proposta-expiring', '0 11 * * *',
                     'select public.nudge_proposta_expiring();');
select cron.schedule('milsaca-nudge-payment-pending',    '0 14 * * *',
                     'select public.nudge_payment_pending();');
