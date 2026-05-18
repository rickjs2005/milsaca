import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const SOURCE_COLOR: Record<string, string> = {
  catalogo_corretoras: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  perfil_corretora: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  home_publica: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  outro: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

type SP = {
  corretora?: string;
  source?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

  // Lista de corretoras pra filtro (limit alto, são poucas)
  const { data: corretorasList } = await supabase
    .from("corretoras")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200);

  type Row = {
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
  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Leads WhatsApp
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cliques no botão &ldquo;Falar no WhatsApp&rdquo; registrados antes do redirect.{" "}
          {count != null ? `${count} registro${count === 1 ? "" : "s"}.` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FunnelKpi
          label="Cliques totais"
          value={funnel.totalClicks}
          hint="incluindo anônimos"
        />
        <FunnelKpi
          label="Pares únicos"
          value={funnel.uniquePairs}
          hint="corretora ↔ produtor"
        />
        <FunnelKpi
          label="Viraram contrato"
          value={funnel.convertedPairs}
          hint="pelo menos 1 contrato após o click"
        />
        <FunnelKpi
          label="Taxa de conversão"
          value={`${conversionPct}%`}
          hint="contratos / pares únicos"
          accent
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
            className="flex h-9 w-72 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm"
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
            className="flex h-9 w-48 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm"
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhum lead registrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Corretora</th>
                <th className="px-4 py-3">Produtor</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    {fmtDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {r.corretoraName ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {r.produtorName ?? (
                      <span className="text-xs italic text-slate-400">
                        anônimo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        SOURCE_COLOR[r.source] ??
                        "bg-slate-200 text-slate-700 hover:bg-slate-200"
                      }
                    >
                      {SOURCE_LABEL[r.source] ?? r.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.message ? (
                      <details>
                        <summary className="cursor-pointer text-milsaca-dourado hover:underline">
                          ver
                        </summary>
                        <p className="mt-1 max-w-md rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                          {r.message}
                        </p>
                      </details>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
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
    </div>
  );
}

function FunnelKpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-2 text-2xl font-bold text-emerald-700"
            : "mt-2 text-2xl font-bold text-slate-900"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </div>
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
