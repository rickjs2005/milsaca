-- =================================================================
-- Milsaca — Automação: "Proposta recebida — lembra o PRODUTOR de responder"
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Nova automação TRANSACIONAL (não precisa opt-in): quando uma corretora
-- enviou uma proposta e o produtor ainda não respondeu depois de ~24h,
-- manda 1 WhatsApp pro produtor avisando que tem proposta esperando.
--
-- Difere de nudge_proposta_expiring (20261220 / fix em 20261260):
--   - aquela dispara PERTO DO VENCIMENTO (validade_ate nas próximas 48h);
--   - ESTA dispara CEDO — 24h após a proposta ser enviada (created_at),
--     desde que ainda esteja dentro da validade.
-- Templates, dedup e kind são diferentes, então não conflitam/duplicam.
--
-- Suposição sobre status: o fluxo da proposta é
--   rascunho → enviada → (aceita | rejeitada | expirada)
-- e a resposta do produtor TRANSICIONA o status pra fora de 'enviada'
-- (ver 20260531 / v1_responder_proposta 20260654). Logo, status='enviada'
-- já é o sinal canônico de "produtor ainda não respondeu" — não há flag
-- extra de "visto/respondido" a checar.
--
-- Mesmo padrão das outras automações: template em notification_templates,
-- CTE de elegíveis, join propostas→leads→produtor, telefone do produtor
-- coalesce(produtores.whatsapp, profiles.phone), dedup via NOT EXISTS em
-- message_dispatches (por proposta), insert de dispatch (entregue depois
-- por process_pending_dispatches), log via fn_log_system_event, exception.
-- SECURITY DEFINER. Idempotente: create or replace + on conflict do nothing
-- + cron upsert por jobname. Sem grant pra authenticated (cron-only).
-- =================================================================

-- -----------------------------------------------------------------
-- Template (on conflict (channel, kind) do nothing)
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'proposta_recebida',
   'Proposta recebida — produtor',
   'Oi {{produtor_nome}}, a {{corretora_nome}} te enviou uma proposta de R$ {{preco_saca}}/saca.'
   || ' Abra o Milsaca pra responder.',
   null,
   '["produtor_nome","corretora_nome","preco_saca"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- nudge_proposta_recebida — avisa o produtor 24h após receber a proposta
-- -----------------------------------------------------------------
create or replace function public.nudge_proposta_recebida() returns integer
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
   where channel = 'whatsapp' and kind = 'proposta_recebida' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-proposta-recebida.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with elegiveis as (
    select pr.id          as proposta_id,
           pr.corretora_id,
           pr.lead_id,
           pr.preco_saca,
           c.name          as corretora_name,
           coalesce(pd.whatsapp, p.phone) as produtor_phone,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.propostas pr
      join public.leads l       on l.id = pr.lead_id
      join public.corretoras c  on c.id = pr.corretora_id
      left join public.profiles p   on p.id = l.produtor_id
      left join public.produtores pd on pd.profile_id = l.produtor_id
     where pr.status = 'enviada'
       and pr.created_at <= now() - interval '24 hours'
       and (pr.validade_ate is null or pr.validade_ate >= now())
       and coalesce(pd.whatsapp, p.phone) is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'proposta_id')::uuid = pr.id
            and d.created_at > now() - interval '3 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id, lead_id)
      select v_template_id, 'whatsapp', elegiveis.produtor_phone,
             jsonb_build_object(
               'proposta_id', elegiveis.proposta_id,
               'produtor_nome', elegiveis.produtor_nome,
               'corretora_nome', elegiveis.corretora_name,
               'preco_saca', translate(to_char(elegiveis.preco_saca, 'FM999G999G990D00'), '.,', ',.')
             ),
             elegiveis.corretora_id,
             elegiveis.lead_id
        from elegiveis
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-proposta-recebida.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-proposta-recebida.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

-- Sem grant pra authenticated: cron-only (a função roda pelo cron como owner).

-- -----------------------------------------------------------------
-- Schedule — 0 13 * * * = 10:00 BRT (UTC-3), todo dia.
-- Bloco padrão: só agenda se o schema cron existir (unschedule-if-exists
-- + schedule). Horário espaçado dos outros nudges (expiring 11, payment 14,
-- trial 13 — este 13 é diário e não colide de função, mas o jobname é único).
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-nudge-proposta-recebida') then
      perform cron.unschedule('milsaca-nudge-proposta-recebida');
    end if;
    perform cron.schedule(
      'milsaca-nudge-proposta-recebida',
      '0 13 * * *',
      $cron$select public.nudge_proposta_recebida();$cron$
    );
  else
    raise notice 'pg_cron não instalado; nudge_proposta_recebida criado mas não agendado.';
  end if;
end $$;
