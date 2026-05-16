import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  MapPin,
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
  getMinhaNegociacao,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_COLOR,
  type LeadStatus,
  type NegociacaoEvent,
} from "../_lib/queries";
import { buildWhatsAppInviteUrl } from "../../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Negociação — Milsaca" };

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

function eventLabel(e: NegociacaoEvent) {
  switch (e.kind) {
    case "created":
      return "Proposta criada";
    case "status_changed": {
      const from = (e.payload.from as LeadStatus) ?? null;
      const to = (e.payload.to as LeadStatus) ?? null;
      const fromLabel = from ? LEAD_STATUS_LABEL[from] : "—";
      const toLabel = to ? LEAD_STATUS_LABEL[to] : "—";
      return `Status: ${fromLabel} → ${toLabel}`;
    }
    case "updated":
      return "Proposta atualizada";
    case "comment":
      return "Comentário da corretora";
    default:
      return e.kind;
  }
}

export default async function NegociacaoDetalhePage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;
  const lead = await getMinhaNegociacao(user.id, id);
  if (!lead) notFound();

  const waUrl = buildWhatsAppInviteUrl({
    phone: lead.corretora_phone,
    message: `Oi! Sobre a proposta da ${lead.corretora_nome}${lead.coffee_type ? ` para ${lead.coffee_type}` : ""}${lead.bag_count ? ` (${lead.bag_count} sacas)` : ""}. Podemos conversar?`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor/negociacoes"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Negociações
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            {lead.corretora_nome}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge
              className={`${LEAD_STATUS_COLOR[lead.status]} hover:${LEAD_STATUS_COLOR[lead.status]}`}
            >
              {LEAD_STATUS_LABEL[lead.status]}
            </Badge>
            {lead.corretora_city && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <MapPin className="h-3.5 w-3.5" />
                {lead.corretora_city}
              </span>
            )}
            {lead.corretora_phone && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <Phone className="h-3.5 w-3.5" />
                {lead.corretora_phone}
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
            <CardTitle className="text-base">Dados da proposta</CardTitle>
            <CardDescription>
              Estes valores foram registrados pela corretora. Pra renegociar,
              fale pelo WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Café
                </p>
                <p className="font-medium text-milsaca-verde">
                  {lead.coffee_type ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Sacas (60kg)
                </p>
                <p className="font-medium text-milsaca-verde">
                  {lead.bag_count != null
                    ? lead.bag_count.toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Por saca
                </p>
                <p className="font-medium text-milsaca-verde">
                  {lead.proposed_price != null
                    ? formatBRL(lead.proposed_price)
                    : "—"}
                </p>
              </div>
            </div>

            {lead.proposed_price != null && lead.bag_count != null && (
              <div className="rounded-md bg-milsaca-cream-escuro/30 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Valor total estimado
                </p>
                <p className="text-lg font-semibold text-milsaca-verde">
                  {formatBRL(lead.proposed_price * lead.bag_count)}
                </p>
              </div>
            )}

            {lead.notes && (
              <div className="rounded-md border border-milsaca-cream-escuro p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Observação da corretora
                </p>
                <p className="mt-1 italic text-milsaca-verde">
                  &quot;{lead.notes}&quot;
                </p>
              </div>
            )}

            <div className="grid gap-2 text-xs text-milsaca-verde-claro sm:grid-cols-2">
              <div>
                <span className="font-medium text-milsaca-verde">
                  Aberta em
                </span>
                : {formatDateTime(lead.created_at)}
              </div>
              <div>
                <span className="font-medium text-milsaca-verde">
                  Última atualização
                </span>
                : {formatDateTime(lead.updated_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-milsaca-cream-escuro lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
            <CardDescription>
              Atualizações registradas pela corretora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lead.events.length === 0 ? (
              <p className="text-xs text-milsaca-verde-claro">
                Sem eventos ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {lead.events.map((e) => (
                  <div key={e.id} className="flex gap-3 text-sm">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-milsaca-cream-escuro/60 text-milsaca-verde">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-medium text-milsaca-verde">
                        {eventLabel(e)}
                      </p>
                      {e.kind === "comment" &&
                        typeof e.payload.text === "string" && (
                          <p className="text-milsaca-verde">
                            {e.payload.text as string}
                          </p>
                        )}
                      {e.kind === "status_changed" &&
                        typeof e.payload.comment === "string" &&
                        e.payload.comment && (
                          <p className="italic text-milsaca-verde-claro">
                            “{e.payload.comment as string}”
                          </p>
                        )}
                      <p className="text-[11px] text-milsaca-verde-claro">
                        {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
