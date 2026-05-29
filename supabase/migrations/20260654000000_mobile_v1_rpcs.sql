-- =================================================================
-- Milsaca — API versioning v1 para o mobile (auditoria 4.5) — BOUNDED
-- Data: 2026-06-54 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- O app mobile (apps/mobile/src/lib/queries.ts) consome PostgREST direto:
-- joins por nome de FK (propostas_corretora_id_fkey), colunas hardcoded,
-- escrita direta em tabelas. Renomear coluna/FK/enum quebraria o app já
-- publicado na loja (lag de atualização App Store/Play).
--
-- Esta migration cria um CONTRATO ESTÁVEL v1_* só para os 3 fluxos mais
-- acoplados/críticos que o mobile escreve/consome:
--   1. v1_listar_propostas_produtor — lista propostas dos leads do produtor
--   2. v1_responder_proposta        — produtor aceita/rejeita uma proposta
--   3. v1_criar_oferta_produtor     — produtor cria lead "oferta" (vitrine)
--
-- Todas SECURITY DEFINER com checagem de auth (auth.uid()) e de
-- propriedade (o produtor só mexe nos próprios leads/propostas). O shape
-- de retorno é estável: mudanças futuras de schema ficam atrás dessas
-- funções (expand/contract). O restante (cotações, vitrine de corretoras)
-- segue lendo PostgREST direto por ora — ver follow-up em
-- docs/milsaca/convencao-migrations.md (seção "expand/contract").
--
-- Idempotente: create or replace + grants. Não cria tabela.
-- =================================================================

-- -----------------------------------------------------------------
-- 1) v1_listar_propostas_produtor
-- -----------------------------------------------------------------
-- Retorna as propostas dos leads do produtor logado. p_only_pending=true
-- traz só status='enviada' (precisam de resposta). Shape estável: o app
-- mapeia diretamente em PropostaParaProdutor.
create or replace function public.v1_listar_propostas_produtor(
  p_only_pending boolean default true
)
returns table (
  id uuid,
  status public.proposta_status,
  preco_saca numeric,
  bag_count integer,
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
  'v1 (contrato estável mobile): propostas dos leads do produtor logado. Checa auth.uid() = leads.produtor_id.';

-- -----------------------------------------------------------------
-- 2) v1_responder_proposta
-- -----------------------------------------------------------------
-- Produtor aceita/rejeita uma proposta enviada de um lead dele.
-- Compare-and-set: só transiciona se status='enviada' E o lead é do
-- produtor logado (espelha a policy propostas_update_produtor). Retorna
-- success/error_msg em vez de levantar exceção crua.
create or replace function public.v1_responder_proposta(
  p_proposta_id uuid,
  p_resposta text
)
returns table (success boolean, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  if auth.uid() is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_resposta not in ('aceita', 'rejeitada') then
    return query select false, 'resposta_invalida';
    return;
  end if;

  update public.propostas pr
     set status = p_resposta::public.proposta_status,
         respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and exists (
       select 1 from public.leads l
        where l.id = pr.lead_id
          and l.produtor_id = auth.uid()
     );

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    -- Ou não é dona, ou já foi respondida (compare-and-set falhou).
    return query select false, 'proposta_indisponivel';
    return;
  end if;

  return query select true, null::text;
end;
$$;

revoke all on function public.v1_responder_proposta(uuid, text) from public;
grant execute on function public.v1_responder_proposta(uuid, text) to authenticated;

comment on function public.v1_responder_proposta is
  'v1 (contrato estável mobile): produtor aceita/rejeita proposta enviada de um lead próprio (compare-and-set em status=enviada).';

-- -----------------------------------------------------------------
-- 3) v1_criar_oferta_produtor
-- -----------------------------------------------------------------
-- Produtor manifesta interesse de vender pra uma corretora → cria um
-- lead (status=novo, origem=vitrine). Monta coffee_type humano no banco
-- pra desacoplar o app do formato do texto. Checa que o produtor é o
-- próprio (auth.uid()) e que a corretora existe.
create or replace function public.v1_criar_oferta_produtor(
  p_corretora_id uuid,
  p_specie text,
  p_processo text default null,
  p_bag_count integer default null,
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
  v_specie_label text;
  v_coffee_type text;
begin
  if auth.uid() is null then
    return query select false, null::uuid, 'forbidden';
    return;
  end if;
  if p_specie not in ('arabica', 'conillon') then
    return query select false, null::uuid, 'specie_invalida';
    return;
  end if;
  if not exists (select 1 from public.corretoras where id = p_corretora_id) then
    return query select false, null::uuid, 'corretora_invalida';
    return;
  end if;

  v_specie_label := case p_specie
    when 'arabica' then 'Arábica'
    when 'conillon' then 'Conillón'
    else p_specie
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

revoke all on function public.v1_criar_oferta_produtor(uuid, text, text, integer, numeric, text) from public;
grant execute on function public.v1_criar_oferta_produtor(uuid, text, text, integer, numeric, text) to authenticated;

comment on function public.v1_criar_oferta_produtor is
  'v1 (contrato estável mobile): produtor cria oferta (lead origem=vitrine) pra uma corretora. Monta coffee_type no banco. Checa auth.uid() e existência da corretora.';
