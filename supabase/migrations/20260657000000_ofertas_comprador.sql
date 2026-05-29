-- =================================================================
-- Milsaca — ofertas ao comprador (gap C3)
-- Data: 2026-06-57
-- =================================================================
-- A corretora intermedia: capta café do produtor (leads/lotes) e VENDE
-- pra cafeeira/comprador. O lado do produtor já tem `propostas`; faltava
-- registrar/rastrear a oferta ao COMPRADOR. O comprador é offline (só
-- cadastro), então isto é controle da corretora: ela cria a oferta e
-- atualiza o status (enviada -> aceita/recusada) após falar por WhatsApp.
--
-- RLS multi-tenant: só a corretora dona (current_corretora) escreve/lê.
-- =================================================================

create type public.oferta_status as enum (
  'rascunho',
  'enviada',
  'aceita',
  'recusada',
  'expirada'
);

create table public.ofertas_comprador (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  comprador_id uuid not null references public.compradores(id) on delete restrict,
  -- Lote ofertado (normalmente preenchido; nullable pra oferta avulsa).
  lote_id uuid references public.lotes(id) on delete set null,

  preco_saca numeric(12, 2) not null check (preco_saca >= 0),
  bag_count integer check (bag_count is null or bag_count >= 0),
  validade_ate date,
  mensagem text,

  status public.oferta_status not null default 'enviada',

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ofertas_comprador_corretora_idx on public.ofertas_comprador (corretora_id);
create index ofertas_comprador_comprador_idx on public.ofertas_comprador (comprador_id);
create index ofertas_comprador_lote_idx on public.ofertas_comprador (lote_id) where lote_id is not null;
create index ofertas_comprador_status_idx on public.ofertas_comprador (status);

create trigger ofertas_comprador_set_updated_at
  before update on public.ofertas_comprador
  for each row execute function public.tg_set_updated_at();

alter table public.ofertas_comprador enable row level security;

create policy ofertas_comprador_tenant_read on public.ofertas_comprador
  for select to authenticated
  using (public.is_admin() or corretora_id = public.current_corretora());

create policy ofertas_comprador_tenant_write on public.ofertas_comprador
  for all to authenticated
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

comment on table public.ofertas_comprador is
  'Ofertas da corretora ao comprador/cafeeira (offline). Controle/rastreamento; a corretora atualiza o status. RLS por tenant (corretora_id).';
