import { createClient } from "@milsaca/db/web/server";
import { loadEstoqueProdutor } from "../../_lib/estoque";

// Uma tranche do plano: "X sacas acima de R$ Y".
export type Meta = {
  id: string;
  sacas: number;
  precoAlvo: number;
  temAlerta: boolean;
  observacoes: string | null;
};

export type Plano = {
  total: number;
  disponivel: number;
  metaSacas: number; // Σ sacas das metas ativas
  aguardando: number; // disponível − metaSacas (≥ 0)
  excede: boolean; // metas pedem mais sacas que o disponível
  metas: Meta[];
};

/**
 * Plano de venda do produtor: metas ativas + quanto sobra "aguardando mercado".
 * Consome a fonte única de estoque (disponível) — não recalcula.
 */
export async function loadPlano(produtorId: string): Promise<Plano> {
  const supabase = await createClient();
  const [estoque, metasRes] = await Promise.all([
    loadEstoqueProdutor(produtorId),
    supabase
      .from("metas_venda")
      .select("id, sacas, preco_alvo, alerta_id, observacoes")
      .eq("produtor_id", produtorId)
      .eq("status", "ativa")
      .order("preco_alvo", { ascending: false }),
  ]);

  const metas: Meta[] = (
    (metasRes.data ?? []) as Array<{
      id: string;
      sacas: number | string | null;
      preco_alvo: number | string | null;
      alerta_id: string | null;
      observacoes: string | null;
    }>
  ).map((m) => ({
    id: m.id,
    sacas: Number(m.sacas ?? 0),
    precoAlvo: Number(m.preco_alvo ?? 0),
    temAlerta: !!m.alerta_id,
    observacoes: m.observacoes,
  }));

  const metaSacas = metas.reduce((s, m) => s + m.sacas, 0);
  const aguardando = Math.max(0, estoque.disponivel - metaSacas);

  return {
    total: estoque.total,
    disponivel: estoque.disponivel,
    metaSacas,
    aguardando,
    excede: metaSacas > estoque.disponivel + 0.001,
    metas,
  };
}
