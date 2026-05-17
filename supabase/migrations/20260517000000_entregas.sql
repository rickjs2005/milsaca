-- =================================================================
-- Milsaca — Entregas (romaneio mínimo)
-- Data: 2026-05-17
-- =================================================================
-- Cada entrega referencia 1 contrato. Um contrato pode ter N entregas
-- parciais (sequencia = 1..N). MVP: campos de romaneio (peso/umidade)
-- são opcionais e viram a "ficha de recebimento" quando preenchidos.
--
-- Fora desta migration (vai pra V2):
--   - Conferência re-amostragem com link a classificacoes_cob
--   - Arbitragem (3 classificadores)
--   - Upload CT-e em Storage
--   - Histórico de divergências → score
-- =================================================================

create type public.entrega_status as enum (
  'programada',
  'em_transito',
  'recebida',
  'conferida',
  'cancelada'
);

create table public.entregas (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  contrato_id  uuid not null references public.contratos(id)  on delete cascade,
  produtor_id  uuid not null references public.profiles(id)   on delete restrict,

  -- Ordem dentro do contrato (1 de N). Útil pra entregas parciais.
  sequencia integer not null default 1,

  -- Quantidade desta entrega específica (pode ser menor que o contrato total)
  bag_count integer,

  -- Ciclo
  status public.entrega_status not null default 'programada',
  data_prevista  date,
  data_realizada date,

  -- Logística simples (sem upload de CT-e ainda)
  local_retirada      text,
  transportadora_nome text,
  transportadora_doc  text,

  -- Romaneio (opcional — vira "ficha de recebimento" quando recebida)
  peso_bruto_kg   numeric(12, 2),
  peso_tara_kg    numeric(12, 2),
  peso_liquido_kg numeric(12, 2),
  umidade_pct     numeric(5, 2),

  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (contrato_id, sequencia)
);

create index entregas_corretora_id_idx on public.entregas (corretora_id);
create index entregas_contrato_id_idx  on public.entregas (contrato_id);
create index entregas_produtor_id_idx  on public.entregas (produtor_id);
create index entregas_status_idx       on public.entregas (status);
create index entregas_data_prevista_idx on public.entregas (data_prevista);

create trigger entregas_set_updated_at before update on public.entregas
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- RLS — mesmo padrão de lotes (corretora dona OU produtor envolvido OU admin)
-- =================================================================
alter table public.entregas enable row level security;

create policy "entregas_tenant_read"
  on public.entregas for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or produtor_id = auth.uid()
  );

-- Só corretora escreve (produtor é read-only nas entregas)
create policy "entregas_tenant_write"
  on public.entregas for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());
