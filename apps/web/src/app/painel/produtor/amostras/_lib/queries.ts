import { createClient } from "@milsaca/db/web/server";

// Uma amostra do produtor (já com nomes resolvidos dos joins).
export type MinhaAmostra = {
  id: string;
  status: string;
  corretoraNome: string | null;
  loteCodigo: string | null;
  loteSpecie: string | null;
  dataEntregaPrevista: string | null;
  dataRecebida: string | null;
  dataResultado: string | null;
  mensagem: string | null;
  motivoRecusa: string | null;
  resultadoBebida: string | null;
  resultadoTipo: string | null;
  resultadoForaDeTipo: boolean | null;
  precoOferta: number | null;
  laudoObservacoes: string | null;
};

export type LoteParaAmostra = {
  id: string;
  codigo: string;
  specie: string;
};

export type CorretoraParaAmostra = {
  id: string;
  name: string;
};

// supabase-js pode devolver o join como objeto OU array (1:N inferido). Normaliza.
function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/**
 * Amostras do produtor com lote e corretora resolvidos, mais recentes primeiro.
 * RLS já restringe às amostras do próprio produtor (a página agrupa por lote).
 */
export async function loadMinhasAmostras(
  produtorId: string,
): Promise<MinhaAmostra[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("amostras")
    .select(
      "id, status, data_entrega_prevista, data_recebida, data_resultado, mensagem, motivo_recusa, resultado_bebida, resultado_tipo, resultado_fora_de_tipo, preco_oferta, laudo_observacoes, lotes(codigo, specie), corretoras(name)",
    )
    .eq("produtor_id", produtorId)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    status: string;
    data_entrega_prevista: string | null;
    data_recebida: string | null;
    data_resultado: string | null;
    mensagem: string | null;
    motivo_recusa: string | null;
    resultado_bebida: string | null;
    resultado_tipo: string | null;
    resultado_fora_de_tipo: boolean | null;
    preco_oferta: number | string | null;
    laudo_observacoes: string | null;
    lotes:
      | { codigo: string; specie: string }
      | { codigo: string; specie: string }[]
      | null;
    corretoras: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as Row[]).map((a): MinhaAmostra => {
    const lote = pickOne(a.lotes);
    const corretora = pickOne(a.corretoras);
    return {
      id: a.id,
      status: a.status,
      corretoraNome: corretora?.name ?? null,
      loteCodigo: lote?.codigo ?? null,
      loteSpecie: lote?.specie ?? null,
      dataEntregaPrevista: a.data_entrega_prevista,
      dataRecebida: a.data_recebida,
      dataResultado: a.data_resultado,
      mensagem: a.mensagem,
      motivoRecusa: a.motivo_recusa,
      resultadoBebida: a.resultado_bebida,
      resultadoTipo: a.resultado_tipo,
      resultadoForaDeTipo: a.resultado_fora_de_tipo,
      // numeric do supabase vem como string → sempre coagir com Number().
      precoOferta: a.preco_oferta != null ? Number(a.preco_oferta) : null,
      laudoObservacoes: a.laudo_observacoes,
    };
  });
}

/**
 * Lotes do produtor (exceto arquivados) pro seletor de amostra.
 */
export async function listLotesParaAmostra(
  produtorId: string,
): Promise<LoteParaAmostra[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lotes")
    .select("id, codigo, specie")
    .eq("produtor_id", produtorId)
    .neq("status", "arquivado")
    .order("created_at", { ascending: false });

  return ((data ?? []) as LoteParaAmostra[]).map((l) => ({
    id: l.id,
    codigo: l.codigo,
    specie: l.specie,
  }));
}

/**
 * Corretoras favoritadas pelo produtor pro seletor de amostra.
 */
export async function listFavoritasParaAmostra(
  produtorId: string,
): Promise<CorretoraParaAmostra[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("favoritos")
    .select("corretora_id, corretoras(id, name)")
    .eq("produtor_id", produtorId);

  type Row = {
    corretora_id: string;
    corretoras: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  return ((data ?? []) as Row[])
    .map((f) => pickOne(f.corretoras))
    .filter((c): c is { id: string; name: string } => !!c && !!c.id && !!c.name)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
