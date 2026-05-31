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
  sistema: "Sistema",
};

// Cada tipo de notificação mapeia pra um tone semântico da marca.
const KIND_TONE: Record<string, StatusTone> = {
  lead: "info",
  contrato: "success",
  entrega: "warning",
  pagamento: "premium",
  cotacao: "premium",
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
