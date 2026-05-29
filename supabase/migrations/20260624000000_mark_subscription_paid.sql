-- =================================================================
-- Milsaca — mark_subscription_paid() atômico
-- Data: 2026-06-24
-- =================================================================
-- Fecha o achado 2.6 (read-modify-write não-atômico): markSubscriptionPaid
-- lia current_period_end no app, calculava o novo fim em JS e escrevia de
-- volta. Dois cliques (ou duas abas) podiam ler o mesmo período e estender
-- duas vezes a partir da MESMA base, ou perder uma extensão. FIX: o UPDATE
-- calcula o novo período no próprio Postgres, partindo de greatest(período
-- atual, agora) — idempotente sob concorrência por linha.
-- =================================================================

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
                when p.billing_period = 'yearly' then interval '1 year'
                else interval '1 month'
              end),
         canceled_at = null
    from public.plans p
   where s.id = p_id
     and p.id = s.plan_id
   returning s.current_period_end into v_new_end;

  -- Fallback: assinatura sem plano vinculado (plan_id null não casa no
  -- join acima). Estende como mensal.
  if v_new_end is null then
    update public.subscriptions s
       set status = 'active'::subscription_status,
           current_period_start = now(),
           current_period_end = greatest(coalesce(s.current_period_end, now()), now()) + interval '1 month',
           canceled_at = null
     where s.id = p_id
     returning s.current_period_end into v_new_end;
  end if;

  return v_new_end;
end;
$$;

revoke all on function public.mark_subscription_paid(uuid) from public;
grant execute on function public.mark_subscription_paid(uuid) to authenticated;

comment on function public.mark_subscription_paid is
  'Renova assinatura (status active + estende period_end) atomicamente no banco. Mensal +1 mês, anual +1 ano, a partir de greatest(period_end, now()).';
