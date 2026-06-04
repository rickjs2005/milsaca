-- =================================================================
-- Milsaca — bag_count integer → numeric (Fase 2b do brief unidades)
-- Data: 2026-06-04
-- =================================================================
-- Decisão C (lotes + negociação): a quantidade negociada deixa de ser
-- inteira pra carregar fração de saca sem perda (regra de ouro: nunca
-- arredondar saca no banco) e parar a mistura numeric×integer no estoque.
-- bag_count segue valor PRÓPRIO da negociação (não é gerado de kg).
--
-- Única view dependente: contrato_saldo (conservação de sacas, 20260940).
-- Precisa drop → alter → recreate. O trigger tg_entrega_valida_saldo é
-- recriado com variáveis NUMERIC (senão arredondaria a conservação).
-- Aditiva no sentido de dados (numeric comporta os inteiros existentes),
-- idempotente.
-- =================================================================

-- 1) Solta a única view dependente.
drop view if exists public.contrato_saldo;

-- 2) bag_count integer → numeric em toda tabela-base que o tiver assim.
do $$
declare r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'bag_count'
      and c.data_type = 'integer'
      and t.table_type = 'BASE TABLE'
  loop
    execute format(
      'alter table public.%I alter column bag_count type numeric using bag_count::numeric',
      r.table_name
    );
  end loop;
end $$;

-- 3) Recria o trigger de conservação com variáveis NUMERIC (preserva fração).
create or replace function public.tg_entrega_valida_saldo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contratado numeric;
  v_outras     numeric;
  v_nova       numeric;
begin
  if NEW.status = 'cancelada' then
    return NEW;
  end if;

  v_nova := coalesce(NEW.bag_count, 0);
  if v_nova <= 0 then
    return NEW;
  end if;

  select bag_count into v_contratado
  from public.contratos
  where id = NEW.contrato_id;

  if v_contratado is null then
    return NEW;
  end if;

  select coalesce(sum(bag_count), 0) into v_outras
  from public.entregas
  where contrato_id = NEW.contrato_id
    and status <> 'cancelada'
    and id <> NEW.id;

  if v_outras + v_nova > v_contratado then
    raise exception
      'Saldo de sacas excedido: o contrato tem % sacas, já há % em entregas e esta soma % (total %). Ajuste o contrato ou a quantidade da entrega.',
      v_contratado, v_outras, v_nova, v_outras + v_nova
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists entregas_valida_saldo on public.entregas;
create trigger entregas_valida_saldo
  before insert or update on public.entregas
  for each row execute function public.tg_entrega_valida_saldo();

-- 4) Recria a view contrato_saldo (idêntica à 20260940, agora sobre numeric).
create view public.contrato_saldo
with (security_invoker = true)
as
select
  c.id           as contrato_id,
  c.corretora_id,
  c.produtor_id,
  c.code,
  c.status,
  coalesce(c.bag_count, 0)    as sacas_contratadas,
  coalesce(e.entregue, 0)     as sacas_entregues,
  coalesce(e.em_transito, 0)  as sacas_em_transito,
  greatest(
    coalesce(c.bag_count, 0) - coalesce(e.entregue, 0) - coalesce(e.em_transito, 0),
    0
  ) as sacas_pendentes,
  greatest(
    coalesce(e.entregue, 0) + coalesce(e.em_transito, 0) - coalesce(c.bag_count, 0),
    0
  ) as sacas_excedente
from public.contratos c
left join (
  select
    contrato_id,
    sum(bag_count) filter (where status in ('recebida', 'conferida'))     as entregue,
    sum(bag_count) filter (where status in ('programada', 'em_transito')) as em_transito
  from public.entregas
  group by contrato_id
) e on e.contrato_id = c.id;

comment on view public.contrato_saldo is
  'Saldo de sacas por contrato (auditoria pré-piloto 2026-06-02). security_invoker: respeita a RLS de contratos/entregas.';

grant select on public.contrato_saldo to authenticated;
