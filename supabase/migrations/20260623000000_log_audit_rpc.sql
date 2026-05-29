-- =================================================================
-- Milsaca — log_audit(): trilha de auditoria por qualquer ator (3.5)
-- Data: 2026-06-23
-- =================================================================
-- A policy audit_log_admin_write (initial_schema) só deixa is_admin()
-- inserir em audit_log. Por isso ações da CORRETORA (ex.: criar/editar/
-- assinar contrato) não conseguiam deixar rastro. Esta RPC SECURITY
-- DEFINER contorna a policy de forma controlada: carimba sempre
-- actor_id = auth.uid() (o ator real, não falsificável pelo cliente) e
-- corretora_id = current_corretora() pra atribuição de tenant.
--
-- Usada pelos server actions de contrato (create/update/status) e
-- disponível pra qualquer fluxo autenticado que precise auditar.
--
-- Idempotente: create or replace.
-- =================================================================

create or replace function public.log_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só registra pra ator autenticado; o actor_id vem do JWT (não do cliente).
  if auth.uid() is null then
    return;
  end if;

  insert into public.audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
  values (
    auth.uid(),
    public.current_corretora(),
    p_action,
    p_entity,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

comment on function public.log_audit(text, text, uuid, jsonb) is
  'Insere em audit_log carimbando actor_id=auth.uid() e corretora_id=current_corretora(). SECURITY DEFINER pra permitir trilha de ações da corretora (a policy de insert é admin-only).';
