import { createClient } from "@milsaca/db/web/server";

export type OfertaStatus =
  | "rascunho"
  | "enviada"
  | "aceita"
  | "recusada"
  | "expirada";

export const OFERTA_STATUS_ORDER: OfertaStatus[] = [
  "enviada",
  "aceita",
  "recusada",
  "expirada",
  "rascunho",
];

export const OFERTA_STATUS_LABEL: Record<OfertaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export const OFERTA_STATUS_COLOR: Record<OfertaStatus, string> = {
  rascunho: "bg-slate-200 text-slate-700",
  enviada: "bg-milsaca-dourado/20 text-milsaca-verde",
  aceita: "bg-emerald-100 text-emerald-800",
  recusada: "bg-rose-100 text-rose-800",
  expirada: "bg-slate-200 text-slate-700",
};

export type OfertaItem = {
  id: string;
  preco_saca: number;
  bag_count: number | null;
  validade_ate: string | null;
  mensagem: string | null;
  status: OfertaStatus;
  created_at: string;
  comprador_id: string;
  comprador_nome: string;
  lote_id: string | null;
  lote_codigo: string | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type Row = {
  id: string;
  preco_saca: number | string;
  bag_count: number | null;
  validade_ate: string | null;
  mensagem: string | null;
  status: OfertaStatus;
  created_at: string;
  comprador_id: string;
  lote_id: string | null;
  comprador: { name: string } | { name: string }[] | null;
  lote: { codigo: string } | { codigo: string }[] | null;
};

const SELECT = `id, preco_saca, bag_count, validade_ate, mensagem, status, created_at,
  comprador_id, lote_id,
  comprador:compradores!ofertas_comprador_comprador_id_fkey(name),
  lote:lotes!ofertas_comprador_lote_id_fkey(codigo)`;

function mapRow(r: Row): OfertaItem {
  const comp = pickOne(r.comprador);
  const lote = pickOne(r.lote);
  return {
    id: r.id,
    preco_saca: Number(r.preco_saca),
    bag_count: r.bag_count,
    validade_ate: r.validade_ate,
    mensagem: r.mensagem,
    status: r.status,
    created_at: r.created_at,
    comprador_id: r.comprador_id,
    comprador_nome: comp?.name ?? "—",
    lote_id: r.lote_id,
    lote_codigo: lote?.codigo ?? null,
  };
}

export const OFERTAS_PAGE_SIZE = 20;

export async function listOfertas(
  corretoraId: string,
  filter: { status?: OfertaStatus } = {},
  page = 1,
): Promise<{ rows: OfertaItem[]; count: number }> {
  const supabase = await createClient();
  const from = (page - 1) * OFERTAS_PAGE_SIZE;
  const to = from + OFERTAS_PAGE_SIZE - 1;
  let q = supabase
    .from("ofertas_comprador")
    .select(SELECT, { count: "exact" })
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter.status) q = q.eq("status", filter.status);
  const { data, count } = await q;
  return {
    rows: ((data ?? []) as unknown as Row[]).map(mapRow),
    count: count ?? 0,
  };
}

/** Ofertas de um lote específico (pro bloco no detalhe do lote). */
export async function listOfertasDoLote(loteId: string): Promise<OfertaItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ofertas_comprador")
    .select(SELECT)
    .eq("lote_id", loteId)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as Row[]).map(mapRow);
}

export type LotePicker = {
  id: string;
  codigo: string;
  specie: string | null;
  status: string;
};

export async function listLotesParaOferta(
  corretoraId: string,
): Promise<LotePicker[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes")
    .select("id, codigo, specie, status")
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as LotePicker[];
}
