-- =================================================================
-- Milsaca — Automação: "Onboarding incompleto — incentiva o PRODUTOR a terminar"
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Produtor que se cadastrou há alguns dias mas NÃO deu o passo essencial
-- pra começar a vender recebe 1 WhatsApp gentil incentivando a terminar.
--
-- CRITÉRIO DE "ONBOARDING INCOMPLETO" (confirmado no schema real, não inventado):
--   O produtor já tem profile + linha em `produtores` (o onboarding em
--   apps/web/src/app/onboarding/produtor/_actions.ts faz o upsert em
--   `produtores` + grava phone no profile). O que falta pra ele realmente
--   "começar a vender" é ter algo concreto a negociar:
--     - NENHUM lote cadastrado  → `lotes.produtor_id`   (= profiles.id) ausente; E
--     - NENHUM lead/negociação  → `leads.produtor_id`   (= profiles.id) ausente.
--   `lotes` é o estoque/safra do produtor (peso_sacas, safra, specie — ver
--   20260515020000). `leads` é a negociação com corretora (ver 20260514000000).
--   Ambas as colunas produtor_id referenciam profiles.id, então o vínculo é
--   pelo produtores.profile_id. "Incompleto" = sem lote E sem lead.
--   (Se só um dos sinais existisse no schema, usaríamos "sem lead" como proxy;
--    aqui os DOIS existem, então exigimos a ausência dos dois — sinal mais forte.)
--
-- JANELA: produtor criado entre ~3 e ~14 dias atrás (produtores.created_at).
--   < 3 dias é cedo demais (ainda explorando); > 14 dias já esfriou — 1 toque só.
--
-- Mesmo padrão das outras automações (send_quote_digest / nudge_price_swing /
-- nudge_proposta_recebida):
--   - template em notification_templates (on conflict (channel,kind) do nothing)
--   - função SECURITY DEFINER, set search_path = public
--   - dispatch enfileirado em message_dispatches (entregue depois por
--     process_pending_dispatches), log via fn_log_system_event
--   - dedup via NOT EXISTS em message_dispatches por (template_id, profile_id, ~30d)
--     → manda no máximo 1x por produtor (toque único)
--   - telefone: coalesce(produtores.whatsapp, profiles.phone)
--   - revoke execute de public + grant service_role (cron-only)
--   - cron com bloco do(...) padrão (unschedule-if-exists + schedule), só se
--     o schema cron existir
--   - idempotente: create or replace + insert on conflict do nothing
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Template whatsapp / onboarding_incompleto
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'onboarding_incompleto',
   'Onboarding incompleto — produtor',
   'Oi {{nome}}, vi que você começou seu cadastro no Milsaca mas ainda falta '
   'um passo pra começar a vender seu café. Leva 2 minutos — qualquer dúvida, '
   'é só chamar!',
   null,
   '["nome"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 2. nudge_onboarding_incompleto — 1 WhatsApp por produtor com cadastro pela metade
-- -----------------------------------------------------------------
create or replace function public.nudge_onboarding_incompleto() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_count       integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'onboarding_incompleto' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-onboarding-incompleto.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found'));
    return 0;
  end if;

  -- Elegíveis: produtor criado entre ~3 e ~14 dias atrás, SEM lote E SEM lead,
  -- com telefone. Dedup por (template, profile, ~30d) → toque único.
  with elegiveis as (
    select pr.profile_id,
           coalesce(nullif(pr.whatsapp, ''), p.phone) as recipient,
           coalesce(p.full_name, 'produtor')          as nome
      from public.produtores pr
      join public.profiles p on p.id = pr.profile_id
     where pr.created_at <= now() - interval '3 days'
       and pr.created_at >= now() - interval '14 days'
       and coalesce(nullif(pr.whatsapp, ''), p.phone) is not null
       and coalesce(nullif(pr.whatsapp, ''), p.phone) <> ''
       -- sem nenhum lote (estoque/safra) cadastrado
       and not exists (
         select 1 from public.lotes l
          where l.produtor_id = pr.profile_id
       )
       -- sem nenhum lead/negociação
       and not exists (
         select 1 from public.leads le
          where le.produtor_id = pr.profile_id
       )
       -- dedup: nunca mandado (ou não nos últimos ~30 dias) pra este produtor
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.profile_id = pr.profile_id
            and d.created_at > now() - interval '30 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, profile_id)
      select v_template_id, 'whatsapp', elegiveis.recipient,
             jsonb_build_object('nome', elegiveis.nome),
             elegiveis.profile_id
        from elegiveis
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-onboarding-incompleto.run', 'success',
    jsonb_build_object('dispatched_count', v_count));
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-onboarding-incompleto.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

comment on function public.nudge_onboarding_incompleto is
  'Enfileira 1 WhatsApp por produtor criado entre 3 e 14 dias atrás que ainda '
  'não cadastrou nenhum lote (lotes.produtor_id) E não tem nenhum lead '
  '(leads.produtor_id) — onboarding incompleto. Telefone coalesce(produtores.'
  'whatsapp, profiles.phone). Dedup (template, profile, 30d) = toque único. '
  'Roda 14:00 BRT, dias úteis.';

-- -----------------------------------------------------------------
-- 3. Permissões: só o cron (postgres/service_role) — não authenticated/anon/public.
-- -----------------------------------------------------------------
revoke all on function public.nudge_onboarding_incompleto() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.nudge_onboarding_incompleto() to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 4. Cron: 0 17 * * 1-5 (= 14:00 BRT, UTC-3), dias úteis.
--    Só agenda se o schema cron existir.
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-onboarding-incompleto') then
      perform cron.unschedule('milsaca-onboarding-incompleto');
    end if;
    perform cron.schedule(
      'milsaca-onboarding-incompleto',
      '0 17 * * 1-5',
      $cron$select public.nudge_onboarding_incompleto();$cron$
    );
  else
    raise notice 'pg_cron não instalado; nudge_onboarding_incompleto criado mas não agendado.';
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: template + função + cron. Nada destrutivo.
-- =================================================================
