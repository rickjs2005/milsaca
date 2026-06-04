-- =================================================================
-- Milsaca — Metas de venda (planejamento de venda do produtor) — Fase 7
-- Data: 2026-06-04
-- =================================================================
-- O produtor planeja a safra: "vender X sacas acima de R$ Y". É ALOCAÇÃO
-- (price_alerts é só notificação). Cada meta pode disparar um price_alert
-- (acima_de) pra avisar quando o mercado bater o alvo. "Aguardando mercado" =
-- disponível − Σ metas (calculado na app, não vira linha). Aditiva, idempotente.
-- =================================================================

create table if not exists public.metas_venda (
  id uuid primary key default extensions.uuid_generate_v4(),
  produtor_id uuid not null references public.profiles(id) on delete cascade,
  sacas numeric not null check (sacas > 0),
  preco_alvo numeric(12, 2) not null check (preco_alvo > 0),
  status text not null default 'ativa' check (status in ('ativa', 'concluida', 'cancelada')),
  alerta_id uuid references public.price_alerts(id) on delete set null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metas_venda_produtor_idx on public.metas_venda (produtor_id);

drop trigger if exists metas_venda_set_updated_at on public.metas_venda;
create trigger metas_venda_set_updated_at before update on public.metas_venda
  for each row execute function public.tg_set_updated_at();

alter table public.metas_venda enable row level security;

drop policy if exists metas_venda_owner on public.metas_venda;
create policy metas_venda_owner on public.metas_venda for all to authenticated
  using (produtor_id = auth.uid() or public.is_admin())
  with check (produtor_id = auth.uid() or public.is_admin());
