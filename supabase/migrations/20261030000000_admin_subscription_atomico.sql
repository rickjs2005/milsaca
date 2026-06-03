-- =================================================================
-- Milsaca — RPCs atômicas pra assinatura (R: updateSubscription não-atômica)
-- Data: 2026-06-02
-- =================================================================
-- updateSubscription / cancelSubscription / grantCorretoraTier faziam a
-- escrita na subscription e o INSERT no audit_log em chamadas separadas — se
-- o audit falhasse, ficava write sem trilha. Estas RPCs SECURITY DEFINER fazem
-- tudo numa única transação (função plpgsql = atômica). Gate de app-admin +
-- actor_id = auth.uid(). create or replace (idempotente).
-- =================================================================

create or replace function public.admin_update_subscription(
  p_id uuid,
  p_status text,
  p_plan_id uuid,
  p_trial_ends_at timestamptz,
  p_current_period_end timestamptz,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.subscriptions
     set status = p_status::public.subscription_status,
         plan_id = p_plan_id,
         trial_ends_at = p_trial_ends_at,
         current_period_end = p_current_period_end,
         canceled_at = case when p_status = 'canceled' then now() else null end,
         notes = p_notes
   where id = p_id;
  if not found then
    raise exception 'assinatura não encontrada' using errcode = 'no_data_found';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (
    auth.uid(), 'update_subscription', 'subscription', p_id,
    jsonb_build_object('status', p_status, 'plan_id', p_plan_id)
  );
end;
$$;

create or replace function public.admin_cancel_subscription(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.subscriptions
     set status = 'canceled', canceled_at = now()
   where id = p_id;
  if not found then
    raise exception 'assinatura não encontrada' using errcode = 'no_data_found';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'subscription_canceled', 'subscription', p_id, '{}'::jsonb);
end;
$$;

-- grantCorretoraTier: gratuito = cancela; pro/premium = upsert da subscription.
-- O plano (p_plan_id) e o período (p_period_end) são resolvidos no caller
-- (upsert/lookup idempotente do plano); aqui a subscription + audit ficam atômicos.
create or replace function public.admin_grant_corretora_tier(
  p_corretora_id uuid,
  p_tier text,
  p_plan_id uuid default null,
  p_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_tier not in ('gratuito', 'pro', 'premium') then
    raise exception 'tier inválido' using errcode = 'check_violation';
  end if;

  if p_tier = 'gratuito' then
    update public.subscriptions
       set status = 'canceled', canceled_at = now()
     where corretora_id = p_corretora_id;
  else
    insert into public.subscriptions
      (corretora_id, plan_id, status, started_at,
       current_period_start, current_period_end, canceled_at, trial_ends_at)
    values
      (p_corretora_id, p_plan_id, 'active', now(),
       now(), p_period_end, null, null)
    on conflict (corretora_id) do update
      set plan_id = excluded.plan_id,
          status = 'active',
          current_period_start = now(),
          current_period_end = excluded.current_period_end,
          canceled_at = null,
          trial_ends_at = null;
  end if;

  insert into public.audit_log
    (actor_id, corretora_id, action, entity, entity_id, payload)
  values (
    auth.uid(), p_corretora_id, 'grant_tier_' || p_tier, 'corretora',
    p_corretora_id, jsonb_build_object('tier', p_tier, 'plan_id', p_plan_id)
  );
end;
$$;

grant execute on function public.admin_update_subscription(uuid, text, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_cancel_subscription(uuid) to authenticated;
grant execute on function public.admin_grant_corretora_tier(uuid, text, uuid, timestamptz) to authenticated;
