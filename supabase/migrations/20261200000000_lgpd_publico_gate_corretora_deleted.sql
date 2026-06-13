-- =================================================================
-- Milsaca — LGPD: RPCs públicas não resolvem artefato de corretora
--                 soft-deleted (auditoria 2026-06-12, item LGPD P2)
-- Data: 2026-06-13 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- get_laudo_publico (20260516010000) e get_contrato_publico (20260632000000)
-- são SECURITY DEFINER e contornam a RLS. A view corretoras_publicas já
-- filtra `deleted_at is null` (20260602), mas essas duas RPCs não — então
-- o laudo/contrato público de uma corretora apagada por pedido LGPD
-- seguia resolvendo e expondo os dados de negócio dela.
--
-- Decisão (dono, 2026-06-13): GATE POR CORRETORA APENAS. Se a corretora
-- está soft-deleted, o link público passa a retornar "não encontrado"
-- (jsonb nulo → a página faz 404). NÃO gateamos pelo produtor: o
-- contrato é documento e a PII do produtor já é mascarada
-- (mask_nome/mask_doc) + anonimizar_titular destrói a PII de fato na
-- exclusão. Assim a permanência do certificado não quebra por causa de
-- uma das partes.
--
-- Só adiciona `and co.deleted_at is null` ao WHERE de cada função.
-- Bodies idênticos aos originais no resto. create or replace (mesmo tipo
-- de retorno jsonb), idempotente. mask_nome/mask_doc não são tocadas.
-- =================================================================

create or replace function public.get_laudo_publico(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id,
    'created_at', c.created_at,
    'tipo', c.tipo,
    'classe', c.classe,
    'bebida', c.bebida,
    'aspecto', c.aspecto,
    'torra', c.torra,
    'umidade', c.umidade,
    'pva', c.pva,
    'impurezas_pct', c.impurezas_pct,
    'total_defeitos', c.total_defeitos,
    'pontuacao', c.pontuacao,
    'fora_de_tipo', c.fora_de_tipo,
    'fora_de_tipo_motivos', c.fora_de_tipo_motivos,
    'bica_corrida', c.bica_corrida,
    'peneira_dominante', c.peneira_dominante,
    'peneiras', c.peneiras,
    'defeitos_crus', c.defeitos_crus,
    'brocados_por_defeito', c.brocados_por_defeito,
    'schema_version', c.schema_version,
    'observacoes', c.observacoes,
    'lote', jsonb_build_object(
      'codigo', l.codigo,
      'specie', l.specie,
      'processo', l.processo,
      'safra', l.safra,
      'peso_sacas', l.peso_sacas
    ),
    'corretora', jsonb_build_object(
      'name', co.name,
      'slug', co.slug,
      'city', co.city,
      'state', co.state,
      'email', co.email,
      'verified', co.verified
    )
  )
  from public.classificacoes_cob c
  join public.lotes l on l.id = c.lote_id
  join public.corretoras co on co.id = c.corretora_id
  where c.id = p_id
    and c.anulada = false
    and co.deleted_at is null;
$$;

grant execute on function public.get_laudo_publico(uuid) to anon, authenticated;

create or replace function public.get_contrato_publico(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', ct.id,
    'code', ct.code,
    'status', ct.status,
    'signed_at', ct.signed_at,
    'content_hash', ct.content_hash,
    'corretora', jsonb_build_object(
      'name', co.name,
      'city', co.city,
      'state', co.state
    ),
    'produtor', jsonb_build_object(
      'nome', public.mask_nome(pr.full_name),
      'doc', public.mask_doc(pd.cpf_cnpj),
      'city', pd.city,
      'state', pd.state
    ),
    'comprador', case
      when cp.id is null then null
      else jsonb_build_object(
        'nome', public.mask_nome(cp.name),
        'doc', public.mask_doc(cp.cnpj),
        'city', cp.city,
        'state', cp.state
      )
    end
  )
  from public.contratos ct
  join public.corretoras co on co.id = ct.corretora_id
  left join public.profiles pr on pr.id = ct.produtor_id
  left join public.produtores pd on pd.profile_id = ct.produtor_id
  left join public.compradores cp on cp.id = ct.comprador_id
  where ct.id = p_id
    and co.deleted_at is null;
$$;

grant execute on function public.get_contrato_publico(uuid) to anon, authenticated;

comment on function public.get_laudo_publico(uuid) is
  'Laudo público (anon). Projeta só campos seguros. Não resolve se a corretora está soft-deleted (LGPD, fix 20261200).';
comment on function public.get_contrato_publico(uuid) is
  'Verificação pública de contrato. PII mascarada. Não resolve se a corretora está soft-deleted (LGPD, fix 20261200).';
