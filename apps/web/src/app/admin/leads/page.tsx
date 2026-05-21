import Link from "next/link";
import { Handshake, MessageCircle } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { loadFunnelStats } from "./_lib/funnel";

export const metadata = { title: "Leads · Admin Milsaca" };

const PAGE_SIZE = 50;

const SOURCES = [
  { value: "", label: "Todas as origens" },
  { value: "catalogo_corretoras", label: "Catálogo" },
  { value: "perfil_corretora", label: "Perfil da corretora" },
  { value: "home_publica", label: "Home pública" },
  { value: "outro", label: "Outro" },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  catalogo_corretoras: "Catálogo",
  perfil_corretora: "Perfil",
  home_publica: "Home",
  outro: "Outro",
};

const SOURCE_TONE: Record<string, StatusTone> = {
  catalogo_corretoras: "success",
  perfil_corretora: "info",
  home_publica: "warning",
  outro: "neutral",
};

type SP = {
  corretora?: string;
  source?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

type Row = {
  id: string;
  corretora_id: string;
  produtor_id: string | null;
  source: string;
  message: string | null;
  user_agent: string | null;
  created_at: string;
  corretoraName: string | null;
  produtorName: string | null;
};

export default async function LeadsAdminPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const corretoraId = sp.corretora?.trim() || null;
  const source = sp.source?.trim() || null;

  const supabase = await createClient();

  let q = supabase
    .from("whatsapp_leads")
    .select(
      "id, corretora_id, produtor_id, source, message, user_agent, created_at, corretoras(name), profiles(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (corretoraId) q = q.eq("corretora_id", corretoraId);
  if (source) q = q.eq("source", source);

  const { data, count } = await q;

  const { data: corretorasList } = await supabase
    .from("corretoras")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200);

  type Raw = {
    id: string;
    corretora_id: string;
    produtor_id: string | null;
    source: string;
    message: string | null;
    user_agent: string | null;
    created_at: string;
    corretoras: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const rows: Row[] = ((data ?? []) as unknown as Raw[]).map((r) => ({
    ...r,
    corretoraName: Array.isArray(r.corretoras)
      ? r.corretoras[0]?.name ?? null
      : r.corretoras?.name ?? null,
    produtorName: Array.isArray(r.profiles)
      ? r.profiles[0]?.full_name ?? null
      : r.profiles?.full_name ?? null,
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const funnel = await loadFunnelStats(corretoraId);
  const conversionPct = (funnel.conversionRate * 100).toFixed(1);

  const columns: Column<Row>[] = [
    {
      key: "quando",
      header: "Quando",
      mobileLabel: "Quando",
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
    {
      key: "corretora",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (r) =>
        r.corretoraName ? (
          <span className="font-medium text-slate-900">{r.corretoraName}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "produtor",
      header: "Produtor",
      mobileLabel: "Produtor",
      cell: (r) =>
        r.produtorName ?? (
          <span className="text-xs italic text-slate-400">anônimo</span>
        ),
    },
    {
      key: "origem",
      header: "Origem",
      mobileLabel: "Origem",
      cell: (r) => (
        <StatusBadge tone={SOURCE_TONE[r.source] ?? "neutral"}>
          {SOURCE_LABEL[r.source] ?? r.source}
        </StatusBadge>
      ),
    },
    {
      key: "msg",
      header: "Mensagem",
      mobileLabel: "Mensagem",
      cell: (r) =>
        r.message ? (
          <details>
            <summary className="cursor-pointer text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline">
              ver
            </summary>
            <p className="mt-1 max-w-md rounded-md bg-slate-50 p-2 text-[11px] text-slate-700">
              {r.message}
            </p>
          </details>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Leads WhatsApp"
        description={`Cliques no botão "Falar no WhatsApp" registrados antes do redirect. ${count ?? 0} ${count === 1 ? "registro" : "registros"} no total.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Leads WhatsApp" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Cliques totais"
          value={funnel.totalClicks}
          icon={MessageCircle}
          hint="Incluindo anônimos."
        />
        <KpiCard
          label="Pares únicos"
          value={funnel.uniquePairs}
          icon={Handshake}
          hint="Corretora ↔ produtor."
        />
        <KpiCard
          label="Viraram contrato"
          value={funnel.convertedPairs}
          tone="success"
          hint="Pelo menos 1 contrato após o click."
        />
        <KpiCard
          label="Taxa de conversão"
          value={`${conversionPct}%`}
          tone="premium"
          hint="Contratos / pares únicos."
        />
      </div>

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card"
      >
        <div className="space-y-1">
          <label
            htmlFor="corretora"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Corretora
          </label>
          <select
            id="corretora"
            name="corretora"
            defaultValue={corretoraId ?? ""}
            className="flex h-9 w-72 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">Todas</option>
            {(corretorasList ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="source"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Origem
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ""}
            className="flex h-9 w-48 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-9">
          Filtrar
        </Button>
        {(corretoraId || source) && (
          <Button asChild variant="ghost" className="h-9 text-slate-500">
            <Link href="/admin/leads">Limpar</Link>
          </Button>
        )}
      </form>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={MessageCircle}
            title="Nenhum lead registrado ainda"
            description={
              corretoraId || source
                ? "Tente ajustar os filtros — talvez a busca esteja restrita demais."
                : "Quando produtores clicarem em \"Falar no WhatsApp\" no catálogo, os cliques aparecem aqui antes do redirect."
            }
            secondaryCta={
              corretoraId || source
                ? { label: "Limpar filtros", href: "/admin/leads" }
                : undefined
            }
          />
        }
      />

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page - 1)}>← Anterior</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page + 1)}>Próxima →</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  if (sp.corretora) params.set("corretora", sp.corretora);
  if (sp.source) params.set("source", sp.source);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/leads?${qs}` : "/admin/leads";
}
