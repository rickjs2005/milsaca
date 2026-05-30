import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type PagamentoStatus = Database["public"]["Enums"]["pagamento_status"];

export const PAGAMENTO_STATUS_ORDER: PagamentoStatus[] = [
  "pendente",
  "pago",
  "vencido",
  "cancelado",
];

export const PAGAMENTO_STATUS_LABEL: Record<PagamentoStatus, string> = {
  pendente: "A pagar",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const PAGAMENTO_STATUS_COLOR: Record<PagamentoStatus, string> = {
  pendente: "bg-milsaca-dourado/20 text-milsaca-verde",
  pago: "bg-emerald-100 text-emerald-800",
  vencido: "bg-rose-100 text-rose-800",
  cancelado: "bg-slate-200 text-slate-700",
};

// Tone semântico (fundação D1) — usado pelo <StatusBadge> nas listagens.
export const PAGAMENTO_STATUS_TONE: Record<PagamentoStatus, StatusTone> = {
  pendente: "warning",
  pago: "success",
  vencido: "danger",
  cancelado: "neutral",
};

export type PagamentoItem = {
  id: string;
  valor_bruto: number;
  valor_liquido: number;
  status: PagamentoStatus;
  data_prevista: string | null;
  data_paga: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  contrato_code: string | null;
  produtor_nome: string;
};

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
  produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  contrato: { code: string } | { code: string }[] | null;
};

export const PAGAMENTOS_PAGE_SIZE = 20;

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
       comprovante_url, observacoes, created_at,
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
      };
    }),
    count: count ?? 0,
  };
}

/**
 * Totais (líquido) de "a pagar" (pendente + vencido) e "já pago" —
 * globais, independentes de filtro/paginação. Pros cards do topo.
 */
export async function sumPagamentosLiquido(
  corretoraId: string,
): Promise<{ aPagar: number; pago: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_pagamentos")
    .select("valor_liquido, status")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as { valor_liquido: number | string; status: PagamentoStatus }[];
  let aPagar = 0;
  let pago = 0;
  for (const r of rows) {
    const v = Number(r.valor_liquido);
    if (r.status === "pendente" || r.status === "vencido") aPagar += v;
    else if (r.status === "pago") pago += v;
  }
  return { aPagar, pago };
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
