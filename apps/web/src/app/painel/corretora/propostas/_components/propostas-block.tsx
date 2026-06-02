import {
  CheckCircle2,
  Clock,
  FileText,
  HandCoins,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  PROPOSTA_STATUS_LABEL,
  PROPOSTA_STATUS_TONE,
  type PropostaRow,
  type PropostaStatus,
} from "../_lib/proposta-meta";
import {
  createProposta,
  deleteProposta,
  updatePropostaStatus,
} from "../_actions";
import { fmtMoney, fmtInt } from "@/lib/format";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Bloco completo de propostas pra plugar em detalhes (lead ou lote).
 * Inclui:
 *  - Form pra criar nova proposta (preço/sacas/mensagem/validade)
 *  - Lista de propostas existentes com botões de transição de status
 *
 * Server component — todos os botões usam `<form action={serverAction}>`.
 *
 * Recebe `leadId` OU `loteId` (não os dois ao mesmo tempo é o padrão,
 * mas tecnicamente o backend aceita). O alvo é injetado no form via
 * hidden input.
 */
export function PropostasBlock({
  propostas,
  leadId,
  loteId,
  /** Sacas sugeridas pra pré-preencher o form (opcional). */
  defaultBagCount,
  /** Lead/lote já fechado (ex.: lead convertido): só leitura, sem nova proposta. */
  locked = false,
  /** Texto do aviso quando `locked` (contexto varia entre lead e lote). */
  lockedNote = "Não dá pra enviar nova proposta agora — o histórico abaixo fica como registro.",
}: {
  propostas: PropostaRow[];
  leadId?: string;
  loteId?: string;
  defaultBagCount?: number | null;
  locked?: boolean;
  lockedNote?: string;
}) {
  return (
    <Card className="border-milsaca-cream-escuro shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HandCoins className="h-4 w-4 text-milsaca-cafezal" />
          Propostas
          {propostas.length > 0 ? (
            <span className="rounded-full bg-milsaca-cafezal/10 px-2 py-0.5 text-[10px] font-semibold text-milsaca-cafezal">
              {propostas.length}
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          Crie ofertas pro produtor/comprador e acompanhe a resposta.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* --- Form: nova proposta (escondido quando fechado) --- */}
        {locked ? (
          <div className="rounded-lg border border-milsaca-cream-escuro bg-milsaca-cream/40 px-4 py-3 text-xs text-milsaca-verde-claro">
            {lockedNote}
          </div>
        ) : (
        <form
          action={createProposta}
          id="nova-proposta"
          className="grid gap-4 rounded-lg border border-milsaca-cream-escuro bg-milsaca-cream/40 p-4 sm:grid-cols-2"
        >
          {leadId ? (
            <input type="hidden" name="lead_id" value={leadId} />
          ) : null}
          {loteId ? (
            <input type="hidden" name="lote_id" value={loteId} />
          ) : null}

          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-milsaca-verde-claro/80">
              Nova proposta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preco_saca">
              Preço por saca (R$) *
            </Label>
            <Input
              id="preco_saca"
              name="preco_saca"
              type="text"
              inputMode="decimal"
              required
              placeholder="1.850,00"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bag_count">Sacas (60kg)</Label>
            <Input
              id="bag_count"
              name="bag_count"
              type="number"
              step="1"
              min="0"
              defaultValue={defaultBagCount ?? ""}
              placeholder="100"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validade_ate">Validade da oferta</Label>
            <Input
              id="validade_ate"
              name="validade_ate"
              type="date"
              className="bg-white"
            />
            <p className="text-[11px] text-milsaca-verde-claro/70">
              Vence no fim do dia escolhido (opcional).
            </p>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="mensagem">Mensagem (opcional)</Label>
            <textarea
              id="mensagem"
              name="mensagem"
              rows={2}
              placeholder="Ex.: condição válida só pra pagamento à vista."
              className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-milsaca-verde-claro/70">
              Vai como <strong>enviada</strong>. Você pode marcar como aceita ou
              rejeitada quando o produtor responder.
            </p>
            <Button
              type="submit"
              className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Enviar proposta
            </Button>
          </div>
        </form>
        )}

        {/* --- Lista de propostas existentes --- */}
        {propostas.length === 0 ? (
          <div className="rounded-md border border-dashed border-milsaca-cream-escuro bg-white/40 px-4 py-6 text-center text-xs text-milsaca-verde-claro">
            Nenhuma proposta ainda. Crie a primeira no formulário acima.
          </div>
        ) : (
          <ul className="space-y-3">
            {propostas.map((p) => (
              <PropostaItem key={p.id} proposta={p} locked={locked} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PropostaItem({
  proposta,
  locked = false,
}: {
  proposta: PropostaRow;
  locked?: boolean;
}) {
  const isTerminal =
    proposta.status === "aceita" ||
    proposta.status === "rejeitada" ||
    proposta.status === "expirada";

  const valorTotal =
    proposta.bag_count != null
      ? proposta.preco_saca * proposta.bag_count
      : null;

  return (
    <li
      className={cn(
        "rounded-lg border bg-white p-4 transition-colors",
        proposta.status === "aceita"
          ? "border-emerald-300 bg-emerald-50/30"
          : proposta.status === "rejeitada"
            ? "border-rose-200 bg-rose-50/20"
            : "border-milsaca-cream-escuro",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={PROPOSTA_STATUS_TONE[proposta.status]}>
              {PROPOSTA_STATUS_LABEL[proposta.status]}
            </StatusBadge>
            <span className="text-lg font-semibold text-milsaca-verde">
              {fmtMoney(proposta.preco_saca)}
              <span className="ml-1 text-[10px] font-medium text-milsaca-verde-claro">
                /sc
              </span>
            </span>
            {proposta.bag_count != null ? (
              <span className="text-xs text-milsaca-verde-claro">
                · {fmtInt(proposta.bag_count)} sacas
              </span>
            ) : null}
            {valorTotal != null ? (
              <span className="text-xs font-medium text-milsaca-cafezal">
                · total {fmtMoney(valorTotal)}
              </span>
            ) : null}
          </div>
          {proposta.mensagem ? (
            <p className="rounded-md border border-milsaca-cream-escuro/60 bg-milsaca-cream/40 px-3 py-2 text-xs italic text-milsaca-verde-claro">
              “{proposta.mensagem}”
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-milsaca-verde-claro/80">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Enviada em {formatDateTime(proposta.enviada_em ?? proposta.created_at)}
            </span>
            {proposta.validade_ate ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Vale até {formatDateOnly(proposta.validade_ate)}
              </span>
            ) : null}
            {proposta.respondida_em ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Respondida em {formatDateTime(proposta.respondida_em)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Botões de transição (escondidos quando o lead/lote está fechado) */}
        {!isTerminal && !locked ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <StatusButton
              id={proposta.id}
              status="aceita"
              label="Aceita"
              tone="emerald"
            />
            <StatusButton
              id={proposta.id}
              status="rejeitada"
              label="Rejeitada"
              tone="rose"
            />
            {proposta.status === "rascunho" ? (
              <StatusButton
                id={proposta.id}
                status="enviada"
                label="Enviar"
                tone="cafezal"
              />
            ) : null}
            {proposta.status === "rascunho" ? (
              <form action={deleteProposta}>
                <input type="hidden" name="id" value={proposta.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 px-2.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                  aria-label="Excluir rascunho"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function StatusButton({
  id,
  status,
  label,
  tone,
}: {
  id: string;
  status: PropostaStatus;
  label: string;
  tone: "emerald" | "rose" | "cafezal";
}) {
  const TONE_CLASS: Record<typeof tone, string> = {
    emerald:
      "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    cafezal:
      "border-milsaca-cafezal bg-milsaca-cafezal/10 text-milsaca-cafezal hover:bg-milsaca-cafezal/20",
  };
  const ICON: Record<typeof tone, typeof CheckCircle2> = {
    emerald: CheckCircle2,
    rose: XCircle,
    cafezal: Send,
  };
  const Icon = ICON[tone];
  return (
    <form action={updatePropostaStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition-colors",
          TONE_CLASS[tone],
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </button>
    </form>
  );
}
