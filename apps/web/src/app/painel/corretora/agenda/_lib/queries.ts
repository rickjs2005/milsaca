import { createClient } from "@milsaca/db/web/server";
import { ENTREGA_PENDENTE_STATUS } from "../../entregas/_lib/entrega-meta";
import { PAGAMENTO_ABERTO_STATUS } from "../../pagamentos/_lib/pagamento-meta";

/**
 * Agenda comercial — compromissos com data marcada, em baldes temporais
 * (Hoje / Amanhã / Esta semana). Junta entregas previstas e vencimentos de
 * pagamento. Itens com data passada entram em "Hoje" marcados como atrasados.
 *
 * Janela = próximos 7 dias (mais o passado em aberto). `data_prevista` é DATE
 * (YYYY-MM-DD), então comparamos como string ISO de data.
 */

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export type AgendaTipo = "entrega" | "pagamento";

export type AgendaItem = {
  id: string;
  tipo: AgendaTipo;
  data: string; // YYYY-MM-DD
  titulo: string;
  sub: string;
  href: string;
  atrasado: boolean;
};

export type Agenda = {
  hoje: AgendaItem[];
  amanha: AgendaItem[];
  semana: AgendaItem[];
};

const EMPTY: Agenda = { hoje: [], amanha: [], semana: [] };

export async function loadAgenda(corretoraId: string): Promise<Agenda> {
  if (!corretoraId) return EMPTY;
  const supabase = await createClient();
  const hoje = isoDate(0);
  const amanha = isoDate(1);
  const fimSemana = isoDate(7);

  const [entregas, pagamentos] = await Promise.all([
    supabase
      .from("entregas")
      .select(
        "id, bag_count, data_prevista, contrato:contratos!entregas_contrato_id_fkey(code), produtor:profiles!entregas_produtor_id_fkey(full_name)",
      )
      .eq("corretora_id", corretoraId)
      .in("status", ENTREGA_PENDENTE_STATUS)
      .not("data_prevista", "is", null)
      .lte("data_prevista", fimSemana)
      .order("data_prevista", { ascending: true })
      .limit(100),
    supabase
      .from("produtor_pagamentos")
      .select(
        "id, valor_liquido, data_prevista, contrato:contratos!produtor_pagamentos_contrato_id_fkey(code), produtor:profiles!produtor_pagamentos_produtor_id_fkey(full_name)",
      )
      .eq("corretora_id", corretoraId)
      .in("status", PAGAMENTO_ABERTO_STATUS)
      .not("data_prevista", "is", null)
      .lte("data_prevista", fimSemana)
      .order("data_prevista", { ascending: true })
      .limit(100),
  ]);

  const items: AgendaItem[] = [];

  for (const r of (entregas.data ?? []) as Array<{
    id: string;
    bag_count: number | string | null;
    data_prevista: string;
    contrato: { code: string } | { code: string }[] | null;
    produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  }>) {
    const code = pickOne(r.contrato)?.code ?? "—";
    const nome = pickOne(r.produtor)?.full_name ?? "—";
    const bag = r.bag_count != null ? Number(r.bag_count) : null;
    items.push({
      id: r.id,
      tipo: "entrega",
      data: r.data_prevista,
      titulo: `${code} · ${nome}`,
      sub: bag != null ? `Entrega · ${bag} sacas` : "Entrega",
      href: `/painel/corretora/entregas/${r.id}`,
      atrasado: r.data_prevista < hoje,
    });
  }

  for (const r of (pagamentos.data ?? []) as Array<{
    id: string;
    valor_liquido: number | string;
    data_prevista: string;
    contrato: { code: string } | { code: string }[] | null;
    produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  }>) {
    const code = pickOne(r.contrato)?.code ?? null;
    const nome = pickOne(r.produtor)?.full_name ?? "—";
    const valor = Number(r.valor_liquido).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
    items.push({
      id: r.id,
      tipo: "pagamento",
      data: r.data_prevista,
      titulo: nome,
      sub: ["Repasse", valor, code].filter(Boolean).join(" · "),
      href: "/painel/corretora/pagamentos",
      atrasado: r.data_prevista < hoje,
    });
  }

  items.sort((a, b) => a.data.localeCompare(b.data));

  return {
    hoje: items.filter((i) => i.data <= hoje),
    amanha: items.filter((i) => i.data === amanha),
    semana: items.filter((i) => i.data > amanha && i.data <= fimSemana),
  };
}
