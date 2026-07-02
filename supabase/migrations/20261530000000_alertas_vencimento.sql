-- =================================================================
-- Milsaca — F5: alertas de vencimento e obrigações
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Dois alertas novos sobre a infra de mensageria (F0):
--   1. alert_documentos_vencendo — documento (F1) com valido_ate em
--      30/7/0 dias avisa o DONO (corretora ou produtor) por WhatsApp.
--      Dedup por (documento_id, janela): cada janela dispara UMA vez.
--   2. alert_eudr_incompleto — lote EM NEGOCIAÇÃO (oferta enviada/aceita
--      ou contrato ativo) com checklist EUDR (F2) incompleto avisa a
--      corretora. Dedup semanal por lote.
--
-- Obs.: "contrato aguardando assinatura" (depende da F3) e régua de
-- cobrança (F4) entram quando essas fases existirem. Entrega atrasada e
-- trial expirado JÁ têm nudges próprios (20261220/20261260/20260612).
--
-- Templates inseridos já com meta_template_name (o seed da 20261470 só
-- cobriu os existentes à época) — registrar na Meta antes do go-live
-- (docs/milsaca/meta-templates-whatsapp.md).
--
-- Mesmo padrão das outras automações: template + CTE de elegíveis +
-- dedup via message_dispatches + fn_log_system_event + cron. SECURITY
-- DEFINER, cron-only (sem grant a authenticated). Idempotente.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Templates
-- -----------------------------------------------------------------
insert into public.notification_templates
  (channel, kind, name, body, subject, variables, meta_template_name) values
  ('whatsapp', 'documento_vencendo',
   'Documento vencendo — dono do documento',
   'Oi {{nome}}, atenção: o documento {{titulo}} ({{categoria}}) vence {{quando}}. Atualize no Milsaca pra não travar contratos e dossiês.',
   null,
   '["nome","titulo","categoria","quando"]'::jsonb,
   'milsaca_documento_vencendo'),
  ('whatsapp', 'eudr_incompleto',
   'Dossiê EUDR incompleto — corretora',
   'Oi {{corretora_nome}}, o lote {{lote_codigo}} está em negociação mas o dossiê EUDR tem pendências: {{pendencias}}. Resolva no painel pra não travar a venda pra exportação.',
   null,
   '["corretora_nome","lote_codigo","pendencias"]'::jsonb,
   'milsaca_eudr_incompleto')
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 2. alert_documentos_vencendo — janelas 30/7/0 dias
-- -----------------------------------------------------------------
create or replace function public.alert_documentos_vencendo() returns integer
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
   where channel = 'whatsapp' and kind = 'documento_vencendo' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.alert-doc-vencendo.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  with vencendo as (
    select d.id           as documento_id,
           d.titulo,
           d.categoria,
           d.valido_ate,
           d.corretora_id,
           (d.valido_ate - current_date) as janela,
           -- Dono: doc de tenant → corretora; doc de produtor → produtor.
           case when d.corretora_id is not null then c.phone
                else coalesce(pd.whatsapp, prof.phone) end as destino,
           case when d.corretora_id is not null then c.name
                else coalesce(prof.full_name, 'produtor') end as nome
      from public.documentos d
      left join public.corretoras c on c.id = d.corretora_id
      left join public.produtores pd
        on d.corretora_id is null
       and d.owner_kind = 'produtor'
       and pd.id = d.owner_id
      left join public.profiles prof on prof.id = pd.profile_id
     where d.deleted_at is null
       and d.valido_ate is not null
       and (d.valido_ate - current_date) in (30, 7, 0)
       and coalesce(
             case when d.corretora_id is not null then c.phone
                  else coalesce(pd.whatsapp, prof.phone) end, '') <> ''
       -- Dedup: cada (documento, janela) avisa UMA vez, pra sempre.
       and not exists (
         select 1 from public.message_dispatches md
          where md.template_id = v_template_id
            and (md.payload->>'documento_id')::uuid = d.id
            and (md.payload->>'janela')::int = (d.valido_ate - current_date)
       )
  ),
  inserted as (
    insert into public.message_dispatches
        (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'whatsapp', vencendo.destino,
             jsonb_build_object(
               'documento_id', vencendo.documento_id,
               'janela', vencendo.janela,
               'nome', vencendo.nome,
               'titulo', vencendo.titulo,
               'categoria', case vencendo.categoria::text
                 when 'car' then 'CAR'
                 when 'itr' then 'ITR'
                 when 'procuracao' then 'Procuração'
                 when 'certificado' then 'Certificado'
                 when 'nota_fiscal' then 'Nota fiscal'
                 when 'contrato_assinado' then 'Contrato assinado'
                 when 'dossie_eudr' then 'Dossiê EUDR'
                 else 'Documento' end,
               'quando', case vencendo.janela
                 when 0 then 'HOJE (' || to_char(vencendo.valido_ate, 'DD/MM/YYYY') || ')'
                 else 'em ' || vencendo.janela || ' dias ('
                      || to_char(vencendo.valido_ate, 'DD/MM/YYYY') || ')' end
             ),
             vencendo.corretora_id
        from vencendo
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.alert-doc-vencendo.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.alert-doc-vencendo.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 3. alert_eudr_incompleto — lote em negociação com checklist pendente
-- -----------------------------------------------------------------
create or replace function public.alert_eudr_incompleto() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_count integer := 0;
  v_lote record;
  v_check jsonb;
  v_pendencias text;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'eudr_incompleto' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.alert-eudr-incompleto.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  -- Loop (não CTE): eudr_checklist é por lote e o volume elegível é
  -- pequeno (lotes em negociação SEM dispatch na última semana).
  for v_lote in
    select l.id, l.codigo, l.corretora_id, c.phone, c.name as corretora_name
      from public.lotes l
      join public.corretoras c on c.id = l.corretora_id
     where c.phone is not null
       and (
         exists (select 1 from public.ofertas_comprador o
                  where o.lote_id = l.id and o.status in ('enviada', 'aceita'))
         or exists (select 1 from public.contratos ct
                     where ct.lote_id = l.id and ct.status = 'ativo')
       )
       and not exists (
         select 1 from public.message_dispatches md
          where md.template_id = v_template_id
            and (md.payload->>'lote_id')::uuid = l.id
            and md.created_at > now() - interval '7 days'
       )
  loop
    v_check := public.eudr_checklist(v_lote.id);
    if coalesce((v_check->>'completo')::boolean, false) then
      continue;
    end if;

    select string_agg(
             case i->>'key'
               when 'produtor_cadastrado' then 'cadastro do produtor'
               when 'cpf_cnpj' then 'CPF/CNPJ'
               when 'car_numero' then 'nº do CAR'
               when 'car_documento' then 'documento do CAR'
               when 'talhao_vinculado' then 'talhão vinculado'
               when 'talhoes_georreferenciados' then 'geolocalização dos talhões'
               when 'safra' then 'safra'
               else i->>'key' end,
             ', ')
      into v_pendencias
      from jsonb_array_elements(v_check->'itens') i
     where (i->>'ok')::boolean = false;

    insert into public.message_dispatches
        (template_id, channel, recipient, payload, corretora_id)
    values (
      v_template_id, 'whatsapp', v_lote.phone,
      jsonb_build_object(
        'lote_id', v_lote.id,
        'corretora_nome', v_lote.corretora_name,
        'lote_codigo', v_lote.codigo,
        'pendencias', coalesce(v_pendencias, 'pendências no checklist')
      ),
      v_lote.corretora_id
    );
    v_count := v_count + 1;
  end loop;

  perform public.fn_log_system_event(
    'cron.alert-eudr-incompleto.run', 'success',
    jsonb_build_object('dispatched_count', v_count)
  );
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.alert-eudr-incompleto.run', 'failed', '{}'::jsonb, sqlerrm
  );
  raise;
end;
$$;

-- Sem grant pra authenticated: cron-only.

-- -----------------------------------------------------------------
-- 4. Schedules — horários espaçados dos nudges existentes (11/12/13/14 UTC)
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-alert-doc-vencendo') then
      perform cron.unschedule('milsaca-alert-doc-vencendo');
    end if;
    perform cron.schedule(
      'milsaca-alert-doc-vencendo',
      '15 11 * * *',  -- 08:15 BRT, diário
      $cron$select public.alert_documentos_vencendo();$cron$
    );

    if exists (select 1 from cron.job where jobname = 'milsaca-alert-eudr-incompleto') then
      perform cron.unschedule('milsaca-alert-eudr-incompleto');
    end if;
    perform cron.schedule(
      'milsaca-alert-eudr-incompleto',
      '45 11 * * *',  -- 08:45 BRT, diário
      $cron$select public.alert_eudr_incompleto();$cron$
    );
  else
    raise notice 'pg_cron não instalado; alertas F5 criados mas não agendados.';
  end if;
end $$;
