"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileSignature,
  HandCoins,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { updateLeadStatus } from "../_actions";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
  LEAD_STATUS_ORDER,
  LEAD_ORIGEM_LABEL,
  LEAD_ORIGEM_TONE,
  type LeadListItem,
  type LeadStatus,
} from "../_lib/lead-meta";
import {
  nextActionFor,
  URGENCIA_LABEL,
  type Urgencia,
} from "../_lib/next-action";
import { whatsappLinkFor } from "../_lib/whatsapp-templates";

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const URGENCIA_TONE: Record<Urgencia, StatusTone> = {
  quente: "danger",
  morno: "warning",
  frio: "neutral",
};

// Próximo status no avanço de 1 clique.
const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  novo: "em_negociacao",
  em_negociacao: "convertido",
};

export function LeadCard({
  lead,
  corretoraName,
}: {
  lead: LeadListItem;
  corretoraName: string;
}) {
  const next = nextActionFor(lead);
  const wa = whatsappLinkFor(lead, corretoraName);
  const advanceTo = NEXT_STATUS[lead.status];
  const local = [lead.city, lead.state].filter(Boolean).join("/");
  const total =
    lead.proposed_price != null && lead.bag_count != null
      ? lead.proposed_price * lead.bag_count
      : null;
  // Convertido → próximo passo é gerar contrato (não propor de novo).
  const isConvertido = lead.status === "convertido";
  const showCriarProposta =
    lead.status !== "perdido" && lead.status !== "arquivado" && !isConvertido;

  return (
    <Card tone="default" interactive className="group p-card sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Identidade do lead */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/painel/corretora/leads/${lead.id}`}
              className="text-h3 text-milsaca-cafezal hover:underline"
            >
              {lead.produtor_nome}
            </Link>
            {/* "produtor" é o default — só sinaliza quando é contato-sombra */}
            {lead.produtor_kind === "contato" ? (
              <StatusBadge
                tone="premium"
                withDot={false}
                className="uppercase tracking-wider"
              >
                <User2 className="h-2.5 w-2.5" />
                contato
              </StatusBadge>
            ) : null}
            <StatusBadge tone={LEAD_STATUS_TONE[lead.status]} withDot={false}>
              {LEAD_STATUS_LABEL[lead.status]}
            </StatusBadge>
            <StatusBadge
              tone={URGENCIA_TONE[next.urgencia]}
              title={`Urgência: ${URGENCIA_LABEL[next.urgencia]}`}
            >
              {URGENCIA_LABEL[next.urgencia]}
            </StatusBadge>
            {lead.origem ? (
              <StatusBadge
                tone={LEAD_ORIGEM_TONE[lead.origem]}
                withDot={false}
                title={`Origem: ${LEAD_ORIGEM_LABEL[lead.origem]}`}
              >
                {LEAD_ORIGEM_LABEL[lead.origem]}
              </StatusBadge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-body-sm text-neutral-600">
            {local ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {local}
              </span>
            ) : null}
            {lead.produtor_phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.produtor_phone}
              </span>
            ) : null}
          </div>

          {/* Valor TOTAL do negócio lidera; unitário/sacas viram legenda */}
          <div className="pt-1">
            {total != null ? (
              <>
                <p className="text-h2 leading-none tabular-nums text-milsaca-cafezal">
                  {BRL.format(total)}
                </p>
                <p className="mt-1 text-caption text-neutral-500">
                  {lead.bag_count} sc
                  {lead.coffee_type
                    ? ` ${COFFEE_LABEL[lead.coffee_type] ?? lead.coffee_type}`
                    : ""}
                  {lead.proposed_price != null
                    ? ` · ${BRL.format(lead.proposed_price)}/sc`
                    : ""}
                </p>
              </>
            ) : lead.proposed_price != null ? (
              <p className="text-h3 tabular-nums text-milsaca-cafezal">
                {BRL.format(lead.proposed_price)}
                <span className="ml-1 text-caption font-medium text-neutral-500">
                  /sc
                </span>
              </p>
            ) : (
              <p className="text-caption italic text-neutral-400">
                Sem valor proposto
              </p>
            )}
          </div>

          <p className="text-body-sm leading-relaxed text-neutral-600">
            <span className="font-semibold text-milsaca-cafezal">
              Próxima ação:
            </span>{" "}
            {next.label}
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a
            href={wa.href}
            target="_blank"
            rel="noopener noreferrer"
            title={wa.preview}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-caption font-semibold transition-colors",
              wa.hasPhone
                ? "bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {wa.hasPhone ? "WhatsApp" : "Abrir WhatsApp"}
          </a>

          {/* Ação primária alinhada ao estágio */}
          {isConvertido ? (
            <Link
              href={`/painel/corretora/contratos/novo?lead=${lead.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-success-600/40 bg-success-50 px-3 text-caption font-semibold text-success-700 transition-colors hover:bg-success-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <FileSignature className="h-3.5 w-3.5" />
              Gerar contrato
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : showCriarProposta ? (
            <Link
              href={`/painel/corretora/leads/${lead.id}#nova-proposta`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-milsaca-cafezal/40 bg-milsaca-cafezal/5 px-3 text-caption font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal/15"
            >
              <HandCoins className="h-3.5 w-3.5" />
              Criar proposta
            </Link>
          ) : null}

          {advanceTo ? (
            <form action={updateLeadStatus}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="status" value={advanceTo} />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-milsaca-dourado/50 bg-milsaca-dourado/10 px-3 text-caption font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {advanceTo === "em_negociacao"
                  ? "Marcar em negociação"
                  : "Marcar convertido"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : null}

          <Link
            href={`/painel/corretora/leads/${lead.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-semibold text-neutral-600 transition-colors hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            Ver detalhes
          </Link>
        </div>
      </div>

      {lead.notes ? (
        <p className="mt-4 line-clamp-2 rounded-md border border-neutral-200 bg-milsaca-cream/60 px-3 py-2 text-caption italic text-neutral-600">
          “{lead.notes}”
        </p>
      ) : null}
    </Card>
  );
}

export const ALL_LEAD_STATUSES = LEAD_STATUS_ORDER;
