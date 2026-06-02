import { createClient } from "@milsaca/db/web/server";
import {
  PAGAMENTO_ABERTO_STATUS,
  type PagamentoStatus,
  type PagamentoItem,
} from "./pagamento-meta";

// Re-export da meta pura — clients importam de "./pagamento-meta" direto.
export {
  PAGAMENTO_STATUS_ORDER,
} from "./pagamento-meta";
export type { PagamentoStatus, PagamentoItem } from "./pagamento-meta";

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type Row = {
  id: string;
  valor_bruto: number | string;
  valor_liquido: number | string;
  status: PagamentoStatus;
  data_prevista: string | null;
  data_paga: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  contrato_id: string | null;
  produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  contrato: { code: string } | { code: string }[] | null;
};

export const PAGAMENTOS_PAGE_SIZE = 20;

/**
 * Conjunto de contrato_ids (dentre os informados) que já têm ao menos uma
 * entrega conferida — sinal de que o repasse ao produtor está liberado.
 */
async function contratosComEntregaConferida(
  supabase: Awaited<ReturnType<typeof createClient>>,
  corretoraId: string,
  contratoIds: string[],
): Promise<Set<string>> {
  if (contratoIds.length === 0) return new Set();
  const { data } = await supabase
    .from("entregas")
    .select("contrato_id")
    .eq("corretora_id", corretoraId)
    .eq("status", "conferida")
    .in("contrato_id", contratoIds);
  const rows = (data ?? []) as { contrato_id: string | null }[];
  return new Set(rows.map((r) => r.contrato_id).filter((v): v is string => !!v));
}

export async function listPagamentos(
  corretoraId: string,
  filter: { status?: PagamentoStatus } = {},
  page = 1,
): Promise<{ rows: PagamentoItem[]; count: number }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGAMENTOS_PAGE_SIZE;
  const to = from + PAGAMENTOS_PAGE_SIZE - 1;
  let q = supabase
    .from("produtor_pagamentos")
    .select(
      `id, valor_bruto, valor_liquido, status, data_prevista, data_paga,
       comprovante_url, observacoes, created_at, contrato_id,
       produtor:profiles!produtor_pagamentos_produtor_id_fkey(full_name),
       contrato:contratos!produtor_pagamentos_contrato_id_fkey(code)`,
      { count: "exact" },
    )
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter.status) q = q.eq("status", filter.status);

  const { data, count } = await q;
  const rows = (data ?? []) as unknown as Row[];

  const conferidas = await contratosComEntregaConferida(
    supabase,
    corretoraId,
    [...new Set(rows.map((r) => r.contrato_id).filter((v): v is string => !!v))],
  );

  return {
    rows: rows.map((r): PagamentoItem => {
      const prod = pickOne(r.produtor);
      const cont = pickOne(r.contrato);
      return {
        id: r.id,
        valor_bruto: Number(r.valor_bruto),
        valor_liquido: Number(r.valor_liquido),
        status: r.status,
        data_prevista: r.data_prevista,
        data_paga: r.data_paga,
        comprovante_url: r.comprovante_url,
        observacoes: r.observacoes,
        created_at: r.created_at,
        contrato_code: cont?.code ?? null,
        produtor_nome: prod?.full_name ?? "—",
        entrega_conferida: r.contrato_id
          ? conferidas.has(r.contrato_id)
          : false,
      };
    }),
    count: count ?? 0,
  };
}

export type PagamentosKpis = {
  /** Líquido pendente + vencido. */
  aPagar: number;
  /** Líquido já pago. */
  pago: number;
  /** Líquido vencido (subconjunto de aPagar) — atenção. */
  vencido: number;
};

/**
 * Totais (líquido) globais, independentes de filtro/paginação. Pros KPIs do
 * topo. "A pagar" = pendente + vencido; "Vencido" é o recorte em atraso.
 */
export async function loadPagamentosKpis(
  corretoraId: string,
): Promise<PagamentosKpis> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_pagamentos")
    .select("valor_liquido, status")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as {
    valor_liquido: number | string;
    status: PagamentoStatus;
  }[];
  let aPagar = 0;
  let pago = 0;
  let vencido = 0;
  for (const r of rows) {
    const v = Number(r.valor_liquido);
    if (PAGAMENTO_ABERTO_STATUS.includes(r.status)) aPagar += v;
    if (r.status === "vencido") vencido += v;
    else if (r.status === "pago") pago += v;
  }
  return { aPagar, pago, vencido };
}

/**
 * Gera uma signed URL (5 min) para um comprovante do bucket privado
 * "comprovantes". `path` é o valor gravado em `comprovante_url`
 * (ex.: "{corretora_id}/{pagamento_id}.{ext}"). Retorna null se falhar
 * ou se o path não for um caminho de Storage (compat com valores antigos
 * que possam ser URL/texto livre).
 */
export async function signedComprovanteUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  // Valores legados podem ser uma URL completa — devolve como está.
  if (/^https?:\/\//i.test(path)) return path;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(path, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}

export type ContratoPicker = {
  id: string;
  code: string;
  produtor_id: string;
  produtor_nome: string;
  total_value: number | null;
};

type ContratoPickerRow = {
  id: string;
  code: string;
  produtor_id: string;
  total_value: number | string | null;
  produtor:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

export async function listContratosParaPagamento(
  corretoraId: string,
): Promise<ContratoPicker[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      `id, code, produtor_id, total_value,
       produtor:profiles!contratos_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as ContratoPickerRow[];
  return rows.map((r): ContratoPicker => {
    const prod = pickOne(r.produtor);
    return {
      id: r.id,
      code: r.code,
      produtor_id: r.produtor_id,
      produtor_nome: prod?.full_name ?? "—",
      total_value: r.total_value != null ? Number(r.total_value) : null,
    };
  });
}
