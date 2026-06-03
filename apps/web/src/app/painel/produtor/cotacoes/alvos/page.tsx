import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { timeAgo } from "@/lib/format";
import { toggleAlertActive, deleteAlert } from "./_actions";

export const metadata = { title: "Alertas de preço — Painel do produtor" };

type Row = {
  id: string;
  product_id: string;
  region_id: string | null;
  target_price: number;
  condition: "acima_de" | "abaixo_de";
  channel: "app" | "whatsapp" | "email";
  active: boolean;
  last_triggered_at: string | null;
  notes: string | null;
  created_at: string;
  coffee_types: { name: string } | { name: string }[] | null;
  pracas: { name: string; state: string } | { name: string; state: string }[] | null;
};

const CHANNEL_LABEL: Record<Row["channel"], string> = {
  app: "App",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function pick<T extends { name: string } | { name: string }[] | null>(
  v: T,
): { name: string } | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function AlvosPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select(
      "id, product_id, region_id, target_price, condition, channel, active, last_triggered_at, notes, created_at, coffee_types(name), pracas(name, state)",
    )
    .eq("produtor_id", user.id)
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    target_price: Number(r.target_price),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor/cotacoes"
          className="inline-flex items-center gap-1 rounded-sm text-body-sm text-neutral-600 transition-colors hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Cotações
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Alertas de preço</h1>
          <p className="text-body-sm text-neutral-600">
            Receba uma notificação quando uma cotação bater o preço que você
            quer.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/produtor/cotacoes/alvos/novo">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo alerta
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
              <Bell className="h-6 w-6" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              Você ainda não criou nenhum alerta.
            </p>
            <p className="max-w-md text-caption text-neutral-600">
              Crie um alerta (ex: &quot;avisar quando Arábica passar de R$
              2.000&quot;) e o Milsaca notifica você quando bater o preço.
            </p>
            <Button asChild variant="primary">
              <Link href="/painel/produtor/cotacoes/alvos/novo">
                Criar primeiro alerta
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const ct = pick(r.coffee_types);
            const pr = pick(r.pracas) as { name: string; state: string } | null;
            const above = r.condition === "acima_de";
            return (
              <Card
                key={r.id}
                tone={r.active ? "default" : "muted"}
                className={r.active ? undefined : "opacity-70"}
              >
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-h3 text-milsaca-cafezal">
                        {ct?.name ?? "—"}
                      </p>
                      {pr ? (
                        <p className="text-caption text-neutral-600">
                          {pr.name}/{pr.state}
                        </p>
                      ) : (
                        <p className="text-caption italic text-neutral-500">
                          Qualquer praça
                        </p>
                      )}
                    </div>
                    {r.active ? (
                      <StatusBadge tone="success" withDot={false}>
                        <Bell className="mr-1 h-3 w-3" />
                        Ativo
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral" withDot={false}>
                        <BellOff className="mr-1 h-3 w-3" />
                        Pausado
                      </StatusBadge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="inline-flex items-center gap-1 text-body-sm font-medium text-milsaca-cafezal">
                      {above ? (
                        <TrendingUp className="h-4 w-4 text-success-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger-600" />
                      )}
                      {above ? "Subir acima de" : "Cair abaixo de"}
                    </span>
                    <span className="text-2xl font-semibold text-milsaca-cafezal">
                      {fmtBRL(r.target_price)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-neutral-600">
                    <span>Notificar: {CHANNEL_LABEL[r.channel]}</span>
                    {r.last_triggered_at ? (
                      <span>Último: {timeAgo(r.last_triggered_at)}</span>
                    ) : (
                      <span className="italic">Sem disparos</span>
                    )}
                  </div>

                  {r.notes ? (
                    <p className="text-caption italic text-neutral-600">
                      “{r.notes}”
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
                    <Link
                      href={`/painel/produtor/cotacoes/alvos/${r.id}`}
                      className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Editar
                    </Link>
                    <form action={toggleAlertActive}>
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={r.active ? "false" : "true"}
                      />
                      <SubmitButton
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        pendingLabel="..."
                      >
                        {r.active ? "Pausar" : "Ativar"}
                      </SubmitButton>
                    </form>
                    <form action={deleteAlert}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                        confirmTitle="Apagar alvo?"
                        confirmMessage={
                          <p>
                            O alvo deixará de existir. Cria um novo se mudar de
                            ideia.
                          </p>
                        }
                        confirmButtonLabel="Apagar"
                        confirmButtonVariant="destructive"
                        pendingLabel="..."
                      >
                        Apagar
                      </ConfirmSubmit>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
