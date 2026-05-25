import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { loadFunnelStats } from "@/app/admin/(panel)/leads/_lib/funnel";

export const metadata = { title: "Leads WhatsApp — Painel da corretora" };

const PAGE_SIZE = 30;

type SP = { page?: string; source?: string };

interface PageProps {
  searchParams: Promise<SP>;
}

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

export default async function LeadsWhatsAppCorretoraPage({
  searchParams,
}: PageProps) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const source = sp.source?.trim() || null;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let q = supabase
    .from("whatsapp_leads")
    .select(
      "id, source, message, user_agent, created_at, produtor_id, profiles(full_name, phone)",
      { count: "exact" },
    )
    .eq("corretora_id", profile.corretora_id)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (source) q = q.eq("source", source);

  const [{ data, count }, sevenDayCount, thirtyDayCount, funnel] =
    await Promise.all([
      q,
      supabase
        .from("whatsapp_leads")
        .select("*", { count: "exact", head: true })
        .eq("corretora_id", profile.corretora_id)
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      supabase
        .from("whatsapp_leads")
        .select("*", { count: "exact", head: true })
        .eq("corretora_id", profile.corretora_id)
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      loadFunnelStats(profile.corretora_id),
    ]);

  type Row = {
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
  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      ...r,
      produtorNome: p?.full_name ?? null,
      produtorPhone: p?.phone ?? null,
    };
  });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Leads WhatsApp
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Produtores que clicaram em &ldquo;Falar no WhatsApp&rdquo; com a sua
          corretora.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={count ?? 0} />
        <Stat label="Últimos 7 dias" value={sevenDayCount.count ?? 0} />
        <Stat label="Últimos 30 dias" value={thirtyDayCount.count ?? 0} />
      </div>

      {funnel.uniquePairs > 0 ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Funil de conversão
          </p>
          <p className="mt-2 text-sm text-emerald-900">
            <strong>{funnel.convertedPairs}</strong> de{" "}
            <strong>{funnel.uniquePairs}</strong> produtores que te chamaram
            viraram contrato — taxa de{" "}
            <strong>{(funnel.conversionRate * 100).toFixed(1)}%</strong>.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Filtrar origem:</span>
        {[
          { value: "", label: "Todas" },
          { value: "catalogo_corretoras", label: "Catálogo" },
          { value: "perfil_corretora", label: "Perfil" },
          { value: "home_publica", label: "Home" },
          { value: "outro", label: "Outro" },
        ].map((s) => {
          const params = new URLSearchParams();
          if (s.value) params.set("source", s.value);
          const href = params.toString()
            ? `/painel/corretora/leads-whatsapp?${params.toString()}`
            : "/painel/corretora/leads-whatsapp";
          const active = source === (s.value || null);
          return (
            <Link
              key={s.value || "all"}
              href={href}
              className={
                active
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-milsaca-verde/10 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <MessageCircle className="h-10 w-10 text-milsaca-verde-claro/40" />
            <p className="text-sm text-milsaca-verde-claro">
              Nenhum lead WhatsApp registrado ainda{source ? " com esse filtro" : ""}.
            </p>
            <p className="max-w-md text-xs text-milsaca-verde-claro/70">
              Conforme produtores cliquem em &ldquo;Falar no WhatsApp&rdquo; no
              catálogo, eles aparecem aqui antes mesmo de você receber a mensagem.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-milsaca-cream-escuro/30 text-left text-xs uppercase tracking-wide text-milsaca-verde-claro">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Produtor</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-milsaca-cream-escuro/40">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-milsaca-cream-escuro/20">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-milsaca-verde-claro">
                    {fmtDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.produtorNome ? (
                      <div>
                        <p className="text-sm font-medium text-milsaca-verde">
                          {r.produtorNome}
                        </p>
                        {r.produtorPhone ? (
                          <p className="font-mono text-[10px] text-milsaca-verde-claro/70">
                            {r.produtorPhone}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs italic text-milsaca-verde-claro/60">
                        Sem login (anônimo)
                      </p>
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
                  <td className="px-4 py-3 text-xs text-milsaca-verde-claro">
                    {r.message ? (
                      <details>
                        <summary className="cursor-pointer text-milsaca-dourado hover:underline">
                          ver
                        </summary>
                        <p className="mt-1 max-w-md rounded bg-milsaca-cream-escuro/30 p-2 text-[11px] text-milsaca-verde">
                          {r.message}
                        </p>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-milsaca-verde-claro">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-milsaca-verde/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-milsaca-verde-claro">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-milsaca-verde">{value}</p>
    </div>
  );
}

function buildHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  if (sp.source) params.set("source", sp.source);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs
    ? `/painel/corretora/leads-whatsapp?${qs}`
    : "/painel/corretora/leads-whatsapp";
}
