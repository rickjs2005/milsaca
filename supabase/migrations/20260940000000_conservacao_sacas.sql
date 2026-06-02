-- =================================================================
-- Milsaca — Conservação de sacas (saldo residual rastreável)
-- Data: 2026-06-02
-- =================================================================
-- Fecha o buraco-raiz da auditoria pré-piloto: o saldo residual (ex.:
-- contrato de 120 sacas, entrega de 100 -> 20 pendentes) sumia porque
-- (a) a entrega não validava contra o contratado e (b) não havia
-- entidade de saldo em lugar nenhum. Esta migration cria:
--   1. trigger BEFORE INSERT/UPDATE em entregas: a soma das entregas
--      não-canceladas não pode exceder contratos.bag_count.
--   2. view contrato_saldo: materializa contratado/entregue/em_transito/
--      pendente/excedente por contrato (security_invoker -> respeita RLS).
-- Identidade garantida: contratado = entregue + em_transito + pendente
--                       (+ excedente, que a trigger agora impede de nascer).
-- =================================================================

-- 1. Trigger de validação de saldo --------------------------------
create or replace function public.tg_entrega_valida_saldo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contratado integer;
  v_outras     integer;
  v_nova       integer;
begin
  -- Entrega cancelada não consome saldo.
  if NEW.status = 'cancelada' then
    return NEW;
  end if;

  v_nova := coalesce(NEW.bag_count, 0);
  -- Entrega ainda sem quantidade declarada (ex.: programada vazia): nada a validar.
  if v_nova <= 0 then
    return NEW;
  end if;

  select bag_count into v_contratado
  from public.contratos
  where id = NEW.contrato_id;

  -- Contrato sem bag_count definido: não dá pra validar conservação.
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

-- 2. View de saldo por contrato -----------------------------------
-- entregue    = sacas em entregas recebidas/conferidas
-- em_transito = sacas programadas/em trânsito (ainda não recebidas)
-- pendente    = contratado - entregue - em_transito (nunca negativo)
-- excedente   = entregue+em_transito - contratado (deve ser 0 com a trigger;
--               fica >0 só pra dados históricos/importados anteriores)
drop view if exists public.contrato_saldo;
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
