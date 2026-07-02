import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  MessageSquare,
  HandCoins,
  CircleDot,
  Check,
  X,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { coffeeLabel } from "@/lib/coffee";
import { SubmitButton } from "@/components/submit-button";
import { requireUser, getProfile } from "@/lib/auth";
import { contraproporNegociacao, responderProposta } from "../_actions";
import {
  getMinhaNegociacao,
  LEAD_STATUS_LABEL,
  type LeadStatus,
  type NegociacaoEvent,
} from "../_lib/queries";
import { buildWhatsAppInviteUrl } from "../../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Proposta — Milsaca" };

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

// status → tonalidade semântica (tokens de fundação).
const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "premium",
  em_negociacao: "info",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};

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
    case "contraproposta":
      return "Sua contraproposta";
    default:
      return e.kind;
  }
}

// Affordance da timeline: ícone + tonalidade do dot por tipo de evento.
function eventVisual(kind: string): { tone: StatusTone; Icon: typeof CircleDot } {
  switch (kind) {
    case "created":
      return { tone: "premium", Icon: Plus };
    case "status_changed":
      return { tone: "info", Icon: RefreshCw };
    case "comment":
      return { tone: "neutral", Icon: MessageSquare };
    case "contraproposta":
      return { tone: "warning", Icon: HandCoins };
    case "updated":
      return { tone: "neutral", Icon: CircleDot };
    default:
      return { tone: "neutral", Icon: CircleDot };
  }
}

const DOT_TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-50 text-success-600 ring-success-100",
  info: "bg-info-50 text-info-600 ring-info-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-600 ring-danger-100",
  neutral: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  premium: "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/30",
};

export default async function NegociacaoDetalhePage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [lead, profile] = await Promise.all([
    getMinhaNegociacao(user.id, id),
    getProfile(),
  ]);
  if (!lead) notFound();

  // P3 — fonte de verdade do preço é a PROPOSTA real (tabela `propostas`),
  // não o campo legado `leads.proposed_price`. Mostra a mais recente; se houver
  // uma `enviada`, o produtor pode aceitar/recusar aqui mesmo (P2).
  const ultimaProposta = lead.propostas[0] ?? null;
  const propostaAtiva =
    lead.propostas.find((p) => p.status === "enviada") ?? null;
  const precoAtual = ultimaProposta?.preco_saca ?? lead.proposed_price;
  const bagAtual = ultimaProposta?.bag_count ?? lead.bag_count;
  const validadeVencida =
    propostaAtiva?.validade_ate != null &&
    new Date(propostaAtiva.validade_ate).getTime() < Date.now();

  const nome = profile?.full_name?.trim() || null;
  const intro = nome ? `Oi! Aqui é ${nome}, da Milsaca.` : "Oi! Aqui é da Milsaca.";
  const detalheProposta = `Sobre a proposta${lead.coffee_type ? ` de ${coffeeLabel(lead.coffee_type)}` : ""}${bagAtual ? ` (${bagAtual} sacas)` : ""}${precoAtual != null ? ` a R$ ${precoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/sc` : ""} — tudo certo?`;
  const waUrl = buildWhatsAppInviteUrl({
    phone: lead.corretora_phone,
    message: `${intro}\n${detalheProposta}\nPodemos conversar pra acertar os detalhes?`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor/negociacoes"
          className="inline-flex items-center gap-1 text-body-sm text-neutral-600 transition-colors hover:text-milsaca-cafezal"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar para Propostas
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1 text-milsaca-cafezal">
            {lead.corretora_nome}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <StatusBadge tone={LEAD_STATUS_TONE[lead.status]} withDot>
              {LEAD_STATUS_LABEL[lead.status]}
            </StatusBadge>
            {lead.corretora_city && (
              <span className="inline-flex items-center gap-1 text-neutral-600">
                <MapPin className="h-3.5 w-3.5" />
                {lead.corretora_city}
              </span>
            )}
            {lead.corretora_phone && (
              <span className="inline-flex items-center gap-1 text-neutral-600">
                <Phone className="h-3.5 w-3.5" />
                {lead.corretora_phone}
              </span>
            )}
          </div>
        </div>
        {waUrl && (
          <Button asChild variant="gold">
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden className="mr-2 h-4 w-4" />
              Falar no WhatsApp
            </a>
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da proposta</CardTitle>
            <CardDescription>
              Estes valores foram registrados pela corretora. Pra renegociar,
              fale pelo WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-caption uppercase tracking-wider text-neutral-600">
                  Café
                </p>
                <p className="text-body-sm font-medium text-milsaca-cafezal">
                  {coffeeLabel(lead.coffee_type) ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wider text-neutral-600">
                  Sacas (60kg)
                </p>
                <p className="text-body-sm font-medium text-milsaca-cafezal">
                  {bagAtual != null
                    ? bagAtual.toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wider text-neutral-600">
                  Por saca
                </p>
                <p className="text-body-sm font-medium text-milsaca-cafezal">
                  {precoAtual != null ? formatBRL(precoAtual) : "—"}
                </p>
              </div>
            </div>

            {precoAtual != null && bagAtual != null && (
              <div className="rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/10 p-4">
                <p className="text-caption uppercase tracking-wider text-milsaca-cafezal/70">
                  Valor total estimado
                </p>
                <p className="text-h3 text-milsaca-cafezal">
                  {formatBRL(precoAtual * bagAtual)}
                </p>
              </div>
            )}

            {lead.notes && (
              <div className="rounded-md border border-neutral-200 bg-milsaca-cream/60 p-4">
                <p className="text-caption uppercase tracking-wider text-neutral-600">
                  Observação da corretora
                </p>
                <p className="mt-1 text-body-sm italic text-neutral-700">
                  &quot;{lead.notes}&quot;
                </p>
              </div>
            )}

            <div className="grid gap-2 text-body-sm text-neutral-600 sm:grid-cols-2">
              <div>
                <span className="font-medium text-milsaca-cafezal">
                  Aberta em
                </span>
                : {formatDateTime(lead.created_at)}
              </div>
              <div>
                <span className="font-medium text-milsaca-cafezal">
                  Última atualização
                </span>
                : {formatDateTime(lead.updated_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>
              Atualizações registradas pela corretora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lead.events.length === 0 ? (
              <p className="text-body-sm text-neutral-500">
                Sem eventos ainda.
              </p>
            ) : (
              <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-200">
                {lead.events.map((e) => {
                  const { tone, Icon } = eventVisual(e.kind);
                  return (
                    <li key={e.id} className="relative flex gap-3">
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                          DOT_TONE_CLASS[tone],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 space-y-0.5 pb-1">
                        <p className="text-body-sm font-medium text-milsaca-cafezal">
                          {eventLabel(e)}
                        </p>
                        {e.kind === "comment" &&
                          typeof e.payload.text === "string" && (
                            <p className="text-body-sm text-neutral-700">
                              {e.payload.text as string}
                            </p>
                          )}
                        {e.kind === "contraproposta" && (
                          <p className="text-body-sm text-neutral-700">
                            R${" "}
                            {Number(
                              e.payload.preco_saca ?? 0,
                            ).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                            /saca
                            {typeof e.payload.mensagem === "string" &&
                            e.payload.mensagem
                              ? ` — “${e.payload.mensagem}”`
                              : ""}
                          </p>
                        )}
                        {e.kind === "status_changed" &&
                          typeof e.payload.comment === "string" &&
                          e.payload.comment && (
                            <p className="text-body-sm italic text-neutral-600">
                              “{e.payload.comment as string}”
                            </p>
                          )}
                        <p className="text-caption text-neutral-500">
                          {formatDateTime(e.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {propostaAtiva && (
        <Card tone="premium">
          <CardHeader>
            <CardTitle>Responder a proposta</CardTitle>
            <CardDescription>
              A corretora ofertou{" "}
              <span className="font-semibold text-milsaca-cafezal">
                {formatBRL(propostaAtiva.preco_saca)}/saca
              </span>
              {propostaAtiva.bag_count != null
                ? ` por ${propostaAtiva.bag_count.toLocaleString("pt-BR")} sacas`
                : ""}
              . Aceite pra travar o valor, ou recuse e siga negociando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {propostaAtiva.validade_ate && (
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium",
                  validadeVencida
                    ? "bg-danger-50 text-danger-700"
                    : "bg-warning-50 text-warning-700",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {validadeVencida
                  ? `Venceu em ${formatDateTime(propostaAtiva.validade_ate)}`
                  : `Válida até ${formatDateTime(propostaAtiva.validade_ate)}`}
              </p>
            )}
            {validadeVencida ? (
              <p className="text-body-sm text-neutral-600">
                Esta proposta venceu. Faça uma contraproposta abaixo ou fale no
                WhatsApp pra a corretora reenviar.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <form action={responderProposta} className="sm:flex-1">
                  <input type="hidden" name="proposta_id" value={propostaAtiva.id} />
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <input type="hidden" name="resposta" value="aceita" />
                  <SubmitButton
                    variant="success"
                    className="w-full"
                    pendingLabel="Aceitando..."
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aceitar proposta
                  </SubmitButton>
                </form>
                <form action={responderProposta} className="sm:flex-1">
                  <input type="hidden" name="proposta_id" value={propostaAtiva.id} />
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <input type="hidden" name="resposta" value="rejeitada" />
                  <SubmitButton
                    variant="outline"
                    className="w-full"
                    pendingLabel="Recusando..."
                  >
                    <X className="mr-2 h-4 w-4" />
                    Recusar
                  </SubmitButton>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(lead.status === "novo" || lead.status === "em_negociacao") && (
        <Card>
          <CardHeader>
            <CardTitle>Fazer uma contraproposta</CardTitle>
            <CardDescription>
              Mande seu valor por saca — a corretora é avisada na hora e
              responde por aqui ou pelo WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={contraproporNegociacao}
              className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-end"
            >
              <input type="hidden" name="lead_id" value={lead.id} />
              <div className="space-y-1.5">
                <Label htmlFor="preco_saca">Seu valor (R$/saca)</Label>
                <Input
                  id="preco_saca"
                  name="preco_saca"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 1.450,00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                <Input
                  id="mensagem"
                  name="mensagem"
                  type="text"
                  maxLength={500}
                  placeholder="Ex.: fecho nesse valor à vista"
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton variant="primary" pendingLabel="Enviando...">
                  Enviar contraproposta
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
