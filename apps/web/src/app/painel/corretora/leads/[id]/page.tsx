import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Clock,
  ArrowRight,
  Phone,
  FileText,
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
  getLead,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_COLOR,
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
    default:
      return e.kind;
  }
}

const STATUS_BUTTONS: { value: LeadStatus; label: string; tone: string }[] = [
  {
    value: "em_negociacao",
    label: "Em negociação",
    tone: "bg-sky-600 text-white hover:bg-sky-700",
  },
  {
    value: "convertido",
    label: "Convertido",
    tone: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  {
    value: "perdido",
    label: "Perdido",
    tone: "bg-rose-600 text-white hover:bg-rose-700",
  },
  {
    value: "arquivado",
    label: "Arquivar",
    tone: "bg-slate-500 text-white hover:bg-slate-600",
  },
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

  const propostas = await listPropostasDoLead(profile.corretora_id, lead.id);

  const waUrl = buildWhatsAppInviteUrl({
    phone: lead.produtor_phone,
    message: `Olá ${lead.produtor_nome.split(" ")[0] || ""}, falando sobre a proposta de ${lead.coffee_type ?? "café"}${lead.bag_count ? ` (${lead.bag_count} sacas)` : ""}. Acesse: ${SITE_URL}`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/leads"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Leads
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            {lead.produtor_nome}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge
              className={`${LEAD_STATUS_COLOR[lead.status]} hover:${LEAD_STATUS_COLOR[lead.status]}`}
            >
              {LEAD_STATUS_LABEL[lead.status]}
            </Badge>
            {lead.produtor_kind === "contato" && (
              <Badge className="bg-milsaca-dourado/20 text-milsaca-verde hover:bg-milsaca-dourado/20">
                Contato pendente
              </Badge>
            )}
            {lead.produtor_phone && (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro">
                <Phone className="h-3.5 w-3.5" />
                {lead.produtor_phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.produtor_kind === "produtor" && (
            <Button
              asChild
              variant="outline"
              className="border-milsaca-verde text-milsaca-verde hover:bg-milsaca-cream-escuro/40"
            >
              <Link href={`/painel/corretora/contratos/novo?lead=${lead.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Criar contrato
              </Link>
            </Button>
          )}
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
        </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1+2: Dados do lead + ações de status */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-milsaca-cream-escuro">
            <CardHeader>
              <CardTitle className="text-base">Dados do lead</CardTitle>
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

                <div className="space-y-2">
                  <Label htmlFor="coffee_type">Café</Label>
                  <select
                    id="coffee_type"
                    name="coffee_type"
                    defaultValue={lead.coffee_type ?? ""}
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
                    defaultValue={lead.bag_count ?? ""}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposed_price">
                    Valor proposto por saca (R$)
                  </Label>
                  <Input
                    id="proposed_price"
                    name="proposed_price"
                    type="text"
                    inputMode="decimal"
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

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={lead.notes ?? ""}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="sm:col-span-2 grid gap-3 rounded-md bg-milsaca-cream-escuro/30 p-3 text-xs text-milsaca-verde-claro sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-milsaca-verde">
                      Valor total
                    </span>
                    :{" "}
                    {lead.proposed_price != null && lead.bag_count != null
                      ? formatBRL(lead.proposed_price * lead.bag_count)
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-milsaca-verde">
                      Criado em
                    </span>
                    : {formatDateTime(lead.created_at)}
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

          <PropostasBlock
            propostas={propostas}
            leadId={lead.id}
            defaultBagCount={lead.bag_count}
          />

          <Card className="border-milsaca-cream-escuro">
            <CardHeader>
              <CardTitle className="text-base">Mover o lead</CardTitle>
              <CardDescription>
                Atualize o status. Comentário opcional vai junto na timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateLeadStatus} className="space-y-4">
                <input type="hidden" name="id" value={lead.id} />

                <div className="space-y-2">
                  <Label htmlFor="comment">Comentário (opcional)</Label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={2}
                    placeholder="Ex.: produtor confirmou preço por WhatsApp."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_BUTTONS.filter((b) => b.value !== lead.status).map(
                    (b) => (
                      <button
                        key={b.value}
                        type="submit"
                        name="status"
                        value={b.value}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium ${b.tone}`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {b.label}
                      </button>
                    ),
                  )}
                  {lead.status !== "novo" && (
                    <button
                      type="submit"
                      name="status"
                      value="novo"
                      className="inline-flex items-center gap-1 rounded-md border border-milsaca-cream-escuro px-3 py-2 text-xs font-medium text-milsaca-verde hover:bg-milsaca-cream-escuro/40"
                    >
                      Voltar para Novo
                    </button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Timeline */}
        <Card className="border-milsaca-cream-escuro lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              Histórico completo deste lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addLeadComment} className="space-y-2">
              <input type="hidden" name="id" value={lead.id} />
              <Label htmlFor="text" className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
                Adicionar comentário
              </Label>
              <textarea
                id="text"
                name="text"
                rows={2}
                required
                placeholder="Escreva uma nota..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                >
                  Comentar
                </Button>
              </div>
            </form>

            <div className="space-y-3 border-t border-milsaca-cream-escuro pt-4">
              {lead.events.length === 0 ? (
                <p className="text-xs text-milsaca-verde-claro">
                  Sem eventos ainda.
                </p>
              ) : (
                lead.events.map((e) => (
                  <div key={e.id} className="flex gap-3 text-sm">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-milsaca-cream-escuro/60 text-milsaca-verde">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-medium text-milsaca-verde">
                        {eventLabel(e)}
                      </p>
                      {e.kind === "comment" && typeof e.payload.text === "string" && (
                        <p className="text-milsaca-verde">
                          {e.payload.text as string}
                        </p>
                      )}
                      {e.kind === "status_changed" &&
                        typeof e.payload.comment === "string" &&
                        e.payload.comment && (
                          <p className="text-milsaca-verde-claro italic">
                            “{e.payload.comment as string}”
                          </p>
                        )}
                      <p className="text-[11px] text-milsaca-verde-claro">
                        {formatDateTime(e.created_at)}
                        {e.actor_name && <> · {e.actor_name}</>}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
