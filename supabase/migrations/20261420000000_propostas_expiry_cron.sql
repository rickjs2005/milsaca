-- =================================================================
-- Milsaca — expiração ativa de propostas (P5)
-- Data: 2026-06-61 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- A proposta tem `validade_ate`, mas hoje nada a vence sozinha: uma proposta
-- `enviada` cuja validade já passou continua aparecendo como aberta até
-- alguém respondê-la. Esta migration adiciona uma função que marca como
-- `expirada` toda proposta `enviada` com validade vencida, e a agenda via
-- pg_cron 1x/dia.
--
-- Idempotente: create or replace + unschedule-if-exists antes do schedule.
-- =================================================================

create or replace function public.expirar_propostas_vencidas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with expiradas as (
    update public.propostas
       set status = 'expirada',
           respondida_em = now()
     where status = 'enviada'
       and validade_ate is not null
       and validade_ate < now()
    returning 1
  )
  select count(*) into v_count from expiradas;

  return v_count;
end;
$$;

revoke all on function public.expirar_propostas_vencidas() from public;
grant execute on function public.expirar_propostas_vencidas() to authenticated;

comment on function public.expirar_propostas_vencidas is
  'Marca propostas enviada com validade_ate < now() como expirada (carimba respondida_em). Rodado por cron 1x/dia. Retorna quantas expirou.';

-- Cron diário (03:10 UTC). Só agenda se pg_cron existir (schema cron).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-expirar-propostas') then
      perform cron.unschedule('milsaca-expirar-propostas');
    end if;
    perform cron.schedule(
      'milsaca-expirar-propostas',
      '10 3 * * *',
      $cron$select public.expirar_propostas_vencidas();$cron$
    );
  else
    raise notice 'pg_cron não instalado; expirar_propostas_vencidas criado mas não agendado.';
  end if;
end $$;
