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
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { timeAgo } from "@/lib/format";
import { toggleAlertActive, deleteAlert } from "./_actions";

export const metadata = { title: "Alvos de preço — Painel do produtor" };

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
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Cotações
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            Alvos de preço
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Receba uma notificação quando uma cotação bater o preço que você
            quer.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/produtor/cotacoes/alvos/novo">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo alvo
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Bell className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Você ainda não criou nenhum alvo.
            </p>
            <p className="max-w-md text-xs text-milsaca-verde-claro">
              Crie um alvo (ex: &quot;avisar quando Arábica passar de R$
              2.000&quot;) e o Milsaca notifica você quando bater o preço.
            </p>
            <Button
              asChild
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/produtor/cotacoes/alvos/novo">
                Criar primeiro alvo
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
                className={
                  r.active
                    ? "border-milsaca-cream-escuro"
                    : "border-milsaca-cream-escuro bg-milsaca-cream-escuro/30 opacity-70"
                }
              >
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-milsaca-verde">
                        {ct?.name ?? "—"}
                      </p>
                      {pr ? (
                        <p className="text-xs text-milsaca-verde-claro">
                          {pr.name}/{pr.state}
                        </p>
                      ) : (
                        <p className="text-xs italic text-milsaca-verde-claro/80">
                          Qualquer praça
                        </p>
                      )}
                    </div>
                    {r.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Bell className="h-3 w-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <BellOff className="h-3 w-3" />
                        Pausado
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-milsaca-verde">
                      {above ? (
                        <TrendingUp className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-700" />
                      )}
                      {above ? "Subir acima de" : "Cair abaixo de"}
                    </span>
                    <span className="text-2xl font-semibold text-milsaca-verde">
                      {fmtBRL(r.target_price)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-milsaca-verde-claro">
                    <span>Notificar: {CHANNEL_LABEL[r.channel]}</span>
                    {r.last_triggered_at ? (
                      <span>
                        Último: {timeAgo(r.last_triggered_at)}
                      </span>
                    ) : (
                      <span className="italic">Sem disparos</span>
                    )}
                  </div>

                  {r.notes ? (
                    <p className="text-xs italic text-milsaca-verde-claro">
                      “{r.notes}”
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2 border-t border-milsaca-cream-escuro/60 pt-3">
                    <Link
                      href={`/painel/produtor/cotacoes/alvos/${r.id}`}
                      className="text-xs font-medium text-milsaca-verde hover:underline"
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
                        className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
