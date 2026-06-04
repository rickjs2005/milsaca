import { createClient } from "@milsaca/db/web/server";

/**
 * MINHA SAFRA — fonte ÚNICA de verdade do estoque do produtor.
 *
 * INVARIANTE (todas as telas DEVEM respeitar): em sacas,
 *
 *     total = vendido + emNegociacao + disponivel
 *
 *   - total        = produção registrada (lotes não-arquivados; peso_sacas é a
 *                    coluna GERADA de peso_kg/60 — ver @/lib/unidades, migr 20261060)
 *   - vendido      = CONTRATOS ativo/finalizado (= Vendas = Financeiro)
 *   - emNegociacao = PROPOSTAS abertas (leads novo/em_negociacao) — comprometido
 *   - disponivel   = o que AINDA PODE VENDER = total − vendido − emNegociacao
 *
 * ⚠️ "disponível" tem UM significado só: `disponivel` (não vendido E não
 * comprometido). NÃO existe mais `naoVendido`/`livre` com sentidos diferentes —
 * essa ambiguidade causava saudação/herói (410) ≠ barra (170). Toda seção da
 * Início consome ESTES campos; nenhuma recalcula por conta própria.
 */
export type EstoqueProdutor = {
  /** Produção total registrada (sacas). */
  total: number;
  /** Já vendido (contratos ativo/finalizado). */
  vendido: number;
  /** Comprometido em propostas abertas. */
  emNegociacao: number;
  /** AINDA PODE VENDER = total − vendido − emNegociacao. O único "disponível". */
  disponivel: number;
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

  // Clamps que GARANTEM a invariante total = vendido + emNegociacao + disponivel:
  // vendido nunca passa do total; em negociação nunca passa do que sobra; o
  // disponível é o resto. Assim toda seção lê os mesmos números e eles fecham.
  const vendidoClamp = Math.min(vendido, total);
  const emNegociacao = Math.min(emNegociacaoBruto, total - vendidoClamp);
  const disponivel = Math.max(0, total - vendidoClamp - emNegociacao);

  // Guarda de regressão: se algum dia os números não fecharem, grita no dev.
  if (
    process.env.NODE_ENV !== "production" &&
    Math.abs(vendidoClamp + emNegociacao + disponivel - total) > 0.001
  ) {
    console.error("[estoque] invariante quebrada", {
      total,
      vendido: vendidoClamp,
      emNegociacao,
      disponivel,
    });
  }

  return {
    total,
    vendido: vendidoClamp,
    emNegociacao,
    disponivel,
    valorVendido,
    temEstimada,
  };
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
