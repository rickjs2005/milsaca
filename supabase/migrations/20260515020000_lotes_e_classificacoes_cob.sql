-- =================================================================
-- Milsaca — Lotes + classificações COB
-- Data: 2026-05-15
-- =================================================================
-- Cobre a IN 8/2003 (MAPA) para classificação de café cru.
-- Estrutura mínima: lote (o que está sendo classificado) e
-- classificacao_cob (o laudo). Cupping SCA, talhões com PostGIS
-- e certificações virão em migrations seguintes.

create type public.coffee_specie as enum ('arabica', 'conillon');

create type public.coffee_processo as enum (
  'natural',
  'cereja_descascado',
  'cd_desmucilado',
  'despolpado',
  'fermentacao_induzida'
);

create type public.lote_status as enum (
  'rascunho',
  'aguardando_classificacao',
  'classificado',
  'fora_de_tipo',
  'rebeneficiar',
  'vendido',
  'arquivado'
);

-- =================================================================
-- lotes — algo concreto que o produtor entrega/oferece pra negociar
-- =================================================================
create table public.lotes (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid not null references public.profiles(id) on delete restrict,

  -- identificação humana
  codigo text not null, -- ex: "LM-2026-0001"
  safra text,           -- ex: "2025/2026"
  descricao text,

  -- atributos do café (antes da classificação)
  specie public.coffee_specie not null,
  processo public.coffee_processo,
  peso_sacas numeric(10, 2),    -- nº de sacas (60 kg)
  peso_kg numeric(12, 2),       -- peso total em kg (caso queira granularidade)
  umidade_inicial numeric(5, 2), -- %

  -- ciclo
  status public.lote_status not null default 'rascunho',
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (corretora_id, codigo)
);

create index lotes_corretora_id_idx on public.lotes (corretora_id);
create index lotes_produtor_id_idx on public.lotes (produtor_id);
create index lotes_status_idx on public.lotes (status);

create trigger lotes_set_updated_at before update on public.lotes
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- classificacoes_cob — laudo COB de um lote
-- =================================================================
-- Um lote pode ter MAIS de uma classificação ao longo do tempo
-- (rebeneficio, reclassificação). A "vigente" é a mais recente
-- não anulada.
create table public.classificacoes_cob (
  id uuid primary key default extensions.uuid_generate_v4(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  classificador_id uuid references public.profiles(id) on delete set null,

  -- ===== resultado calculado (espelha o output do @milsaca/cob) =====
  total_defeitos integer not null,
  tipo text,                    -- "2", "4", "4-25", "6", "8"... null se fora de tipo
  pontuacao integer,            -- relativa ao Tipo 4 (=0)
  fora_de_tipo boolean not null default false,
  fora_de_tipo_motivos jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,

  -- ===== dados crus que alimentaram o cálculo (auditáveis) =====
  defeitos_crus jsonb not null,
  -- formato: { intrinsecos: {...}, extrinsecos: {...} }

  -- ===== parâmetros de cálculo =====
  brocados_por_defeito smallint not null default 3
    check (brocados_por_defeito between 2 and 5),

  -- ===== outras dimensões da IN =====
  -- bebida: valores válidos dependem de specie do lote (validar na app)
  bebida text,
  classe text, -- cor: verde_azulado, verde_cana, verde, amarelada, amarela, marrom, esbranquicada, chumbado, discrepante
  aspecto text check (aspecto in ('bom', 'regular', 'mau')),
  torra text,

  -- peneiras: array de { peneira, percentual }
  peneiras jsonb not null default '[]'::jsonb,
  peneira_dominante text,
  bica_corrida boolean not null default false,

  -- umidade, PVA, impurezas extras
  umidade numeric(5, 2),
  pva numeric(5, 2),
  impurezas_pct numeric(5, 2),

  observacoes text,
  pdf_url text,

  -- estado da classificação
  anulada boolean not null default false,
  anulada_motivo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classificacoes_cob_lote_id_idx on public.classificacoes_cob (lote_id);
create index classificacoes_cob_corretora_id_idx on public.classificacoes_cob (corretora_id);
create index classificacoes_cob_tipo_idx on public.classificacoes_cob (tipo);
create index classificacoes_cob_fora_de_tipo_idx on public.classificacoes_cob (fora_de_tipo) where fora_de_tipo;

create trigger classificacoes_cob_set_updated_at before update on public.classificacoes_cob
  for each row execute function public.tg_set_updated_at();

-- =================================================================
-- RLS
-- =================================================================
alter table public.lotes enable row level security;
alter table public.classificacoes_cob enable row level security;

-- lotes: corretora dona OU produtor envolvido OU admin
create policy "lotes_tenant_read"
  on public.lotes for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or produtor_id = auth.uid()
  );

create policy "lotes_tenant_write"
  on public.lotes for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

-- classificacoes_cob: idem regras de lotes
create policy "classificacoes_cob_tenant_read"
  on public.classificacoes_cob for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or exists (
      select 1 from public.lotes l
       where l.id = classificacoes_cob.lote_id
         and l.produtor_id = auth.uid()
    )
  );

create policy "classificacoes_cob_tenant_write"
  on public.classificacoes_cob for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());
