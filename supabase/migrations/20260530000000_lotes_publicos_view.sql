-- =================================================================
-- Milsaca — view pública de lotes pra rota /lote/[id]
-- Data: 2026-05-25
-- =================================================================
-- Fase 9b do redesign: corretora compartilha lote individualmente com
-- compradores via link público. Hoje `lotes` é gated por RLS de
-- corretora_id, então visitante anon não acessa.
--
-- Estratégia (espelha `corretoras_publicas`):
--   - View `lotes_publicos` com `security_invoker = off` (executa
--     como owner — bypass RLS interna). Escolha CONSCIENTE: a view
--     projeta SÓ campos seguros.
--   - Filtra status: rascunho/arquivado nunca aparecem publicamente.
--   - JOIN lateral com classificacoes_cob pra trazer só a vigente.
--   - JOIN com corretoras (campos públicos) + produtores (sem PII).
--   - Grant select pra anon — corretora vai compartilhar com produtor
--     ou comprador que não tem conta na Milsaca.
--
-- PII deliberadamente OMITIDA da view:
--   - lotes.observacoes (info interna do corretor)
--   - produtores.cpf_cnpj, caepf, whatsapp, lat, lng, polygon_geojson,
--     preco_alvo, canal_preferido, deleted_at
--   - profiles.phone, avatar_url (corretora pode escolher mostrar
--     foto na view futuramente, mas hoje fica fora)
--   - classificacoes_cob.total_defeitos (info técnica detalhada)
--   - corretoras.cnpj, inscricao_est, cep, endereco, bairro,
--     telefone_fixo (mesma proteção da view corretoras_publicas)
-- =================================================================

create or replace view public.lotes_publicos
with (security_invoker = off) as
select
  l.id,
  l.codigo,
  l.safra,
  l.descricao,
  l.specie,
  l.processo,
  l.peso_sacas,
  l.peso_kg,
  l.status,
  l.created_at,
  l.corretora_id,
  l.produtor_id,

  -- Corretora (campos públicos)
  c.name           as corretora_name,
  c.slug           as corretora_slug,
  c.city           as corretora_city,
  c.state          as corretora_state,
  c.phone          as corretora_phone,
  c.email          as corretora_email,
  c.descricao      as corretora_descricao,
  c.logo_url       as corretora_logo_url,
  c.verified       as corretora_verified,

  -- Produtor (sem PII)
  pf.full_name     as produtor_nome,
  p.fazenda_nome,
  p.city           as produtor_city,
  p.state          as produtor_state,
  p.altitude_m,
  p.certificacoes,
  p.indicacao_geografica,
  p.foto_capa_url,

  -- Classificação vigente (1 via LATERAL)
  cl.tipo               as classificacao_tipo,
  cl.fora_de_tipo       as classificacao_fora_de_tipo,
  cl.bebida             as classificacao_bebida,
  cl.pontuacao          as classificacao_pontuacao,
  cl.peneira_dominante  as classificacao_peneira,
  cl.bica_corrida       as classificacao_bica_corrida
from public.lotes l
join public.corretoras c on c.id = l.corretora_id
left join public.profiles pf on pf.id = l.produtor_id
left join public.produtores p on p.profile_id = l.produtor_id
left join lateral (
  select tipo, fora_de_tipo, bebida, pontuacao, peneira_dominante, bica_corrida
  from public.classificacoes_cob
  where lote_id = l.id and not anulada
  order by created_at desc
  limit 1
) cl on true
where l.status in (
  'aguardando_classificacao',
  'classificado',
  'fora_de_tipo',
  'rebeneficiar',
  'vendido'
);

comment on view public.lotes_publicos is
  'Catálogo público de lotes. NUNCA adicionar PII aqui (cpf, cnpj, telefone do produtor, geolocalização precisa, observações internas).';

revoke all on public.lotes_publicos from public;
grant select on public.lotes_publicos to anon;
grant select on public.lotes_publicos to authenticated;
