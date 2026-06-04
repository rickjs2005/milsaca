import { createClient } from "@milsaca/db/web/server";

/**
 * Estoque de café do produtor — o conceito central da comercialização.
 * Reconcilia TODOS os módulos (Propostas, Vendas, Financeiro, Meu Café):
 *   - total        = lotes registrados (peso_sacas = coluna GERADA de peso_kg/60,
 *                    a verdade; ver @/lib/unidades + migration 20261060), não-arquivados
 *   - vendido      = CONTRATOS ativo/finalizado (= Vendas = Financeiro)
 *   - naoVendido   = total − vendido (= Σ "não vendidas" por lote no Meu Café)
 *   - emNegociacao = PROPOSTAS abertas (leads novo/em_negociacao) — interesse,
 *                    ainda não compromete; é um subconjunto do não-vendido
 *   - livre        = max(0, naoVendido − emNegociacao)
 *   - cancelado    = ignorado
 * A venda flui pelo CONTRATO; a negociação é a proposta (lead). Cada um aparece
 * no módulo certo e os números fecham (total = vendido + emNeg + livre).
 */
export type EstoqueProdutor = {
  total: number;
  vendido: number;
  emNegociacao: number;
  /** Não vendido (total − vendido) — bate com o "disponível" por lote. */
  naoVendido: number;
  /** Disponível livre de negociação (não-vendido − em negociação). */
  livre: number;
  /** Valor REAL já vendido (Σ total_value dos contratos ativo/finalizado). */
  valorVendido: number;
  /** Há lote não-beneficiado em estoque → parte das sacas é ESTIMADA. */
  temEstimada: boolean;
};

const STATUS_VENDIDO = ["ativo", "finalizado"];
const STATUS_EM_NEG_LEAD = ["novo", "em_negociacao"];

export async function loadEstoqueProdutor(
  userId: string,
): Promise<EstoqueProdutor> {
  const supabase = await createClient();
  const [lotesRes, contratosRes, leadsRes] = await Promise.all([
    supabase.from("lotes").select("peso_sacas, status, beneficiado").eq("produtor_id", userId),
    supabase
      .from("contratos")
      .select("bag_count, total_value, status")
      .eq("produtor_id", userId),
    supabase.from("leads").select("bag_count, status").eq("produtor_id", userId),
  ]);

  const lotes = (lotesRes.data ?? []) as {
    peso_sacas: number | string | null;
    status: string;
    beneficiado: boolean;
  }[];
  const ativos = lotes.filter((l) => l.status !== "arquivado");
  const total = ativos.reduce((s, l) => s + Number(l.peso_sacas ?? 0), 0);
  // Café não-beneficiado (e não vendido) ainda em estoque → saca estimada.
  const temEstimada = ativos.some(
    (l) => l.status !== "vendido" && !l.beneficiado,
  );

  const contratos = (contratosRes.data ?? []) as {
    bag_count: number | null;
    total_value: number | string | null;
    status: string;
  }[];
  const vendidos = contratos.filter((c) => STATUS_VENDIDO.includes(c.status));
  // bag_count é numeric no Postgres → supabase-js devolve string; coage pra somar.
  const vendido = vendidos.reduce((s, c) => s + Number(c.bag_count ?? 0), 0);
  const valorVendido = vendidos.reduce(
    (s, c) => s + (c.total_value != null ? Number(c.total_value) : 0),
    0,
  );

  const leads = (leadsRes.data ?? []) as { bag_count: number | null; status: string }[];
  const emNegociacaoBruto = leads
    .filter((l) => STATUS_EM_NEG_LEAD.includes(l.status))
    .reduce((s, l) => s + Number(l.bag_count ?? 0), 0);

  const naoVendido = Math.max(0, total - vendido);
  // Em negociação não pode exceder o que não foi vendido (clamp p/ coerência).
  const emNegociacao = Math.min(emNegociacaoBruto, naoVendido);
  const livre = Math.max(0, naoVendido - emNegociacao);

  return { total, vendido, emNegociacao, naoVendido, livre, valorVendido, temEstimada };
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
    out[r.lote_id] = (out[r.lote_id] ?? 0) + Number(r.bag_count ?? 0);
  }
  return out;
}

/** Sacas já comprometidas (contratos não-cancelados) num lote — pro guard. */
export async function sacasComprometidasNoLote(loteId: string): Promise<number> {
  const map = await loadComprometidoPorLote([loteId]);
  return map[loteId] ?? 0;
}
