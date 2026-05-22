-- =================================================================
-- Milsaca — Bloco B cotações: cron 2x/dia + auto-stale + source tracking
-- Data: 2026-05-22
-- =================================================================
-- 1. Atualiza schedule de milsaca-sync-cotacoes pra rodar 2x ao dia
--    (12:00 UTC manhã NY + 21:00 UTC fechamento).
-- 2. Função mark_stale_cotacoes — cotação manual sem reference_date
--    recente vira status='stale' (deixa de aparecer como atual).
-- 3. Cron diário pra rodar mark_stale_cotacoes.
-- 4. Trigger AFTER INSERT em market_quotes — atualiza
--    quote_sources.last_success_at automaticamente. Mesma coisa pra
--    cotacoes manuais (last_success do source).
--
-- Idempotente.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Schedule 2x/dia pro sync-cotacoes (alter, não recreate)
-- -----------------------------------------------------------------
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'milsaca-sync-cotacoes';
  if v_jobid is not null then
    -- 0 12,21 * * 1-5 = 12:00 UTC (manhã NY) + 21:00 UTC (fim do dia),
    -- segunda a sexta. Mantém o secret embutido no body.
    perform cron.alter_job(job_id := v_jobid, schedule := '0 12,21 * * 1-5');
    raise notice 'milsaca-sync-cotacoes reagendado pra 0 12,21 * * 1-5';
  else
    raise notice 'milsaca-sync-cotacoes não existe; rode apply-cron.mjs primeiro';
  end if;
end $$;

-- -----------------------------------------------------------------
-- 2. mark_stale_cotacoes — cotações manuais antigas viram stale
-- -----------------------------------------------------------------
-- Critério: cotação manual ativa cuja reference_date é mais antiga
-- que 7 dias OU cujo valid_until já passou. Status muda pra 'stale'.
-- Produtor vê com badge "desatualizada" em vez de preço atual.
--
-- Reversível: admin pode reativar manualmente trocando status pra
-- 'active' em /admin/cotacoes/[id].
-- -----------------------------------------------------------------
create or replace function public.mark_stale_cotacoes() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.cotacoes
       set status = 'stale'
     where status = 'active'
       and (
         reference_date < (now()::date - interval '7 days')
         or (valid_until is not null and valid_until < now())
       )
    returning id
  )
  select count(*) into v_count from updated;

  perform public.fn_log_system_event(
    'cron.mark-stale-cotacoes.run',
    'success',
    jsonb_build_object('stale_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.mark-stale-cotacoes.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

grant execute on function public.mark_stale_cotacoes() to authenticated;

-- Cron diário 02:00 UTC pra rodar mark_stale.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-mark-stale-cotacoes') then
    perform cron.unschedule('milsaca-mark-stale-cotacoes');
  end if;
end $$;

select cron.schedule(
  'milsaca-mark-stale-cotacoes',
  '0 2 * * *',                       -- 02:00 UTC = 23:00 BRT
  $$select public.mark_stale_cotacoes();$$
);

-- -----------------------------------------------------------------
-- 3. Auto-track de last_success_at em quote_sources
-- -----------------------------------------------------------------
-- Quando edge function (ou admin/corretora) insere em market_quotes
-- ou cotacoes, atualiza quote_sources.last_success_at pra match.
-- Permite que o /admin/cotacoes/fontes mostre saúde sem precisar
-- de chamada explícita.
-- -----------------------------------------------------------------

-- Pra market_quotes — match por source slug
create or replace function public.tg_track_quote_source_market()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quote_sources
     set last_success_at = greatest(coalesce(last_success_at, '-infinity'::timestamptz), new.fetched_at),
         last_error_at = null,
         last_error_message = null
   where slug = new.source;
  return new;
end;
$$;

drop trigger if exists market_quotes_track_source on public.market_quotes;
create trigger market_quotes_track_source
  after insert or update on public.market_quotes
  for each row execute function public.tg_track_quote_source_market();

-- Pra cotacoes manuais — match por source_id se setado
create or replace function public.tg_track_quote_source_manual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_id is not null then
    update public.quote_sources
       set last_success_at = greatest(coalesce(last_success_at, '-infinity'::timestamptz), now())
     where id = new.source_id;
  end if;
  return new;
end;
$$;

drop trigger if exists cotacoes_track_source on public.cotacoes;
create trigger cotacoes_track_source
  after insert on public.cotacoes
  for each row execute function public.tg_track_quote_source_manual();

-- -----------------------------------------------------------------
-- 4. Backfill last_success_at com base no que já existe
-- -----------------------------------------------------------------
update public.quote_sources qs
   set last_success_at = (
     select max(m.fetched_at) from public.market_quotes m where m.source = qs.slug
   )
 where qs.type = 'automatic'
   and qs.last_success_at is null
   and exists (select 1 from public.market_quotes m where m.source = qs.slug);
