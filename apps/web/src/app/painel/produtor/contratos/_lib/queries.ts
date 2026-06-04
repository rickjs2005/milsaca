import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

export const CONTRATO_STATUS_ORDER: ContratoStatus[] = [
  "rascunho",
  "em_analise",
  "ativo",
  "finalizado",
  "cancelado",
];

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

// Tone semântico (fundação D1) — usado pelo <StatusBadge> nas listagens.
export const CONTRATO_STATUS_TONE: Record<ContratoStatus, StatusTone> = {
  rascunho: "neutral",
  em_analise: "warning",
  ativo: "success",
  finalizado: "premium",
  cancelado: "danger",
};

export type MeuContratoListItem = {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora_nome: string;
  corretora_phone: string | null;
  corretora_city: string | null;
  // Fase 5 — progresso de entrega e pagamento (0–100, já com cap).
  entreguePct: number;
  pagoPct: number;
};

type Row = {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora:
    | { id: string; name: string; phone: string | null; city: string | null }
    | { id: string; name: string; phone: string | null; city: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 100 ? 100 : n;
}

// Fase 5 — agrega % entregue e % pago por contrato.
// % entregue = sacas_entregues / sacas_contratadas (view contrato_saldo).
// % pago = Σ valor_liquido (status='pago') / contratos.total_value.
async function buildProgressMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contratoIds: string[],
  totalValueById: Map<string, number | null>,
): Promise<{ entregue: Map<string, number>; pago: Map<string, number> }> {
  const entregue = new Map<string, number>();
  const pago = new Map<string, number>();
  if (contratoIds.length === 0) return { entregue, pago };

  const [saldoRes, pagamentosRes] = await Promise.all([
    supabase
      .from("contrato_saldo")
      .select("contrato_id, sacas_contratadas, sacas_entregues")
      .in("contrato_id", contratoIds),
    supabase
      .from("produtor_pagamentos")
      .select("contrato_id, valor_liquido, status")
      .in("contrato_id", contratoIds)
      .eq("status", "pago"),
  ]);

  // numeric do Postgres chega como string → coage tudo com Number.
  for (const row of (saldoRes.data ?? []) as {
    contrato_id: string;
    sacas_contratadas: number | string | null;
    sacas_entregues: number | string | null;
  }[]) {
    const contratadas = Number(row.sacas_contratadas ?? 0);
    const entregues = Number(row.sacas_entregues ?? 0);
    const pct = contratadas > 0 ? (entregues / contratadas) * 100 : 0;
    entregue.set(row.contrato_id, clampPct(pct));
  }

  const pagoAcc = new Map<string, number>();
  for (const row of (pagamentosRes.data ?? []) as {
    contrato_id: string;
    valor_liquido: number | string | null;
  }[]) {
    const prev = pagoAcc.get(row.contrato_id) ?? 0;
    pagoAcc.set(row.contrato_id, prev + Number(row.valor_liquido ?? 0));
  }
  for (const id of contratoIds) {
    const base = totalValueById.get(id);
    const total = base != null ? Number(base) : 0;
    const pct = total > 0 ? ((pagoAcc.get(id) ?? 0) / total) * 100 : 0;
    pago.set(id, clampPct(pct));
  }

  return { entregue, pago };
}

export async function listMeusContratos(
  produtorId: string,
  filter: { status?: ContratoStatus } = {},
): Promise<MeuContratoListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("contratos")
    .select(
      `id, code, status, coffee_type, bag_count, total_value, signed_at,
       created_at, updated_at, corretora_id,
       corretora:corretoras!contratos_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const rows = (data ?? []) as Row[];

  const totalValueById = new Map<string, number | null>(
    rows.map((r) => [r.id, r.total_value != null ? Number(r.total_value) : null]),
  );
  const { entregue, pago } = await buildProgressMaps(
    supabase,
    rows.map((r) => r.id),
    totalValueById,
  );

  return rows.map((r): MeuContratoListItem => {
    const cor = pickOne(r.corretora);
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      coffee_type: r.coffee_type,
      // bag_count é numeric no Postgres → vem como string; coage (igual total_value).
      bag_count: r.bag_count != null ? Number(r.bag_count) : null,
      total_value: r.total_value != null ? Number(r.total_value) : null,
      signed_at: r.signed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      corretora_id: r.corretora_id,
      corretora_nome: cor?.name ?? "—",
      corretora_phone: cor?.phone ?? null,
      corretora_city: cor?.city ?? null,
      entreguePct: entregue.get(r.id) ?? 0,
      pagoPct: pago.get(r.id) ?? 0,
    };
  });
}

export async function getMeuContrato(
  produtorId: string,
  id: string,
): Promise<MeuContratoListItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      `id, code, status, coffee_type, bag_count, total_value, signed_at,
       created_at, updated_at, corretora_id,
       corretora:corretoras!contratos_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const r = data as Row;
  const cor = pickOne(r.corretora);
  const { entregue, pago } = await buildProgressMaps(
    supabase,
    [r.id],
    new Map([[r.id, r.total_value != null ? Number(r.total_value) : null]]),
  );
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    coffee_type: r.coffee_type,
    // bag_count é numeric no Postgres → vem como string; coage (igual total_value).
    bag_count: r.bag_count != null ? Number(r.bag_count) : null,
    total_value: r.total_value != null ? Number(r.total_value) : null,
    signed_at: r.signed_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    corretora_id: r.corretora_id,
    corretora_nome: cor?.name ?? "—",
    corretora_phone: cor?.phone ?? null,
    corretora_city: cor?.city ?? null,
    entreguePct: entregue.get(r.id) ?? 0,
    pagoPct: pago.get(r.id) ?? 0,
  };
}
