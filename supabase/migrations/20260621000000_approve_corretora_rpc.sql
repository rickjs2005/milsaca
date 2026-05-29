-- =================================================================
-- Milsaca — approve_corretora() transacional e idempotente
-- Data: 2026-06-21
-- =================================================================
-- Fecha 3 achados da auditoria:
--   2.1 (atomicidade): a aprovação fazia 4 escritas separadas no app
--       (insert corretora → update profile → ensure plan → insert
--       subscription). Se a subscription falhava, a corretora já tinha
--       sido criada e o profile já estava ativo, deixando a corretora
--       sem assinatura e sem rollback.
--   2.2 (TOCTOU): o gate de vagas de fundadora lia founder_program_status()
--       e só depois inseria. Duas aprovações simultâneas podiam passar
--       pelo check ao mesmo tempo e estourar o limite de vagas.
--   2.3 (dupla aprovação): clicar "aprovar" duas vezes criava duas
--       corretoras/subscriptions pro mesmo profile.
--
-- FIX: tudo numa única função SECURITY DEFINER, transacional:
--   - pg_advisory_xact_lock serializa o gate de vagas (resolve TOCTOU);
--     o lock é liberado automaticamente no commit/rollback da txn.
--   - recheck de status/corretora_id do profile dentro da mesma txn
--     (resolve dupla aprovação — idempotente).
--   - bloco exception envolve as escritas: qualquer erro reverte tudo
--     e devolve error_msg em vez de deixar estado parcial.
-- =================================================================

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

  -- 4) Recheck do cap de fundadoras NA MESMA txn (sob o lock).
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
  'Aprova corretora pendente como fundadora numa única txn atômica. advisory lock serializa o gate de vagas; recheck idempotente impede dupla aprovação.';
