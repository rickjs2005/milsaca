-- =================================================================
-- Milsaca — F2: Talhões georreferenciados + checklist EUDR (v1)
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Fundação do Dossiê EUDR (Regulamento UE antidesmatamento, prazo
-- 30/12/2026): o exportador precisa da GEOLOCALIZAÇÃO de cada talhão de
-- origem do lote (ponto para ≤4 ha; polígono acima) + due diligence.
--
-- Entrega desta migration:
--   1. PostGIS (schema extensions — padrão Supabase).
--   2. `talhoes` — talhão do PRODUTOR (posse global, como documentos F1),
--      geometria 4326 + coluna `geojson` GERADA (leitura via PostgREST sem
--      função no select).
--   3. `lote_talhoes` — N:N lote↔talhão (um lote pode misturar talhões; a
--      rastreabilidade exige saber quais).
--   4. RPC `criar_talhao` (security INVOKER — RLS decide) convertendo
--      GeoJSON→geometry com validação de tipo.
--   5. `eudr_checklist(p_lote_id)` — itens de conformidade do lote em
--      jsonb; fonte do dashboard e do gate "gerar dossiê" (fase seguinte).
--   6. Valor 'dossie_eudr' no enum documento_categoria (usado na fase
--      seguinte pra arquivar o dossiê gerado — NÃO usado nesta migration,
--      senão o ALTER TYPE falharia na mesma transação).
--
-- Idempotente. Expand-only.
-- =================================================================

create extension if not exists postgis with schema extensions;

alter type public.documento_categoria add value if not exists 'dossie_eudr';

-- -----------------------------------------------------------------
-- 1. talhoes
-- -----------------------------------------------------------------
create table if not exists public.talhoes (
  id           uuid primary key default extensions.uuid_generate_v4(),
  produtor_id  uuid not null references public.produtores(id) on delete cascade,
  nome         text not null check (char_length(nome) between 1 and 120),
  area_ha      numeric(10, 2) check (area_ha is null or area_ha > 0),
  -- 4326 (GPS). Ponto é aceito pelo EUDR até 4 ha; acima, polígono.
  geom         extensions.geometry(Geometry, 4326),
  -- Leitura pronta pra UI/export sem chamar função no select (PostgREST).
  geojson      jsonb generated always as (
    case when geom is null then null
         else extensions.st_asgeojson(geom)::jsonb end
  ) stored,
  -- Como a geometria foi capturada (relevante pra confiança do dado).
  origem       text not null default 'manual'
    check (origem in ('gps', 'mapa', 'arquivo', 'manual')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint talhoes_geom_tipo check (
    geom is null
    or extensions.st_geometrytype(geom) in
       ('ST_Point', 'ST_Polygon', 'ST_MultiPolygon')
  )
);

create index if not exists talhoes_produtor_idx on public.talhoes (produtor_id);

drop trigger if exists tg_set_updated_at_talhoes on public.talhoes;
create trigger tg_set_updated_at_talhoes
  before update on public.talhoes
  for each row execute function public.tg_set_updated_at();

comment on table public.talhoes is
  'Talhões/glebas do produtor com geolocalização (EUDR). Posse do produtor; corretoras relacionadas (lead/contrato) leem e podem cadastrar em nome dele.';

alter table public.talhoes enable row level security;

drop policy if exists talhoes_admin_all on public.talhoes;
create policy talhoes_admin_all
  on public.talhoes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Produtor: CRUD nos próprios talhões.
drop policy if exists talhoes_produtor_all on public.talhoes;
create policy talhoes_produtor_all
  on public.talhoes for all
  using (exists (
    select 1 from public.produtores p
     where p.id = produtor_id and p.profile_id = (select auth.uid())))
  with check (exists (
    select 1 from public.produtores p
     where p.id = produtor_id and p.profile_id = (select auth.uid())));

-- Corretora relacionada (lead/contrato com o produtor): CRUD — a corretora
-- costuma cadastrar o talhão junto com o produtor no mutirão de campo.
drop policy if exists talhoes_corretora_relacionada on public.talhoes;
create policy talhoes_corretora_relacionada
  on public.talhoes for all
  using (exists (
    select 1 from public.produtores p
     where p.id = produtor_id
       and (
         exists (select 1 from public.leads l
                  where l.produtor_id = p.profile_id
                    and l.corretora_id = public.current_corretora())
         or exists (select 1 from public.contratos c
                     where c.produtor_id = p.profile_id
                       and c.corretora_id = public.current_corretora())
       )))
  with check (exists (
    select 1 from public.produtores p
     where p.id = produtor_id
       and (
         exists (select 1 from public.leads l
                  where l.produtor_id = p.profile_id
                    and l.corretora_id = public.current_corretora())
         or exists (select 1 from public.contratos c
                     where c.produtor_id = p.profile_id
                       and c.corretora_id = public.current_corretora())
       )));

-- -----------------------------------------------------------------
-- 2. lote_talhoes (N:N)
-- -----------------------------------------------------------------
create table if not exists public.lote_talhoes (
  lote_id    uuid not null references public.lotes(id) on delete cascade,
  talhao_id  uuid not null references public.talhoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lote_id, talhao_id)
);

create index if not exists lote_talhoes_talhao_idx
  on public.lote_talhoes (talhao_id);

alter table public.lote_talhoes enable row level security;

drop policy if exists lote_talhoes_admin_all on public.lote_talhoes;
create policy lote_talhoes_admin_all
  on public.lote_talhoes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Corretora dona do lote: CRUD. O with check amarra o talhão ao PRODUTOR
-- do lote — não dá pra vincular talhão de outra pessoa.
drop policy if exists lote_talhoes_corretora_all on public.lote_talhoes;
create policy lote_talhoes_corretora_all
  on public.lote_talhoes for all
  using (exists (
    select 1 from public.lotes l
     where l.id = lote_id and l.corretora_id = public.current_corretora()))
  with check (exists (
    select 1 from public.lotes l
      join public.talhoes t on t.id = talhao_id
      join public.produtores p on p.id = t.produtor_id
     where l.id = lote_id
       and l.corretora_id = public.current_corretora()
       and p.profile_id = l.produtor_id));

-- Produtor: vê os vínculos dos lotes dele.
drop policy if exists lote_talhoes_produtor_select on public.lote_talhoes;
create policy lote_talhoes_produtor_select
  on public.lote_talhoes for select
  using (exists (
    select 1 from public.lotes l
     where l.id = lote_id and l.produtor_id = (select auth.uid())));

-- -----------------------------------------------------------------
-- 3. RPC criar_talhao — GeoJSON → geometry com validação
-- -----------------------------------------------------------------
-- SECURITY INVOKER de propósito: o insert passa pela RLS de talhoes, então
-- produtor cria só pra si e corretora só pra produtor relacionado.
create or replace function public.criar_talhao(
  p_produtor_id uuid,
  p_nome        text,
  p_area_ha     numeric,
  p_geojson     jsonb,
  p_origem      text default 'manual'
) returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_geom extensions.geometry;
  v_id   uuid;
begin
  if p_geojson is not null then
    v_geom := extensions.st_setsrid(
      extensions.st_geomfromgeojson(p_geojson::text), 4326);
    if extensions.st_geometrytype(v_geom) not in
       ('ST_Point', 'ST_Polygon', 'ST_MultiPolygon') then
      raise exception 'geometria_invalida: use Point, Polygon ou MultiPolygon';
    end if;
    if not extensions.st_isvalid(v_geom) then
      raise exception 'geometria_invalida: geometria mal formada';
    end if;
  end if;

  insert into public.talhoes (produtor_id, nome, area_ha, geom, origem)
  values (p_produtor_id, p_nome, p_area_ha, v_geom,
          coalesce(nullif(p_origem, ''), 'manual'))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.criar_talhao(uuid, text, numeric, jsonb, text)
  to authenticated;

-- -----------------------------------------------------------------
-- 4. eudr_checklist — conformidade do lote em jsonb
-- -----------------------------------------------------------------
-- SECURITY INVOKER: enxerga o que o chamador enxergaria (RLS). Retorna
--   { "completo": bool, "itens": [ {"key": text, "ok": bool}, ... ] }
-- Labels/explicações ficam na UI (i18n/copy é preocupação do front).
create or replace function public.eudr_checklist(p_lote_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_lote      record;
  v_prod      record;
  v_talhoes   integer;
  v_sem_geo   integer;
  v_doc_car   boolean;
  v_itens     jsonb;
begin
  select l.id, l.produtor_id, l.safra into v_lote
    from public.lotes l where l.id = p_lote_id;
  if v_lote.id is null then
    return jsonb_build_object('completo', false, 'itens', '[]'::jsonb,
                              'erro', 'lote_nao_encontrado');
  end if;

  select p.id, p.car, p.cpf_cnpj into v_prod
    from public.produtores p where p.profile_id = v_lote.produtor_id;

  select count(*),
         count(*) filter (where t.geom is null)
    into v_talhoes, v_sem_geo
    from public.lote_talhoes lt
    join public.talhoes t on t.id = lt.talhao_id
   where lt.lote_id = p_lote_id;

  -- Doc CAR anexado: do produtor (F1) ou direto no lote.
  select exists (
    select 1 from public.documentos d
     where d.categoria = 'car'
       and d.deleted_at is null
       and ((d.owner_kind = 'produtor' and d.owner_id = v_prod.id)
         or (d.owner_kind = 'lote' and d.owner_id = p_lote_id))
  ) into v_doc_car;

  v_itens := jsonb_build_array(
    jsonb_build_object('key', 'produtor_cadastrado', 'ok', v_prod.id is not null),
    jsonb_build_object('key', 'cpf_cnpj',  'ok', coalesce(nullif(trim(v_prod.cpf_cnpj), ''), null) is not null),
    jsonb_build_object('key', 'car_numero','ok', coalesce(nullif(trim(v_prod.car), ''), null) is not null),
    jsonb_build_object('key', 'car_documento', 'ok', v_doc_car),
    jsonb_build_object('key', 'talhao_vinculado', 'ok', v_talhoes > 0),
    jsonb_build_object('key', 'talhoes_georreferenciados',
                       'ok', v_talhoes > 0 and v_sem_geo = 0),
    jsonb_build_object('key', 'safra', 'ok', coalesce(nullif(trim(v_lote.safra), ''), null) is not null)
  );

  return jsonb_build_object(
    'completo',
    (select bool_and((i->>'ok')::boolean) from jsonb_array_elements(v_itens) i),
    'itens', v_itens
  );
end;
$$;

grant execute on function public.eudr_checklist(uuid) to authenticated;
