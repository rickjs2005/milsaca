import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Phone,
  Link2,
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
import { getProfile } from "@/lib/auth";
import {
  getContrato,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_COLOR,
  type ContratoStatus,
} from "../_lib/queries";
import {
  updateContratoFields,
  updateContratoStatus,
} from "../_actions";
import { buildWhatsAppInviteUrl } from "../../produtores/_lib/whatsapp";

export const metadata = { title: "Contrato — Milsaca" };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; saved?: string }>;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const STATUS_BUTTONS: { value: ContratoStatus; label: string; tone: string }[] =
  [
    {
      value: "em_analise",
      label: "Em análise",
      tone: "bg-milsaca-dourado text-milsaca-verde hover:opacity-90",
    },
    {
      value: "ativo",
      label: "Ativar contrato",
      tone: "bg-emerald-600 text-white hover:bg-emerald-700",
    },
    {
      value: "finalizado",
      label: "Finalizar",
      tone: "bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro",
    },
    {
      value: "cancelado",
      label: "Cancelar",
      tone: "bg-rose-600 text-white hover:bg-rose-700",
    },
  ];

export default async function ContratoDetalhePage({
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

  const contrato = await getContrato(profile.corretora_id, id);
  if (!contrato) notFound();

  const waUrl = buildWhatsAppInviteUrl({
    phone: contrato.produtor_phone,
    message: `Olá ${contrato.produtor_nome.split(" ")[0] || ""}, falando sobre o contrato ${contrato.code}${contrato.bag_count ? ` (${contrato.bag_count} sacas)` : ""}. Acesse: ${SITE_URL}`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/contratos"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            {contrato.code}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge
              className={`${CONTRATO_STATUS_COLOR[contrato.status]} hover:${CONTRATO_STATUS_COLOR[contrato.status]}`}
            >
              {CONTRATO_STATUS_LABEL[contrato.status]}
            </Badge>
            <span className="text-milsaca-verde-claro">
              {contrato.produtor_nome}
            </span>
            {contrato.produtor_phone && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <Phone className="h-3.5 w-3.5" />
                {contrato.produtor_phone}
              </span>
            )}
          </div>
        </div>
        {waUrl && (
          <Button
            asChild
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </div>
      )}

      {contrato.lead_id && (
        <Card className="border-milsaca-cream-escuro bg-milsaca-cream-escuro/30">
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <Link2 className="h-4 w-4 text-milsaca-verde-claro" />
            <span className="text-milsaca-verde-claro">
              Vinculado ao lead{" "}
              <Link
                href={`/painel/corretora/leads/${contrato.lead_id}`}
                className="font-medium text-milsaca-verde hover:underline"
              >
                {contrato.lead_id.slice(0, 8)}
              </Link>
            </span>
            {contrato.notes_lead && (
              <span className="ml-2 text-xs italic text-milsaca-verde-claro">
                · &quot;{contrato.notes_lead}&quot;
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-milsaca-cream-escuro">
            <CardHeader>
              <CardTitle className="text-base">Dados do contrato</CardTitle>
              <CardDescription>
                Edite enquanto for rascunho ou em análise. Após assinado,
                cuidado ao mudar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateContratoFields}
                className="grid gap-5 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={contrato.id} />

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    name="code"
                    required
                    defaultValue={contrato.code}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coffee_type">Café</Label>
                  <select
                    id="coffee_type"
                    name="coffee_type"
                    defaultValue={contrato.coffee_type ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    <option value="Arábica">Arábica</option>
                    <option value="Conillón">Conillón</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bag_count">Sacas (60kg)</Label>
                  <Input
                    id="bag_count"
                    name="bag_count"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={contrato.bag_count ?? ""}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="total_value">Valor total (R$)</Label>
                  <Input
                    id="total_value"
                    name="total_value"
                    type="text"
                    inputMode="decimal"
                    defaultValue={
                      contrato.total_value != null
                        ? contrato.total_value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""
                    }
                  />
                </div>

                <div className="sm:col-span-2 grid gap-3 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-milsaca-verde">
                      Criado em
                    </span>
                    : {formatDateTime(contrato.created_at)}
                  </div>
                  <div>
                    <span className="font-medium text-milsaca-verde">
                      Assinado em
                    </span>
                    :{" "}
                    {contrato.signed_at
                      ? formatDate(contrato.signed_at)
                      : "—"}
                  </div>
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
            <CardTitle className="text-base">Status do contrato</CardTitle>
            <CardDescription>
              &quot;Ativo&quot; marca data de assinatura automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateContratoStatus} className="space-y-3">
              <input type="hidden" name="id" value={contrato.id} />
              <div className="flex flex-col gap-2">
                {STATUS_BUTTONS.filter(
                  (b) => b.value !== contrato.status,
                ).map((b) => (
                  <button
                    key={b.value}
                    type="submit"
                    name="status"
                    value={b.value}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${b.tone}`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {b.label}
                  </button>
                ))}
                {contrato.status !== "rascunho" && (
                  <button
                    type="submit"
                    name="status"
                    value="rascunho"
                    className="inline-flex items-center gap-1 rounded-md border border-milsaca-cream-escuro px-3 py-2 text-sm font-medium text-milsaca-verde hover:bg-milsaca-cream-escuro/40"
                  >
                    Voltar para Rascunho
                  </button>
                )}
              </div>
            </form>
            {contrato.total_value != null && contrato.bag_count != null && (
              <div className="mt-4 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro">
                <span className="font-medium text-milsaca-verde">
                  Valor por saca
                </span>
                :{" "}
                {formatBRL(contrato.total_value / contrato.bag_count)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
