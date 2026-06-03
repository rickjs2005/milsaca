import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Phone,
  FileText,
  Plus,
  Package,
  RefreshCw,
  MessageSquare,
  HandCoins,
  CircleDot,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/auth";
import {
  getLead,
  LEAD_STATUS_LABEL,
  type LeadStatus,
  type LeadEvent,
} from "../_lib/queries";
import {
  updateLeadFields,
  updateLeadStatus,
  addLeadComment,
} from "../_actions";
import { buildWhatsAppInviteUrl } from "../../produtores/_lib/whatsapp";
import { listPropostasDoLead } from "../../propostas/_lib/queries";
import { PropostasBlock } from "../../propostas/_components/propostas-block";
import { COFFEE_OPTIONS, coffeeLabel } from "@/lib/coffee";

export const metadata = { title: "Lead — Milsaca" };

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

// status do lead → tonalidade semântica (tokens de fundação).
// em_negociacao=info, convertido=success, perdido=danger, arquivado=neutral,
// novo=premium (mantém a identidade dourada do estado inicial).
const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "premium",
  em_negociacao: "info",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};

function eventLabel(e: LeadEvent) {
  switch (e.kind) {
    case "created":
      return "Lead criado";
    case "status_changed": {
      const from = (e.payload.from as LeadStatus) ?? null;
      const to = (e.payload.to as LeadStatus) ?? null;
      const fromLabel = from ? LEAD_STATUS_LABEL[from] : "—";
      const toLabel = to ? LEAD_STATUS_LABEL[to] : "—";
      return `Status: ${fromLabel} → ${toLabel}`;
    }
    case "updated":
      return "Dados atualizados";
    case "comment":
      return "Comentário";
    case "contraproposta":
      return "Contraproposta do produtor";
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

// Botões de mudança de status → variant do Button (cores semânticas, não cruas).
// "Convertido" NÃO entra aqui: a conversão acontece ao gerar o contrato
// (botão "Criar contrato" no topo), nunca manualmente — assim não existe
// lead convertido sem contrato.
const STATUS_BUTTONS: {
  value: LeadStatus;
  label: string;
  variant: "primary" | "success" | "danger" | "secondary";
}[] = [
  { value: "em_negociacao", label: "Em negociação", variant: "primary" },
  { value: "perdido", label: "Perdido", variant: "danger" },
  { value: "arquivado", label: "Arquivar", variant: "secondary" },
];

export default async function LeadDetalhePage({
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

  const lead = await getLead(profile.corretora_id, id);
  if (!lead) notFound();

  // Lead convertido = negócio fechado (virou contrato): terminal e read-only.
  // Trava edição de campos e mudança de status na UI (o servidor também trava).
  const terminal = lead.status === "convertido";

  const propostas = await listPropostasDoLead(profile.corretora_id, lead.id);

  const waUrl = buildWhatsAppInviteUrl({
    phone: lead.produtor_phone,
    message: `Olá ${lead.produtor_nome.split(" ")[0] || ""}, falando sobre a proposta de ${coffeeLabel(lead.coffee_type) ?? "café"}${lead.bag_count ? ` (${lead.bag_count} sacas)` : ""}. Acesse: ${SITE_URL}`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/leads"
          className="inline-flex items-center gap-1 text-body-sm text-neutral-600 transition-colors hover:text-milsaca-cafezal"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Leads
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1 text-milsaca-cafezal">
            {lead.produtor_nome}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <StatusBadge tone={LEAD_STATUS_TONE[lead.status]} withDot>
              {LEAD_STATUS_LABEL[lead.status]}
            </StatusBadge>
            {lead.produtor_kind === "contato" && (
              <StatusBadge tone="warning">Contato pendente</StatusBadge>
            )}
            {lead.produtor_phone && (
              <span className="inline-flex items-center gap-1 text-neutral-600">
                <Phone className="h-3.5 w-3.5" />
                {lead.produtor_phone}
              </span>
            )}
            {lead.lote_id && lead.lote_codigo ? (
              <Link
                href={`/painel/corretora/lotes/${lead.lote_id}`}
                className="inline-flex items-center gap-1 rounded-pill bg-milsaca-cafezal/10 px-2.5 py-0.5 font-medium text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal/20"
              >
                <Package className="h-3.5 w-3.5" />
                Lote {lead.lote_codigo}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Package className="h-3.5 w-3.5" />
                Sem lote vinculado
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {waUrl && (
            <Button asChild variant="gold">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}
          {lead.contrato_id ? (
            <Button asChild variant="primary">
              <Link href={`/painel/corretora/contratos/${lead.contrato_id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Ver contrato
              </Link>
            </Button>
          ) : lead.produtor_kind === "produtor" ? (
            <Button asChild variant="primary">
              <Link href={`/painel/corretora/contratos/novo?lead=${lead.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Criar contrato
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1+2: Dados do lead + ações de status */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados do lead</CardTitle>
              <CardDescription>
                Edite o que precisar. Toda alteração entra na timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateLeadFields}
                className="grid gap-5 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={lead.id} />

                <div className="space-y-1.5">
                  <Label htmlFor="coffee_type">Café</Label>
                  <Select
                    id="coffee_type"
                    name="coffee_type"
                    defaultValue={lead.coffee_type ?? ""}
                    disabled={terminal}
                  >
                    <option value="">—</option>
                    {COFFEE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bag_count">Sacas (60kg)</Label>
                  <Input
                    id="bag_count"
                    name="bag_count"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={lead.bag_count ?? ""}
                    disabled={terminal}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="proposed_price">
                    Valor proposto por saca (R$)
                  </Label>
                  <Input
                    id="proposed_price"
                    name="proposed_price"
                    type="text"
                    inputMode="decimal"
                    disabled={terminal}
                    defaultValue={
                      lead.proposed_price != null
                        ? lead.proposed_price
                            .toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                        : ""
                    }
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={lead.notes ?? ""}
                    disabled={terminal}
                    className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 ring-offset-background placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="grid gap-3 rounded-md border border-neutral-200 bg-milsaca-cream/60 p-4 text-body-sm text-neutral-600 sm:col-span-2 sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-milsaca-cafezal">
                      Valor total
                    </span>
                    :{" "}
                    {lead.proposed_price != null && lead.bag_count != null
                      ? formatBRL(lead.proposed_price * lead.bag_count)
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-milsaca-cafezal">
                      Criado em
                    </span>
                    : {formatDateTime(lead.created_at)}
                  </div>
                </div>

                <div className="flex justify-end sm:col-span-2">
                  {terminal ? (
                    <p className="text-caption italic text-neutral-500">
                      Lead convertido — dados travados (já viraram contrato).
                    </p>
                  ) : (
                    <Button type="submit" variant="primary">
                      Salvar alterações
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <PropostasBlock
            propostas={propostas}
            leadId={lead.id}
            defaultBagCount={lead.bag_count}
            locked={terminal}
            lockedNote="Negócio fechado — o lead virou contrato. Não dá pra enviar nova proposta; o histórico abaixo fica como registro."
          />

          <Card>
            <CardHeader>
              <CardTitle>Mover o lead</CardTitle>
              <CardDescription>
                Atualize o status. Comentário opcional vai junto na timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {terminal ? (
                <div className="flex flex-col items-start gap-3 rounded-md border border-success-100 bg-success-50 px-4 py-3 text-body-sm text-success-700">
                  <p>
                    Negócio fechado — este lead virou contrato e não muda mais
                    de status.
                  </p>
                  {lead.contrato_id ? (
                    <Button asChild variant="primary" size="sm">
                      <Link
                        href={`/painel/corretora/contratos/${lead.contrato_id}`}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Ver contrato
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
              <form action={updateLeadStatus} className="space-y-4">
                <input type="hidden" name="id" value={lead.id} />

                <div className="space-y-1.5">
                  <Label htmlFor="comment">Comentário (opcional)</Label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={2}
                    placeholder="Ex.: produtor confirmou preço por WhatsApp."
                    className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 ring-offset-background placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_BUTTONS.filter((b) => b.value !== lead.status).map(
                    (b) => (
                      <Button
                        key={b.value}
                        type="submit"
                        name="status"
                        value={b.value}
                        variant={b.variant}
                        size="sm"
                      >
                        <ArrowRight className="mr-1 h-3.5 w-3.5" />
                        {b.label}
                      </Button>
                    ),
                  )}
                  {lead.status !== "novo" && (
                    <Button
                      type="submit"
                      name="status"
                      value="novo"
                      variant="outline"
                      size="sm"
                    >
                      Voltar para Novo
                    </Button>
                  )}
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Histórico completo deste lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addLeadComment} className="space-y-1.5">
              <input type="hidden" name="id" value={lead.id} />
              <Label htmlFor="text">Adicionar comentário</Label>
              <textarea
                id="text"
                name="text"
                rows={2}
                required
                placeholder="Escreva uma nota..."
                className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 ring-offset-background placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" variant="primary">
                  Comentar
                </Button>
              </div>
            </form>

            <div className="border-t border-neutral-200 pt-4">
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
                            {e.actor_name && <> · {e.actor_name}</>}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
