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

export type ContratoListItem = {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  produtor_id: string;
  produtor_nome: string;
  produtor_phone: string | null;
  lead_id: string | null;
};

type ContratoRow = {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  produtor_id: string;
  lead_id: string | null;
  produtor:
    | { id: string; full_name: string | null; phone: string | null }
    | { id: string; full_name: string | null; phone: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Produtor de um lote do tenant — usado pra pré-preencher o contrato a
 * partir do atalho "gerar contrato" de uma oferta aceita ao comprador.
 */
export async function getProdutorIdDoLote(
  corretoraId: string,
  loteId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes")
    .select("produtor_id")
    .eq("id", loteId)
    .eq("corretora_id", corretoraId)
    .maybeSingle<{ produtor_id: string }>();
  return data?.produtor_id ?? null;
}

export const CONTRATOS_PAGE_SIZE = 20;

export async function listContratos(
  corretoraId: string,
  filter: { status?: ContratoStatus } = {},
  page = 1,
): Promise<{ rows: ContratoListItem[]; count: number }> {
  const supabase = await createClient();
  const from = (page - 1) * CONTRATOS_PAGE_SIZE;
  const to = from + CONTRATOS_PAGE_SIZE - 1;
  let q = supabase
    .from("contratos")
    .select(
      `id, code, status, coffee_type, bag_count, total_value, signed_at,
       created_at, updated_at, produtor_id, lead_id,
       produtor:profiles!contratos_produtor_id_fkey(id, full_name, phone)`,
      { count: "exact" },
    )
    .eq("corretora_id", corretoraId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filter.status) q = q.eq("status", filter.status);

  const { data, count } = await q;
  const rows = (data ?? []) as ContratoRow[];

  const mapped = rows.map((r): ContratoListItem => {
    const p = pickOne(r.produtor);
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
      produtor_id: r.produtor_id,
      produtor_nome: p?.full_name ?? "—",
      produtor_phone: p?.phone ?? null,
      lead_id: r.lead_id,
    };
  });

  return { rows: mapped, count: count ?? 0 };
}

export type ContratoDetail = ContratoListItem & {
  notes_lead: string | null;
  produtor_cpf_cnpj: string | null;
  produtor_fazenda: string | null;
  produtor_city: string | null;
  produtor_state: string | null;
  comprador_id: string | null;
  comprador_nome: string | null;
  comprador_cnpj: string | null;
  comprador_ie: string | null;
  comprador_city: string | null;
  comprador_state: string | null;
  comissao_pct: number | null;
  comissao_total: number | null;
};

export async function getContrato(
  corretoraId: string,
  id: string,
): Promise<ContratoDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      `id, code, status, coffee_type, bag_count, total_value, signed_at,
       created_at, updated_at, produtor_id, lead_id,
       comprador_id, comissao_pct, comissao_total,
       produtor:profiles!contratos_produtor_id_fkey(id, full_name, phone, produtores(cpf_cnpj, fazenda_nome, city, state)),
       lead:leads!contratos_lead_id_fkey(notes),
       comprador:compradores!contratos_comprador_id_fkey(id, name, cnpj, inscricao_estadual, city, state)`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  type ProdExt = {
    cpf_cnpj: string | null;
    fazenda_nome: string | null;
    city: string | null;
    state: string | null;
  };
  type ProdutorWithExt = {
    id: string;
    full_name: string | null;
    phone: string | null;
    produtores: ProdExt | ProdExt[] | null;
  };
  type CompradorDetail = {
    id: string;
    name: string;
    cnpj: string | null;
    inscricao_estadual: string | null;
    city: string | null;
    state: string | null;
  };
  type ContratoDetailRow = Omit<ContratoRow, "produtor"> & {
    lead: { notes: string | null } | { notes: string | null }[] | null;
    comprador_id: string | null;
    comissao_pct: number | string | null;
    comissao_total: number | string | null;
    produtor: ProdutorWithExt | ProdutorWithExt[] | null;
    comprador: CompradorDetail | CompradorDetail[] | null;
  };
  const r = data as ContratoDetailRow;

  const p = pickOne(r.produtor);
  const pExt = p ? pickOne(p.produtores) : null;
  const lead = pickOne(r.lead);
  const c = pickOne(r.comprador);
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
    produtor_id: r.produtor_id,
    produtor_nome: p?.full_name ?? "—",
    produtor_phone: p?.phone ?? null,
    produtor_cpf_cnpj: pExt?.cpf_cnpj ?? null,
    produtor_fazenda: pExt?.fazenda_nome ?? null,
    produtor_city: pExt?.city ?? null,
    produtor_state: pExt?.state ?? null,
    lead_id: r.lead_id,
    notes_lead: lead?.notes ?? null,
    comprador_id: r.comprador_id,
    comprador_nome: c?.name ?? null,
    comprador_cnpj: c?.cnpj ?? null,
    comprador_ie: c?.inscricao_estadual ?? null,
    comprador_city: c?.city ?? null,
    comprador_state: c?.state ?? null,
    comissao_pct: r.comissao_pct != null ? Number(r.comissao_pct) : null,
    comissao_total: r.comissao_total != null ? Number(r.comissao_total) : null,
  };
}

export type ProdutorRealOption = {
  id: string;
  label: string;
  sublabel: string | null;
};

export async function listProdutoresReais(
  corretoraId: string,
): Promise<ProdutorRealOption[]> {
  const supabase = await createClient();

  const [leadsRows, contratosRows, favoritosRows] = await Promise.all([
    supabase
      .from("leads")
      .select("produtor_id")
      .eq("corretora_id", corretoraId)
      .not("produtor_id", "is", null),
    supabase
      .from("contratos")
      .select("produtor_id")
      .eq("corretora_id", corretoraId),
    supabase
      .from("favoritos")
      .select("produtor_id")
      .eq("corretora_id", corretoraId),
  ]);

  const ids = new Set<string>();
  for (const r of (leadsRows.data ?? []) as { produtor_id: string | null }[]) {
    if (r.produtor_id) ids.add(r.produtor_id);
  }
  for (const r of (contratosRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id) ids.add(r.produtor_id);
  }
  for (const r of (favoritosRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id) ids.add(r.produtor_id);
  }

  if (ids.size === 0) return [];

  type Row = {
    id: string;
    full_name: string | null;
    produtores:
      | { fazenda_nome: string | null; city: string | null }
      | { fazenda_nome: string | null; city: string | null }[]
      | null;
  };
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, produtores(fazenda_nome, city)")
    .in("id", Array.from(ids))
    .order("full_name", { ascending: true });

  return ((data ?? []) as Row[]).map((p) => {
    const ext = pickOne(p.produtores);
    const sub = [ext?.fazenda_nome, ext?.city].filter(Boolean).join(" — ");
    return {
      id: p.id,
      label: p.full_name ?? "Sem nome",
      sublabel: sub || null,
    };
  });
}

export type LeadPrefill = {
  id: string;
  produtor_id: string | null;
  produtor_nome: string | null;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
};

export async function getLeadForContrato(
  corretoraId: string,
  leadId: string,
): Promise<LeadPrefill | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      `id, produtor_id, coffee_type, bag_count, proposed_price, notes,
       produtor:profiles!leads_produtor_id_fkey(full_name)`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", leadId)
    .maybeSingle();

  if (!data) return null;
  const r = data as {
    id: string;
    produtor_id: string | null;
    coffee_type: string | null;
    bag_count: number | null;
    proposed_price: number | null;
    notes: string | null;
    produtor:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
  };
  const p = pickOne(r.produtor);
  return {
    id: r.id,
    produtor_id: r.produtor_id,
    produtor_nome: p?.full_name ?? null,
    coffee_type: r.coffee_type,
    bag_count: r.bag_count,
    proposed_price: r.proposed_price != null ? Number(r.proposed_price) : null,
    notes: r.notes,
  };
}

/**
 * Gera próximo código de contrato no formato `<slug>-<ano>-<seq>`.
 * Conta contratos da corretora no ano e soma 1.
 */
export async function nextContratoCode(corretoraId: string): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;

  const [{ data: corretora }, { count }] = await Promise.all([
    supabase
      .from("corretoras")
      .select("slug")
      .eq("id", corretoraId)
      .maybeSingle(),
    supabase
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .gte("created_at", start)
      .lt("created_at", end),
  ]);

  const slug = corretora?.slug ?? "MIL";
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `${slug}-${year}-${seq}`;
}
