import { createClient } from "@milsaca/db/web/server";
import type { OfertaStatus, OfertaItem } from "./oferta-meta";

// Re-export da meta pura — clients importam de "./oferta-meta" direto.
export {
  OFERTA_STATUS_ORDER,
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_TONE,
  OFERTA_STATUS_COLOR,
} from "./oferta-meta";
export type { OfertaStatus, OfertaItem } from "./oferta-meta";

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
  lote: LoteJoin | LoteJoin[] | null;
};

type LoteJoin = {
  codigo: string;
  produtor_id: string | null;
  produtor:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

const SELECT = `id, preco_saca, bag_count, validade_ate, mensagem, status, created_at,
  comprador_id, lote_id,
  comprador:compradores!ofertas_comprador_comprador_id_fkey(name),
  lote:lotes!ofertas_comprador_lote_id_fkey(codigo, produtor_id,
    produtor:profiles!lotes_produtor_id_fkey(full_name))`;

function mapRow(r: Row): OfertaItem {
  const comp = pickOne(r.comprador);
  const lote = pickOne(r.lote);
  const loteProdutor = lote ? pickOne(lote.produtor) : null;
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
    produtor_id: lote?.produtor_id ?? null,
    produtor_nome: loteProdutor?.full_name ?? null,
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

export type OfertasKpis = {
  ofertado: number;
  enviadas: number;
  aceitas: number;
  conversao: number;
};

export async function loadOfertasKpis(
  corretoraId: string,
): Promise<OfertasKpis> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ofertas_comprador")
    .select("status, preco_saca, bag_count")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as Array<{
    status: OfertaStatus;
    preco_saca: number | string;
    bag_count: number | null;
  }>;

  let ofertado = 0;
  let enviadas = 0;
  let aceitas = 0;
  let base = 0; // tudo que saiu do rascunho (denominador da conversão)
  for (const r of rows) {
    const total = r.bag_count != null ? Number(r.preco_saca) * r.bag_count : 0;
    if (r.status === "enviada" || r.status === "aceita") ofertado += total;
    if (r.status === "enviada") enviadas += 1;
    if (r.status === "aceita") aceitas += 1;
    if (r.status !== "rascunho") base += 1;
  }
  const conversao = base > 0 ? Math.round((aceitas / base) * 100) : 0;
  return { ofertado, enviadas, aceitas, conversao };
}
