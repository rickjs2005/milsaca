-- =================================================================
-- Milsaca — Endurecimento dos fluxos financeiros
-- Data: 2026-07-31
-- =================================================================
-- Fecha achados de auditoria nos RPCs/financeiro. Tudo idempotente
-- (create or replace / if not exists). NÃO aplicar manualmente — a
-- aplicação é feita pelo orquestrador via MCP.
--
-- Correções:
--   ALTO 2.3  — race no cap de fundadoras: o limite (founder_slots_total)
--               era lido fora da serialização. Agora TANTO o limite QUANTO
--               a contagem de vagas usadas são lidos DEPOIS do
--               pg_advisory_xact_lock, na mesma txn — reduzir o limite no
--               meio de uma aprovação não fura o cap.
--   MÉDIO 1.3 — lock infinito: approve_corretora podia bloquear
--               indefinidamente. Adicionado lock_timeout = '10s'.
--   MÉDIO 4.1 — mark_subscription_paid fazia UPDATE principal + UPDATE de
--               fallback (plan_id null). Unificado num único UPDATE com
--               lookup do billing_period via subquery + coalesce('monthly').
--   MÉDIO 6.1 — pagamento duplicado por contrato: índice unique parcial em
--               produtor_pagamentos (contrato_id) ignorando cancelados.
-- =================================================================

-- =================================================================
-- 1) approve_corretora — leitura do cap sob o lock + lock_timeout (ALTO 2.3, MÉDIO 1.3)
-- =================================================================
-- Mantém assinatura, security definer, search_path, guard de admin
-- (public.is_app_admin(), helper canônico — is_admin() é só alias dele),
-- advisory lock, idempotência, inserts atômicos, audit_log e o retorno
-- TABLE(success, corretora_id, error_msg). A única mudança de
-- comportamento é serializar a leitura do limite junto da contagem (já
-- estava após o lock, agora é garantido) e não esperar lock pra sempre.
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
  -- Não espera lock pra sempre: se não conseguir adquirir em 10s, aborta
  -- com erro em vez de bloquear a conexão indefinidamente (MÉDIO 1.3).
  set local lock_timeout = '10s';

  -- 1) Só admin da plataforma aprova.
  if not public.is_app_admin() then
    return query select false, null::uuid, 'forbidden';
    return;
  end if;

  -- 2) Lock de aplicação que serializa o gate de vagas de fundadora.
  --    Liberado no fim da txn. Garante que dois admins aprovando ao
  --    mesmo tempo não estourem o limite (TOCTOU 2.2).
  perform pg_advisory_xact_lock(9021001);

  -- 3) Carrega o profile e valida idempotência (dupla aprovação 2.3).
  select id, status, corretora_id
    into v_profile
    from public.profiles
   where id = p_profile_id;

  if not found then
    return query select false, null::uuid, 'profile_invalido';
    return;
  end if;
  if v_profile.corretora_id is not null then
    -- Já vinculado a uma corretora → já aprovada antes.
    return query select false, null::uuid, 'ja_aprovada';
    return;
  end if;
  if v_profile.status <> 'pendente'::profile_status then
    return query select false, null::uuid, 'profile_invalido';
    return;
  end if;

  -- 4) Recheck do cap de fundadoras NA MESMA txn, SOB o lock.
  --    Tanto o LIMITE quanto a CONTAGEM são lidos só depois do
  --    pg_advisory_xact_lock acima. Assim, se um admin reduzir
  --    founder_slots_total no meio de outra aprovação, a segunda txn
  --    enxerga o valor já comprometido e respeita o cap (ALTO 2.3).
  select coalesce(
    (select (value #>> '{}')::int from public.platform_settings where key = 'founder_slots_total'),
    5
  )
    into v_total;

  select count(*)
    into v_used
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
   where p.slug = 'corretora-fundador'
     and s.status = 'active';

  if v_used >= v_total then
    return query select false, null::uuid, 'limite_fundadoras';
    return;
  end if;

  -- 5) Escritas atômicas. Qualquer erro reverte tudo.
  begin
    v_lifetime_end := v_now + interval '100 years';

    insert into public.corretoras (name, slug, cnpj, city, state, verified)
    values (p_name, p_slug, p_cnpj, p_city, p_state, true)
    returning id into v_corretora_id;

    update public.profiles
       set corretora_id = v_corretora_id,
           status = 'ativo'::profile_status
     where id = p_profile_id;

    -- Garante o plano fundador (idempotente por slug).
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

    -- Assinatura vitalícia (grátis, +100 anos).
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
        'name', p_name,
        'cnpj', p_cnpj,
        'city', p_city,
        'state', p_state,
        'plano', 'fundador',
        'vitalicio_ate', v_lifetime_end
      )
    );
  exception
    when others then
      return query select false, null::uuid, 'erro: ' || sqlerrm;
      return;
  end;

  -- 6) Sucesso.
  return query select true, v_corretora_id, null::text;
end;
$$;

revoke all on function public.approve_corretora(uuid, text, text, text, text, text) from public;
grant execute on function public.approve_corretora(uuid, text, text, text, text, text) to authenticated;

comment on function public.approve_corretora is
  'Aprova corretora pendente como fundadora numa única txn atômica. advisory lock serializa o gate de vagas; limite E contagem lidos sob o lock (ALTO 2.3); lock_timeout 10s evita bloqueio infinito (MÉDIO 1.3); recheck idempotente impede dupla aprovação.';

-- =================================================================
-- 2) mark_subscription_paid — UPDATE único com coalesce do billing_period (MÉDIO 4.1)
-- =================================================================
-- Mantém assinatura (timestamptz) e semântica. Elimina o padrão de
-- UPDATE principal + UPDATE de fallback: o billing_period vem de uma
-- subquery LEFT-join-equivalente (scalar subselect) e cai em 'monthly'
-- via coalesce quando plan_id é null (assinatura sem plano).
create or replace function public.mark_subscription_paid(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_end timestamptz;
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;

  update public.subscriptions s
     set status = 'active'::subscription_status,
         current_period_start = now(),
         current_period_end = greatest(coalesce(s.current_period_end, now()), now())
           + (case
                when coalesce(
                       (select p.billing_period from public.plans p where p.id = s.plan_id),
                       'monthly'
                     ) = 'yearly'
                  then interval '1 year'
                else interval '1 month'
              end),
         canceled_at = null
   where s.id = p_id
   returning s.current_period_end into v_new_end;

  return v_new_end;
end;
$$;

revoke all on function public.mark_subscription_paid(uuid) from public;
grant execute on function public.mark_subscription_paid(uuid) to authenticated;

comment on function public.mark_subscription_paid is
  'Renova assinatura (status active + estende period_end) atomicamente num único UPDATE. billing_period vem de subquery com coalesce(monthly) — anual +1 ano, resto +1 mês, a partir de greatest(period_end, now()).';

-- =================================================================
-- 3) Índice unique parcial — 1 pagamento ativo por contrato (MÉDIO 6.1)
-- =================================================================
-- Enum status é public.pagamento_status; coluna é "status". Permite
-- recriar um pagamento depois de cancelar o anterior (status='cancelado')
-- e ignora pagamentos avulsos sem contrato (contrato_id null).
create unique index if not exists produtor_pagamentos_contrato_unico
  on public.produtor_pagamentos (contrato_id)
  where status <> 'cancelado' and contrato_id is not null;
