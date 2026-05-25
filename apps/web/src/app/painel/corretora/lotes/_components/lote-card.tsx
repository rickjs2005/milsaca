"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Coffee,
  HandCoins,
  MapPin,
  MoreHorizontal,
  Package,
  Share2,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateLoteStatus } from "../_actions";
import {
  LOTE_STATUS_LABEL,
  LOTE_STATUS_COLOR,
  PROCESSO_LABEL,
  SPECIE_LABEL,
  type LoteRow,
  type LoteStatus,
} from "../_lib/lote-meta";
import { shareLoteOnWhatsapp } from "../_lib/lote-share";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("pt-BR");

const NEXT_STATUS: Partial<Record<LoteStatus, LoteStatus>> = {
  aguardando_classificacao: "classificado",
  classificado: "vendido",
};

const NEXT_STATUS_LABEL: Partial<Record<LoteStatus, string>> = {
  aguardando_classificacao: "Marcar classificado",
  classificado: "Marcar vendido",
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function LoteCard({
  lote,
  corretoraName,
  cotacaoRef,
}: {
  lote: LoteRow;
  corretoraName: string;
  /** Última cotação da specie do lote, pra mostrar no card e usar no share. */
  cotacaoRef: number | null;
}) {
  const share = shareLoteOnWhatsapp(lote, corretoraName, cotacaoRef);
  const advanceTo = NEXT_STATUS[lote.status];
  const local = [lote.city, lote.state].filter(Boolean).join("/");

  return (
    <article className="group rounded-card border border-milsaca-cream-escuro bg-white p-5 shadow-card transition-all hover:border-milsaca-dourado/40 hover:shadow-card-hover sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Identidade do lote */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/painel/corretora/lotes/${lote.id}`}
              className="font-mono text-base font-semibold text-milsaca-verde hover:underline"
            >
              {lote.codigo}
            </Link>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                LOTE_STATUS_COLOR[lote.status],
              )}
            >
              {LOTE_STATUS_LABEL[lote.status]}
            </span>
            {lote.ultimo_tipo ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                  lote.ultimo_fora_de_tipo
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40",
                )}
              >
                {lote.ultimo_fora_de_tipo
                  ? "Fora de tipo"
                  : `Tipo ${lote.ultimo_tipo}`}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-milsaca-verde-claro sm:grid-cols-3">
            <span className="inline-flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              {SPECIE_LABEL[lote.specie]}
              {lote.processo
                ? ` · ${PROCESSO_LABEL[lote.processo] ?? lote.processo}`
                : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" />
              {lote.peso_sacas ? `${NUM.format(lote.peso_sacas)} sacas` : "—"}
            </span>
            {lote.safra ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Safra {lote.safra}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <User2 className="h-3 w-3" />
              {lote.produtor_nome}
            </span>
            {local ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {local}
              </span>
            ) : null}
            {lote.fazenda ? (
              <span className="inline-flex items-center gap-1 text-milsaca-verde-claro/80">
                {lote.fazenda}
              </span>
            ) : null}
          </div>

          {/* Cotação de referência */}
          {cotacaoRef != null ? (
            <div className="inline-flex items-baseline gap-2 rounded-md bg-milsaca-cream/60 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-milsaca-verde-claro">
                Cotação ref.
              </span>
              <span className="text-sm font-semibold text-milsaca-verde">
                {BRL.format(cotacaoRef)}
                <span className="ml-0.5 text-[10px] font-medium text-milsaca-verde-claro">
                  /sc
                </span>
              </span>
            </div>
          ) : null}

          <p className="text-[11px] text-milsaca-verde-claro/70">
            Cadastrado em {formatDateShort(lote.created_at)} · atualizado{" "}
            {formatDateShort(lote.updated_at)}
          </p>
        </div>

        {/* Ações */}
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <a
            href={share.href}
            target="_blank"
            rel="noopener noreferrer"
            title={share.preview}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#25D366] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1ebe5d]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar no WhatsApp
          </a>

          <Link
            href={`/painel/corretora/lotes/${lote.id}#nova-proposta`}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-milsaca-cafezal/40 bg-milsaca-cafezal/5 px-3 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal/15 lg:w-auto"
          >
            <HandCoins className="h-3.5 w-3.5" />
            Criar proposta
          </Link>

          {advanceTo ? (
            <form action={updateLoteStatus}>
              <input type="hidden" name="id" value={lote.id} />
              <input type="hidden" name="status" value={advanceTo} />
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/10 px-3 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/20 lg:w-auto"
              >
                {NEXT_STATUS_LABEL[lote.status]}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : null}

          <Link
            href={`/painel/corretora/lotes/${lote.id}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-milsaca-cream-escuro px-3 text-xs font-semibold text-milsaca-verde-claro transition-colors hover:text-milsaca-verde"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
