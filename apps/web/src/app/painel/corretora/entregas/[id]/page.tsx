import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getProfile } from "@/lib/auth";
import {
  ENTREGA_STATUS_COLOR,
  ENTREGA_STATUS_LABEL,
  getEntrega,
  type EntregaStatus,
} from "../_lib/queries";
import { updateEntregaFields, updateEntregaStatus } from "../_actions";

export const metadata = { title: "Entrega — Milsaca" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

const STATUS_BUTTONS: { value: EntregaStatus; label: string; tone: string }[] =
  [
    {
      value: "em_transito",
      label: "Marcar em trânsito",
      tone: "bg-sky-600 text-white hover:bg-sky-700",
    },
    {
      value: "recebida",
      label: "Marcar recebida",
      tone: "bg-emerald-600 text-white hover:bg-emerald-700",
    },
    {
      value: "conferida",
      label: "Marcar conferida",
      tone: "bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro",
    },
    {
      value: "cancelada",
      label: "Cancelar",
      tone: "bg-rose-600 text-white hover:bg-rose-700",
    },
  ];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default async function EntregaDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const sp = await searchParams;
  const e = await getEntrega(profile.corretora_id, id);
  if (!e) notFound();

  const waUrl = e.produtor_phone
    ? `https://wa.me/${e.produtor_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá, sobre a entrega ${e.sequencia} do contrato ${e.contrato_code}`,
      )}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/entregas"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Entregas
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            <Truck className="h-7 w-7" />
            Entrega #{e.sequencia}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge
              className={`${ENTREGA_STATUS_COLOR[e.status]} hover:${ENTREGA_STATUS_COLOR[e.status]}`}
            >
              {ENTREGA_STATUS_LABEL[e.status]}
            </Badge>
            {e.is_atrasada ? (
              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                Em atraso
              </Badge>
            ) : null}
            <Link
              href={`/painel/corretora/contratos/${e.contrato_id}`}
              className="font-mono text-xs text-milsaca-verde hover:underline"
            >
              {e.contrato_code}
            </Link>
            <span className="text-milsaca-verde-claro">· {e.produtor_nome}</span>
          </div>
        </div>
        {waUrl ? (
          <Button
            asChild
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        ) : null}
      </header>

      {sp.saved ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-milsaca-cream-escuro">
            <CardHeader>
              <CardTitle className="text-base">Dados da entrega</CardTitle>
              <CardDescription>
                Datas, logística e romaneio. Romaneio fica opcional até receber.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateEntregaFields}
                className="grid gap-5 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={e.id} />

                <div className="space-y-2">
                  <Label htmlFor="bag_count">Sacas (60kg)</Label>
                  <Input
                    id="bag_count"
                    name="bag_count"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={e.bag_count ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_prevista">Data prevista</Label>
                  <Input
                    id="data_prevista"
                    name="data_prevista"
                    type="date"
                    defaultValue={e.data_prevista ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_realizada">Data realizada</Label>
                  <Input
                    id="data_realizada"
                    name="data_realizada"
                    type="date"
                    defaultValue={e.data_realizada ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="local_retirada">Local de retirada</Label>
                  <Input
                    id="local_retirada"
                    name="local_retirada"
                    defaultValue={e.local_retirada ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transportadora_nome">Transportadora</Label>
                  <Input
                    id="transportadora_nome"
                    name="transportadora_nome"
                    defaultValue={e.transportadora_nome ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transportadora_doc">CT-e</Label>
                  <Input
                    id="transportadora_doc"
                    name="transportadora_doc"
                    placeholder="Nº ou chave de acesso"
                    defaultValue={e.transportadora_doc ?? ""}
                  />
                </div>

                <div className="sm:col-span-2 mt-2 border-t border-milsaca-cream-escuro pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
                    Romaneio (preencher na descarga)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso_bruto_kg">Peso bruto (kg)</Label>
                  <Input
                    id="peso_bruto_kg"
                    name="peso_bruto_kg"
                    inputMode="decimal"
                    defaultValue={e.peso_bruto_kg ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso_tara_kg">Tara (kg)</Label>
                  <Input
                    id="peso_tara_kg"
                    name="peso_tara_kg"
                    inputMode="decimal"
                    defaultValue={e.peso_tara_kg ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso_liquido_kg">
                    Líquido (kg)
                    <span className="ml-1 text-[10px] text-milsaca-verde-claro/60">
                      (auto se vazio: bruto − tara)
                    </span>
                  </Label>
                  <Input
                    id="peso_liquido_kg"
                    name="peso_liquido_kg"
                    inputMode="decimal"
                    defaultValue={e.peso_liquido_kg ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="umidade_pct">Umidade (%)</Label>
                  <Input
                    id="umidade_pct"
                    name="umidade_pct"
                    inputMode="decimal"
                    defaultValue={e.umidade_pct ?? ""}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={3}
                    defaultValue={e.observacoes ?? ""}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="submit"
                    className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                  >
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-milsaca-cream-escuro lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>
              &quot;Recebida&quot;/&quot;Conferida&quot; marca a data realizada automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateEntregaStatus} className="space-y-2">
              <input type="hidden" name="id" value={e.id} />
              {STATUS_BUTTONS.filter(
                (b) => b.value !== e.status && b.value !== "cancelada",
              ).map((b) => (
                <button
                  key={b.value}
                  type="submit"
                  name="status"
                  value={b.value}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${b.tone}`}
                >
                  {b.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ))}
              {e.status !== "programada" ? (
                <button
                  type="submit"
                  name="status"
                  value="programada"
                  className="flex w-full items-center justify-between rounded-md border border-milsaca-cream-escuro px-3 py-2 text-sm font-medium text-milsaca-verde hover:bg-milsaca-cream-escuro/40"
                >
                  Voltar para Programada
                </button>
              ) : null}
            </form>
            {e.status !== "cancelada" && (
              <form action={updateEntregaStatus} className="mt-2">
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="status" value="cancelada" />
                <ConfirmSubmit
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                  confirmTitle="Cancelar entrega?"
                  confirmMessage={
                    <p>
                      Essa entrega ficará marcada como cancelada. A
                      classificação do contrato não muda.
                    </p>
                  }
                  confirmButtonLabel="Cancelar entrega"
                  pendingLabel="Cancelando..."
                >
                  Cancelar entrega
                </ConfirmSubmit>
              </form>
            )}

            <div className="mt-4 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro">
              <p>
                <span className="font-medium text-milsaca-verde">Prevista</span>:{" "}
                {fmtDate(e.data_prevista)}
              </p>
              <p>
                <span className="font-medium text-milsaca-verde">Realizada</span>:{" "}
                {fmtDate(e.data_realizada)}
              </p>
              {e.peso_liquido_kg ? (
                <p className="mt-2">
                  <span className="font-medium text-milsaca-verde">
                    Líquido
                  </span>
                  : {e.peso_liquido_kg.toLocaleString("pt-BR")} kg
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
