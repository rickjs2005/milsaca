-- =================================================================
-- Milsaca — list_pending_corretora_signups inclui UF e WhatsApp
-- Data: 2026-05-19
-- =================================================================
-- A partir da Fase D do cadastro, o /cadastrar passa a salvar
-- corretora_uf (separado de corretora_city) e corretora_whatsapp
-- (opcional) em raw_user_meta_data. Atualiza a RPC pra refletir esses
-- campos na tela de aprovações, evitando que o admin tenha que digitar
-- UF do zero quando o cadastro já trouxe.
--
-- DROP + CREATE em vez de CREATE OR REPLACE porque PG não permite
-- adicionar colunas ao TABLE return type de uma função existente.
-- =================================================================

drop function if exists public.list_pending_corretora_signups();

create function public.list_pending_corretora_signups()
returns table (
  profile_id uuid,
  email text,
  full_name text,
  signup_at timestamptz,
  corretora_name text,
  corretora_cnpj text,
  corretora_city text,
  corretora_uf text,
  corretora_whatsapp text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id as profile_id,
    u.email::text,
    p.full_name,
    p.created_at as signup_at,
    (u.raw_user_meta_data ->> 'corretora_name') as corretora_name,
    (u.raw_user_meta_data ->> 'corretora_cnpj') as corretora_cnpj,
    (u.raw_user_meta_data ->> 'corretora_city') as corretora_city,
    (u.raw_user_meta_data ->> 'corretora_uf') as corretora_uf,
    (u.raw_user_meta_data ->> 'corretora_whatsapp') as corretora_whatsapp
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.status = 'pendente'
    and 'corretora' = any(p.roles)
  order by p.created_at asc;
end;
$$;

revoke all on function public.list_pending_corretora_signups() from public;
grant execute on function public.list_pending_corretora_signups() to authenticated;

comment on function public.list_pending_corretora_signups() is
  'Lista signups de corretora aguardando aprovação. Restrito a admin via is_admin().';
