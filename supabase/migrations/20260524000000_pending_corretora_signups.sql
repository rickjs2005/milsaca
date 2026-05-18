-- =================================================================
-- Milsaca — função para listar signups de corretora pendentes
-- Data: 2026-05-18
-- =================================================================
-- A tela /admin/aprovacoes precisa cruzar profiles (status=pendente,
-- role=corretora) com auth.users.raw_user_meta_data (corretora_name,
-- corretora_cnpj, corretora_city) que vieram do form de cadastro.
--
-- auth.users só é acessível via service_role; pra evitar carregar a
-- chave secret no servidor Next, expomos uma função SECURITY DEFINER
-- que faz o JOIN, restrita a quem é admin.
-- =================================================================

create or replace function public.list_pending_corretora_signups()
returns table (
  profile_id uuid,
  email text,
  full_name text,
  signup_at timestamptz,
  corretora_name text,
  corretora_cnpj text,
  corretora_city text
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
    (u.raw_user_meta_data ->> 'corretora_city') as corretora_city
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
