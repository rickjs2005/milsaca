import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";

export const metadata = { title: "Notificações — Milsaca" };

const KIND_LABEL: Record<string, string> = {
  lead: "Proposta",
  contrato: "Contrato",
  entrega: "Entrega",
  pagamento: "Pagamento",
  cotacao: "Cotação",
  price_alert: "Alerta de preço",
  social: "Comunidade",
  sistema: "Sistema",
};

// Cada tipo de notificação mapeia pra um tone semântico da marca.
const KIND_TONE: Record<string, StatusTone> = {
  lead: "info",
  contrato: "success",
  entrega: "warning",
  pagamento: "premium",
  cotacao: "premium",
  price_alert: "info",
  social: "premium",
  sistema: "neutral",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Destino "Ver →" de cada notificação, a partir do tipo + ids em `data`
 * (lead_id/contrato_id gravados pelo notify()). Produtor não tem detalhe de
 * entrega/pagamento, então esses caem na lista correspondente.
 */
function actionFor(
  kind: string,
  data: Record<string, unknown> | null,
): { href: string; label: string } | null {
  const id = (k: string) =>
    data && typeof data[k] === "string" ? (data[k] as string) : null;
  switch (kind) {
    case "lead": {
      const leadId = id("lead_id");
      return leadId
        ? { href: `/painel/produtor/negociacoes/${leadId}`, label: "Ver proposta" }
        : null;
    }
    case "contrato": {
      const contratoId = id("contrato_id");
      return contratoId
        ? { href: `/painel/produtor/contratos/${contratoId}`, label: "Ver contrato" }
        : null;
    }
    case "entrega":
      return { href: "/painel/produtor/entregas", label: "Ver entregas" };
    case "pagamento":
      return { href: "/painel/produtor/financeiro", label: "Ver no financeiro" };
    case "cotacao":
    case "price_alert":
      return { href: "/painel/produtor/cotacoes", label: "Ver cotações" };
    case "social": {
      const postId = id("post_id");
      if (postId) {
        return {
          href: `/painel/produtor/comunidade/post/${postId}`,
          label: "Ver publicação",
        };
      }
      const perfilId = id("perfil_id");
      return perfilId
        ? {
            href: `/painel/produtor/comunidade/perfil/${perfilId}`,
            label: "Ver perfil",
          }
        : { href: "/painel/produtor/comunidade", label: "Ver Comunidade" };
    }
    default:
      return null;
  }
}

export default async function NotificacoesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, read_at, data, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    read_at: string | null;
    data: Record<string, unknown> | null;
    created_at: string;
  };

  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Notificações</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Avisos sobre cotações, propostas, contratos, entregas e pagamentos.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="py-10 text-center text-body-sm text-neutral-600">
            Sem notificações por enquanto. Quando aparecer movimentação na sua
            conta, mostramos aqui.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-200 p-0">
            {rows.map((n) => (
              <div
                key={n.id}
                className={
                  n.read_at
                    ? "flex items-start justify-between gap-4 px-5 py-4"
                    : "flex items-start justify-between gap-4 bg-milsaca-cream-escuro/40 px-5 py-4"
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={KIND_TONE[n.kind] ?? "neutral"}>
                      {KIND_LABEL[n.kind] ?? n.kind}
                    </StatusBadge>
                    <p className="text-body-sm font-semibold text-milsaca-cafezal">
                      {n.title}
                    </p>
                  </div>
                  {n.body ? (
                    <p className="mt-1 text-body-sm text-neutral-600">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-caption text-neutral-500">
                    {fmtDateTime(n.created_at)}
                  </p>
                  {(() => {
                    const act = actionFor(n.kind, n.data);
                    return act ? (
                      <Link
                        href={act.href}
                        className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-milsaca-dourado-texto hover:underline"
                      >
                        {act.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null;
                  })()}
                </div>
                {!n.read_at ? (
                  <span
                    aria-label="Não lida"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-milsaca-dourado"
                  />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
