-- =================================================================
-- Milsaca — Anti-spam: agrega nudges em 1 mensagem-resumo por corretora
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- PROBLEMA (#e — anti-spam): os 3 nudges que avisam a CORRETORA
--   (pagamento pendente, lead parado, entrega atrasada) inseriam UM
--   message_dispatches por ITEM. Uma corretora com N pendências recebia
--   N mensagens de WhatsApp separadas — e repetidas a cada janela de dedup
--   (a dedup era por item). Spam.
--
-- SOLUÇÃO: agregar em UMA mensagem-resumo por corretora, por tipo de nudge.
--   - Agrupa os itens elegíveis por corretora_id (recipient = telefone da
--     corretora, único por corretora) e conta a qtd (e soma o total R$ no
--     caso de pagamentos).
--   - Insere UM dispatch por corretora com payload de RESUMO: qtd, total BR,
--     nome do 1º produtor + "e mais N".
--   - DEDUP passa a ser POR CORRETORA: not exists em message_dispatches por
--     (template_id, corretora_id, janela). Não reenvia pra mesma corretora
--     dentro da janela atual (pagamento 7d, leads 6d, entrega 7d).
--   - Atualiza os 3 notification_templates pro texto de resumo em pt-BR com
--     as variáveis novas.
--
-- PRESERVA: filtros de elegibilidade de cada item (status, datas com
--   AT TIME ZONE onde já havia, telefone não-nulo), security definer,
--   set search_path = public, exception/log e o horário do cron (não mexe).
-- create or replace, idempotente.
-- =================================================================

-- -----------------------------------------------------------------
-- Helper de redação do "sujeito" do resumo: "<1º produtor>" ou
-- "<1º produtor> e mais N". Implementado inline em cada função via
-- array_agg ordenado; mantido aqui só como nota de convenção.
-- -----------------------------------------------------------------

-- =================================================================
-- 1. Templates — texto de RESUMO por corretora
-- =================================================================

-- 1.1 Pagamento pendente (kind pagamento_pendente)
update public.notification_templates
   set body = 'Oi {{corretora_nome}}, você tem {{qtd}} pagamento(s) pendente(s) ' ||
              '({{resumo_produtores}}) totalizando R$ {{total}}. ' ||
              'Vale acertar/registrar no Milsaca.',
       variables = '["corretora_nome","qtd","total","resumo_produtores"]'::jsonb
 where channel = 'whatsapp' and kind = 'pagamento_pendente';

-- 1.2 Lead parado há 3 dias (kind lead_parado_3d)
update public.notification_templates
   set body = 'Oi {{corretora_nome}}, você tem {{qtd}} lead(s) parado(s) há mais de 3 dias ' ||
              '({{resumo_produtores}}). Vale dar um toque ou marcar como perdido.',
       variables = '["corretora_nome","qtd","resumo_produtores"]'::jsonb
 where channel = 'whatsapp' and kind = 'lead_parado_3d';

-- 1.3 Entrega atrasada (kind entrega_atrasada)
update public.notification_templates
   set body = 'Oi {{corretora_nome}}, você tem {{qtd}} entrega(s) atrasada(s) ' ||
              '({{resumo_produtores}}). Vale conferir o status no Milsaca.',
       variables = '["corretora_nome","qtd","resumo_produtores"]'::jsonb
 where channel = 'whatsapp' and kind = 'entrega_atrasada';

-- =================================================================
-- 2. nudge_payment_pending — 1 resumo por corretora (janela 7d)
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
    -- mesmos filtros de elegibilidade do item (status, datas, telefone)
    select pg.id          as pagamento_id,
           pg.corretora_id,
           pg.valor_liquido,
           pg.data_prevista,
           c.phone          as corretora_phone,
           c.name           as corretora_name,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.produtor_pagamentos pg
      join public.corretoras c on c.id = pg.corretora_id
      left join public.profiles p on p.id = pg.produtor_id
     where pg.status = 'pendente'
       and pg.data_prevista is not null
       and pg.data_prevista < now()::date
       and c.phone is not null
  ),
  por_corretora as (
    -- agrega por corretora: conta, soma R$, e monta lista ordenada de
    -- produtores (data_prevista mais antiga primeiro) p/ "1º + e mais N".
    select o.corretora_id,
           o.corretora_phone,
           o.corretora_name,
           count(*)                       as qtd,
           sum(o.valor_liquido)           as total_valor,
           (array_agg(o.produtor_nome order by o.data_prevista asc, o.pagamento_id asc))[1] as primeiro_produtor
      from overdue o
     group by o.corretora_id, o.corretora_phone, o.corretora_name
  ),
  elegiveis as (
    -- DEDUP POR CORRETORA: não reenviar pra mesma corretora dentro de 7d.
    select pc.*
      from por_corretora pc
     where not exists (
       select 1 from public.message_dispatches d
        where d.template_id = v_template_id
          and d.corretora_id = pc.corretora_id
          and d.created_at > now() - interval '7 days'
     )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', elegiveis.corretora_phone,
             jsonb_build_object(
               'corretora_nome', elegiveis.corretora_name,
               'qtd', elegiveis.qtd,
               'total', translate(to_char(elegiveis.total_valor, 'FM999G999G990D00'), '.,', ',.'),
               'resumo_produtores',
                 case when elegiveis.qtd > 1
                      then elegiveis.primeiro_produtor || ' e mais ' || (elegiveis.qtd - 1)
                      else elegiveis.primeiro_produtor end
             ),
             elegiveis.corretora_id
        from elegiveis
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

-- =================================================================
-- 3. nudge_stale_leads — 1 resumo por corretora (janela 6d)
-- =================================================================
create or replace function public.nudge_stale_leads() returns integer
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
   where channel = 'whatsapp' and kind = 'lead_parado_3d' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-stale-leads.run',
      'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  -- "Parado" = última interação REAL há mais de 3 dias. A última interação é
  -- o max entre: o próprio lead (updated_at/created_at), o último evento da
  -- timeline (lead_events) e a última proposta. Critério de elegibilidade do
  -- item PRESERVADO; só a agregação/dedup mudaram.
  with stale as (
    select l.id as lead_id,
           l.corretora_id,
           c.phone as corretora_phone,
           c.name  as corretora_name,
           coalesce(p.full_name, 'produtor') as produtor_nome,
           greatest(
             coalesce(l.updated_at, l.created_at),
             coalesce(
               (select max(le.created_at)
                  from public.lead_events le
                 where le.lead_id = l.id),
               coalesce(l.updated_at, l.created_at)
             ),
             coalesce(
               (select max(coalesce(pr.updated_at, pr.created_at))
                  from public.propostas pr
                 where pr.lead_id = l.id),
               coalesce(l.updated_at, l.created_at)
             )
           ) as last_touched
      from public.leads l
      join public.corretoras c on c.id = l.corretora_id
      left join public.profiles p on p.id = l.produtor_id
     where l.status = 'em_negociacao'
       and c.phone is not null
       and greatest(
             coalesce(l.updated_at, l.created_at),
             coalesce(
               (select max(le.created_at)
                  from public.lead_events le
                 where le.lead_id = l.id),
               coalesce(l.updated_at, l.created_at)
             ),
             coalesce(
               (select max(coalesce(pr.updated_at, pr.created_at))
                  from public.propostas pr
                 where pr.lead_id = l.id),
               coalesce(l.updated_at, l.created_at)
             )
           ) < now() - interval '3 days'
  ),
  por_corretora as (
    -- agrega por corretora: conta e monta lista ordenada (mais parado
    -- primeiro) p/ "1º produtor + e mais N".
    select s.corretora_id,
           s.corretora_phone,
           s.corretora_name,
           count(*) as qtd,
           (array_agg(s.produtor_nome order by s.last_touched asc, s.lead_id asc))[1] as primeiro_produtor
      from stale s
     group by s.corretora_id, s.corretora_phone, s.corretora_name
  ),
  elegiveis as (
    -- DEDUP POR CORRETORA: não reenviar pra mesma corretora dentro de 6d.
    select pc.*
      from por_corretora pc
     where not exists (
       select 1 from public.message_dispatches d
        where d.template_id = v_template_id
          and d.corretora_id = pc.corretora_id
          and d.created_at > now() - interval '6 days'
     )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', elegiveis.corretora_phone,
             jsonb_build_object(
               'corretora_nome', elegiveis.corretora_name,
               'qtd', elegiveis.qtd,
               'resumo_produtores',
                 case when elegiveis.qtd > 1
                      then elegiveis.primeiro_produtor || ' e mais ' || (elegiveis.qtd - 1)
                      else elegiveis.primeiro_produtor end
             ),
             elegiveis.corretora_id
        from elegiveis
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-stale-leads.run',
    'success',
    jsonb_build_object('dispatched_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-stale-leads.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- =================================================================
-- 4. nudge_delivery_late — 1 resumo por corretora (janela 7d)
-- =================================================================
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
    -- mesmos filtros de elegibilidade do item (status, datas, telefone)
    select e.id            as entrega_id,
           e.corretora_id,
           e.data_prevista,
           c.phone          as corretora_phone,
           c.name           as corretora_name,
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
  ),
  por_corretora as (
    -- agrega por corretora: conta e monta lista ordenada (entrega mais
    -- antiga primeiro) p/ "1º produtor + e mais N".
    select l.corretora_id,
           l.corretora_phone,
           l.corretora_name,
           count(*) as qtd,
           (array_agg(l.produtor_nome order by l.data_prevista asc, l.entrega_id asc))[1] as primeiro_produtor
      from late l
     group by l.corretora_id, l.corretora_phone, l.corretora_name
  ),
  elegiveis as (
    -- DEDUP POR CORRETORA: não reenviar pra mesma corretora dentro de 7d.
    select pc.*
      from por_corretora pc
     where not exists (
       select 1 from public.message_dispatches d
        where d.template_id = v_template_id
          and d.corretora_id = pc.corretora_id
          and d.created_at > now() - interval '7 days'
     )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', elegiveis.corretora_phone,
             jsonb_build_object(
               'corretora_nome', elegiveis.corretora_name,
               'qtd', elegiveis.qtd,
               'resumo_produtores',
                 case when elegiveis.qtd > 1
                      then elegiveis.primeiro_produtor || ' e mais ' || (elegiveis.qtd - 1)
                      else elegiveis.primeiro_produtor end
             ),
             elegiveis.corretora_id
        from elegiveis
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

-- =================================================================
-- Done. Os 3 nudges pra corretora agora mandam 1 resumo por corretora,
-- com dedup por (template_id, corretora_id, janela). Cron, grants,
-- security definer, search_path e logs intactos.
-- =================================================================
