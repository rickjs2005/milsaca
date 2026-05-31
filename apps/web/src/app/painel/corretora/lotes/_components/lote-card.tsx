"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  FileCheck2,
  HandCoins,
  MapPin,
  MoreHorizontal,
  Share2,
  User2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { updateLoteStatus } from "../_actions";
import {
  LOTE_STATUS_LABEL,
  LOTE_STATUS_TONE,
  PROCESSO_LABEL,
  SPECIE_LABEL,
  nextLoteAction,
  type LoteRow,
} from "../_lib/lote-meta";
import { shareLoteOnWhatsapp } from "../_lib/lote-share";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("pt-BR");

export function LoteCard({
  lote,
  corretoraName,
  cotacaoRef,
}: {
  lote: LoteRow;
  corretoraName: string;
  cotacaoRef: number | null;
}) {
  const share = shareLoteOnWhatsapp(lote, corretoraName, cotacaoRef);
  const action = nextLoteAction(lote);
  const local = [lote.city, lote.state].filter(Boolean).join("/");
  const total =
    cotacaoRef != null && lote.peso_sacas != null
      ? cotacaoRef * lote.peso_sacas
      : null;
  const laudoHref = lote.ultimo_classificacao_id
    ? `/laudos/${lote.ultimo_classificacao_id}`
    : null;
  const especie = `${SPECIE_LABEL[lote.specie]}${
    lote.processo ? ` ${PROCESSO_LABEL[lote.processo] ?? lote.processo}` : ""
  }`;

  return (
    <Card tone="default" interactive className="group p-card sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-3">
          {/* Código + status + Tipo (link pro laudo) */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/painel/corretora/lotes/${lote.id}`}
              className="font-mono text-h3 text-milsaca-cafezal hover:underline"
            >
              {lote.codigo}
            </Link>
            <StatusBadge tone={LOTE_STATUS_TONE[lote.status]} withDot={false}>
              {LOTE_STATUS_LABEL[lote.status]}
            </StatusBadge>
            {lote.ultimo_tipo || lote.ultimo_fora_de_tipo ? (
              laudoHref ? (
                <Link href={laudoHref} target="_blank">
                  <StatusBadge
                    tone={lote.ultimo_fora_de_tipo ? "danger" : "premium"}
                    withDot={false}
                  >
                    {lote.ultimo_fora_de_tipo
                      ? "Fora de tipo"
                      : `Tipo ${lote.ultimo_tipo}`}
                  </StatusBadge>
                </Link>
              ) : (
                <StatusBadge
                  tone={lote.ultimo_fora_de_tipo ? "danger" : "premium"}
                  withDot={false}
                >
                  {lote.ultimo_fora_de_tipo
                    ? "Fora de tipo"
                    : `Tipo ${lote.ultimo_tipo}`}
                </StatusBadge>
              )
            ) : null}
          </div>

          {/* VALOR TOTAL lidera; sacas/unitário/café viram legenda */}
          <div>
            {total != null ? (
              <>
                <p className="text-h2 leading-none tabular-nums text-milsaca-cafezal">
                  {BRL.format(total)}
                </p>
                <p className="mt-1 text-caption text-neutral-500">
                  {NUM.format(lote.peso_sacas ?? 0)} sc · {BRL.format(cotacaoRef!)}/sc ·{" "}
                  {especie}
                </p>
              </>
            ) : (
              <p className="text-body-sm text-neutral-500">
                {lote.peso_sacas ? `${NUM.format(lote.peso_sacas)} sc · ` : ""}
                {especie}
                <span className="ml-1 italic text-neutral-400">
                  (sem cotação ref.)
                </span>
              </p>
            )}
          </div>

          {/* Produtor / fazenda / local / safra */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <User2 className="h-3 w-3" />
              {lote.produtor_nome}
            </span>
            {lote.fazenda ? (
              <span className="text-neutral-500">{lote.fazenda}</span>
            ) : null}
            {local ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {local}
              </span>
            ) : null}
            {lote.safra ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Safra {lote.safra}
              </span>
            ) : null}
          </div>

          {laudoHref ? (
            <Link
              href={laudoHref}
              target="_blank"
              className="inline-flex items-center gap-1 text-caption font-semibold text-dourado-texto hover:underline"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Ver laudo →
            </Link>
          ) : null}
        </div>

        {/* Ações — primária por estágio + secundárias */}
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          {action?.type === "share" ? (
            <a
              href={share.href}
              target="_blank"
              rel="noopener noreferrer"
              title={share.preview}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 text-caption font-semibold text-white transition-colors hover:bg-[#1ebe5d]"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar no WhatsApp
            </a>
          ) : action?.type === "advance" ? (
            <form action={updateLoteStatus} className="contents">
              <input type="hidden" name="id" value={lote.id} />
              <input type="hidden" name="status" value={action.toStatus} />
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-caption font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : action?.type === "link" ? (
            <Link
              href={action.href}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-caption font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          {lote.status === "classificado" ? (
            <Link
              href={`/painel/corretora/lotes/${lote.id}#nova-proposta`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-milsaca-cafezal/40 bg-milsaca-cafezal/5 px-3 text-caption font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal/15"
            >
              <HandCoins className="h-3.5 w-3.5" />
              Criar proposta
            </Link>
          ) : null}

          <Link
            href={`/painel/corretora/lotes/${lote.id}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-semibold text-neutral-600 transition-colors hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            Ver detalhes
          </Link>
        </div>
      </div>
    </Card>
  );
}
