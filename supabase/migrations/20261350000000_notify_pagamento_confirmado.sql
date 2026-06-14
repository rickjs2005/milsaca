-- =================================================================
-- Milsaca — Automação: "Pagamento confirmado → avisa o PRODUTOR"
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Nova automação TRANSACIONAL (não precisa opt-in): quando a corretora
-- marca um produtor_pagamento como PAGO, manda 1 WhatsApp pro PRODUTOR
-- confirmando que o pagamento dele saiu. É o espelho "pra cima" do
-- nudge_payment_pending (20261220 / 20261260), que avisa a CORRETORA do
-- pagamento ATRASADO. Esta avisa o PRODUTOR do pagamento CONFIRMADO.
--
-- STATUS DE "PAGO": o enum é public.pagamento_status ('pendente','pago',
--   'vencido','cancelado'). O valor de pago é 'pago' — confirmado no fluxo
--   da app (apps/web/.../pagamentos/_actions.ts marcarPago seta
--   status='pago', data_paga = data de hoje). NÃO há 'confirmado'/'paid'.
--
-- TIMESTAMP USADO / SUPOSIÇÃO: a coluna data_paga é DATE (só dia, sem hora),
--   logo não dá pra cravar uma janela horária com ela. Usamos updated_at
--   (timestamptz, tocado pelo trigger tg_set_updated_at NO MESMO update que
--   marca pago) pra pegar pagamentos confirmados nas últimas ~25h — janela
--   um pouco maior que 24h pro cron DIÁRIO não perder nenhum por borda de
--   horário. data_paga entra só como guarda extra (not null). A dedup ampla
--   (~30 dias) por pagamento_id garante "avisa UMA vez só" mesmo que
--   updated_at seja tocado de novo depois (ex.: anexar comprovante).
--
-- Mesmo padrão das outras automações: template em notification_templates,
-- CTE de elegíveis, join produtor_pagamentos→profiles/produtores (telefone
-- coalesce(produtores.whatsapp, profiles.phone)) + contratos (code opcional),
-- dedup via NOT EXISTS em message_dispatches (por pagamento_id), insert de
-- dispatch (entregue depois por process_pending_dispatches), dinheiro BR
-- (translate(to_char(..),'.,',',.')), log via fn_log_system_event, exception.
-- SECURITY DEFINER, set search_path = public. Idempotente: create or replace
-- + on conflict (channel,kind) do nothing + cron upsert por jobname.
-- Sem grant pra authenticated (cron-only — roda pelo cron como owner).
-- =================================================================

-- -----------------------------------------------------------------
-- Template (on conflict (channel, kind) do nothing)
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'pagamento_confirmado',
   'Pagamento confirmado — produtor',
   'Oi {{produtor_nome}}, seu pagamento de R$ {{valor_liquido}}{{contrato_sufixo}}'
   || ' foi confirmado pela corretora. ✅',
   null,
   '["produtor_nome","valor_liquido","contrato_sufixo"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- notify_pagamento_confirmado — avisa o produtor que o pagamento saiu
-- -----------------------------------------------------------------
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
               'contrato_sufixo', case when confirmados.contrato_code is not null
                                       then ' (contrato ' || confirmados.contrato_code || ')' else '' end
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

-- Sem grant pra authenticated: cron-only (a função roda pelo cron como owner).

-- -----------------------------------------------------------------
-- Schedule — 0 12 * * * = 09:00 BRT (UTC-3), todo dia.
-- Bloco padrão: só agenda se o schema cron existir (unschedule-if-exists
-- + schedule). Horário espaçado dos outros nudges (proposta-recebida 13,
-- expiring 11, payment 14, trial 13).
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-notify-pagamento-confirmado') then
      perform cron.unschedule('milsaca-notify-pagamento-confirmado');
    end if;
    perform cron.schedule(
      'milsaca-notify-pagamento-confirmado',
      '0 12 * * *',
      $cron$select public.notify_pagamento_confirmado();$cron$
    );
  else
    raise notice 'pg_cron não instalado; notify_pagamento_confirmado criado mas não agendado.';
  end if;
end $$;
