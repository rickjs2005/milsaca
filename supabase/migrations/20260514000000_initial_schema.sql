-- =================================================================
-- Milsaca — schema inicial
-- Data: 2026-05-14
-- Convenções:
--   - Nomes técnicos em inglês (ou no nome combinado quando em pt).
--   - UUID v4 como PK em tudo.
--   - timestamptz para created_at/updated_at.
--   - RLS HABILITADO em TODAS as tabelas em `public`.
--   - Multi-tenant por corretora_id.
--   - Helpers: current_role(), current_corretora(), is_admin().
-- =================================================================

-- Extensions ------------------------------------------------------
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Enums -----------------------------------------------------------
create type public.user_role as enum ('produtor', 'corretora', 'admin');

create type public.lead_status as enum (
  'novo',
  'em_negociacao',
  'convertido',
  'perdido',
  'arquivado'
);

create type public.contrato_status as enum (
  'rascunho',
  'em_analise',
  'ativo',
  'finalizado',
  'cancelado'
);

create type public.notification_kind as enum (
  'lead',
  'contrato',
  'cotacao',
  'sistema'
);

-- =================================================================
-- updated_at trigger
-- =================================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =================================================================
-- corretoras
-- =================================================================
create table public.corretoras (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  city text,
  state text,
  phone text,
  email text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger corretoras_set_updated_at before update on public.corretoras
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- profiles (1-1 com auth.users)
-- =================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'produtor',
  corretora_id uuid references public.corretoras(id) on delete set null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_corretora_id_idx on public.profiles (corretora_id);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- helpers (precisam de profiles)
-- =================================================================
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_corretora()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select corretora_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- =================================================================
-- handle_new_user — cria profile no signup
-- =================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'produtor'),
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================================================================
-- produtores (perfil estendido do produtor)
-- =================================================================
create table public.produtores (
  id uuid primary key default extensions.uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  fazenda_nome text,
  city text,
  state text,
  area_ha numeric(10,2),
  altitude_m integer,
  preferencias jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index produtores_state_idx on public.produtores (state);
create trigger produtores_set_updated_at before update on public.produtores
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- leads
-- =================================================================
create table public.leads (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid references public.profiles(id) on delete set null,
  status public.lead_status not null default 'novo',
  coffee_type text,
  bag_count integer,
  proposed_price numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_corretora_id_idx on public.leads (corretora_id);
create index leads_produtor_id_idx on public.leads (produtor_id);
create index leads_status_idx on public.leads (status);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- lead_events (timeline)
-- =================================================================
create table public.lead_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index lead_events_lead_id_idx on public.lead_events (lead_id);
create index lead_events_corretora_id_idx on public.lead_events (corretora_id);

-- =================================================================
-- contratos
-- =================================================================
create table public.contratos (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid not null references public.profiles(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  code text not null unique,
  status public.contrato_status not null default 'rascunho',
  coffee_type text,
  bag_count integer,
  total_value numeric(14,2),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contratos_corretora_id_idx on public.contratos (corretora_id);
create index contratos_produtor_id_idx on public.contratos (produtor_id);
create index contratos_status_idx on public.contratos (status);
create trigger contratos_set_updated_at before update on public.contratos
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- notifications
-- =================================================================
create table public.notifications (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications (user_id);

-- =================================================================
-- cotacoes (snapshots de preço)
-- =================================================================
create table public.cotacoes (
  id uuid primary key default extensions.uuid_generate_v4(),
  coffee_type text not null,
  region text,
  price numeric(12,2) not null,
  source text,
  reference_date date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index cotacoes_type_date_idx on public.cotacoes (coffee_type, reference_date desc);

-- =================================================================
-- audit_log
-- =================================================================
create table public.audit_log (
  id uuid primary key default extensions.uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  corretora_id uuid references public.corretoras(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_corretora_id_idx on public.audit_log (corretora_id);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- =================================================================
-- favoritos (produtor favorita corretora)
-- =================================================================
create table public.favoritos (
  id uuid primary key default extensions.uuid_generate_v4(),
  produtor_id uuid not null references public.profiles(id) on delete cascade,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (produtor_id, corretora_id)
);
create index favoritos_corretora_id_idx on public.favoritos (corretora_id);

-- =================================================================
-- RLS — habilitar em TODAS as tabelas em public
-- =================================================================
alter table public.corretoras   enable row level security;
alter table public.profiles     enable row level security;
alter table public.produtores   enable row level security;
alter table public.leads        enable row level security;
alter table public.lead_events  enable row level security;
alter table public.contratos    enable row level security;
alter table public.notifications enable row level security;
alter table public.cotacoes     enable row level security;
alter table public.audit_log    enable row level security;
alter table public.favoritos    enable row level security;

-- =================================================================
-- Policies básicas
-- (refinar conforme features forem entregues)
-- =================================================================

-- corretoras: leitura pública (catálogo); escrita só admin
create policy "corretoras_public_read"
  on public.corretoras for select using (true);
create policy "corretoras_admin_write"
  on public.corretoras for all using (public.is_admin()) with check (public.is_admin());

-- profiles: dono lê/atualiza; admin tudo
create policy "profiles_self_read"
  on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_self_update"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_all"
  on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- produtores: dono CRUD; admin tudo
create policy "produtores_owner_all"
  on public.produtores for all
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

-- leads: corretora dona OU produtor envolvido OU admin
create policy "leads_tenant_read"
  on public.leads for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or produtor_id = auth.uid()
  );
create policy "leads_tenant_write"
  on public.leads for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

-- lead_events: mesmas regras de leads
create policy "lead_events_tenant_read"
  on public.lead_events for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
  );
create policy "lead_events_tenant_write"
  on public.lead_events for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

-- contratos: corretora dona OU produtor envolvido OU admin
create policy "contratos_tenant_read"
  on public.contratos for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or produtor_id = auth.uid()
  );
create policy "contratos_tenant_write"
  on public.contratos for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

-- notifications: dono
create policy "notifications_owner_read"
  on public.notifications for select using (auth.uid() = user_id or public.is_admin());
create policy "notifications_owner_update"
  on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_admin_insert"
  on public.notifications for insert with check (public.is_admin());

-- cotacoes: leitura para todo autenticado; escrita só admin
create policy "cotacoes_authenticated_read"
  on public.cotacoes for select using (auth.role() = 'authenticated');
create policy "cotacoes_admin_write"
  on public.cotacoes for all using (public.is_admin()) with check (public.is_admin());

-- audit_log: leitura corretora dona; escrita só admin/sistema
create policy "audit_log_tenant_read"
  on public.audit_log for select
  using (public.is_admin() or corretora_id = public.current_corretora());
create policy "audit_log_admin_write"
  on public.audit_log for all using (public.is_admin()) with check (public.is_admin());

-- favoritos: dono
create policy "favoritos_owner_read"
  on public.favoritos for select using (auth.uid() = produtor_id or public.is_admin());
create policy "favoritos_owner_write"
  on public.favoritos for all
  using (auth.uid() = produtor_id)
  with check (auth.uid() = produtor_id);

-- =================================================================
-- Permissões padrão
-- =================================================================
grant usage on schema public to authenticated, anon;
grant select on public.corretoras to anon, authenticated;
grant select on public.cotacoes   to authenticated;
