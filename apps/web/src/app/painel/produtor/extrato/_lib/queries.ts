import { createClient } from "@milsaca/db/web/server";

/**
 * Extrato de Movimentação — read-model derivado de eventos que JÁ existem
 * (lotes, contratos, leads). Sem tabela nova. Cada evento vira um item de
 * timeline estilo extrato bancário: o que entrou e saiu das sacas do produtor.
 */
export type MovimentacaoItem = {
  id: string;
  data: string;
  /** Variação assinada de sacas: positiva (entrada) ou negativa (saída). */
  delta: number;
  /** Quantidade absoluta de sacas (sempre positiva). */
  sacas: number;
  tipo: "entrada" | "venda" | "negociacao";
  descricao: string;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function loadMovimentacao(
  produtorId: string,
): Promise<MovimentacaoItem[]> {
  const supabase = await createClient();

  type LoteRow = {
    id: string;
    codigo: string;
    peso_sacas: number | string | null;
    created_at: string;
  };
  type ContratoRow = {
    id: string;
    bag_count: number | string | null;
    signed_at: string | null;
    created_at: string;
    corretoras: { name: string } | { name: string }[] | null;
  };
  type LeadRow = {
    id: string;
    bag_count: number | string | null;
    created_at: string;
    corretoras: { name: string } | { name: string }[] | null;
  };

  const [lotesRes, contratosRes, leadsRes] = await Promise.all([
    supabase
      .from("lotes")
      .select("id, codigo, peso_sacas, created_at")
      .eq("produtor_id", produtorId),
    supabase
      .from("contratos")
      .select("id, bag_count, signed_at, created_at, corretoras(name)")
      .eq("produtor_id", produtorId)
      .in("status", ["ativo", "finalizado"]),
    supabase
      .from("leads")
      .select("id, bag_count, created_at, corretoras(name)")
      .eq("produtor_id", produtorId)
      .in("status", ["novo", "em_negociacao"]),
  ]);

  const items: MovimentacaoItem[] = [];

  // ENTRADAS — cada lote cadastrado soma sacas à carteira.
  for (const l of (lotesRes.data ?? []) as LoteRow[]) {
    const sacas = Number(l.peso_sacas ?? 0);
    items.push({
      id: `lote:${l.id}`,
      data: l.created_at,
      delta: sacas,
      sacas,
      tipo: "entrada",
      descricao: `Cadastro de lote ${l.codigo}`,
    });
  }

  // SAÍDAS vendidas — contratos ativos/finalizados subtraem sacas.
  for (const c of (contratosRes.data ?? []) as ContratoRow[]) {
    const sacas = Number(c.bag_count ?? 0);
    const corretora = pickOne(c.corretoras)?.name ?? "corretora";
    items.push({
      id: `contrato:${c.id}`,
      data: c.signed_at ?? c.created_at,
      delta: -sacas,
      sacas,
      tipo: "venda",
      descricao: `Vendidas — ${corretora}`,
    });
  }

  // COMPROMETIDAS — propostas em aberto reservam sacas (ainda não vendidas).
  for (const ld of (leadsRes.data ?? []) as LeadRow[]) {
    const sacas = Number(ld.bag_count ?? 0);
    const corretora = pickOne(ld.corretoras)?.name ?? "corretora";
    items.push({
      id: `lead:${ld.id}`,
      data: ld.created_at,
      delta: -sacas,
      sacas,
      tipo: "negociacao",
      descricao: `Comprometidas — proposta ${corretora}`,
    });
  }

  // Mais recentes primeiro (extrato).
  items.sort((a, b) => b.data.localeCompare(a.data));
  return items;
}
