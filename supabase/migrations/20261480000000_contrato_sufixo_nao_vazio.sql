-- =================================================================
-- Milsaca — Fix: contrato_sufixo vazio mata o dispatch (F0 mensageria)
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- nudge_payment_pending (20261260) e notify_pagamento_confirmado (20261350)
-- montam 'contrato_sufixo' com `else ''` quando o pagamento não tem contrato
-- vinculado. String VAZIA é fatal nos dois modos de envio do worker:
--   - type:"text": renderTemplate trata '' como variável faltando →
--     MissingTemplateVarError → dispatch 'failed' (permanente). Bug latente
--     hoje, mascarado pelo modo stub (que descarta tudo antes do render).
--   - type:"template" (Meta HSM): a Graph API rejeita parâmetro vazio.
-- Fix na FONTE: `else ' (avulso)'` — parâmetro nunca vazio e a frase segue
-- legível ("pagamento de R$ 500,00 (avulso) foi confirmado...").
--
-- Recria as 2 funções via create or replace copiando a última versão
-- (20261260 e 20261350) e mudando SÓ o else do case do contrato_sufixo.
-- Cron, filtros, dedup, payload e logs intactos. Idempotente.
-- =================================================================

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
               -- ÚNICA mudança: nunca vazio (era `else ''`).
               'contrato_sufixo', case when overdue.contrato_code is not null
                                       then ' (contrato ' || overdue.contrato_code || ')'
                                       else ' (avulso)' end,
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

create or replace function public.notify_pagamento_confirmado() returns integer
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
   where channel = 'whatsapp' and kind = 'pagamento_confirmado' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.notify-pagamento-confirmado.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with confirmados as (
    select pg.id          as pagamento_id,
           pg.corretora_id,
           pg.produtor_id,
           pg.valor_liquido,
           coalesce(pd.whatsapp, p.phone)    as produtor_phone,
           coalesce(p.full_name, 'produtor') as produtor_nome,
           ctr.code        as contrato_code
      from public.produtor_pagamentos pg
      left join public.profiles p    on p.id = pg.produtor_id
      left join public.produtores pd on pd.profile_id = pg.produtor_id
      left join public.contratos ctr on ctr.id = pg.contrato_id
     where pg.status = 'pago'
       -- confirmado recentemente (janela horária precisa via updated_at;
       -- ~25h pro cron diário não perder por borda). data_paga = guarda extra.
       and pg.updated_at > now() - interval '25 hours'
       and pg.data_paga is not null
       and coalesce(pd.whatsapp, p.phone) is not null
       -- dedup amplo (~30 dias) por pagamento: avisa UMA vez só por pagamento.
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'pagamento_id')::uuid = pg.id
            and d.created_at > now() - interval '30 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id, profile_id)
      select v_template_id, 'whatsapp', confirmados.produtor_phone,
             jsonb_build_object(
               'pagamento_id', confirmados.pagamento_id,
               'produtor_nome', confirmados.produtor_nome,
               'valor_liquido', translate(to_char(confirmados.valor_liquido, 'FM999G999G990D00'), '.,', ',.'),
               -- ÚNICA mudança: nunca vazio (era `else ''`).
               'contrato_sufixo', case when confirmados.contrato_code is not null
                                       then ' (contrato ' || confirmados.contrato_code || ')'
                                       else ' (avulso)' end
             ),
             confirmados.corretora_id,
             confirmados.produtor_id
        from confirmados
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.notify-pagamento-confirmado.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.notify-pagamento-confirmado.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;
