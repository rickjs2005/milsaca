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
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getProfile } from "@/lib/auth";
import { fmtMoney } from "@/lib/format";
import { getCorretoraSubscriptionInfo } from "../../_lib/corretora";
import { isProOrAbove } from "../../_lib/plan-gate";
import {
  getContrato,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_COLOR,
  CONTRATO_TRANSICOES,
  type ContratoStatus,
} from "../_lib/queries";
import {
  updateContratoFields,
  updateContratoStatus,
} from "../_actions";
import { listEntregasDoContrato } from "../../entregas/_lib/queries";
import { EntregasContrato } from "../_components/entregas-contrato";
import { buildWhatsAppInviteUrl } from "../../produtores/_lib/whatsapp";
import { listCompradoresOptions } from "../../compradores/_lib/queries";

export const metadata = { title: "Contrato — Milsaca" };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; saved?: string }>;

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
      tone: "bg-success-600 text-white hover:bg-success-700",
    },
    {
      value: "finalizado",
      label: "Finalizar",
      tone: "bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro",
    },
    {
      value: "cancelado",
      label: "Cancelar",
      tone: "bg-danger-600 text-white hover:bg-danger-700",
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

  const [contrato, compradoresOpts, subscription, entregas] =
    await Promise.all([
      getContrato(profile.corretora_id, id),
      listCompradoresOptions(profile.corretora_id),
      getCorretoraSubscriptionInfo(profile.corretora_id),
      listEntregasDoContrato(id),
    ]);
  if (!contrato) notFound();
  const isPro = isProOrAbove(subscription);

  // Assinado = content_hash congelado em updateContratoStatus. Os campos
  // materiais entram no hash, então não podem ser editados depois sem quebrar
  // o espelho e a verificação pública: renderizamos só leitura.
  const isSigned =
    contrato.status === "ativo" || contrato.status === "finalizado";

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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-milsaca-verde text-milsaca-verde hover:bg-milsaca-verde hover:text-milsaca-cream"
          >
            <Link href={`/painel/corretora/contratos/${contrato.id}/espelho`}>
              Espelho / imprimir
            </Link>
          </Button>
          {waUrl && (
            <Button
              asChild
              className="bg-success-600 text-white hover:bg-success-700"
            >
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}
        </div>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
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
                {isSigned
                  ? "Contrato assinado — valores travados pelo hash de verificação."
                  : "Edite enquanto for rascunho ou em análise."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSigned ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-2 rounded-md border border-milsaca-cream-escuro bg-milsaca-cream-escuro/40 px-4 py-3 text-sm text-milsaca-verde">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                    <p>
                      Contrato assinado — valores travados pelo hash de
                      verificação. Para alterar, cancele o contrato e refaça.
                    </p>
                  </div>
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Código
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.code}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Café
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.coffee_type ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Sacas (60kg)
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.bag_count ?? "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Valor total
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.total_value != null
                          ? fmtMoney(contrato.total_value)
                          : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 border-t border-milsaca-cream-escuro pt-4">
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Comprador
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.comprador_nome ?? "— sem comprador —"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-milsaca-verde-claro">
                        Comissão (%)
                      </dt>
                      <dd className="text-sm text-milsaca-verde">
                        {contrato.comissao_pct != null
                          ? `${String(contrato.comissao_pct).replace(".", ",")}%`
                          : "—"}
                      </dd>
                      {contrato.comissao_total != null ? (
                        <p className="text-xs text-milsaca-verde-claro">
                          Total: {fmtMoney(contrato.comissao_total)}
                        </p>
                      ) : null}
                    </div>
                  </dl>
                  <div className="grid gap-3 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro sm:grid-cols-2">
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
                </div>
              ) : (
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

                <div className="space-y-2 sm:col-span-2 border-t border-milsaca-cream-escuro pt-4">
                  <Label htmlFor="comprador_id">Comprador</Label>
                  <select
                    id="comprador_id"
                    name="comprador_id"
                    defaultValue={contrato.comprador_id ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— sem comprador —</option>
                    {compradoresOpts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {compradoresOpts.length === 0 ? (
                    <p className="text-xs text-milsaca-verde-claro">
                      Nenhum comprador ativo.{" "}
                      <Link
                        href="/painel/corretora/compradores/novo"
                        className="text-milsaca-dourado-texto hover:underline"
                      >
                        Cadastrar
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comissao_pct">Comissão (%)</Label>
                  <Input
                    id="comissao_pct"
                    name="comissao_pct"
                    type="text"
                    inputMode="decimal"
                    placeholder="1,0"
                    defaultValue={
                      contrato.comissao_pct != null
                        ? String(contrato.comissao_pct).replace(".", ",")
                        : ""
                    }
                  />
                  {contrato.comissao_total != null ? (
                    <p className="text-xs text-milsaca-verde-claro">
                      Total: R${" "}
                      {contrato.comissao_total.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  ) : null}
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
              )}
            </CardContent>
          </Card>

          {isPro ? (
            <EntregasContrato
              entregas={entregas}
              contratado={contrato.bag_count}
              contratoId={contrato.id}
              canCreate={isPro}
            />
          ) : null}
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
                  (b) =>
                    b.value !== "cancelado" &&
                    (CONTRATO_TRANSICOES[contrato.status] ?? []).includes(
                      b.value,
                    ),
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
                {(CONTRATO_TRANSICOES[contrato.status] ?? []).includes(
                  "rascunho",
                ) && (
                  <button
                    type="submit"
                    name="status"
                    value="rascunho"
                    className="inline-flex items-center gap-1 rounded-md border border-milsaca-cream-escuro px-3 py-2 text-sm font-medium text-milsaca-verde hover:bg-milsaca-cream-escuro/40"
                  >
                    Voltar para Rascunho
                  </button>
                )}
                {(CONTRATO_TRANSICOES[contrato.status] ?? []).length === 0 && (
                  <p className="text-sm italic text-neutral-500">
                    Contrato {CONTRATO_STATUS_LABEL[contrato.status].toLowerCase()} —
                    estado final, sem mais transições.
                  </p>
                )}
              </div>
            </form>
            {(CONTRATO_TRANSICOES[contrato.status] ?? []).includes(
              "cancelado",
            ) && (
              <form action={updateContratoStatus} className="mt-2">
                <input type="hidden" name="id" value={contrato.id} />
                <input type="hidden" name="status" value="cancelado" />
                <ConfirmSubmit
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 border-danger-100 text-danger-700 hover:bg-danger-50"
                  confirmTitle="Cancelar contrato?"
                  confirmMessage={
                    <>
                      <p>
                        O contrato <strong>{contrato.code}</strong> ficará
                        marcado como cancelado.
                      </p>
                      <p className="mt-2">
                        Entregas vinculadas ficam órfãs; ajuste depois se
                        necessário.
                      </p>
                    </>
                  }
                  confirmButtonLabel="Cancelar contrato"
                  pendingLabel="Cancelando..."
                >
                  Cancelar contrato
                </ConfirmSubmit>
              </form>
            )}
            {contrato.total_value != null && contrato.bag_count != null && (
              <div className="mt-4 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro">
                <span className="font-medium text-milsaca-verde">
                  Valor por saca
                </span>
                :{" "}
                {fmtMoney(contrato.total_value / contrato.bag_count)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
