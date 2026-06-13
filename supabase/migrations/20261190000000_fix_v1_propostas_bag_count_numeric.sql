-- =================================================================
-- Milsaca — Fix: RPC mobile v1 quebrada por bag_count integer→numeric
-- Data: 2026-06-13 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- BUG (auditoria 2026-06-12, item P2): a migration 20261070 converteu
-- propostas.bag_count (e leads/contratos/entregas/ofertas) de integer
-- para numeric. Mas v1_listar_propostas_produtor (criada em 20260654,
-- ANTES) ainda declara `bag_count integer` no RETURNS TABLE e seleciona
-- pr.bag_count (agora numeric). numeric→integer NÃO é binário-coercível:
-- a função levanta erro 42804 ("structure of query does not match
-- function result type") assim que retorna a 1ª linha. Isso mata o app
-- mobile no primeiro uso da tela de propostas. Não afeta o web (piloto
-- web-only), mas é um contrato v1 publicado e precisa ficar correto.
--
-- Como RETURNS TABLE muda o tipo de retorno, `create or replace` não
-- basta (Postgres recusa mudar o tipo de retorno): drop + create.
--
-- De quebra, alinhamos v1_criar_oferta_produtor à mesma decisão numeric
-- (p_bag_count integer→numeric — fração de saca) e tornamos a checagem
-- de espécie tolerante às DUAS grafias do schema (`conilon` em
-- produtor_specie/coffee_types × `conillon` em coffee_specie/leads), sem
-- alterar nenhum enum. Bodies idênticos aos originais salvo esses tipos.
--
-- Idempotente: drop if exists (assinatura exata) + create + grants.
-- =================================================================

-- -----------------------------------------------------------------
-- 1) v1_listar_propostas_produtor — bag_count integer → numeric
-- -----------------------------------------------------------------
drop function if exists public.v1_listar_propostas_produtor(boolean);

create function public.v1_listar_propostas_produtor(
  p_only_pending boolean default true
)
returns table (
  id uuid,
  status public.proposta_status,
  preco_saca numeric,
  bag_count numeric,
  mensagem text,
  validade_ate timestamptz,
  enviada_em timestamptz,
  respondida_em timestamptz,
  created_at timestamptz,
  lead_id uuid,
  corretora_id uuid,
  corretora_nome text,
  corretora_phone text,
  coffee_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.status,
    pr.preco_saca,
    pr.bag_count,
    pr.mensagem,
    pr.validade_ate,
    pr.enviada_em,
    pr.respondida_em,
    pr.created_at,
    pr.lead_id,
    pr.corretora_id,
    coalesce(c.name, 'Corretora') as corretora_nome,
    c.phone as corretora_phone,
    l.coffee_type
  from public.propostas pr
  join public.leads l on l.id = pr.lead_id
  left join public.corretoras c on c.id = pr.corretora_id
  where auth.uid() is not null
    and l.produtor_id = auth.uid()
    and (not p_only_pending or pr.status = 'enviada')
  order by pr.created_at desc
  limit 200;
$$;

revoke all on function public.v1_listar_propostas_produtor(boolean) from public;
grant execute on function public.v1_listar_propostas_produtor(boolean) to authenticated;

comment on function public.v1_listar_propostas_produtor is
  'v1 (contrato estável mobile): propostas dos leads do produtor logado. Checa auth.uid() = leads.produtor_id. bag_count numeric (fix 20261190).';

-- -----------------------------------------------------------------
-- 2) v1_criar_oferta_produtor — p_bag_count integer → numeric
--    + aceita 'conilon' e 'conillon' (boundary tolerante a grafia)
-- -----------------------------------------------------------------
drop function if exists public.v1_criar_oferta_produtor(uuid, text, text, integer, numeric, text);

create function public.v1_criar_oferta_produtor(
  p_corretora_id uuid,
  p_specie text,
  p_processo text default null,
  p_bag_count numeric default null,
  p_preco_alvo numeric default null,
  p_observacoes text default null
)
returns table (success boolean, lead_id uuid, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_specie_norm text;
  v_specie_label text;
  v_coffee_type text;
begin
  if auth.uid() is null then
    return query select false, null::uuid, 'forbidden';
    return;
  end if;

  -- Tolera as duas grafias do schema: conilon (produtor_specie/coffee_types)
  -- e conillon (coffee_specie/leads). Normaliza pra label humana.
  v_specie_norm := case
    when lower(coalesce(p_specie, '')) = 'arabica' then 'arabica'
    when lower(coalesce(p_specie, '')) like 'conil%' then 'conillon'
    else null
  end;
  if v_specie_norm is null then
    return query select false, null::uuid, 'specie_invalida';
    return;
  end if;

  if not exists (select 1 from public.corretoras where id = p_corretora_id) then
    return query select false, null::uuid, 'corretora_invalida';
    return;
  end if;

  v_specie_label := case v_specie_norm
    when 'arabica' then 'Arábica'
    when 'conillon' then 'Conillón'
    else v_specie_norm
  end;
  v_coffee_type := case
    when p_processo is not null and length(trim(p_processo)) > 0
      then v_specie_label || ' · ' || p_processo
    else v_specie_label
  end;

  insert into public.leads (
    corretora_id, produtor_id, status, origem,
    coffee_type, bag_count, proposed_price, notes
  )
  values (
    p_corretora_id, auth.uid(), 'novo'::public.lead_status, 'vitrine'::public.lead_origem,
    v_coffee_type, p_bag_count, p_preco_alvo, p_observacoes
  )
  returning id into v_lead_id;

  return query select true, v_lead_id, null::text;
exception
  when others then
    return query select false, null::uuid, 'erro: ' || sqlerrm;
end;
$$;

revoke all on function public.v1_criar_oferta_produtor(uuid, text, text, numeric, numeric, text) from public;
grant execute on function public.v1_criar_oferta_produtor(uuid, text, text, numeric, numeric, text) to authenticated;

comment on function public.v1_criar_oferta_produtor is
  'v1 (contrato estável mobile): produtor cria oferta (lead origem=vitrine). p_bag_count numeric; aceita conilon/conillon (fix 20261190).';
