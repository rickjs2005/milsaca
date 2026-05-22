-- corretora_invites — convites de admin pra dono de corretora criar conta
--
-- Fluxo:
--   1. Admin clica "Gerar link de convite" em /admin/corretoras/[id]
--   2. Insere registro aqui; token uuid vira parte da URL pública /convite/[token]
--   3. Convidado abre o link → form (email, nome, senha)
--   4. Server action consulta RPC get_corretora_invite (SECURITY DEFINER, sem auth)
--   5. Após sucesso: signUp com role='corretora', UPDATE profile.corretora_id, marca used_at
--
-- O admin gera UM link por corretora; pode regerar se expirou ou foi usado.
-- Não envia email automático — o admin copia o link e manda pelo canal que
-- preferir (WhatsApp). Sem dependência de provider de email transacional.

create table if not exists public.corretora_invites (
  token uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  email text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists corretora_invites_corretora_id_idx
  on public.corretora_invites(corretora_id);
create index if not exists corretora_invites_active_idx
  on public.corretora_invites(corretora_id, expires_at)
  where used_at is null;

alter table public.corretora_invites enable row level security;

-- Admin gerencia tudo. Convidado consome via RPC SECURITY DEFINER (sem RLS aplicada).
drop policy if exists "corretora_invites_admin_all" on public.corretora_invites;
create policy "corretora_invites_admin_all" on public.corretora_invites
  for all to authenticated using (is_admin()) with check (is_admin());

-- RPC pública pra validar token na tela de aceite. SECURITY DEFINER bypassa
-- RLS — retorna só campos seguros (sem expor created_by, used_by_user_id).
create or replace function public.get_corretora_invite(invite_token uuid)
returns table (
  token uuid,
  corretora_id uuid,
  corretora_name text,
  corretora_slug text,
  email text,
  expires_at timestamptz,
  is_valid boolean,
  invalid_reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      ci.token,
      ci.corretora_id,
      c.name as corretora_name,
      c.slug as corretora_slug,
      ci.email,
      ci.expires_at,
      (ci.used_at is null and ci.expires_at > now() and c.deleted_at is null) as is_valid,
      case
        when ci.used_at is not null then 'used'
        when ci.expires_at <= now() then 'expired'
        when c.deleted_at is not null then 'corretora_removed'
        else null
      end as invalid_reason
    from corretora_invites ci
    join corretoras c on c.id = ci.corretora_id
    where ci.token = invite_token;
end;
$$;

grant execute on function public.get_corretora_invite(uuid) to anon, authenticated;

-- RPC pra consumir o convite (marca used_at + vincula user à corretora).
-- Chamada pelo server action depois que o signUp + signIn rolaram.
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

  return query select true, v_invite.corretora_id, null::text;
end;
$$;

grant execute on function public.consume_corretora_invite(uuid, uuid)
  to authenticated;

comment on table public.corretora_invites is
  'Convites de admin → dono de corretora. Cada link único por token; URL pública /convite/[token]. RPC get_corretora_invite valida sem auth; consume_corretora_invite roda após signUp.';
