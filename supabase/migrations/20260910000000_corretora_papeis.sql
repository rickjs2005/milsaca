-- =================================================================
-- Milsaca — Papéis na corretora: dono × operador
-- Data: 2026-09-10
-- =================================================================
-- Até aqui todo membro da corretora tinha acesso IGUAL (a 20260659 diz
-- explicitamente "sem hierarquia dono/operador"). Risco real: qualquer
-- operador convidado podia marcar pagamento como pago, convidar/remover
-- gente e mexer na assinatura.
--
-- Esta migration introduz 2 papéis:
--   - dono     → acesso total (inclui Pagamentos, Equipe, Assinatura).
--   - operador → operação comercial, MAS bloqueado em marcar-pago, gerir
--                equipe e assinatura (gate no BACKEND, não só no front).
--
-- Modelo: coluna profiles.corretora_role. O criador da corretora (via
-- approve_corretora) vira 'dono'; quem entra por convite (consume) vira
-- 'operador'. Backfill: membros vinculados via convite aceito → operador;
-- demais membros vinculados → dono.
--
-- Também amarra o nº de operadores ao plano: Gratuito = 1 (só o dono);
-- pago/fundadora = ilimitado. Gate dentro de gerar_convite_corretora_self.
-- =================================================================

-- 1) Enum de papel de membro da corretora.
do $$
begin
  create type public.corretora_member_role as enum ('dono', 'operador');
exception
  when duplicate_object then null;
end
$$;

-- 2) Coluna no profile (null = não é membro de corretora).
alter table public.profiles
  add column if not exists corretora_role public.corretora_member_role;

-- 3) Backfill idempotente.
--    Quem entrou via convite aceito → operador.
update public.profiles p
   set corretora_role = 'operador'::public.corretora_member_role
 where p.corretora_id is not null
   and p.corretora_role is null
   and exists (
     select 1 from public.corretora_invites i
      where i.used_by_user_id = p.id
        and i.corretora_id = p.corretora_id
   );
--    Demais membros vinculados (incl. o criador) → dono.
update public.profiles p
   set corretora_role = 'dono'::public.corretora_member_role
 where p.corretora_id is not null
   and p.corretora_role is null;

-- 4) Helper: o caller é dono da própria corretora?
create or replace function public.is_corretora_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select corretora_role = 'dono'::public.corretora_member_role
       from public.profiles
      where id = auth.uid() and corretora_id is not null),
    false
  );
$$;
revoke all on function public.is_corretora_dono() from public, anon;
grant execute on function public.is_corretora_dono() to authenticated;

-- 5) approve_corretora: o criador nasce DONO (adiciona corretora_role).
create or replace function public.approve_corretora(
  p_profile_id uuid,
  p_name text,
  p_slug text,
  p_cnpj text,
  p_city text,
  p_state text
)
returns table (success boolean, corretora_id uuid, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_used int;
  v_total int;
  v_plan_id uuid;
  v_corretora_id uuid;
  v_now timestamptz := now();
  v_lifetime_end timestamptz;
begin
  if not public.is_app_admin() then
    return query select false, null::uuid, 'forbidden';
    return;
  end if;

  perform pg_advisory_xact_lock(9021001);

  select id, status, corretora_id
    into v_profile
    from public.profiles
   where id = p_profile_id;

  if not found then
    return query select false, null::uuid, 'profile_invalido';
    return;
  end if;
  if v_profile.corretora_id is not null then
    return query select false, null::uuid, 'ja_aprovada';
    return;
  end if;
  if v_profile.status <> 'pendente'::profile_status then
    return query select false, null::uuid, 'profile_invalido';
    return;
  end if;

  select count(*)
    into v_used
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
   where p.slug = 'corretora-fundador'
     and s.status = 'active';

  v_total := coalesce(
    (select (value #>> '{}')::int from public.platform_settings where key = 'founder_slots_total'),
    5
  );

  if v_used >= v_total then
    return query select false, null::uuid, 'limite_fundadoras';
    return;
  end if;

  begin
    v_lifetime_end := v_now + interval '100 years';

    insert into public.corretoras (name, slug, cnpj, city, state, verified)
    values (p_name, p_slug, p_cnpj, p_city, p_state, true)
    returning id into v_corretora_id;

    update public.profiles
       set corretora_id = v_corretora_id,
           corretora_role = 'dono'::public.corretora_member_role,
           status = 'ativo'::profile_status
     where id = p_profile_id;

    insert into public.plans (slug, name, description, price_cents, billing_period, features, active)
    values (
      'corretora-fundador',
      'Fundadora',
      'Programa fundador — acesso completo, grátis vitalício.',
      0,
      'monthly',
      '[]'::jsonb,
      true
    )
    on conflict (slug) do nothing;

    select id into v_plan_id from public.plans where slug = 'corretora-fundador';

    insert into public.subscriptions (
      corretora_id, plan_id, status,
      started_at, current_period_start, current_period_end, trial_ends_at
    )
    values (
      v_corretora_id, v_plan_id, 'active'::subscription_status,
      v_now, v_now, v_lifetime_end, null
    );

    insert into public.audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
    values (
      auth.uid(), v_corretora_id, 'aprovar_corretora', 'profile', p_profile_id,
      jsonb_build_object(
        'name', p_name, 'cnpj', p_cnpj, 'city', p_city, 'state', p_state,
        'plano', 'fundador', 'vitalicio_ate', v_lifetime_end
      )
    );
  exception
    when others then
      return query select false, null::uuid, 'erro: ' || sqlerrm;
      return;
  end;

  return query select true, v_corretora_id, null::text;
end;
$$;

-- 6) consume_corretora_invite: quem aceita vira OPERADOR.
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

  update corretora_invites
     set used_at = now(),
         used_by_user_id = consuming_user_id
   where token = invite_token;

  update profiles
     set role = 'corretora'::user_role,
         roles = case
           when 'corretora'::user_role = any(coalesce(roles, array[]::user_role[]))
             then roles
           else coalesce(roles, array[]::user_role[]) || array['corretora'::user_role]
         end,
         corretora_id = v_invite.corretora_id,
         corretora_role = 'operador'::public.corretora_member_role,
         status = 'ativo'::profile_status
   where id = consuming_user_id;

  insert into audit_log (actor_id, corretora_id, action, entity, entity_id, payload)
  values (
    auth.uid(), v_invite.corretora_id, 'consume_invite', 'profile', consuming_user_id,
    jsonb_build_object('corretora_id', v_invite.corretora_id, 'token', invite_token, 'papel', 'operador')
  );

  return query select true, v_invite.corretora_id, null::text;
end;
$$;

-- 7) Operadores do tenant — agora retorna o papel. DROP+CREATE (muda o RETURNS).
drop function if exists public.list_corretora_operadores();
create function public.list_corretora_operadores()
returns table (
  id uuid,
  full_name text,
  phone text,
  status public.profile_status,
  corretora_role public.corretora_member_role,
  is_self boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.phone, p.status, p.corretora_role,
         (p.id = auth.uid()) as is_self
  from public.profiles p
  where public.current_corretora() is not null
    and p.corretora_id = public.current_corretora()
    and p.deleted_at is null
  order by (p.corretora_role = 'dono'::public.corretora_member_role) desc,
           (p.id = auth.uid()) desc,
           p.full_name nulls last;
$$;
revoke all on function public.list_corretora_operadores() from public, anon;
grant execute on function public.list_corretora_operadores() to authenticated;

-- 8) gerar_convite_corretora_self: exige DONO + gate por plano.
create or replace function public.gerar_convite_corretora_self(p_email text default null)
returns table (token uuid, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cor uuid := public.current_corretora();
  v_token uuid;
  v_is_pago boolean;
  v_membros int;
  v_convites int;
begin
  -- Só o DONO convida.
  if v_cor is null or not public.is_corretora_dono() then
    return query select null::uuid, 'forbidden';
    return;
  end if;

  -- Gate por plano: Gratuito = 1 membro (só o dono). Pago/fundadora = ilimitado.
  -- "Pago" = existe assinatura num plano que não seja o gratuito (corretora
  -- no Gratuito não tem linha em subscriptions).
  v_is_pago := exists (
    select 1
      from public.subscriptions s
      left join public.plans p on p.id = s.plan_id
     where s.corretora_id = v_cor
       and coalesce(p.slug, '') <> 'gratuito'
  );

  if not v_is_pago then
    select count(*) into v_membros
      from public.profiles
     where corretora_id = v_cor and deleted_at is null;
    select count(*) into v_convites
      from public.corretora_invites
     where corretora_id = v_cor and used_at is null and expires_at > now();
    if (v_membros + v_convites) >= 1 then
      return query select null::uuid, 'limite_plano';
      return;
    end if;
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

-- 9) revogar_convite_corretora_self: exige DONO.
create or replace function public.revogar_convite_corretora_self(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cor uuid := public.current_corretora();
begin
  if v_cor is null or not public.is_corretora_dono() then
    raise exception 'forbidden';
  end if;
  update public.corretora_invites
     set expires_at = now() - interval '1 second'
   where token = p_token
     and corretora_id = v_cor
     and used_at is null;
end;
$$;

-- 10) remover_operador_corretora: exige DONO.
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
  if v_cor is null or not public.is_corretora_dono() then
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
         corretora_role = null,
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

grant execute on function public.gerar_convite_corretora_self(text) to authenticated;
grant execute on function public.revogar_convite_corretora_self(uuid) to authenticated;
grant execute on function public.remover_operador_corretora(uuid) to authenticated;
