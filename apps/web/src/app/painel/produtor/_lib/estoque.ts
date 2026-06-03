import { createClient } from "@milsaca/db/web/server";

/**
 * Estoque de café do produtor — o conceito central da comercialização.
 * Total (lotes) = Vendido + Em negociação + Disponível.
 *
 * Fonte: lotes (total registrado) + leads (propostas do produtor):
 *   - vendido       = leads convertidos (viraram venda/contrato)
 *   - emNegociacao  = leads novos / em negociação
 *   - disponivel    = max(0, total - vendido - emNegociacao)
 * O disponível atualiza sozinho conforme as propostas avançam.
 */
export type EstoqueProdutor = {
  total: number;
  vendido: number;
  emNegociacao: number;
  disponivel: number;
};

export async function loadEstoqueProdutor(
  userId: string,
): Promise<EstoqueProdutor> {
  const supabase = await createClient();
  const [lotesRes, leadsRes] = await Promise.all([
    supabase.from("lotes").select("peso_sacas, status").eq("produtor_id", userId),
    supabase.from("leads").select("bag_count, status").eq("produtor_id", userId),
  ]);

  const total = ((lotesRes.data ?? []) as { peso_sacas: number | string | null; status: string }[])
    .filter((l) => l.status !== "arquivado")
    .reduce((s, l) => s + Number(l.peso_sacas ?? 0), 0);

  const leads = (leadsRes.data ?? []) as { bag_count: number | null; status: string }[];
  const vendido = leads
    .filter((l) => l.status === "convertido")
    .reduce((s, l) => s + (l.bag_count ?? 0), 0);
  const emNegociacao = leads
    .filter((l) => l.status === "novo" || l.status === "em_negociacao")
    .reduce((s, l) => s + (l.bag_count ?? 0), 0);

  const disponivel = Math.max(0, total - vendido - emNegociacao);
  return { total, vendido, emNegociacao, disponivel };
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
