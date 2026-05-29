-- =================================================================
-- Milsaca — lotes_publicos sem PII de produtor/contato (auditoria 1.2)
-- Data: 2026-06-52 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- A view pública `lotes_publicos` (20260530000000) tinha grant a anon e
-- expunha, sem login:
--   - corretora_phone, corretora_email  (contato comercial → scraping)
--   - produtor_nome (profiles.full_name) (PII do produtor)
--   - fazenda_nome  (identifica a propriedade)
--
-- Não é cross-tenant (catálogo é público por desenho), mas é PII +
-- contato sem auth nem rate-limit → risco LGPD/scraping. Esta migration
-- recria a view REMOVENDO essas 4 colunas e mantém todo o resto
-- (specie/processo/classificação/cidade-UF) intacto.
--
-- O contato da corretora continua disponível pelo fluxo autenticado +
-- com rate-limit (rota /api/leads/whatsapp). A página /lote/[id] usa
-- corretora_slug pra linkar o perfil público da corretora.
--
-- `create or replace` mantém grants existentes; reforçamos os grants no
-- fim por idempotência. security_invoker = off preservado (a view
-- projeta só campos seguros — agora sem PII).
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

  -- Corretora (campos públicos, SEM contato direto — phone/email saíram)
  c.name           as corretora_name,
  c.slug           as corretora_slug,
  c.city           as corretora_city,
  c.state          as corretora_state,
  c.descricao      as corretora_descricao,
  c.logo_url       as corretora_logo_url,
  c.verified       as corretora_verified,

  -- Produtor (sem PII — produtor_nome e fazenda_nome saíram)
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
-- (join com profiles removido: produtor_nome saiu da projeção)
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
  'Catálogo público de lotes. NUNCA adicionar PII aqui (cpf, cnpj, telefone/email do produtor OU da corretora, nome do produtor, nome da fazenda, geolocalização precisa, observações internas). Contato da corretora só via fluxo autenticado + rate-limit.';

revoke all on public.lotes_publicos from public;
grant select on public.lotes_publicos to anon;
grant select on public.lotes_publicos to authenticated;
