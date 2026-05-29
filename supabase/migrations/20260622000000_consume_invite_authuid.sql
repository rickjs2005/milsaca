-- =================================================================
-- Milsaca — consume_corretora_invite() valida auth.uid() + audita
-- Data: 2026-06-22
-- =================================================================
-- Fecha 2 achados da auditoria:
--   1.1 (escalonamento de privilégio): a RPC aceitava consuming_user_id
--       arbitrário. Como roda SECURITY DEFINER e dá role='corretora' +
--       vincula corretora_id, qualquer authenticated podia chamar com
--       o token e o id de OUTRO usuário, promovendo/vinculando vítima
--       a uma corretora. FIX: consuming_user_id precisa ser == auth.uid().
--   3.6 (audit role): a promoção a corretora não deixava rastro no
--       audit_log. FIX: registra 'consume_invite' após o update.
--
-- create or replace mantém grant e assinatura. Corpo copiado de
-- 20260616000000_corretora_invites.sql com as duas mudanças.
-- =================================================================

create or replace function public.consume_corretora_invite(
  invite_token uuid,
  consuming_user_id uuid
)
returns table (success boolean, corretora_id uuid, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  -- Anti-escalonamento (1.1): só o próprio usuário autenticado pode
  -- consumir o convite pra si mesmo. Impede promover/vincular terceiros.
  if consuming_user_id is null or consuming_user_id <> auth.uid() then
    return query select false, null::uuid, 'forbidden';
    return;
  end if;

  select ci.*, c.deleted_at as corretora_deleted_at
    into v_invite
    from corretora_invites ci
    join corretoras c on c.id = ci.corretora_id
    where ci.token = invite_token;

  if not found then
    return query select false, null::uuid, 'invite_not_found';
    return;
  end if;
  if v_invite.used_at is not null then
    return query select false, null::uuid, 'invite_used';
    return;
  end if;
  if v_invite.expires_at <= now() then
    return query select false, null::uuid, 'invite_expired';
    return;
  end if;
  if v_invite.corretora_deleted_at is not null then
    return query select false, null::uuid, 'corretora_removed';
    return;
  end if;

  -- Marca invite como consumido
  update corretora_invites
     set used_at = now(),
         used_by_user_id = consuming_user_id
   where token = invite_token;

  -- Vincula o profile à corretora + garante role corretora
  update profiles
     set role = 'corretora'::user_role,
         roles = case
           when 'corretora'::user_role = any(coalesce(roles, array[]::user_role[]))
             then roles
           else coalesce(roles, array[]::user_role[]) || array['corretora'::user_role]
         end,
         corretora_id = v_invite.corretora_id,
         status = 'ativo'::profile_status
   where id = consuming_user_id;

  -- Audita a promoção a corretora (3.6).
  insert into audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
  values (
    auth.uid(), v_invite.corretora_id, 'consume_invite', 'profile', consuming_user_id,
    jsonb_build_object('corretora_id', v_invite.corretora_id, 'token', invite_token)
  );

  return query select true, v_invite.corretora_id, null::text;
end;
$$;

grant execute on function public.consume_corretora_invite(uuid, uuid)
  to authenticated;
