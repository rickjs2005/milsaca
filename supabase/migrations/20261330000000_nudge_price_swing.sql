-- =================================================================
-- Milsaca — Automação: nudge de movimento brusco de preço
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- "Movimento brusco de preço" — quando uma cotação de mercado se move
-- muito num dia (|variação no dia| >= price_swing_pct), avisa por
-- WhatsApp os PRODUTORES que optaram por receber notícias de cotação
-- (produtores.quote_digest_optin = true).
--
-- Irmã de send_quote_digest (mesmo opt-in quote_digest_optin / mesmo
-- whatsapp do produtor). Mesmo padrão das outras automações do Milsaca:
--   - template em notification_templates (on conflict (channel,kind) do nothing)
--   - setting configurável em platform_settings
--   - função SECURITY DEFINER, set search_path = public
--   - dispatch enfileirado em message_dispatches (entregue depois por
--     process_pending_dispatches), log via fn_log_system_event
--   - dedup via NOT EXISTS em message_dispatches
--   - revoke execute de public + grant service_role
--   - cron com bloco do(...) padrão (unschedule-if-exists + schedule),
--     só se o schema cron existir
--   - idempotente: create or replace + insert on conflict + add column if not exists
--
-- DETECÇÃO DA VARIAÇÃO DO DIA (por símbolo, só cotação fresca):
--   - market_quotes guarda 1 linha por (source, symbol) = a mais recente.
--   - Quando market_quotes.variation_pct NÃO for null (ex.: ice_us/KC.F,
--     às vezes bcb_ptax), usamos ela direto.
--   - Quando for null (típico do cepea_esalq), calculamos a variação
--     dia-a-dia a partir de market_quotes_history: comparamos o último
--     ponto (mais recente) com o ponto do dia anterior disponível
--     ((novo - anterior)/anterior * 100), no preço da unidade da fonte
--     (price_brl_cents OU price_usd_cents).
--   - "Fresca" = market_quotes.fetched_at nas últimas ~36h (mesmo limiar
--     do check_market_quotes_stale).
--
-- DEFENSIVO: as colunas produtores.whatsapp e produtores.quote_digest_optin
-- pertencem à automação irmã send_quote_digest. Adicionamos aqui com
-- "add column if not exists" pra esta migration ser auto-suficiente e
-- compilar/rodar mesmo que seja aplicada antes da irmã. Fallback de
-- telefone: produtores.whatsapp, senão profiles.phone.
-- =================================================================

-- -----------------------------------------------------------------
-- 0. Colunas de opt-in / whatsapp do produtor (defensivo — ver header)
-- -----------------------------------------------------------------
alter table public.produtores
  add column if not exists whatsapp text;
alter table public.produtores
  add column if not exists quote_digest_optin boolean not null default false;

-- -----------------------------------------------------------------
-- 1. Setting configurável: % mínimo de variação no dia pra disparar
-- -----------------------------------------------------------------
insert into public.platform_settings (key, value, description)
values (
  'price_swing_pct',
  '5'::jsonb,
  'Variação percentual mínima (em módulo) de uma cotação de mercado no dia '
  'pra disparar o nudge de movimento brusco (cron nudge_price_swing). '
  'Default 5 (= 5%).'
)
on conflict (key) do nothing;

-- -----------------------------------------------------------------
-- 2. Template whatsapp / cotacao_movimento
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'cotacao_movimento',
   'Movimento brusco de cotação — produtor',
   'Atenção, {{nome}}! Movimento forte no café: {{detalhe}}. Veja no Milsaca.',
   null,
   '["nome","detalhe"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 3. nudge_price_swing — detecta swing e enfileira 1 dispatch/produtor opt-in
-- -----------------------------------------------------------------
create or replace function public.nudge_price_swing() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_threshold   numeric;
  v_fresh_cutoff timestamptz := now() - interval '36 hours';
  q             record;
  v_var_pct     numeric;
  v_prev        numeric;
  v_curr        numeric;
  v_label       text;
  v_unit        text;        -- 'brl' | 'usd'
  v_price_val   numeric;     -- preço atual na unidade da fonte (já em R$/US$, não cents)
  v_price_txt   text;
  v_detalhe     text;
  v_partes      text[] := '{}';
  v_detalhe_all text;
  v_count       integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'cotacao_movimento' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-price-swing.run', 'skipped',
      jsonb_build_object('reason', 'template_not_found'));
    return 0;
  end if;

  v_threshold := coalesce(
    (select (value #>> '{}')::numeric from public.platform_settings
      where key = 'price_swing_pct'),
    5
  );

  -- Percorre as cotações de mercado frescas (1 linha por source/symbol).
  for q in
    select source, symbol, price_brl_cents, price_usd_cents, variation_pct
      from public.market_quotes
     where fetched_at >= v_fresh_cutoff
  loop
    -- Rótulo legível + unidade preferida da fonte (não inventar unidade).
    if q.symbol ilike '%arabica%' then
      v_label := 'Arábica CEPEA'; v_unit := 'brl';
    elsif q.symbol ilike '%conilon%' or q.symbol ilike '%robusta%' then
      v_label := 'Conilon CEPEA'; v_unit := 'brl';
    elsif q.source = 'ice_us' or q.symbol = 'KC.F' then
      v_label := 'Arábica ICE NY'; v_unit := 'usd';
    elsif q.source = 'ice_eu' or q.symbol = 'RC.F' then
      v_label := 'Robusta ICE EU'; v_unit := 'usd';
    elsif q.source = 'bcb_ptax' or q.symbol = 'USDBRL' then
      v_label := 'Dólar PTAX'; v_unit := 'brl';
    else
      -- Fonte desconhecida: rótulo genérico, escolhe a unidade que tem preço.
      v_label := initcap(replace(q.symbol, '_', ' '));
      v_unit  := case when q.price_brl_cents is not null then 'brl' else 'usd' end;
    end if;

    -- Variação do dia: usa variation_pct quando existir; senão history.
    v_var_pct := q.variation_pct;

    if v_var_pct is null then
      -- Calcula day-over-day a partir do histórico (último x dia anterior),
      -- na unidade da fonte. v_curr = ponto mais recente; v_prev = o anterior.
      select case when v_unit = 'usd' then price_usd_cents else price_brl_cents end
        into v_curr
        from public.market_quotes_history
       where source = q.source and symbol = q.symbol
         and case when v_unit = 'usd' then price_usd_cents else price_brl_cents end is not null
       order by captured_date desc
       limit 1;

      select case when v_unit = 'usd' then price_usd_cents else price_brl_cents end
        into v_prev
        from public.market_quotes_history
       where source = q.source and symbol = q.symbol
         and case when v_unit = 'usd' then price_usd_cents else price_brl_cents end is not null
       order by captured_date desc
       offset 1 limit 1;

      if v_curr is null or v_prev is null or v_prev = 0 then
        continue; -- sem base pra calcular variação
      end if;
      v_var_pct := ((v_curr - v_prev) / v_prev) * 100.0;
    end if;

    -- Bateu o limiar (em módulo)?
    if v_var_pct is null or abs(v_var_pct) < v_threshold then
      continue;
    end if;

    -- Preço atual (na unidade da fonte) pra montar o detalhe.
    v_price_val := case when v_unit = 'usd'
                        then q.price_usd_cents / 100.0
                        else q.price_brl_cents / 100.0 end;
    if v_price_val is null then
      continue;
    end if;

    v_price_txt := translate(to_char(v_price_val, 'FM999G999G990D00'), '.,', ',.');

    -- Ex.: "Arábica CEPEA R$ 1.412,22/sc (-6,2% hoje)"
    v_detalhe := v_label || ' '
              || case when v_unit = 'usd' then 'US$ ' else 'R$ ' end
              || v_price_txt
              || case
                   when v_unit = 'usd' and (q.source = 'ice_us' or q.source = 'ice_eu') then '/lb'
                   when v_unit = 'brl' and (q.source = 'bcb_ptax') then ''
                   else '/sc'
                 end
              || ' ('
              || case when v_var_pct >= 0 then '+' else '' end
              || translate(to_char(v_var_pct, 'FM990D0'), '.,', ',.')
              || '% hoje)';

    v_partes := v_partes || v_detalhe;
  end loop;

  -- Nada bateu o limiar → return 0 (log skipped).
  if array_length(v_partes, 1) is null then
    perform public.fn_log_system_event(
      'cron.nudge-price-swing.run', 'skipped',
      jsonb_build_object('reason', 'no_swing', 'threshold_pct', v_threshold));
    return 0;
  end if;

  -- Junta os movimentos do dia num único detalhe (separados por "; ").
  v_detalhe_all := array_to_string(v_partes, '; ');

  -- Enfileira 1 dispatch por produtor opt-in com whatsapp não-nulo.
  -- Dedup por (template_id, profile_id, ~20h) — não repete no mesmo dia.
  with destinatarios as (
    select pr.profile_id,
           coalesce(nullif(pr.whatsapp, ''), p.phone) as recipient,
           coalesce(p.full_name, 'produtor')          as nome
      from public.produtores pr
      join public.profiles p on p.id = pr.profile_id
     where pr.quote_digest_optin = true
       and coalesce(nullif(pr.whatsapp, ''), p.phone) is not null
       and coalesce(nullif(pr.whatsapp, ''), p.phone) <> ''
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.profile_id = pr.profile_id
            and d.created_at > now() - interval '20 hours'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, profile_id)
      select v_template_id, 'whatsapp', destinatarios.recipient,
             jsonb_build_object(
               'nome', destinatarios.nome,
               'detalhe', v_detalhe_all
             ),
             destinatarios.profile_id
        from destinatarios
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-price-swing.run', 'success',
    jsonb_build_object(
      'dispatched_count', v_count,
      'swings', array_length(v_partes, 1),
      'threshold_pct', v_threshold,
      'detalhe', v_detalhe_all
    ));
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-price-swing.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

comment on function public.nudge_price_swing is
  'Detecta cotação de mercado fresca (fetched_at < 36h) com |variação no dia| '
  '>= price_swing_pct (usa market_quotes.variation_pct, ou day-over-day via '
  'market_quotes_history quando null) e enfileira 1 WhatsApp por produtor '
  'opt-in (quote_digest_optin). Dedup (template, profile, 20h). Roda à tarde, '
  'dias úteis.';

-- -----------------------------------------------------------------
-- 4. Permissões: só o cron (postgres/service_role) — não authenticated/anon/public.
-- -----------------------------------------------------------------
revoke all on function public.nudge_price_swing() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.nudge_price_swing() to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 5. Cron: 30 21 * * 1-5 (= 18:30 BRT), à tarde após o fechamento, dias úteis.
--    Só agenda se o schema cron existir.
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-nudge-price-swing') then
      perform cron.unschedule('milsaca-nudge-price-swing');
    end if;
    perform cron.schedule(
      'milsaca-nudge-price-swing',
      '30 21 * * 1-5',
      $cron$select public.nudge_price_swing();$cron$
    );
  else
    raise notice 'pg_cron não instalado; nudge_price_swing criado mas não agendado.';
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: setting + template + função + cron de detecção de swing.
-- Nada destrutivo.
-- =================================================================
