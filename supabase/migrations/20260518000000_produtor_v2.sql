-- =================================================================
-- Milsaca — Produtor v2 + financeiro básico
-- Data: 2026-05-18
-- =================================================================
-- Fortalece a tabela produtores com campos pedidos pelo MVP:
--   CPF/CNPJ/CAEPF, WhatsApp separado, status, espécie, variedades,
--   certificações, IG, polígono (jsonb sem PostGIS ainda — fica EUDR
--   completo pra Fase 2), foto da fazenda, CAR, preferências.
--
-- Cria tabela produtor_pagamentos pra rastrear repasse ao produtor
-- por entrega/contrato com descontos detalhados.
-- =================================================================

-- =================================================================
-- Enums
-- =================================================================
create type public.produtor_specie as enum ('arabica', 'conilon', 'ambos');

create type public.produtor_status as enum (
  'sombra',
  'ativo',
  'pendente',
  'bloqueado'
);

create type public.pagamento_status as enum (
  'pendente',
  'pago',
  'vencido',
  'cancelado'
);

create type public.canal_preferido as enum (
  'app',
  'whatsapp',
  'email',
  'sms'
);

-- =================================================================
-- Produtores — campos novos
-- =================================================================
alter table public.produtores
  add column cpf_cnpj text,
  add column caepf text,
  add column whatsapp text,
  add column status public.produtor_status not null default 'ativo',
  add column specie public.produtor_specie,
  add column variedades jsonb not null default '[]'::jsonb,
  add column certificacoes jsonb not null default '[]'::jsonb,
  add column indicacao_geografica text,
  add column polygon_geojson jsonb,
  add column foto_capa_url text,
  add column car text,
  add column preco_alvo numeric(10, 2),
  add column canal_preferido public.canal_preferido,
  add column receber_cotacao_diaria boolean not null default true;

-- =================================================================
-- Produtor_pagamentos — repasse ao produtor
-- =================================================================
create table public.produtor_pagamentos (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid not null references public.profiles(id) on delete restrict,
  contrato_id uuid references public.contratos(id) on delete set null,
  entrega_id uuid references public.entregas(id) on delete set null,

  valor_bruto numeric(14, 2) not null,
  -- Estrutura esperada: { frete: 100, sacaria: 50, comissao: 925, outros: 0 }
  descontos jsonb not null default '{}'::jsonb,
  valor_liquido numeric(14, 2) not null,

  status public.pagamento_status not null default 'pendente',
  data_prevista date,
  data_paga date,
  comprovante_url text,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index produtor_pagamentos_corretora_id_idx on public.produtor_pagamentos (corretora_id);
create index produtor_pagamentos_produtor_id_idx  on public.produtor_pagamentos (produtor_id);
create index produtor_pagamentos_contrato_id_idx  on public.produtor_pagamentos (contrato_id);
create index produtor_pagamentos_status_idx       on public.produtor_pagamentos (status);
create index produtor_pagamentos_data_prevista_idx on public.produtor_pagamentos (data_prevista);

create trigger produtor_pagamentos_set_updated_at before update on public.produtor_pagamentos
  for each row execute function public.tg_set_updated_at();

-- RLS: corretora dona escreve; produtor lê os seus; admin lê tudo
alter table public.produtor_pagamentos enable row level security;

create policy "produtor_pagamentos_tenant_read"
  on public.produtor_pagamentos for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or produtor_id = auth.uid()
  );

create policy "produtor_pagamentos_tenant_write"
  on public.produtor_pagamentos for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());
