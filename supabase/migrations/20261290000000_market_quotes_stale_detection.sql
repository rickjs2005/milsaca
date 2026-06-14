-- =================================================================
-- Milsaca — detecção server-side de cotação automática velha + persistir
--           falha de fonte pra alertar (auditoria 2ª onda, itens b e c)
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- CONTEXTO (achados da 2ª onda):
--   (b) Falha de fonte de cotação não era persistida nem alertada. O trigger
--       tg_track_quote_source_market só LIMPA last_error_at/last_error_message
--       (em caso de sucesso); ninguém nunca os ESCREVE. Logo
--       check_queue_failures (que conta system_events 'failed') nunca dispara
--       por causa de cotação, e o painel /admin/cotacoes/fontes nunca mostra
--       erro de fonte.
--   (c) market_quotes (cotações AUTOMÁTICAS) velhas não tinham detecção
--       server-side — só comentário/frontend. Se uma fonte para de atualizar
--       (ex.: scraping quebrou), ninguém é avisado server-side.
--
-- SOLUÇÃO (toda no banco — independe de redeploy da edge sync-cotacoes):
--   1. record_quote_source_error(slug, message) — RPC SECURITY DEFINER que a
--      edge (quando redeployada) PODE chamar pra persistir a falha de uma
--      fonte: grava last_error_at/last_error_message em quote_sources e loga
--      um system_event 'failed' (assim check_queue_failures enxerga). Não
--      depende dela existir hoje — é aditiva e segura.
--   2. check_market_quotes_stale() — cron que detecta fontes AUTOMÁTICAS
--      ativas (quote_sources.type='automatic') cujo market_quotes mais recente
--      está velho (sem fetch fresco há > N horas, default 30h, configurável).
--      Marca last_error_at/last_error_message na fonte E loga UM system_event
--      'failed' (com anti-flood) — fechando a cadeia até check_queue_failures.
--      Isso cobre (c) sem depender da edge: mesmo que a edge falhe em silêncio
--      (Promise.allSettled engole), a ausência de dado fresco é detectada.
--
-- Threshold default = 30h: as fontes automáticas rodam 12:00 e 21:00 UTC em
-- dias úteis (cron milsaca-sync-cotacoes). 30h tolera a janela noturna e o
-- fim de semana NÃO é coberto porque o stale só conta dias úteis (ver filtro
-- de dow). Idempotente: create or replace + insert on conflict + unschedule.
-- =================================================================

-- -----------------------------------------------------------------
-- 0. Setting do threshold (horas sem fetch fresco até considerar stale)
-- -----------------------------------------------------------------
insert into public.platform_settings (key, value, description)
values (
  'market_quotes_stale_hours',
  '30'::jsonb,
  'Horas sem market_quotes.fetched_at fresco até uma fonte automática ser '
  'considerada velha (cron check_market_quotes_stale). Default 30h cobre a '
  'janela entre os syncs diários (12:00 e 21:00 UTC).'
)
on conflict (key) do nothing;

-- -----------------------------------------------------------------
-- 1. record_quote_source_error — persiste falha de fonte + loga evento
-- -----------------------------------------------------------------
-- Chamável pela edge sync-cotacoes (service_role) quando um adapter falha.
-- Idempotente por natureza (UPDATE + INSERT de evento). Não expõe nada a
-- usuário logado (revoke abaixo). O message é curto e SEM PII (nome do
-- adapter / motivo técnico) — responsabilidade do caller não passar PII.
create or replace function public.record_quote_source_error(
  p_slug    text,
  p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  update public.quote_sources
     set last_error_at = now(),
         last_error_message = left(coalesce(p_message, 'erro_desconhecido'), 500)
   where slug = p_slug
  returning true into v_exists;

  -- Loga 'failed' pra check_queue_failures enxergar. fn_log_system_event
  -- já marca processed_at. O kind é específico pra dar pra filtrar no painel.
  perform public.fn_log_system_event(
    'cotacao.source.error',
    'failed',
    jsonb_build_object(
      'slug', p_slug,
      'source_found', coalesce(v_exists, false)
    ),
    format('Fonte de cotação %s falhou: %s', p_slug, left(coalesce(p_message,'erro'), 200))
  );
end;
$$;

comment on function public.record_quote_source_error(text, text) is
  'Persiste falha de uma fonte de cotação (quote_sources.last_error_*) e loga '
  'system_event failed pra check_queue_failures alertar. Chamada pela edge '
  'sync-cotacoes (service_role). Não exposta a authenticated/anon.';

-- Só o dono/service_role (a edge) executa — não authenticated/anon/public.
revoke all on function public.record_quote_source_error(text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_quote_source_error(text, text) to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 2. check_market_quotes_stale — detecta fonte automática sem dado fresco
-- -----------------------------------------------------------------
-- Pra cada quote_sources type='automatic' e active=true, acha o
-- market_quotes mais recente (por source = slug). Se não houver nenhum, ou
-- o fetched_at mais novo for mais velho que o threshold, marca a fonte com
-- last_error_at/message e loga UM system_event 'failed' (com anti-flood de
-- 6h por slug, pra não floodar a fila a cada run). Fontes sem nenhuma cotação
-- ainda (never fetched) também contam como stale.
--
-- Anti-falso-positivo de fim de semana: só roda a verificação de "velho" em
-- dia útil (a janela de 30h naturalmente atravessa a noite; sábado/domingo
-- não há sync esperado, então pulamos pra não alarmar).
create or replace function public.check_market_quotes_stale() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours       int;
  v_cutoff      timestamptz;
  v_stale_count int := 0;
  v_dow         int;
  s             record;
  v_latest      timestamptz;
  v_recent_alert boolean;
begin
  -- Dia da semana em BRT (0=domingo .. 6=sábado). Pula fds.
  v_dow := extract(dow from (now() at time zone 'America/Sao_Paulo'))::int;
  if v_dow = 0 or v_dow = 6 then
    perform public.fn_log_system_event(
      'cron.check-market-quotes-stale.run', 'skipped',
      jsonb_build_object('reason', 'weekend'));
    return 0;
  end if;

  v_hours := coalesce(
    (select (value #>> '{}')::int from public.platform_settings
      where key = 'market_quotes_stale_hours'),
    30
  );
  v_cutoff := now() - make_interval(hours => v_hours);

  for s in
    select slug, name
      from public.quote_sources
     where type = 'automatic'
       and active = true
  loop
    select max(fetched_at) into v_latest
      from public.market_quotes
     where source = s.slug;

    -- Fresco o bastante? então segue.
    if v_latest is not null and v_latest >= v_cutoff then
      continue;
    end if;

    v_stale_count := v_stale_count + 1;

    -- Persiste o erro na fonte (pro painel /admin/cotacoes/fontes mostrar).
    update public.quote_sources
       set last_error_at = now(),
           last_error_message = case
             when v_latest is null
               then 'Sem cotação automática registrada (nunca coletou).'
             else format('Cotação automática velha: última coleta %s (limiar %sh).',
                         to_char(v_latest at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
                         v_hours)
           end
     where slug = s.slug;

    -- Anti-flood: já alertou desta fonte nas últimas 6h? então não repete.
    select exists (
      select 1 from public.system_events
       where kind = 'cotacao.source.stale'
         and (payload->>'slug') = s.slug
         and created_at > now() - interval '6 hours'
    ) into v_recent_alert;

    if v_recent_alert then
      continue;
    end if;

    perform public.fn_log_system_event(
      'cotacao.source.stale',
      'failed',
      jsonb_build_object(
        'slug', s.slug,
        'last_fetched_at', v_latest,
        'threshold_hours', v_hours
      ),
      format('Fonte de cotação "%s" sem dado fresco há mais de %sh.', s.name, v_hours)
    );
  end loop;

  perform public.fn_log_system_event(
    'cron.check-market-quotes-stale.run',
    case when v_stale_count > 0 then 'failed' else 'success' end,
    jsonb_build_object('stale_sources', v_stale_count),
    case when v_stale_count > 0
         then format('%s fonte(s) automática(s) com cotação velha', v_stale_count)
         else null end
  );

  return v_stale_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.check-market-quotes-stale.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

comment on function public.check_market_quotes_stale is
  'Detecta fontes automáticas (quote_sources.type=automatic) sem market_quotes '
  'fresco há mais de market_quotes_stale_hours (default 30h). Marca '
  'last_error_* na fonte e loga system_event failed (anti-flood 6h/slug) pra '
  'check_queue_failures alertar. Roda em dia útil; pula fim de semana.';

-- Só o cron (postgres/service_role) — não authenticated/anon.
revoke all on function public.check_market_quotes_stale() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.check_market_quotes_stale() to service_role;
  end if;
end $$;

-- -----------------------------------------------------------------
-- 3. Cron: roda 1h depois de cada sync esperado pra checar se chegou dado.
--    Sync roda 12:00 e 21:00 UTC; checamos 14:00 e 23:00 UTC, dias úteis.
--    (O filtro de fds dentro da função é a guarda principal; o cron só
--    reduz execuções.)
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-check-market-quotes-stale') then
      perform cron.unschedule('milsaca-check-market-quotes-stale');
    end if;
    perform cron.schedule(
      'milsaca-check-market-quotes-stale',
      '0 14,23 * * 1-5',
      $cron$select public.check_market_quotes_stale();$cron$
    );
  else
    raise notice 'pg_cron não instalado; check_market_quotes_stale criado mas não agendado.';
  end if;
end $$;

-- =================================================================
-- Done. Aditivo: nova RPC + novo cron de detecção. Nada destrutivo.
-- =================================================================
