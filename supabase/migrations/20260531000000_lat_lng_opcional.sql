-- =================================================================
-- Milsaca — coordenadas opcionais em corretoras e produtores
-- Data: 2026-05-18
-- =================================================================
-- Base pra mapa de corretoras (futuro) e busca por proximidade.
-- Sem PostGIS por enquanto — colunas numeric simples bastam pra
-- exibir markers e calcular distância no client.
--
-- Quando precisar de raio/buffer geográfico real, migrar pra
-- geography(Point) com PostGIS.
-- =================================================================

alter table public.corretoras
  add column if not exists lat numeric(10, 7),
  add column if not exists lng numeric(10, 7);

alter table public.produtores
  add column if not exists lat numeric(10, 7),
  add column if not exists lng numeric(10, 7);

-- Recria view pública incluindo lat/lng (campos não-sensíveis).
-- create or replace não permite reordenar, então novas colunas
-- entram ao final.
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
  regioes_atendimento,
  lat,
  lng
from public.corretoras;

comment on view public.corretoras_publicas is
  'Catálogo público. NUNCA adicionar cnpj/ie/cep/endereco/bairro/telefone_fixo aqui.';

revoke all on public.corretoras_publicas from public;
grant select on public.corretoras_publicas to authenticated;
