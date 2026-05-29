-- =================================================================
-- Milsaca — C6: corretora gerencia a própria equipe (operadores)
-- Data: 2026-06-59
-- =================================================================
-- Hoje só o admin da plataforma cria convites (RLS de corretora_invites é
-- admin-only) e a RLS de profiles é self/admin — a corretora não consegue
-- nem listar os próprios operadores. Estas RPCs SECURITY DEFINER dão isso
-- de forma escopada: o caller só age sobre a PRÓPRIA corretora
-- (current_corretora()). Reaproveita o fluxo de aceite /convite/[token].
-- Sem hierarquia dono/operador (não existe no schema) — todos iguais,
-- exceto que ninguém se auto-remove.
-- =================================================================

-- Operadores do próprio tenant.
create or replace function public.list_corretora_operadores()
returns table (id uuid, full_name text, phone text, status public.profile_status, is_self boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.phone, p.status, (p.id = auth.uid()) as is_self
  from public.profiles p
  where public.current_corretora() is not null
    and p.corretora_id = public.current_corretora()
    and p.deleted_at is null
  order by (p.id = auth.uid()) desc, p.full_name nulls last;
$$;

-- Convites ativos (não usados, não expirados) do próprio tenant.
create or replace function public.list_convites_corretora_self()
returns table (token uuid, email text, expires_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select i.token, i.email, i.expires_at, i.created_at
  from public.corretora_invites i
  where public.current_corretora() is not null
    and i.corretora_id = public.current_corretora()
    and i.used_at is null
    and i.expires_at > now()
  order by i.created_at desc;
$$;

-- Cria convite pro próprio tenant.
create or replace function public.gerar_convite_corretora_self(p_email text default null)
returns table (token uuid, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cor uuid := public.current_corretora();
  v_token uuid;
begin
  if v_cor is null then
    return query select null::uuid, 'forbidden';
    return;
  end if;
  insert into public.corretora_invites (corretora_id, email, created_by)
  values (v_cor, nullif(btrim(coalesce(p_email, '')), ''), auth.uid())
  returning corretora_invites.token into v_token;

  insert into public.audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
  values (auth.uid(), v_cor, 'create_corretora_invite_self', 'corretora_invite', v_token,
          jsonb_build_object('email', nullif(btrim(coalesce(p_email, '')), '')));

  return query select v_token, null::text;
end;
$$;

-- Revoga (expira) um convite do próprio tenant.
create or replace function public.revogar_convite_corretora_self(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cor uuid := public.current_corretora();
begin
  if v_cor is null then
    raise exception 'forbidden';
  end if;
  update public.corretora_invites
     set expires_at = now() - interval '1 second'
   where token = p_token
     and corretora_id = v_cor
     and used_at is null;
end;
$$;

-- Remove um operador da corretora (desvincula). Não pode remover a si mesmo.
create or replace function public.remover_operador_corretora(p_target uuid)
returns table (success boolean, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cor uuid := public.current_corretora();
  v_roles public.user_role[];
begin
  if v_cor is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_target = auth.uid() then
    return query select false, 'nao_pode_remover_voce';
    return;
  end if;

  v_roles := array_remove(
    coalesce((select roles from public.profiles where id = p_target and corretora_id = v_cor),
             array[]::public.user_role[]),
    'corretora'::public.user_role
  );
  if array_length(v_roles, 1) is null then
    v_roles := array['produtor'::public.user_role];
  end if;

  update public.profiles
     set corretora_id = null,
         role = 'produtor'::public.user_role,
         roles = v_roles
   where id = p_target
     and corretora_id = v_cor;
  if not found then
    return query select false, 'operador_nao_encontrado';
    return;
  end if;

  insert into public.audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
  values (auth.uid(), v_cor, 'remove_operador_corretora', 'profile', p_target, '{}'::jsonb);

  return query select true, null::text;
end;
$$;

revoke all on function public.list_corretora_operadores() from public, anon;
revoke all on function public.list_convites_corretora_self() from public, anon;
revoke all on function public.gerar_convite_corretora_self(text) from public, anon;
revoke all on function public.revogar_convite_corretora_self(uuid) from public, anon;
revoke all on function public.remover_operador_corretora(uuid) from public, anon;
grant execute on function public.list_corretora_operadores() to authenticated;
grant execute on function public.list_convites_corretora_self() to authenticated;
grant execute on function public.gerar_convite_corretora_self(text) to authenticated;
grant execute on function public.revogar_convite_corretora_self(uuid) to authenticated;
grant execute on function public.remover_operador_corretora(uuid) to authenticated;
