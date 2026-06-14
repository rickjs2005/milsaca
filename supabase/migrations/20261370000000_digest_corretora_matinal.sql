-- =================================================================
-- Milsaca — Automação: digest matinal pra corretora
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- "Bom dia, corretora" — toda manhã de dia útil (08:00 BRT), envia UM
-- WhatsApp por corretora com um resumo operacional do que precisa de
-- atenção HOJE:
--   - leads novos (status 'novo' criados nas últimas 24h)
--   - propostas vencendo (status 'enviada', validade_ate nas próximas 48h)
--   - entregas atrasadas (status programada/em_transito, data_prevista
--     já passou, data_realizada ainda nula)
--   - pagamentos pendentes vencidos (status 'pendente', data_prevista
--     já passou)
--
-- Transacional/operacional (sem opt-in): é o briefing de trabalho da
-- corretora, não marketing.
--
-- REGRA-CHAVE: só manda se houver ALGO a reportar. O {{resumo}} é montado
-- na função apenas com as linhas que tiverem contagem > 0. Se a corretora
-- não tem NADA (os 4 contadores zerados) → pula (não enfileira dispatch).
--
-- Mesmo padrão das outras automações do Milsaca:
--   - 1 dispatch por corretora (recipient = corretoras.phone), agregado
--     (espelha aggregate_nudges_por_corretora) e com texto-resumo montado
--     na função (espelha send_quote_digest / nudge_price_swing).
--   - template em notification_templates (on conflict (channel,kind) do nothing)
--   - função SECURITY DEFINER, set search_path = public
--   - dispatch enfileirado em message_dispatches (entregue depois por
--     process_pending_dispatches), log via fn_log_system_event
--   - DEDUP por (template_id, corretora_id, ~20h) → no máx. 1x por manhã,
--     mesmo se o cron rodar de novo no mesmo dia.
--   - revoke execute de public + grant service_role
--   - cron com bloco do(...) padrão (unschedule-if-exists + schedule),
--     só se o schema cron existir
--   - idempotente: create or replace + insert on conflict do nothing
--
-- Datas exibíveis nenhuma neste digest (só contagens), então não há
-- formatação de data/dinheiro a fazer. As janelas usam now()::date /
-- now() direto (mesma convenção dos nudges-irmãos).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Template whatsapp / digest_corretora
--    Texto: saudação + {{resumo}} (montado na função, com \n por linha).
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'digest_corretora',
   'Digest matinal — corretora',
   'Bom dia, {{corretora_nome}}! Seu dia no Milsaca:{{resumo}}',
   null,
   '["corretora_nome","resumo"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 2. send_corretora_digest — 1 resumo por corretora (janela dedup ~20h)
-- -----------------------------------------------------------------
create or replace function public.send_corretora_digest() returns integer
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
   where channel = 'whatsapp' and kind = 'digest_corretora' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.send-corretora-digest.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with base as (
    -- 1 linha por corretora com telefone, já com as 4 contagens.
    -- Subselects correlacionados (filtros = critério de cada nudge-irmão).
    select c.id   as corretora_id,
           c.phone as corretora_phone,
           c.name  as corretora_name,
           -- leads novos: status inicial 'novo' criados nas últimas 24h
           (select count(*) from public.leads l
             where l.corretora_id = c.id
               and l.status = 'novo'
               and l.created_at >= now() - interval '1 day') as qtd_leads,
           -- propostas vencendo: enviada, validade nas próximas 48h
           (select count(*) from public.propostas pr
             where pr.corretora_id = c.id
               and pr.status = 'enviada'
               and pr.validade_ate is not null
               and pr.validade_ate >= now()
               and pr.validade_ate <= now() + interval '2 days') as qtd_propostas,
           -- entregas atrasadas: programada/em_transito, prevista vencida, não realizada
           (select count(*) from public.entregas e
             where e.corretora_id = c.id
               and e.status in ('programada','em_transito')
               and e.data_prevista is not null
               and e.data_prevista < now()::date
               and e.data_realizada is null) as qtd_entregas,
           -- pagamentos pendentes vencidos: pendente, prevista vencida
           (select count(*) from public.produtor_pagamentos pg
             where pg.corretora_id = c.id
               and pg.status = 'pendente'
               and pg.data_prevista is not null
               and pg.data_prevista < now()::date) as qtd_pagamentos
      from public.corretoras c
     where c.phone is not null
       and c.phone <> ''
  ),
  com_resumo as (
    -- Monta o resumo só com as linhas de contagem > 0 (concat de
    -- "\n- N <coisa>"), pluralizando manualmente em pt-BR.
    select b.*,
           (
             case when b.qtd_leads > 0
                  then E'\n- ' || b.qtd_leads || ' lead' ||
                       case when b.qtd_leads > 1 then 's' else '' end || ' novo' ||
                       case when b.qtd_leads > 1 then 's' else '' end
                  else '' end
           ) ||
           (
             case when b.qtd_propostas > 0
                  then E'\n- ' || b.qtd_propostas || ' proposta' ||
                       case when b.qtd_propostas > 1 then 's' else '' end || ' vencendo'
                  else '' end
           ) ||
           (
             case when b.qtd_entregas > 0
                  then E'\n- ' || b.qtd_entregas || ' entrega' ||
                       case when b.qtd_entregas > 1 then 's' else '' end || ' atrasada' ||
                       case when b.qtd_entregas > 1 then 's' else '' end
                  else '' end
           ) ||
           (
             case when b.qtd_pagamentos > 0
                  then E'\n- ' || b.qtd_pagamentos || ' pagamento' ||
                       case when b.qtd_pagamentos > 1 then 's' else '' end || ' pendente' ||
                       case when b.qtd_pagamentos > 1 then 's' else '' end
                  else '' end
           ) as resumo
      from base b
  ),
  elegiveis as (
    -- "Tem algo a reportar" = pelo menos 1 das 4 contagens > 0
    -- (resumo não-vazio). DEDUP por corretora: 1x por manhã (~20h).
    select cr.*
      from com_resumo cr
     where cr.resumo <> ''
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.corretora_id = cr.corretora_id
            and d.created_at > now() - interval '20 hours'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', elegiveis.corretora_phone,
             jsonb_build_object(
               'corretora_nome', elegiveis.corretora_name,
               'resumo', elegiveis.resumo
             ),
             elegiveis.corretora_id
        from elegiveis
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.send-corretora-digest.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.send-corretora-digest.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

comment on function public.send_corretora_digest is
  'Digest matinal operacional por corretora: 1 WhatsApp/corretora com '
  'contagens de leads novos (24h), propostas vencendo (48h), entregas '
  'atrasadas e pagamentos pendentes vencidos. Só manda se houver algo a '
  'reportar (>=1 contagem >0). Dedup (template, corretora, 20h). '
  'Roda de manhã, dias úteis.';

-- -----------------------------------------------------------------
-- 3. Permissões: só o cron (postgres/service_role) — não authenticated/anon/public.
-- -----------------------------------------------------------------
revoke all on function public.send_corretora_digest() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.send_corretora_digest() to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 4. Cron: 0 11 * * 1-5 (= 08:00 BRT, UTC-3), dias úteis (seg-sex).
--    Só agenda se o schema cron existir.
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-digest-corretora') then
      perform cron.unschedule('milsaca-digest-corretora');
    end if;
    perform cron.schedule(
      'milsaca-digest-corretora',
      '0 11 * * 1-5',
      $cron$select public.send_corretora_digest();$cron$
    );
  else
    raise notice 'pg_cron não instalado; send_corretora_digest criado mas não agendado.';
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: template + função de digest + cron matinal.
-- Nada destrutivo.
-- =================================================================
