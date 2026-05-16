import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_negociacao",
  "convertido",
  "perdido",
  "arquivado",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  novo: "bg-milsaca-dourado/20 text-milsaca-verde",
  em_negociacao: "bg-sky-100 text-sky-800",
  convertido: "bg-emerald-100 text-emerald-800",
  perdido: "bg-rose-100 text-rose-800",
  arquivado: "bg-slate-200 text-slate-700",
};

export type LeadListItem = {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  produtor_kind: "produtor" | "contato";
  produtor_id: string;
  produtor_nome: string;
  produtor_phone: string | null;
};

export type LeadListFilter = { status?: LeadStatus };

type LeadRow = {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  produtor_id: string | null;
  contato_id: string | null;
  produtor:
    | { id: string; full_name: string | null; phone: string | null }
    | { id: string; full_name: string | null; phone: string | null }[]
    | null;
  contato:
    | { id: string; full_name: string; phone: string | null }
    | { id: string; full_name: string; phone: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function listLeads(
  corretoraId: string,
  filter: LeadListFilter = {},
): Promise<LeadListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select(
      `id, status, coffee_type, bag_count, proposed_price, notes, created_at, updated_at,
       produtor_id, contato_id,
       produtor:profiles!leads_produtor_id_fkey(id, full_name, phone),
       contato:produtor_contatos!leads_contato_id_fkey(id, full_name, phone)`,
    )
    .eq("corretora_id", corretoraId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const rows = (data ?? []) as LeadRow[];

  return rows.map((r): LeadListItem => {
    const prod = pickOne(r.produtor);
    const cont = pickOne(r.contato);
    const kind: "produtor" | "contato" = prod ? "produtor" : "contato";
    return {
      id: r.id,
      status: r.status,
      coffee_type: r.coffee_type,
      bag_count: r.bag_count,
      proposed_price:
        r.proposed_price != null ? Number(r.proposed_price) : null,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      produtor_kind: kind,
      produtor_id: prod?.id ?? cont?.id ?? "",
      produtor_nome: prod?.full_name ?? cont?.full_name ?? "—",
      produtor_phone: prod?.phone ?? cont?.phone ?? null,
    };
  });
}

export type LeadEvent = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  actor_name: string | null;
  created_at: string;
};

export type LeadDetail = LeadListItem & {
  events: LeadEvent[];
};

export async function getLead(
  corretoraId: string,
  leadId: string,
): Promise<LeadDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      `id, status, coffee_type, bag_count, proposed_price, notes, created_at, updated_at,
       produtor_id, contato_id,
       produtor:profiles!leads_produtor_id_fkey(id, full_name, phone),
       contato:produtor_contatos!leads_contato_id_fkey(id, full_name, phone)`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", leadId)
    .maybeSingle();

  if (!data) return null;
  const r = data as LeadRow;

  const { data: eventsRaw } = await supabase
    .from("lead_events")
    .select(
      `id, kind, payload, created_at,
       actor:profiles!lead_events_actor_id_fkey(full_name)`,
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(200);

  type EventRow = {
    id: string;
    kind: string;
    payload: Record<string, unknown> | null;
    created_at: string;
    actor:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
  };

  const events: LeadEvent[] = ((eventsRaw ?? []) as EventRow[]).map((e) => {
    const actor = pickOne(e.actor);
    return {
      id: e.id,
      kind: e.kind,
      payload: e.payload ?? {},
      actor_name: actor?.full_name ?? null,
      created_at: e.created_at,
    };
  });

  const prod = pickOne(r.produtor);
  const cont = pickOne(r.contato);
  const kind: "produtor" | "contato" = prod ? "produtor" : "contato";

  return {
    id: r.id,
    status: r.status,
    coffee_type: r.coffee_type,
    bag_count: r.bag_count,
    proposed_price: r.proposed_price != null ? Number(r.proposed_price) : null,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    produtor_kind: kind,
    produtor_id: prod?.id ?? cont?.id ?? "",
    produtor_nome: prod?.full_name ?? cont?.full_name ?? "—",
    produtor_phone: prod?.phone ?? cont?.phone ?? null,
    events,
  };
}

export type LeadTargetOption = {
  value: string; // "produtor:<uuid>" | "contato:<uuid>"
  label: string;
  kind: "produtor" | "contato";
  sublabel: string | null;
};

export async function listLeadTargets(
  corretoraId: string,
): Promise<{
  produtores: LeadTargetOption[];
  contatos: LeadTargetOption[];
}> {
  const supabase = await createClient();

  // Produtores reais relacionados: união de leads + contratos + favoritos
  const [leadsRows, contratosRows, favoritosRows, contatosRows] =
    await Promise.all([
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
      supabase
        .from("produtor_contatos")
        .select("id, full_name, fazenda_nome, city, state, claimed_profile_id")
        .eq("corretora_id", corretoraId)
        .is("claimed_profile_id", null)
        .order("full_name", { ascending: true }),
    ]);

  const produtorIds = new Set<string>();
  for (const r of (leadsRows.data ?? []) as { produtor_id: string | null }[]) {
    if (r.produtor_id) produtorIds.add(r.produtor_id);
  }
  for (const r of (contratosRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id) produtorIds.add(r.produtor_id);
  }
  for (const r of (favoritosRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id) produtorIds.add(r.produtor_id);
  }

  type ProfileRow = {
    id: string;
    full_name: string | null;
    produtores:
      | { fazenda_nome: string | null; city: string | null }
      | { fazenda_nome: string | null; city: string | null }[]
      | null;
  };

  const profileIds = Array.from(produtorIds);
  const profiles: ProfileRow[] =
    profileIds.length === 0
      ? []
      : ((
          await supabase
            .from("profiles")
            .select("id, full_name, produtores(fazenda_nome, city)")
            .in("id", profileIds)
            .order("full_name", { ascending: true })
        ).data ?? []) as ProfileRow[];

  const produtores: LeadTargetOption[] = profiles.map((p) => {
    const ext = pickOne(p.produtores);
    const sub = [ext?.fazenda_nome, ext?.city].filter(Boolean).join(" — ");
    return {
      value: `produtor:${p.id}`,
      label: p.full_name ?? "Sem nome",
      kind: "produtor",
      sublabel: sub || null,
    };
  });

  type ContatoRow = {
    id: string;
    full_name: string;
    fazenda_nome: string | null;
    city: string | null;
    state: string | null;
  };

  const contatos: LeadTargetOption[] = (
    (contatosRows.data ?? []) as ContatoRow[]
  ).map((c) => {
    const local = [c.city, c.state].filter(Boolean).join("/");
    const sub = [c.fazenda_nome, local].filter(Boolean).join(" — ");
    return {
      value: `contato:${c.id}`,
      label: c.full_name,
      kind: "contato",
      sublabel: sub || null,
    };
  });

  return { produtores, contatos };
}
