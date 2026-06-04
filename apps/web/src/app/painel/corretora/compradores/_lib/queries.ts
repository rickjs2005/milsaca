import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

import { getCorretoraName } from "../../_lib/corretora";

import {
  parsePerfilCompra,
  type CompradorListItem,
  type PerfilCompra,
} from "./comprador-meta";

// Re-export pra compat de quem importa o tipo a partir de queries.
export type { CompradorListItem } from "./comprador-meta";

export type RegimeTributario =
  Database["public"]["Enums"]["regime_tributario"];

export const REGIME_LABEL: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
  isento: "Isento",
};

type CompradorRow = {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  tipo: string | null;
  ativo: boolean;
  created_at: string;
};

/**
 * Lista compradores da carteira com densidade financeira agregada: contratos
 * (qtd + fechados), valor comprado (soma de total_value dos fechados) e
 * recência da última compra. Uma query de compradores + uma de contratos,
 * agregadas em memória (carteira é pequena; cap 500).
 */
export async function listCompradores(
  corretoraId: string,
): Promise<CompradorListItem[]> {
  const supabase = await createClient();
  const [compRes, ctRes] = await Promise.all([
    supabase
      .from("compradores")
      .select(
        "id, name, trade_name, cnpj, city, state, tipo, ativo, contact_phone",
      )
      .eq("corretora_id", corretoraId)
      .limit(500),
    supabase
      .from("contratos")
      .select("comprador_id, status, total_value, created_at")
      .eq("corretora_id", corretoraId)
      .not("comprador_id", "is", null),
  ]);

  type CompRow = {
    id: string;
    name: string;
    trade_name: string | null;
    cnpj: string | null;
    city: string | null;
    state: string | null;
    tipo: string | null;
    ativo: boolean;
    contact_phone: string | null;
  };
  type CtRow = {
    comprador_id: string | null;
    status: string;
    total_value: number | string | null;
    created_at: string;
  };

  const agg = new Map<
    string,
    { qtd: number; fechados: number; valor: number; last: string | null }
  >();
  for (const r of (ctRes.data ?? []) as CtRow[]) {
    if (!r.comprador_id) continue;
    const a =
      agg.get(r.comprador_id) ??
      { qtd: 0, fechados: 0, valor: 0, last: null as string | null };
    a.qtd += 1;
    if (r.status === "ativo" || r.status === "finalizado") {
      a.fechados += 1;
      a.valor += Number(r.total_value ?? 0);
      if (!a.last || r.created_at > a.last) a.last = r.created_at;
    }
    agg.set(r.comprador_id, a);
  }

  const items: CompradorListItem[] = ((compRes.data ?? []) as CompRow[]).map(
    (c) => {
      const a = agg.get(c.id);
      return {
        id: c.id,
        name: c.name,
        trade_name: c.trade_name,
        cnpj: c.cnpj,
        city: c.city,
        state: c.state,
        tipo: c.tipo,
        ativo: c.ativo,
        contact_phone: c.contact_phone,
        qtd_contratos: a?.qtd ?? 0,
        qtd_fechados: a?.fechados ?? 0,
        valor_comprado: a?.valor ?? 0,
        last_compra: a?.last ?? null,
      };
    },
  );

  // Fallback estável (a ordenação interativa vive na view): valor desc, nome.
  return items.sort((x, y) => {
    if (y.valor_comprado !== x.valor_comprado) {
      return y.valor_comprado - x.valor_comprado;
    }
    return x.name.localeCompare(y.name, "pt-BR");
  });
}

/** @deprecated Use `getCorretoraName` de `../../_lib/corretora`. Mantido por compat de imports. */
export const getCorretoraNome = getCorretoraName;

export type CompradorDetail = CompradorRow & {
  inscricao_estadual: string | null;
  regime_tributario: RegimeTributario | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  observacoes: string | null;
  /** Perfil de compra parseado do JSONB `preferencias`. */
  perfil: PerfilCompra;
};

export async function getComprador(
  corretoraId: string,
  id: string,
): Promise<CompradorDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compradores")
    .select(
      `id, name, trade_name, cnpj, inscricao_estadual, regime_tributario,
       contact_name, contact_email, contact_phone, city, state, tipo,
       ativo, observacoes, preferencias, created_at`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  type Raw = Omit<CompradorDetail, "perfil"> & { preferencias: unknown };
  const row = data as Raw;
  return { ...row, perfil: parsePerfilCompra(row.preferencias) };
}

// ---------------------------------------------------------------------------
// Histórico do comprador: ofertas + contratos + stats (CRM de verdade)
// ---------------------------------------------------------------------------

type CompradorOferta = {
  id: string;
  lote_codigo: string | null;
  preco_saca: number;
  bag_count: number | null;
  validade_ate: string | null;
  status: string;
  total: number | null;
};

type CompradorContrato = {
  id: string;
  code: string;
  status: string;
  total_value: number | null;
  comissao_total: number | null;
  created_at: string;
};

export type CompradorHistorico = {
  ofertas: CompradorOferta[];
  contratos: CompradorContrato[];
  stats: {
    totalComprado: number;
    comissaoGerada: number;
    ofertasAbertas: number;
    contratos: number;
  };
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function getCompradorHistorico(
  corretoraId: string,
  compradorId: string,
): Promise<CompradorHistorico> {
  const supabase = await createClient();
  const [ofRes, ctRes] = await Promise.all([
    supabase
      .from("ofertas_comprador")
      .select(
        `id, preco_saca, bag_count, validade_ate, status,
         lote:lotes!ofertas_comprador_lote_id_fkey(codigo)`,
      )
      .eq("corretora_id", corretoraId)
      .eq("comprador_id", compradorId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("contratos")
      .select("id, code, status, total_value, comissao_total, created_at")
      .eq("corretora_id", corretoraId)
      .eq("comprador_id", compradorId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const ofertas: CompradorOferta[] = (
    (ofRes.data ?? []) as Array<{
      id: string;
      preco_saca: number | string;
      bag_count: number | null;
      validade_ate: string | null;
      status: string;
      lote: { codigo: string } | { codigo: string }[] | null;
    }>
  ).map((o) => {
    const preco = Number(o.preco_saca);
    return {
      id: o.id,
      lote_codigo: pickOne(o.lote)?.codigo ?? null,
      preco_saca: preco,
      bag_count: o.bag_count != null ? Number(o.bag_count) : null,
      validade_ate: o.validade_ate,
      status: o.status,
      total: o.bag_count != null ? preco * Number(o.bag_count) : null,
    };
  });

  const contratos: CompradorContrato[] = (
    (ctRes.data ?? []) as Array<{
      id: string;
      code: string;
      status: string;
      total_value: number | string | null;
      comissao_total: number | string | null;
      created_at: string;
    }>
  ).map((c) => ({
    id: c.id,
    code: c.code,
    status: c.status,
    total_value: c.total_value != null ? Number(c.total_value) : null,
    comissao_total: c.comissao_total != null ? Number(c.comissao_total) : null,
    created_at: c.created_at,
  }));

  const fechados = contratos.filter(
    (c) => c.status === "ativo" || c.status === "finalizado",
  );
  return {
    ofertas,
    contratos,
    stats: {
      totalComprado: fechados.reduce((s, c) => s + (c.total_value ?? 0), 0),
      comissaoGerada: fechados.reduce((s, c) => s + (c.comissao_total ?? 0), 0),
      ofertasAbertas: ofertas.filter((o) => o.status === "enviada").length,
      contratos: contratos.length,
    },
  };
}

export type CompradorOption = { id: string; name: string };

export async function listCompradoresOptions(
  corretoraId: string,
): Promise<CompradorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compradores")
    .select("id, name")
    .eq("corretora_id", corretoraId)
    .eq("ativo", true)
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []) as CompradorOption[];
}
