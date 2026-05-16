import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

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

export const CONTRATO_STATUS_COLOR: Record<ContratoStatus, string> = {
  rascunho: "bg-slate-200 text-slate-700",
  em_analise: "bg-milsaca-dourado/20 text-milsaca-verde",
  ativo: "bg-emerald-100 text-emerald-800",
  finalizado: "bg-milsaca-verde text-milsaca-cream",
  cancelado: "bg-rose-100 text-rose-800",
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

  return rows.map((r): MeuContratoListItem => {
    const cor = pickOne(r.corretora);
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      coffee_type: r.coffee_type,
      bag_count: r.bag_count,
      total_value: r.total_value != null ? Number(r.total_value) : null,
      signed_at: r.signed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      corretora_id: r.corretora_id,
      corretora_nome: cor?.name ?? "—",
      corretora_phone: cor?.phone ?? null,
      corretora_city: cor?.city ?? null,
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
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    coffee_type: r.coffee_type,
    bag_count: r.bag_count,
    total_value: r.total_value != null ? Number(r.total_value) : null,
    signed_at: r.signed_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    corretora_id: r.corretora_id,
    corretora_nome: cor?.name ?? "—",
    corretora_phone: cor?.phone ?? null,
    corretora_city: cor?.city ?? null,
  };
}
