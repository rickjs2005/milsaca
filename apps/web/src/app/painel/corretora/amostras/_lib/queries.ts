import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types";

export type AmostraStatus = Database["public"]["Enums"]["amostra_status"];

/**
 * Uma amostra na visão da corretora: dados próprios + o café (lote) e o nome
 * do produtor que agendou. `preco_oferta` vem STRING do supabase-js (numeric);
 * coagimos com Number ao ler.
 */
export type AmostraCorretora = {
  id: string;
  status: AmostraStatus;
  produtorNome: string;
  loteCodigo: string | null;
  loteSpecie: "arabica" | "conillon" | null;
  lotePesoSacas: number | null;
  dataEntregaPrevista: string | null;
  dataRecebida: string | null;
  dataResultado: string | null;
  mensagem: string | null;
  resultadoBebida: string | null;
  resultadoTipo: string | null;
  resultadoForaDeTipo: boolean;
  precoOferta: number | null;
  laudoObservacoes: string | null;
  motivoRecusa: string | null;
  createdAt: string;
};

// Amostras pendentes (agendada/recebida) sobem pro topo; o resto desce.
const STATUS_PRIORIDADE: Record<AmostraStatus, number> = {
  agendada: 0,
  recebida: 0,
  classificada: 1,
  recusada: 1,
  cancelada: 1,
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function loadAmostrasCorretora(
  corretoraId: string,
): Promise<AmostraCorretora[]> {
  if (!corretoraId) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("amostras")
    .select(
      `id, status, data_entrega_prevista, data_recebida, data_resultado,
       mensagem, motivo_recusa, resultado_bebida, resultado_tipo,
       resultado_fora_de_tipo, preco_oferta, laudo_observacoes, created_at,
       lotes(codigo, specie, peso_sacas),
       produtor:profiles!amostras_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadAmostrasCorretora:", error.message);
    return [];
  }

  type LoteRel = {
    codigo: string | null;
    specie: "arabica" | "conillon" | null;
    peso_sacas: number | string | null;
  };
  type Raw = {
    id: string;
    status: AmostraStatus;
    data_entrega_prevista: string | null;
    data_recebida: string | null;
    data_resultado: string | null;
    mensagem: string | null;
    motivo_recusa: string | null;
    resultado_bebida: string | null;
    resultado_tipo: string | null;
    resultado_fora_de_tipo: boolean;
    preco_oferta: number | string | null;
    laudo_observacoes: string | null;
    created_at: string;
    lotes: LoteRel | LoteRel[] | null;
    produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const rows = (data ?? []) as Raw[];
  const mapped = rows.map((r): AmostraCorretora => {
    const lote = pickOne(r.lotes);
    const produtor = pickOne(r.produtor);
    return {
      id: r.id,
      status: r.status,
      produtorNome: produtor?.full_name ?? "Sem produtor",
      loteCodigo: lote?.codigo ?? null,
      loteSpecie: lote?.specie ?? null,
      lotePesoSacas: lote?.peso_sacas != null ? Number(lote.peso_sacas) : null,
      dataEntregaPrevista: r.data_entrega_prevista,
      dataRecebida: r.data_recebida,
      dataResultado: r.data_resultado,
      mensagem: r.mensagem,
      resultadoBebida: r.resultado_bebida,
      resultadoTipo: r.resultado_tipo,
      resultadoForaDeTipo: r.resultado_fora_de_tipo,
      precoOferta: r.preco_oferta != null ? Number(r.preco_oferta) : null,
      laudoObservacoes: r.laudo_observacoes,
      motivoRecusa: r.motivo_recusa,
      createdAt: r.created_at,
    };
  });

  // agendada/recebida primeiro, depois por created_at desc.
  return mapped.sort((a, b) => {
    const pa = STATUS_PRIORIDADE[a.status];
    const pb = STATUS_PRIORIDADE[b.status];
    if (pa !== pb) return pa - pb;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
