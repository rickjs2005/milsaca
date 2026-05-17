import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

export type EntregaStatus = Database["public"]["Enums"]["entrega_status"];

export const ENTREGA_STATUS_ORDER: EntregaStatus[] = [
  "programada",
  "em_transito",
  "recebida",
  "conferida",
  "cancelada",
];

export const ENTREGA_STATUS_LABEL: Record<EntregaStatus, string> = {
  programada: "Programada",
  em_transito: "Em trânsito",
  recebida: "Recebida",
  conferida: "Conferida",
  cancelada: "Cancelada",
};

export const ENTREGA_STATUS_COLOR: Record<EntregaStatus, string> = {
  programada: "bg-milsaca-dourado/20 text-milsaca-verde",
  em_transito: "bg-sky-100 text-sky-800",
  recebida: "bg-emerald-100 text-emerald-800",
  conferida: "bg-milsaca-verde text-milsaca-cream",
  cancelada: "bg-slate-200 text-slate-700",
};

// "Pendente" = ainda não recebeu/conferiu/cancelou
const PENDENTE_STATUS: EntregaStatus[] = ["programada", "em_transito"];

export type EntregaListItem = {
  id: string;
  sequencia: number;
  bag_count: number | null;
  status: EntregaStatus;
  data_prevista: string | null;
  data_realizada: string | null;
  contrato_id: string;
  contrato_code: string;
  produtor_id: string;
  produtor_nome: string;
  is_atrasada: boolean;
  created_at: string;
  updated_at: string;
};

type Row = {
  id: string;
  sequencia: number;
  bag_count: number | null;
  status: EntregaStatus;
  data_prevista: string | null;
  data_realizada: string | null;
  contrato_id: string;
  produtor_id: string;
  created_at: string;
  updated_at: string;
  contrato:
    | { code: string }
    | { code: string }[]
    | null;
  produtor:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function toListItem(r: Row, today: string): EntregaListItem {
  const c = pickOne(r.contrato);
  const p = pickOne(r.produtor);
  const isAtrasada =
    PENDENTE_STATUS.includes(r.status) &&
    r.data_prevista != null &&
    r.data_prevista < today;
  return {
    id: r.id,
    sequencia: r.sequencia,
    bag_count: r.bag_count,
    status: r.status,
    data_prevista: r.data_prevista,
    data_realizada: r.data_realizada,
    contrato_id: r.contrato_id,
    contrato_code: c?.code ?? "—",
    produtor_id: r.produtor_id,
    produtor_nome: p?.full_name ?? "—",
    is_atrasada: isAtrasada,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listEntregas(
  corretoraId: string,
  filter: { status?: EntregaStatus } = {},
): Promise<EntregaListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("entregas")
    .select(
      `id, sequencia, bag_count, status, data_prevista, data_realizada,
       contrato_id, produtor_id, created_at, updated_at,
       contrato:contratos!entregas_contrato_id_fkey(code),
       produtor:profiles!entregas_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .order("data_prevista", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const today = todayISO();
  return ((data ?? []) as Row[]).map((r) => toListItem(r, today));
}

export type EntregaDetail = EntregaListItem & {
  local_retirada: string | null;
  transportadora_nome: string | null;
  transportadora_doc: string | null;
  peso_bruto_kg: number | null;
  peso_tara_kg: number | null;
  peso_liquido_kg: number | null;
  umidade_pct: number | null;
  observacoes: string | null;
  produtor_phone: string | null;
};

export async function getEntrega(
  corretoraId: string,
  id: string,
): Promise<EntregaDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entregas")
    .select(
      `id, sequencia, bag_count, status, data_prevista, data_realizada,
       contrato_id, produtor_id, created_at, updated_at,
       local_retirada, transportadora_nome, transportadora_doc,
       peso_bruto_kg, peso_tara_kg, peso_liquido_kg, umidade_pct, observacoes,
       contrato:contratos!entregas_contrato_id_fkey(code),
       produtor:profiles!entregas_produtor_id_fkey(full_name, phone)`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const r = data as Row & {
    local_retirada: string | null;
    transportadora_nome: string | null;
    transportadora_doc: string | null;
    peso_bruto_kg: number | string | null;
    peso_tara_kg: number | string | null;
    peso_liquido_kg: number | string | null;
    umidade_pct: number | string | null;
    observacoes: string | null;
    produtor:
      | { full_name: string | null; phone: string | null }
      | { full_name: string | null; phone: string | null }[]
      | null;
  };

  const base = toListItem(r as Row, todayISO());
  const prod = pickOne(r.produtor) as
    | { full_name: string | null; phone: string | null }
    | null;
  const num = (v: number | string | null) => (v == null ? null : Number(v));

  return {
    ...base,
    local_retirada: r.local_retirada,
    transportadora_nome: r.transportadora_nome,
    transportadora_doc: r.transportadora_doc,
    peso_bruto_kg: num(r.peso_bruto_kg),
    peso_tara_kg: num(r.peso_tara_kg),
    peso_liquido_kg: num(r.peso_liquido_kg),
    umidade_pct: num(r.umidade_pct),
    observacoes: r.observacoes,
    produtor_phone: prod?.phone ?? null,
  };
}

// Pra cards do dashboard
export async function listEntregasHojeEAtrasadas(
  corretoraId: string,
): Promise<{ hoje: EntregaListItem[]; atrasadas: EntregaListItem[] }> {
  const today = todayISO();
  const supabase = await createClient();
  const { data } = await supabase
    .from("entregas")
    .select(
      `id, sequencia, bag_count, status, data_prevista, data_realizada,
       contrato_id, produtor_id, created_at, updated_at,
       contrato:contratos!entregas_contrato_id_fkey(code),
       produtor:profiles!entregas_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .in("status", PENDENTE_STATUS)
    .lte("data_prevista", today)
    .order("data_prevista", { ascending: true })
    .limit(100);

  const rows = ((data ?? []) as Row[]).map((r) => toListItem(r, today));
  return {
    hoje: rows.filter((r) => r.data_prevista === today),
    atrasadas: rows.filter((r) => r.is_atrasada),
  };
}

// Contratos elegíveis pra criar entrega (não cancelados)
export type ContratoOption = {
  id: string;
  code: string;
  produtor_id: string;
  produtor_nome: string;
  bag_count: number | null;
};

export async function listContratosOptions(
  corretoraId: string,
): Promise<ContratoOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      `id, code, produtor_id, bag_count, status,
       produtor:profiles!contratos_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false })
    .limit(200);

  type R = {
    id: string;
    code: string;
    produtor_id: string;
    bag_count: number | null;
    produtor:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
  };

  return ((data ?? []) as R[]).map((r) => {
    const p = pickOne(r.produtor);
    return {
      id: r.id,
      code: r.code,
      produtor_id: r.produtor_id,
      produtor_nome: p?.full_name ?? "—",
      bag_count: r.bag_count,
    };
  });
}
