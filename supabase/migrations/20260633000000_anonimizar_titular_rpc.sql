-- =================================================================
-- Milsaca — Fase 2: anonimização de titular LGPD (3.2 impl)
-- =================================================================
-- RPC SECURITY DEFINER admin-only que substitui PII de um titular
-- (nome/cpf/cnpj/telefone/email correlatos) por placeholders e seta
-- deleted_at onde a coluna existir. Diferente do soft-delete (que só
-- esconde via RLS), aqui a PII em texto pleno é DESTRUÍDA — atende ao
-- direito de eliminação da LGPD (art. 18, VI), retendo só o mínimo.
--
-- Cobre: profiles, produtores, produtor_contatos (sombra do titular,
-- batidos por claimed_profile_id). corretoras NÃO é anonimizada aqui
-- (entidade jurídica com obrigações fiscais; soft-delete via admin).
--
-- Idempotente: create or replace; chamadas repetidas só reescrevem
-- placeholders (sem efeito colateral).
-- =================================================================

create or replace function public.anonimizar_titular(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text := 'anon-' || left(p_user_id::text, 8);
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'p_user_id obrigatório';
  end if;

  -- profiles: nome/telefone vão pra placeholder; deleted_at marcado.
  update public.profiles
     set full_name = 'Titular anonimizado',
         phone = null,
         avatar_url = null,
         deleted_at = coalesce(deleted_at, now())
   where id = p_user_id;

  -- produtores: cpf_cnpj/fazenda destruídos; deleted_at marcado.
  update public.produtores
     set cpf_cnpj = null,
         fazenda_nome = v_tag,
         deleted_at = coalesce(deleted_at, now())
   where profile_id = p_user_id;

  -- produtor_contatos vinculados a este titular (já reivindicados):
  -- destrói PII de contato; deleted_at marcado.
  update public.produtor_contatos
     set full_name = 'Contato anonimizado',
         email = null,
         phone = null,
         fazenda_nome = null,
         notes = null,
         deleted_at = coalesce(deleted_at, now())
   where claimed_profile_id = p_user_id;

  -- Trilha de auditoria (sem PII no payload).
  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (
    auth.uid(),
    'titular_anonimizado',
    'profile',
    p_user_id,
    jsonb_build_object('tag', v_tag, 'at', now())
  );
end;
$$;

revoke all on function public.anonimizar_titular(uuid) from public, anon;
grant execute on function public.anonimizar_titular(uuid) to authenticated;

comment on function public.anonimizar_titular(uuid) is
  'LGPD: destrói PII em texto pleno do titular (nome/cpf/cnpj/telefone/email) e seta deleted_at. Admin-only (is_app_admin).';
