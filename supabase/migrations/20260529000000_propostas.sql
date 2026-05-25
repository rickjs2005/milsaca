-- =================================================================
-- Milsaca — entidade propostas
-- Data: 2026-05-25
-- =================================================================
-- Briefing da Fase 9a do redesign do painel: criar "Propostas" como
-- entidade separada de leads. Hoje o lead tem campo `proposed_price`
-- (preço único) mas é normal o corretor mandar várias contra-ofertas
-- pro mesmo produtor — esse fluxo precisa de N propostas por lead.
--
-- Decisões:
--   - 1 lead = N propostas (FK lead_id nullable)
--   - 1 lote = N propostas (FK lote_id nullable)
--   - pelo menos UMA das duas FKs preenchida (check constraint)
--   - corretora_id obrigatório (RLS multi-tenant)
--   - status enum: rascunho → enviada → (aceita | rejeitada | expirada)
--
-- Não toca em `leads.proposed_price` que vira "última proposta sugerida"
-- (compat com Fase 4). Migration aditiva.
-- =================================================================

create type public.proposta_status as enum (
  'rascunho',
  'enviada',
  'aceita',
  'rejeitada',
  'expirada'
);

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,

  -- Alvo: pelo menos um dos dois
  lead_id uuid references public.leads(id) on delete set null,
  lote_id uuid references public.lotes(id) on delete set null,

  -- Conteúdo
  preco_saca numeric(12, 2) not null check (preco_saca >= 0),
  bag_count integer check (bag_count is null or bag_count >= 0),
  mensagem text,
  validade_ate timestamptz,

  -- Ciclo
  status public.proposta_status not null default 'rascunho',
  enviada_em timestamptz,
  respondida_em timestamptz,

  -- Auditoria
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint propostas_target_check
    check (lead_id is not null or lote_id is not null)
);

create index propostas_corretora_idx on public.propostas (corretora_id);
create index propostas_lead_idx
  on public.propostas (lead_id) where lead_id is not null;
create index propostas_lote_idx
  on public.propostas (lote_id) where lote_id is not null;
create index propostas_status_idx on public.propostas (status);

create trigger propostas_set_updated_at
  before update on public.propostas
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- RLS
-- =================================================================
alter table public.propostas enable row level security;

-- Leitura: dona da corretora ou admin
drop policy if exists propostas_select on public.propostas;
create policy propostas_select on public.propostas
  for select to authenticated
  using (
    corretora_id = public.current_corretora()
    or public.is_admin()
  );

-- Insert: só da própria corretora
drop policy if exists propostas_insert on public.propostas;
create policy propostas_insert on public.propostas
  for insert to authenticated
  with check (corretora_id = public.current_corretora());

-- Update: só da própria corretora
drop policy if exists propostas_update on public.propostas;
create policy propostas_update on public.propostas
  for update to authenticated
  using (corretora_id = public.current_corretora())
  with check (corretora_id = public.current_corretora());

-- Delete: só da própria corretora (rascunho idealmente, mas o gate
-- de UI já cuida disso — RLS é defesa em profundidade)
drop policy if exists propostas_delete on public.propostas;
create policy propostas_delete on public.propostas
  for delete to authenticated
  using (corretora_id = public.current_corretora());

-- Admin tudo (consistente com outras tabelas)
drop policy if exists propostas_admin_all on public.propostas;
create policy propostas_admin_all on public.propostas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.propostas is
  'Propostas comerciais — N por lead/lote. Substitui o campo proposed_price único do lead.';
comment on column public.propostas.lead_id is
  'Lead alvo. Nullable porque a proposta pode ser direta sobre um lote sem lead intermediário.';
comment on column public.propostas.lote_id is
  'Lote alvo. Nullable porque a proposta pode ser de uma negociação ainda sem lote definido.';
