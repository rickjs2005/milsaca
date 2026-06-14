-- =================================================================
-- Milsaca — Resumo diário de cotações no WhatsApp do produtor (opt-in)
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- De manhã (08:00 BRT, dias úteis). Só produtores que ativarem
-- (produtores.quote_digest_optin = true). Enfileira em message_dispatches
-- (entrega real depende de provider; hoje stub). Idempotente.
-- =================================================================

-- 1) Opt-in por produtor (default false = ninguém recebe até ativar)
alter table public.produtores
  add column if not exists quote_digest_optin boolean not null default false;

comment on column public.produtores.quote_digest_optin is
  'Produtor optou por receber o resumo diário de cotações no WhatsApp (cron send_quote_digest). Default false.';

-- 2) Template (variáveis: nome, resumo). Resumo dinâmico montado na função.
insert into public.notification_templates (channel, kind, name, body, subject, variables)
values (
  'whatsapp', 'resumo_cotacoes',
  'Resumo diário de cotações — produtor',
  'Bom dia, {{nome}}! Café hoje:' || chr(10) || '{{resumo}}' || chr(10) || chr(10) || 'Acompanhe tudo no Milsaca.',
  null,
  '["nome","resumo"]'::jsonb
)
on conflict (channel, kind) do nothing;

-- 3) Função: monta o resumo das últimas cotações e enfileira p/ cada produtor opt-in
create or replace function public.send_quote_digest() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_resumo text;
  v_newest timestamptz;
  v_count integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'resumo_cotacoes' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.send-quote-digest.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found'));
    return 0;
  end if;

  select string_agg(line, chr(10) order by ord), max(fetched_at)
    into v_resumo, v_newest
  from (
    select
      case
        when source='cepea_esalq' and symbol='arabica_bica_corrida_esalq' then 1
        when source='cepea_esalq' and symbol='conilon_es_esalq' then 2
        when source='ice_us' and symbol='KC.F' then 3
        when source='bcb_ptax' and symbol='USDBRL' then 4
      end as ord,
      case
        when source='cepea_esalq' and symbol='arabica_bica_corrida_esalq'
          then '- Arábica (CEPEA): R$ ' || translate(to_char(price_brl_cents::numeric/100,'FM999G999G990D00'),'.,',',.') || '/sc'
        when source='cepea_esalq' and symbol='conilon_es_esalq'
          then '- Conilon (CEPEA): R$ ' || translate(to_char(price_brl_cents::numeric/100,'FM999G999G990D00'),'.,',',.') || '/sc'
        when source='ice_us' and symbol='KC.F'
          then '- ICE NY: ' || price_usd_cents::text || ' US cents/lb'
               || coalesce(' (' || case when variation_pct > 0 then '+' else '' end
                    || translate(to_char(variation_pct,'FM990D0'),'.,',',.') || '%)', '')
        when source='bcb_ptax' and symbol='USDBRL'
          then '- Dólar: R$ ' || translate(to_char(price_brl_cents::numeric/100,'FM990D00'),'.,',',.')
      end as line,
      fetched_at
    from public.market_quotes
    where (source='cepea_esalq' and symbol in ('arabica_bica_corrida_esalq','conilon_es_esalq'))
       or (source='ice_us' and symbol='KC.F')
       or (source='bcb_ptax' and symbol='USDBRL')
  ) t
  where line is not null;

  if v_resumo is null or v_newest is null or v_newest < now() - interval '36 hours' then
    perform public.fn_log_system_event(
      'cron.send-quote-digest.run', 'skipped',
      jsonb_build_object('reason', 'no_fresh_quotes', 'newest', v_newest));
    return 0;
  end if;

  with elig as (
    select pr.profile_id, pr.whatsapp, coalesce(p.full_name, 'produtor') as nome
      from public.produtores pr
      join public.profiles p on p.id = pr.profile_id
     where pr.quote_digest_optin = true
       and pr.whatsapp is not null and pr.whatsapp <> ''
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.profile_id = pr.profile_id
            and d.created_at > now() - interval '20 hours'
       )
  ),
  ins as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, profile_id)
      select v_template_id, 'whatsapp', elig.whatsapp,
             jsonb_build_object('nome', elig.nome, 'resumo', v_resumo),
             elig.profile_id
        from elig
    returning id
  )
  select count(*) into v_count from ins;

  perform public.fn_log_system_event(
    'cron.send-quote-digest.run', 'success',
    jsonb_build_object('dispatched_count', v_count));
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.send-quote-digest.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

revoke all on function public.send_quote_digest() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.send_quote_digest() to service_role;
  end if;
end $$;

-- 4) Cron: 08:00 BRT (11:00 UTC), dias úteis.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-send-quote-digest') then
      perform cron.unschedule('milsaca-send-quote-digest');
    end if;
    perform cron.schedule(
      'milsaca-send-quote-digest',
      '0 11 * * 1-5',
      $cron$select public.send_quote_digest();$cron$
    );
  end if;
end $$;
