-- =================================================================
-- Milsaca — Compradores + comissão nos contratos
-- Data: 2026-05-17
-- =================================================================
-- Fecha o ciclo da corretagem: produtor (vendedor) ↔ corretora
-- (intermediária) ↔ comprador (indústria/exportador/trading/torrefador).
-- Contrato passa a referenciar comprador + ter comissão configurável.
-- =================================================================

create type public.regime_tributario as enum (
  'simples_nacional',
  'lucro_presumido',
  'lucro_real',
  'mei',
  'isento'
);

create table public.compradores (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,

  -- Identificação
  name text not null,           -- razão social ou nome
  trade_name text,              -- nome fantasia
  cnpj text,                    -- 14 dígitos sem máscara (validar na app)
  inscricao_estadual text,
  regime_tributario public.regime_tributario,

  -- Contato
  contact_name text,
  contact_email text,
  contact_phone text,

  -- Localização
  city text,
  state text,

  -- Tipo (indústria, exportador, trading, torrefador, outro) — texto livre
  -- pra não precisar migration toda hora que aparecer um tipo novo.
  tipo text,

  -- Preferências (tipo/peneira/bebida default) — jsonb pra evolução
  preferencias jsonb not null default '{}'::jsonb,

  ativo boolean not null default true,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (corretora_id, cnpj)
);

create index compradores_corretora_id_idx on public.compradores (corretora_id);
create index compradores_ativo_idx on public.compradores (ativo);

create trigger compradores_set_updated_at before update on public.compradores
  for each row execute function public.tg_set_updated_at();

-- RLS: corretora dona + admin (produtor não vê compradores)
alter table public.compradores enable row level security;

create policy "compradores_tenant_read"
  on public.compradores for select
  using (public.is_admin() or corretora_id = public.current_corretora());

create policy "compradores_tenant_write"
  on public.compradores for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

-- =================================================================
-- Contratos — comprador_id + comissão
-- =================================================================
alter table public.contratos
  add column comprador_id uuid references public.compradores(id) on delete set null,
  add column comissao_pct numeric(5, 2),       -- ex: 1.00 = 1%
  add column comissao_total numeric(14, 2);    -- comissao_pct * total_value / 100

create index contratos_comprador_id_idx on public.contratos (comprador_id);
