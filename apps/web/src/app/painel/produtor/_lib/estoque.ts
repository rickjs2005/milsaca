import { createClient } from "@milsaca/db/web/server";

/**
 * Estoque de café do produtor — o conceito central da comercialização.
 * Total (lotes) = Vendido + Em negociação + Disponível.
 *
 * UMA fonte de verdade: a VENDA flui pelo CONTRATO (não pelo lead).
 *   - total        = lotes registrados (peso_sacas, não-arquivados)
 *   - vendido      = contratos ativo/finalizado  (bag_count)
 *   - emNegociacao = contratos rascunho/em_analise (bag_count)
 *   - cancelado    = ignorado
 *   - disponivel   = max(0, total - vendido - emNegociacao)
 * Conversa (lead) não compromete estoque; só o contrato compromete — coerente
 * com o guard de criação de contrato e com o estoque por lote (contratos.lote_id).
 */
export type EstoqueProdutor = {
  total: number;
  vendido: number;
  emNegociacao: number;
  disponivel: number;
  /** Valor REAL já vendido (Σ total_value dos contratos ativo/finalizado). */
  valorVendido: number;
};

const STATUS_VENDIDO = ["ativo", "finalizado"];
const STATUS_NEGOCIACAO = ["rascunho", "em_analise"];

export async function loadEstoqueProdutor(
  userId: string,
): Promise<EstoqueProdutor> {
  const supabase = await createClient();
  const [lotesRes, contratosRes] = await Promise.all([
    supabase.from("lotes").select("peso_sacas, status").eq("produtor_id", userId),
    supabase
      .from("contratos")
      .select("bag_count, total_value, status")
      .eq("produtor_id", userId),
  ]);

  const total = ((lotesRes.data ?? []) as { peso_sacas: number | string | null; status: string }[])
    .filter((l) => l.status !== "arquivado")
    .reduce((s, l) => s + Number(l.peso_sacas ?? 0), 0);

  const contratos = (contratosRes.data ?? []) as {
    bag_count: number | null;
    total_value: number | string | null;
    status: string;
  }[];
  const vendidos = contratos.filter((c) => STATUS_VENDIDO.includes(c.status));
  const vendido = vendidos.reduce((s, c) => s + (c.bag_count ?? 0), 0);
  const valorVendido = vendidos.reduce(
    (s, c) => s + (c.total_value != null ? Number(c.total_value) : 0),
    0,
  );
  const emNegociacao = contratos
    .filter((c) => STATUS_NEGOCIACAO.includes(c.status))
    .reduce((s, c) => s + (c.bag_count ?? 0), 0);

  const disponivel = Math.max(0, total - vendido - emNegociacao);
  return { total, vendido, emNegociacao, disponivel, valorVendido };
}

/**
 * Sacas comprometidas por lote — via contratos (lote_id) não-cancelados.
 * É o vínculo REAL venda↔lote: cada contrato consome sacas do lote.
 * Retorna Record<loteId, sacasComprometidas>.
 */
export async function loadComprometidoPorLote(
  loteIds: string[],
): Promise<Record<string, number>> {
  if (loteIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select("lote_id, bag_count, status")
    .in("lote_id", loteIds)
    .neq("status", "cancelado");

  const out: Record<string, number> = {};
  for (const r of (data ?? []) as {
    lote_id: string | null;
    bag_count: number | null;
    status: string;
  }[]) {
    if (!r.lote_id) continue;
    out[r.lote_id] = (out[r.lote_id] ?? 0) + (r.bag_count ?? 0);
  }
  return out;
}

/** Sacas já comprometidas (contratos não-cancelados) num lote — pro guard. */
export async function sacasComprometidasNoLote(loteId: string): Promise<number> {
  const map = await loadComprometidoPorLote([loteId]);
  return map[loteId] ?? 0;
}
