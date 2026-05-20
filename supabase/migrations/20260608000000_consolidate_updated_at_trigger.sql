-- =================================================================
-- Milsaca — consolida set_updated_at em tg_set_updated_at
-- Data: 2026-05-20
-- =================================================================
-- Limpa redundância:
--   tg_set_updated_at()  — em 20260514, usada por todos os triggers
--                          de updated_at no schema (≥ 8 triggers).
--   set_updated_at()     — em 20260526 (plans/subscriptions), faz EXATAMENTE
--                          a mesma coisa. Resíduo de copy-paste.
--
-- FIX:
--   1. Substitui os triggers de plans/subscriptions pra usarem
--      tg_set_updated_at (já existente).
--   2. Drop da função redundante set_updated_at.
--
-- Idempotente: pode rodar várias vezes sem erro.
-- =================================================================

drop trigger if exists set_plans_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row
  execute function public.tg_set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.tg_set_updated_at();

-- Função redundante removida. Verifica não-uso antes pra ser
-- realmente seguro — se algum trigger novo apareceu, falha aqui
-- em vez de quebrar silenciosamente.
do $$
declare
  v_count int;
begin
  select count(*) into v_count
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
   where p.proname = 'set_updated_at'
     and p.pronamespace = 'public'::regnamespace;
  if v_count > 0 then
    raise notice 'set_updated_at ainda tem % trigger(s) usando — não dropando', v_count;
  else
    drop function if exists public.set_updated_at();
  end if;
end $$;
