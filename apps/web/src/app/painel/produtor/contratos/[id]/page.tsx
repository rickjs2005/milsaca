import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  getMeuContrato,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_COLOR,
} from "../_lib/queries";
import { buildWhatsAppInviteUrl } from "../../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Contrato — Milsaca" };

type Params = Promise<{ id: string }>;

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

export default async function ContratoProdutorDetalhePage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;
  const contrato = await getMeuContrato(user.id, id);
  if (!contrato) notFound();

  const waUrl = buildWhatsAppInviteUrl({
    phone: contrato.corretora_phone,
    message: `Oi! Sobre o contrato ${contrato.code}${contrato.coffee_type ? ` de ${contrato.coffee_type}` : ""}${contrato.bag_count ? ` (${contrato.bag_count} sacas)` : ""}. Podemos conversar?`,
  });

  const pricePerBag =
    contrato.total_value != null && contrato.bag_count != null && contrato.bag_count > 0
      ? contrato.total_value / contrato.bag_count
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor/contratos"
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
              {contrato.corretora_nome}
            </span>
            {contrato.corretora_city && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <MapPin className="h-3.5 w-3.5" />
                {contrato.corretora_city}
              </span>
            )}
            {contrato.corretora_phone && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <Phone className="h-3.5 w-3.5" />
                {contrato.corretora_phone}
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
              Falar no WhatsApp
            </a>
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-milsaca-cream-escuro lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Detalhes do contrato</CardTitle>
            <CardDescription>
              Operação registrada pela corretora. Mudanças passam por ela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Café
                </p>
                <p className="font-medium text-milsaca-verde">
                  {contrato.coffee_type ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Sacas (60kg)
                </p>
                <p className="font-medium text-milsaca-verde">
                  {contrato.bag_count != null
                    ? contrato.bag_count.toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Por saca
                </p>
                <p className="font-medium text-milsaca-verde">
                  {pricePerBag != null ? formatBRL(pricePerBag) : "—"}
                </p>
              </div>
            </div>

            {contrato.total_value != null && (
              <div className="rounded-md bg-milsaca-cream-escuro/30 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Valor total
                </p>
                <p className="text-2xl font-semibold text-milsaca-verde">
                  {formatBRL(contrato.total_value)}
                </p>
              </div>
            )}

            <div className="grid gap-2 text-xs text-milsaca-verde-claro sm:grid-cols-2">
              <div>
                <span className="font-medium text-milsaca-verde">
                  Aberto em
                </span>
                : {formatDateTime(contrato.created_at)}
              </div>
              <div>
                <span className="font-medium text-milsaca-verde">
                  Última atualização
                </span>
                : {formatDateTime(contrato.updated_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-milsaca-cream-escuro lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Assinatura</CardTitle>
            <CardDescription>
              Quando o contrato fica ativo, esta data é registrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contrato.signed_at ? (
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Contrato assinado
                  </p>
                  <p className="text-xs text-emerald-800">
                    em {formatDate(contrato.signed_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-milsaca-verde-claro">
                Ainda não foi assinado. O status atual é{" "}
                <span className="font-medium text-milsaca-verde">
                  {CONTRATO_STATUS_LABEL[contrato.status]}
                </span>
                .
              </p>
            )}
            <p className="mt-4 text-[11px] text-milsaca-verde-claro">
              Em breve, download do PDF com QR público pra conferência.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
