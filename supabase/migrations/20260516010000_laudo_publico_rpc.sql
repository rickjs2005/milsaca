-- =================================================================
-- Milsaca — Função RPC para laudo público (Fase 10)
-- =================================================================
-- Expõe SOMENTE os campos públicos de uma classificação COB
-- (sem nome do produtor, sem dados sensíveis), permitindo que o link
-- com QR seja consultado por anônimos.
-- SECURITY DEFINER contorna RLS de classificacoes_cob/lotes/corretoras
-- mas a função filtra os campos manualmente — privacidade preservada.
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
  where c.id = p_id and c.anulada = false;
$$;

grant execute on function public.get_laudo_publico(uuid) to anon, authenticated;
