-- =================================================================
-- Milsaca — Automação: Pós-entrega → pedir avaliação da corretora
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Alguns dias depois de uma entrega ser CONCLUÍDA, manda um WhatsApp pro
-- PRODUTOR pedindo pra avaliar a corretora no Milsaca — desde que ele
-- ainda NÃO tenha avaliado aquela corretora. Transacional (sem opt-in).
--
-- DEFINIÇÃO de "entrega concluída": a enum entrega_status (20260517) NÃO
--   tem 'entregue'/'concluida'. O ciclo é programada → em_transito →
--   recebida → conferida (ou cancelada). "Concluída" = chegou ao fim do
--   romaneio = status in ('recebida','conferida') E data_realizada is not
--   null (data efetiva do recebimento; é o sinal de fato).
--
-- JANELA: entre ~2 e ~9 dias após data_realizada. Dá um tempo de respiro
--   (não pede no dia) e dá folga pro cron diário pegar a entrega ~1x sem
--   correr risco de perder por causa de um dia sem rodar.
--
-- JÁ AVALIOU? corretora_avaliacoes (20261180) tem (corretora_id,
--   produtor_id) UNIQUE. NOT EXISTS por (corretora_id, produtor_id) =
--   esse produtor já avaliou essa corretora → não pede de novo.
--
-- Telefone do produtor: coalesce(produtores.whatsapp, profiles.phone) via
--   entregas.produtor_id (mesmo padrão de nudge_proposta_expiring).
--
-- DEDUP do dispatch: por (template_id, payload->>'entrega_id', ~30 dias)
--   — 1 pedido por entrega no máximo a cada 30 dias.
--
-- Padrão copiado de nudge_proposta_expiring / nudge_delivery_late
-- (20261220 / 20261310): template em notification_templates, dedup via
-- NOT EXISTS em message_dispatches por payload->>'entrega_id', insert de
-- dispatch (entregue depois por process_pending_dispatches), log em
-- system_events via fn_log_system_event. SECURITY DEFINER, search_path.
-- Idempotente: create or replace + on conflict do nothing + cron guard.
-- =================================================================

-- -----------------------------------------------------------------
-- Template (on conflict (channel, kind) do nothing)
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'pos_entrega_avaliacao',
   'Pós-entrega: pedir avaliação — produtor',
   'Oi {{produtor_nome}}, sua entrega com a {{corretora_nome}} foi concluída! '
   || 'Que tal avaliar a corretora no Milsaca? Leva 1 minuto. ⭐',
   null,
   '["produtor_nome","corretora_nome"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- Função — pede avaliação ao produtor após entrega concluída
-- -----------------------------------------------------------------
create or replace function public.nudge_pos_entrega_avaliacao() returns integer
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
   where channel = 'whatsapp' and kind = 'pos_entrega_avaliacao' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-pos-entrega-avaliacao.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with elegiveis as (
    select e.id            as entrega_id,
           e.corretora_id,
           e.produtor_id,
           c.name           as corretora_name,
           coalesce(pd.whatsapp, p.phone)    as produtor_phone,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.entregas e
      join public.corretoras c       on c.id = e.corretora_id
      left join public.profiles p    on p.id = e.produtor_id
      left join public.produtores pd on pd.profile_id = e.produtor_id
      -- "Concluída": status final do romaneio + data efetiva preenchida.
     where e.status in ('recebida','conferida')
       and e.data_realizada is not null
       -- Janela ~2..9 dias após a conclusão (folga pro cron diário).
       and e.data_realizada <= now()::date - 2
       and e.data_realizada >= now()::date - 9
       -- Produtor com telefone (senão não tem como mandar WhatsApp).
       and coalesce(pd.whatsapp, p.phone) is not null
       -- Produtor AINDA NÃO avaliou essa corretora.
       and not exists (
         select 1 from public.corretora_avaliacoes a
          where a.corretora_id = e.corretora_id
            and a.produtor_id  = e.produtor_id
       )
       -- Dedup por entrega: no máximo 1 pedido a cada ~30 dias por entrega.
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and (d.payload->>'entrega_id')::uuid = e.id
            and d.created_at > now() - interval '30 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, profile_id, corretora_id)
      select v_template_id, 'whatsapp', elegiveis.produtor_phone,
             jsonb_build_object(
               'entrega_id', elegiveis.entrega_id,
               'produtor_nome', elegiveis.produtor_nome,
               'corretora_nome', elegiveis.corretora_name
             ),
             elegiveis.produtor_id,
             elegiveis.corretora_id
        from elegiveis
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-pos-entrega-avaliacao.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-pos-entrega-avaliacao.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

-- Cron-only: nenhum usuário logado dispara a varredura (padrão das demais).
revoke all on function public.nudge_pos_entrega_avaliacao() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.nudge_pos_entrega_avaliacao() to service_role;
  end if;
end $$;

comment on function public.nudge_pos_entrega_avaliacao is
  'Pede ao produtor (WhatsApp) que avalie a corretora ~2..9 dias após entrega concluída (status recebida/conferida + data_realizada), se ele ainda não avaliou. Dedup por entrega (30d). Rodado por cron em dias úteis.';

-- -----------------------------------------------------------------
-- Cron — dias úteis às 13:00 BRT (16:00 UTC). Só agenda se pg_cron existir.
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-nudge-pos-entrega') then
      perform cron.unschedule('milsaca-nudge-pos-entrega');
    end if;
    perform cron.schedule(
      'milsaca-nudge-pos-entrega',
      '0 16 * * 1-5',
      $cron$select public.nudge_pos_entrega_avaliacao();$cron$
    );
  else
    raise notice 'pg_cron não instalado; nudge_pos_entrega_avaliacao criado mas não agendado.';
  end if;
end $$;
