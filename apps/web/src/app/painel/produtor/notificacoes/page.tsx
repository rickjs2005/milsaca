import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";

export const metadata = { title: "Notificações — Milsaca" };

const KIND_LABEL: Record<string, string> = {
  lead: "Proposta",
  contrato: "Contrato",
  cotacao: "Cotação",
  sistema: "Sistema",
};

const KIND_COLOR: Record<string, string> = {
  lead: "bg-sky-100 text-sky-800",
  contrato: "bg-emerald-100 text-emerald-800",
  cotacao: "bg-milsaca-dourado/20 text-milsaca-verde",
  sistema: "bg-slate-200 text-slate-700",
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
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-milsaca-verde">
          <Bell className="h-7 w-7" />
          Notificações
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Avisos sobre cotações, propostas, contratos, entregas e pagamentos.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Sem notificações por enquanto. Quando aparecer movimentação na sua
            conta, mostramos aqui.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
            {rows.map((n) => (
              <div
                key={n.id}
                className={
                  n.read_at
                    ? "flex items-start justify-between gap-4 px-5 py-4"
                    : "flex items-start justify-between gap-4 bg-milsaca-cream-escuro/30 px-5 py-4"
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${KIND_COLOR[n.kind] ?? "bg-slate-100"} hover:${KIND_COLOR[n.kind] ?? "bg-slate-100"}`}
                    >
                      {KIND_LABEL[n.kind] ?? n.kind}
                    </Badge>
                    <p className="text-sm font-semibold text-milsaca-verde">
                      {n.title}
                    </p>
                  </div>
                  {n.body ? (
                    <p className="mt-1 text-sm text-milsaca-verde-claro">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-milsaca-verde-claro/70">
                    {fmtDateTime(n.created_at)}
                  </p>
                </div>
                {!n.read_at ? (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-milsaca-dourado" />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
