-- =================================================================
-- Milsaca — máquina de estados do lead (P1)
-- Data: 2026-06-60 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Hoje o status do lead (public.leads.status, enum public.lead_status) é
-- trocado livremente pela server action — a única trava real é no app
-- (updateLeadStatus). Esta migration move a verdade pro banco: um trigger
-- `before update` valida cada transição de status e rejeita saltos
-- incoerentes (ex.: voltar de `convertido`, que é terminal).
--
-- Transições permitidas (espelhadas em LEAD_TRANSICOES no app):
--   novo          -> em_negociacao, perdido, arquivado, convertido
--   em_negociacao -> novo, convertido, perdido, arquivado
--   perdido       -> novo, em_negociacao, arquivado
--   arquivado     -> novo, em_negociacao
--   convertido    -> (TERMINAL — nenhuma; só no-op pro mesmo status)
--
-- O caminho de geração de contrato (createContrato) seta `convertido` a
-- partir de `novo` OU `em_negociacao` — ambos permitidos acima.
--
-- No-op (NEW.status = OLD.status) é SEMPRE permitido — idempotência, e não
-- atrapalha updates que só mexem em outros campos (coffee_type, notes etc.).
--
-- Idempotente: create or replace + drop trigger if exists.
-- =================================================================

create or replace function public.tg_validate_lead_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  -- Sem mudança de status: no-op sempre permitido (idempotência + updates
  -- que tocam só outros campos do lead).
  if new.status = old.status then
    return new;
  end if;

  v_ok := case old.status
    when 'novo' then
      new.status in ('em_negociacao', 'perdido', 'arquivado', 'convertido')
    when 'em_negociacao' then
      new.status in ('novo', 'convertido', 'perdido', 'arquivado')
    when 'perdido' then
      new.status in ('novo', 'em_negociacao', 'arquivado')
    when 'arquivado' then
      new.status in ('novo', 'em_negociacao')
    when 'convertido' then
      -- Terminal: virou contrato, não muda mais (só no-op, tratado acima).
      false
    else
      false
  end;

  if not v_ok then
    raise exception 'transicao_lead_invalida: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

comment on function public.tg_validate_lead_transition is
  'Trigger before-update em public.leads: valida transições do enum lead_status. convertido é terminal. No-op (mesmo status) sempre permitido.';

drop trigger if exists leads_validate_transition on public.leads;
create trigger leads_validate_transition
  before update on public.leads
  for each row
  when (old.status is distinct from new.status)
  execute function public.tg_validate_lead_transition();
