-- =================================================================
-- Milsaca — nudge_stale_leads mede ÚLTIMA INTERAÇÃO REAL (auditoria 2ª onda, a)
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- PROBLEMA: nudge_stale_leads() considerava "parado" um lead cujo
--   coalesce(leads.updated_at, leads.created_at) < now() - 3 dias. Mas
--   leads.updated_at NÃO acompanha a conversa: um comentário, um evento de
--   timeline (lead_events) ou uma proposta nova num lead NÃO necessariamente
--   tocam leads.updated_at. Resultado: FALSO NEGATIVO — lead com atividade
--   recente (evento/proposta) ainda assim contava como "parado há 3 dias" e
--   gerava nudge desnecessário; e o inverso também (um update administrativo
--   irrelevante em leads "rejuvenescia" o lead sem haver interação real).
--
-- FIX: o "last touched" passa a ser o MAIS RECENTE entre:
--   - leads.updated_at / created_at (sinal antigo, mantido como piso);
--   - o último lead_events.created_at do lead (timeline real: comentário,
--     contraproposta, mudança de etapa — tudo grava em lead_events);
--   - a última proposta do lead (propostas.updated_at/created_at).
--   Só dispara o nudge se TODAS essas fontes estiverem > 3 dias atrás.
--
-- Sem mudança de schema, de cron, de template, de dedup nem de payload —
-- só o critério de "parado" ficou correto. create or replace, idempotente.
-- SECURITY DEFINER + set search_path = public (igual ao original).
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
  -- timeline (lead_events) e a última proposta. Se QUALQUER uma delas for
  -- recente (< 3 dias), o lead NÃO está parado.
  with stale as (
    select l.id as lead_id,
           l.corretora_id,
           c.phone as corretora_phone,
           c.name  as corretora_name,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.leads l
      join public.corretoras c on c.id = l.corretora_id
      left join public.profiles p on p.id = l.produtor_id
     where l.status = 'em_negociacao'
       and c.phone is not null
       -- last touched = max(lead, último evento, última proposta) < now()-3d
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
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.lead_id = l.id
            and d.created_at > now() - interval '6 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id, lead_id)
      select v_template_id, 'whatsapp', stale.corretora_phone,
             jsonb_build_object(
               'corretora_nome', stale.corretora_name,
               'produtor_nome', stale.produtor_nome
             ),
             stale.corretora_id,
             stale.lead_id
        from stale
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
-- Done. Só o critério de "parado" mudou (passa a olhar interação real).
-- Grant/execução inalterados (create or replace preserva).
-- =================================================================
