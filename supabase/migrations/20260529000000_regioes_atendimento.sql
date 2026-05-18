-- =================================================================
-- Milsaca — região de atendimento das corretoras
-- Data: 2026-05-18
-- =================================================================
-- Hoje corretoras só têm cidade/UF como localização. Produtor que
-- procura corretora não consegue filtrar por região cafeeira (que
-- é como o mercado pensa — "minha corretora atende a Zona da Mata").
--
-- Esta migration:
--   - cria type região com regiões cafeeiras brasileiras (foco MG/ES
--     mas inclui Cerrado, Mogiana, BA, RO; "Outras" como escape)
--   - adiciona coluna corretoras.regioes_atendimento (text[] convertido
--     em enum[]) — corretora pode marcar múltiplas
--   - recria view corretoras_publicas pra expor o campo no catálogo
--   - index GIN para filtros por @>/&&
-- =================================================================

create type public.regiao_cafeeira as enum (
  'zona_da_mata',
  'sul_de_minas',
  'cerrado_mineiro',
  'matas_de_minas',
  'caparao',
  'mogiana',
  'espirito_santo',
  'bahia',
  'rondonia',
  'outras'
);

alter table public.corretoras
  add column if not exists regioes_atendimento public.regiao_cafeeira[]
    not null default array[]::public.regiao_cafeeira[];

create index if not exists corretoras_regioes_idx
  on public.corretoras
  using gin (regioes_atendimento);

-- Recria view pública pra incluir o novo campo.
-- create or replace view não permite reordenar colunas; nova coluna
-- entra ao final.
create or replace view public.corretoras_publicas
with (security_invoker = off) as
select
  id,
  name,
  slug,
  city,
  state,
  phone,
  email,
  verified,
  descricao,
  logo_url,
  site_url,
  created_at,
  regioes_atendimento
from public.corretoras;

comment on view public.corretoras_publicas is
  'Catálogo público. NUNCA adicionar cnpj/ie/cep/endereco/bairro/telefone_fixo aqui.';

revoke all on public.corretoras_publicas from public;
grant select on public.corretoras_publicas to authenticated;
