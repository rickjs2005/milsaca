-- =================================================================
-- Milsaca — F2 v2: verificação de desmatamento por talhão (MapBiomas)
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Histórico de checagens de desmatamento dos talhões contra o MapBiomas
-- Alerta (corte EUDR: 31/12/2020). O fluxo (server action na web):
--   1. Busca alertas na API GraphQL do MapBiomas por BOUNDING BOX do
--      talhão (filtro grosso — a API não aceita geometria arbitrária);
--   2. Confere a interseção EXATA aqui no PostGIS via
--      talhao_intersecta_wkt (a API retorna geometryWkt do alerta);
--   3. Grava o resultado nesta tabela (uma linha por verificação — é
--      histórico/auditoria, não estado).
--
-- A verificação NÃO trava o eudr_checklist (itens documentais/geo): ela
-- aparece como bloco próprio na UI e seção própria no dossiê PDF.
--
-- Idempotente. Expand-only.
-- =================================================================

create table if not exists public.talhao_verificacoes (
  id             uuid primary key default extensions.uuid_generate_v4(),
  talhao_id      uuid not null references public.talhoes(id) on delete cascade,
  provider       text not null default 'mapbiomas_alerta',
  -- sem_alerta      → nenhum alerta intersecta o talhão desde o corte
  -- alerta_detectado→ >=1 alerta intersecta (detalhes em `alertas`)
  -- erro            → API indisponível/credencial inválida (ver `erro`)
  status         text not null
    check (status in ('sem_alerta', 'alerta_detectado', 'erro')),
  -- Alertas que intersectam: [{code, area_ha, detected_at, status_name,
  -- conferencia: 'exata'|'bbox'}] — 'bbox' quando o WKT não pôde ser
  -- conferido no PostGIS (mantido por precaução, conferir no laudo).
  alertas        jsonb not null default '[]'::jsonb,
  erro           text,
  periodo_inicio date not null default '2020-12-31',
  verificado_em  timestamptz not null default now(),
  verificado_por uuid references public.profiles(id) on delete set null
);

create index if not exists talhao_verificacoes_talhao_idx
  on public.talhao_verificacoes (talhao_id, verificado_em desc);

comment on table public.talhao_verificacoes is
  'Histórico de checagens de desmatamento (MapBiomas Alerta) por talhão. Corte EUDR 31/12/2020. Interseção exata conferida no PostGIS.';

alter table public.talhao_verificacoes enable row level security;

drop policy if exists talhao_verif_admin_all on public.talhao_verificacoes;
create policy talhao_verif_admin_all
  on public.talhao_verificacoes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Produtor: vê as verificações dos talhões dele.
drop policy if exists talhao_verif_produtor_select on public.talhao_verificacoes;
create policy talhao_verif_produtor_select
  on public.talhao_verificacoes for select
  using (exists (
    select 1 from public.talhoes t
      join public.produtores p on p.id = t.produtor_id
     where t.id = talhao_id and p.profile_id = (select auth.uid())));

-- Corretora relacionada ao produtor do talhão: lê e registra verificações.
drop policy if exists talhao_verif_corretora_select on public.talhao_verificacoes;
create policy talhao_verif_corretora_select
  on public.talhao_verificacoes for select
  using (exists (
    select 1 from public.talhoes t
      join public.produtores p on p.id = t.produtor_id
     where t.id = talhao_id
       and (
         exists (select 1 from public.leads l
                  where l.produtor_id = p.profile_id
                    and l.corretora_id = public.current_corretora())
         or exists (select 1 from public.contratos c
                     where c.produtor_id = p.profile_id
                       and c.corretora_id = public.current_corretora())
       )));

drop policy if exists talhao_verif_corretora_insert on public.talhao_verificacoes;
create policy talhao_verif_corretora_insert
  on public.talhao_verificacoes for insert
  with check (
    verificado_por = (select auth.uid())
    and exists (
      select 1 from public.talhoes t
        join public.produtores p on p.id = t.produtor_id
       where t.id = talhao_id
         and (
           exists (select 1 from public.leads l
                    where l.produtor_id = p.profile_id
                      and l.corretora_id = public.current_corretora())
           or exists (select 1 from public.contratos c
                       where c.produtor_id = p.profile_id
                         and c.corretora_id = public.current_corretora())
         )));

-- -----------------------------------------------------------------
-- RPC: interseção exata talhão × geometria WKT do alerta
-- -----------------------------------------------------------------
-- SECURITY INVOKER — só responde para talhões que o chamador enxerga
-- (RLS de talhoes). Retorna:
--   true  → intersecta (ou está a <30m; margem pra talhão-ponto na borda)
--   false → não intersecta
--   null  → WKT não parseável (chamador decide; nosso action mantém o
--           alerta com conferencia='bbox' por precaução)
create or replace function public.talhao_intersecta_wkt(
  p_talhao_id uuid,
  p_wkt       text
) returns boolean
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_alerta extensions.geometry;
begin
  begin
    v_alerta := extensions.st_setsrid(extensions.st_geomfromtext(p_wkt), 4326);
  exception when others then
    return null;
  end;

  return exists (
    select 1 from public.talhoes t
     where t.id = p_talhao_id
       and t.geom is not null
       and (
         extensions.st_intersects(t.geom, v_alerta)
         or extensions.st_dwithin(
              t.geom::extensions.geography,
              v_alerta::extensions.geography,
              30)
       )
  );
end;
$$;

grant execute on function public.talhao_intersecta_wkt(uuid, text)
  to authenticated;
