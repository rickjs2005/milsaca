import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import type { SubscriptionInfo } from "../_lib/corretora";

const WHATSAPP_SUPPORT =
  "https://wa.me/5533999999999?text=" +
  encodeURIComponent(
    "Olá! Quero ativar/renovar minha assinatura no Milsaca.",
  );

/**
 * Card de status da assinatura no topo do painel da corretora.
 *
 * Estratégia de copy:
 *   - Sem assinatura → oportunidade de upgrade (não erro)
 *   - Trial vigente → tudo bem (só alerta se < 7 dias pro fim)
 *   - Active OK → não renderiza (return null)
 *   - Active perto de vencer → aviso amigável
 *   - past_due/expired/canceled → bloqueio claro
 *
 * Em todos os estados acionáveis, sempre 3 CTAs: ver planos, liberar/renovar,
 * falar no WhatsApp. Coloca a assinatura como ferramenta de venda, não erro.
 */
export function SubscriptionBanner({ info }: { info: SubscriptionInfo }) {
  // Active OK e trial saudável (>7d): nada
  if (info.effectiveStatus === "active") {
    if (info.daysUntilExpiry != null && info.daysUntilExpiry <= 7) {
      return (
        <RenewSoonCard daysUntilExpiry={info.daysUntilExpiry} />
      );
    }
    return null;
  }
  if (
    info.effectiveStatus === "trial" &&
    (info.daysUntilExpiry == null || info.daysUntilExpiry > 7)
  ) {
    return null;
  }

  // Trial perto de acabar
  if (info.effectiveStatus === "trial") {
    return <TrialEndingSoonCard daysUntilExpiry={info.daysUntilExpiry} />;
  }

  // Bloqueio: past_due, expired, canceled
  if (
    info.effectiveStatus === "past_due" ||
    info.effectiveStatus === "expired" ||
    info.effectiveStatus === "canceled"
  ) {
    return <BlockedCard status={info.effectiveStatus} />;
  }

  // none — corretora sem trial ativo. Copy de upgrade, não erro.
  return <UpgradeCard />;
}

/* ====================================================================== */
/* Estado: nunca teve plano (oportunidade de upgrade)                    */
/* ====================================================================== */
function UpgradeCard() {
  return (
    <section className="relative overflow-hidden rounded-card border border-milsaca-dourado/40 bg-gradient-to-br from-milsaca-cafezal via-milsaca-cafezal to-[#0a261c] p-6 text-milsaca-cream shadow-card-hover sm:p-7">
      <DecorativeGlow />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-dourado ring-1 ring-inset ring-milsaca-dourado/40">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-milsaca-dourado">
              Plano gratuito ativo
            </span>
          </div>
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Libere a corretora completa.
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-milsaca-cream/75">
            Você está usando recursos limitados da Milsaca. Ative o plano{" "}
            <strong className="text-milsaca-dourado">Premium</strong> (R$100/mês,
            1º mês grátis) e libere gestão completa de lotes, leads, propostas,
            contratos e analytics. Sem limite por operador.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <CtaPrimary href="/painel/corretora/assinatura">
            Ver planos
          </CtaPrimary>
          <div className="flex gap-2">
            <CtaSecondary href="/painel/corretora/assinatura">
              Liberar painel completo
            </CtaSecondary>
            <CtaIcon href={WHATSAPP_SUPPORT} external>
              <MessageCircle className="h-4 w-4" />
            </CtaIcon>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================== */
/* Estado: trial está acabando (≤ 7 dias)                                 */
/* ====================================================================== */
function TrialEndingSoonCard({
  daysUntilExpiry,
}: {
  daysUntilExpiry: number | null;
}) {
  const days = daysUntilExpiry ?? 0;
  return (
    <section className="rounded-card border border-milsaca-dourado/40 bg-gradient-to-br from-milsaca-cream-claro/60 via-white to-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-milsaca-verde">
              Seu trial termina em {days} dia{days === 1 ? "" : "s"}.
            </p>
            <p className="mt-0.5 text-xs text-milsaca-verde-claro">
              Garanta o acesso completo antes do vencimento.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/corretora/assinatura"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
          >
            Ver planos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={WHATSAPP_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-milsaca-cream-escuro text-milsaca-verde transition-colors hover:bg-milsaca-cream-escuro/40"
            aria-label="Falar com o suporte no WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================== */
/* Estado: assinatura ativa, renovação próxima                            */
/* ====================================================================== */
function RenewSoonCard({ daysUntilExpiry }: { daysUntilExpiry: number }) {
  return (
    <section className="rounded-card border border-amber-200 bg-amber-50/60 p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200">
            <Clock className="h-4 w-4" />
          </span>
          <p className="text-sm text-amber-900">
            Seu plano vence em{" "}
            <strong>
              {daysUntilExpiry} dia{daysUntilExpiry === 1 ? "" : "s"}
            </strong>
            . Renove pra evitar interrupção.
          </p>
        </div>
        <Link
          href="/painel/corretora/assinatura"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-amber-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
        >
          Renovar
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ====================================================================== */
/* Estado: bloqueado (past_due/expired/canceled)                          */
/* ====================================================================== */
function BlockedCard({
  status,
}: {
  status: "past_due" | "expired" | "canceled";
}) {
  const title =
    status === "canceled"
      ? "Assinatura cancelada"
      : status === "expired"
        ? "Trial expirado"
        : "Pagamento em atraso";

  const description =
    status === "canceled"
      ? "Sua assinatura foi cancelada. Reative pra voltar a criar contratos, lotes e entregas."
      : status === "expired"
        ? "Seu trial chegou ao fim. Escolha um plano e continue operando sem interrupção."
        : "Identificamos uma pendência de pagamento. Regularize pra liberar criação de contratos, lotes e entregas.";

  return (
    <section className="rounded-card border border-rose-200 bg-rose-50/60 p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200">
            {status === "canceled" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-rose-900">{title}</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-rose-800">
              {description} Leitura de dados continua liberada.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/corretora/assinatura"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-800"
          >
            {status === "canceled" ? "Reativar" : "Regularizar"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={WHATSAPP_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-900 transition-colors hover:bg-rose-50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Suporte
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================== */
/* Pieces                                                                  */
/* ====================================================================== */

function DecorativeGlow() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-milsaca-dourado/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-milsaca-folha/30 blur-3xl"
      />
    </>
  );
}

function CtaPrimary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-milsaca-dourado px-4 text-sm font-semibold text-milsaca-cafezal shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_18px_-8px_rgba(201,169,97,0.6)] transition-all duration-150 hover:brightness-105"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function CtaSecondary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-md border border-milsaca-dourado/40 bg-transparent px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-dourado/10"
    >
      {children}
    </Link>
  );
}

function CtaIcon({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label="Falar com o suporte no WhatsApp"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-milsaca-dourado/40 bg-transparent text-milsaca-cream transition-colors hover:bg-milsaca-dourado/10"
    >
      {children}
    </Link>
  );
}
