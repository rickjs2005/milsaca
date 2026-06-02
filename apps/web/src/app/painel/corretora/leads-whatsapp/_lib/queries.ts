import { createClient } from "@milsaca/db/web/server";
import { loadFunnelStats, type FunnelStats } from "@/lib/leads-funnel";
import {
  WHATSAPP_LEADS_PAGE_SIZE,
  type WhatsAppLeadItem,
  type WhatsAppLeadsFilter,
} from "./meta";

// Re-exporta a meta pura pra quem importava daqui continuar funcionando (server).
// O CLIENT view deve importar de "./meta" diretamente (queries puxa server-only).
export {
  WHATSAPP_LEADS_PAGE_SIZE,
} from "./meta";
export type { WhatsAppLeadItem, WhatsAppLeadsFilter } from "./meta";

export type WhatsAppLeadsSummary = {
  total: number;
  last7Days: number;
  last30Days: number;
  funnel: FunnelStats;
};

type LeadRow = {
  id: string;
  source: string;
  message: string | null;
  user_agent: string | null;
  created_at: string;
  produtor_id: string | null;
  profiles:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Lista paginada de leads-WhatsApp da corretora, filtrável por origem. */
export async function listWhatsAppLeads(
  corretoraId: string,
  filter: WhatsAppLeadsFilter = {},
  page = 1,
): Promise<{ rows: WhatsAppLeadItem[]; count: number }> {
  const supabase = await createClient();
  const from = (page - 1) * WHATSAPP_LEADS_PAGE_SIZE;
  const to = from + WHATSAPP_LEADS_PAGE_SIZE - 1;

  let q = supabase
    .from("whatsapp_leads")
    .select(
      "id, source, message, user_agent, created_at, produtor_id, profiles(full_name, phone)",
      { count: "exact" },
    )
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter.source) q = q.eq("source", filter.source);

  const { data, count } = await q;

  const rows = ((data ?? []) as unknown as LeadRow[]).map(
    (r): WhatsAppLeadItem => {
      const p = pickOne(r.profiles);
      return {
        id: r.id,
        source: r.source,
        message: r.message,
        user_agent: r.user_agent,
        created_at: r.created_at,
        produtor_id: r.produtor_id,
        produtor_nome: p?.full_name ?? null,
        produtor_phone: p?.phone ?? null,
      };
    },
  );

  return { rows, count: count ?? 0 };
}

/** Métricas de topo: total, janelas de 7/30 dias e funil de conversão. */
export async function loadWhatsAppLeadsSummary(
  corretoraId: string,
): Promise<WhatsAppLeadsSummary> {
  const supabase = await createClient();
  const since = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [total, last7, last30, funnel] = await Promise.all([
    supabase
      .from("whatsapp_leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId),
    supabase
      .from("whatsapp_leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .gte("created_at", since(7)),
    supabase
      .from("whatsapp_leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .gte("created_at", since(30)),
    loadFunnelStats(corretoraId),
  ]);

  return {
    total: total.count ?? 0,
    last7Days: last7.count ?? 0,
    last30Days: last30.count ?? 0,
    funnel,
  };
}
