-- =================================================================
-- Milsaca — planos e assinaturas
-- Data: 2026-05-18
-- =================================================================
-- O admin (operador da plataforma) gerencia planos e assinaturas das
-- corretoras. Esta migration cria:
--   plans         — catálogo de planos (Mensal, Anual etc.)
--   subscriptions — assinatura ativa por corretora (1-pra-1)
--
-- Pagamento NÃO é processado aqui — admin marca como paga manualmente
-- e estende current_period_end. Quando integrar Stripe/Asaas, basta
-- popular esses campos via webhook.
-- =================================================================

create type public.billing_period as enum ('monthly', 'yearly');

create type public.subscription_status as enum (
  'trial',     -- período gratuito inicial
  'active',    -- paga, em dia
  'past_due',  -- vencida, aguardando pagamento
  'canceled',  -- cancelada pelo cliente ou admin
  'expired'    -- trial/period encerrado sem renovação
);

-- =================================================================
-- plans
-- =================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents int not null default 0 check (price_cents >= 0),
  billing_period public.billing_period not null default 'monthly',
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plans_active_idx on public.plans (active);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
  before update on public.plans
  for each row
  execute function public.set_updated_at();

alter table public.plans enable row level security;

-- Authenticated lê planos ativos (pra exibir lista pra corretora);
-- admin tudo (inclusive inativos)
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to authenticated
  using (active or public.is_admin());

drop policy if exists plans_admin_all on public.plans;
create policy plans_admin_all on public.plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =================================================================
-- subscriptions
-- =================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null unique references public.corretoras(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trial',
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_plan_idx on public.subscriptions (plan_id);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Corretora vê só a própria; admin vê tudo
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions
  for select to authenticated
  using (
    corretora_id = public.current_corretora()
    or public.is_admin()
  );

-- Admin pode tudo
drop policy if exists subs_admin_all on public.subscriptions;
create policy subs_admin_all on public.subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =================================================================
-- helper: status efetivo (considera trial/period vencido)
-- =================================================================
-- Se trial_ends_at < now() e status='trial', considera expired.
-- Se current_period_end < now() e status='active', considera past_due.
create or replace function public.subscription_effective_status(sub public.subscriptions)
returns public.subscription_status
language sql
stable
as $$
  select case
    when sub.status = 'trial' and sub.trial_ends_at is not null and sub.trial_ends_at < now() then 'expired'::public.subscription_status
    when sub.status = 'active' and sub.current_period_end is not null and sub.current_period_end < now() then 'past_due'::public.subscription_status
    else sub.status
  end
$$;

comment on table public.plans is
  'Catálogo de planos vendidos pela Milsaca. CRUD em /admin/planos.';
comment on table public.subscriptions is
  'Assinatura ativa por corretora (1-pra-1). Gerência em /admin/assinaturas.';
comment on function public.subscription_effective_status is
  'Status considerando expiração automática de trial/period.';
