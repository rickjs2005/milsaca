-- =================================================================
-- Milsaca — Remove o e-mail da corretora do laudo público (anon)
-- =================================================================
-- get_laudo_publico é SECURITY DEFINER e acessível a `anon`. Ela expunha
-- `co.email` na projeção da corretora — um dado de contato direto da
-- corretora ficava legível por qualquer um que tivesse o link/QR público.
-- Decisão de segurança: o laudo público NÃO precisa do e-mail; o contato
-- da corretora se dá pelos canais internos do app.
--
-- Mantemos a CHAVE `email` no JSON de retorno como null::text para não
-- quebrar o shape consumido pelo app (apps/web/.../laudos lê
-- `corretora.email: string | null`); a exibição já foi removida nos
-- componentes. Resto IDÊNTICO à definição vigente (20261200000000):
-- assinatura jsonb, SECURITY DEFINER, search_path, gate de soft-delete
-- LGPD (`co.deleted_at is null`), grants e mascaramentos preservados.
-- create or replace — idempotente.
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
      -- e-mail removido do laudo público (segurança). Chave mantida como
      -- null pra preservar o shape consumido pelo app.
      'email', null::text,
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

comment on function public.get_laudo_publico(uuid) is
  'Laudo público (anon). Projeta só campos seguros. E-mail da corretora removido (fix 20260663). Não resolve se a corretora está soft-deleted (LGPD, fix 20261200).';
