-- =================================================================
-- Milsaca — Automação: "Reengajar produtor inativo"
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Win-back leve: produtor que NÃO acessa o app há ~30 dias recebe 1
-- WhatsApp gentil de reengajamento ("as cotações mudaram, dá uma
-- olhada"). Baixa frequência (1x/semana de cron) e dedup LONGO (~60
-- dias) pra NÃO incomodar quem já foi cutucado recentemente.
--
-- COMO IDENTIFICAMOS "PRODUTOR":
--   linha em public.produtores (profile_id not null unique → 1 por
--   produtor). Mesmo critério canônico de send_quote_digest /
--   nudge_price_swing. Não dependemos de profiles.role nem do array
--   profiles.roles (ambíguos com multi-role); a presença em produtores
--   é a verdade. Telefone: coalesce(produtores.whatsapp, profiles.phone).
--
-- COMO MEDIMOS "INATIVIDADE":
--   auth.users.last_sign_in_at. Esta função é SECURITY DEFINER e roda
--   como owner, que pode ler o schema auth. Com search_path=public a
--   tabela é referenciada qualificada (auth.users). Critério:
--     last_sign_in_at IS NOT NULL  (quem NUNCA logou é outro caso —
--                                   onboarding, não win-back — pulamos)
--     last_sign_in_at < now() - (inactive_producer_days dias).
--
-- LIMITE DE SEGURANÇA: no máximo 200 produtores por execução (evita
--   rajada de WhatsApp), ordenando por last_sign_in_at ASC (os mais
--   inativos primeiro). Os demais entram nas próximas semanas.
--
-- Mesmo padrão das outras automações do Milsaca:
--   - setting configurável em platform_settings (on conflict do nothing)
--   - template em notification_templates (on conflict (channel,kind) do nothing)
--   - função SECURITY DEFINER, set search_path = public
--   - dispatch enfileirado em message_dispatches (entregue depois por
--     process_pending_dispatches), log via fn_log_system_event
--   - dedup via NOT EXISTS em message_dispatches
--   - revoke all from public + grant service_role
--   - cron com bloco do(...) padrão (unschedule-if-exists + schedule),
--     só se o schema cron existir
--   - idempotente: create or replace + insert on conflict + add column if not exists
--
-- DEFENSIVO: produtores.whatsapp pertence à automação irmã
-- send_quote_digest; adicionamos com "add column if not exists" pra
-- esta migration ser auto-suficiente.
-- =================================================================

-- -----------------------------------------------------------------
-- 0. Coluna whatsapp do produtor (defensivo — ver header)
-- -----------------------------------------------------------------
alter table public.produtores
  add column if not exists whatsapp text;

-- -----------------------------------------------------------------
-- 1. Setting configurável: dias sem login pra considerar inativo
-- -----------------------------------------------------------------
insert into public.platform_settings (key, value, description)
values (
  'inactive_producer_days',
  '30'::jsonb,
  'Dias sem login (auth.users.last_sign_in_at) pra considerar um produtor '
  'inativo e elegível ao WhatsApp de reengajamento (cron '
  'reengajar_produtor_inativo). Default 30.'
)
on conflict (key) do nothing;

-- -----------------------------------------------------------------
-- 2. Template whatsapp / reengajamento_produtor
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'reengajamento_produtor',
   'Reengajamento — produtor inativo',
   'Oi {{nome}}, faz um tempo que você não dá uma olhada no Milsaca. '
   'As cotações do café mudaram — vale conferir os preços e suas negociações. ☕',
   null,
   '["nome"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 3. reengajar_produtor_inativo — 1 dispatch por produtor inativo elegível
-- -----------------------------------------------------------------
create or replace function public.reengajar_produtor_inativo() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_days        integer;
  v_limit       integer := 200;  -- teto de segurança por execução
  v_count       integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'reengajamento_produtor' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.reengajar-produtor-inativo.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found'));
    return 0;
  end if;

  v_days := coalesce(
    (select (value #>> '{}')::integer from public.platform_settings
      where key = 'inactive_producer_days'),
    30
  );

  -- Produtores inativos elegíveis: têm linha em produtores, já logaram
  -- pelo menos uma vez (last_sign_in_at not null), e o último login foi
  -- há mais de v_days dias. Telefone não-nulo. Dedup LONGO (~60 dias):
  -- no máximo 1 reengajamento por produtor a cada 60 dias. Teto de 200,
  -- mais inativos primeiro (last_sign_in_at asc).
  with elegiveis as (
    select pr.profile_id,
           coalesce(nullif(pr.whatsapp, ''), p.phone) as recipient,
           coalesce(p.full_name, 'produtor')          as nome
      from public.produtores pr
      join public.profiles p  on p.id = pr.profile_id
      join auth.users u       on u.id = pr.profile_id
     where u.last_sign_in_at is not null
       and u.last_sign_in_at < now() - make_interval(days => v_days)
       and coalesce(nullif(pr.whatsapp, ''), p.phone) is not null
       and coalesce(nullif(pr.whatsapp, ''), p.phone) <> ''
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.profile_id = pr.profile_id
            and d.created_at > now() - interval '60 days'
       )
     order by u.last_sign_in_at asc
     limit v_limit
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
    'cron.reengajar-produtor-inativo.run', 'success',
    jsonb_build_object(
      'dispatched_count', v_count,
      'inactive_days', v_days,
      'limit', v_limit
    ));
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.reengajar-produtor-inativo.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

comment on function public.reengajar_produtor_inativo is
  'Win-back leve: produtor (linha em produtores) que já logou mas cujo '
  'auth.users.last_sign_in_at é mais antigo que inactive_producer_days '
  'recebe 1 WhatsApp de reengajamento. Dedup longo (template, profile, '
  '60 dias), teto de 200/execução (mais inativos primeiro). Roda 1x/semana.';

-- -----------------------------------------------------------------
-- 4. Permissões: só o cron (postgres/service_role) — não authenticated/anon/public.
-- -----------------------------------------------------------------
revoke all on function public.reengajar_produtor_inativo() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.reengajar_produtor_inativo() to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 5. Cron: 0 14 * * 2 (= 11:00 BRT, UTC-3) toda terça. 1x/semana basta
--    pra um win-back de baixa frequência. Só agenda se o schema cron existir.
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-reengajar-produtor') then
      perform cron.unschedule('milsaca-reengajar-produtor');
    end if;
    perform cron.schedule(
      'milsaca-reengajar-produtor',
      '0 14 * * 2',
      $cron$select public.reengajar_produtor_inativo();$cron$
    );
  else
    raise notice 'pg_cron não instalado; reengajar_produtor_inativo criado mas não agendado.';
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: setting + template + função + cron de win-back.
-- Nada destrutivo.
-- =================================================================
