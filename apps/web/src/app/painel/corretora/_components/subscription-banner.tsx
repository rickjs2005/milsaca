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
import { PREMIUM_PITCH } from "../assinatura/_lib/plans-catalog";

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
  // Barra fina, uma linha — não rouba a dobra do dashboard (feedback UX).
  return (
    <Link
      href="/painel/corretora/assinatura"
      className="group flex items-center justify-between gap-3 rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/10 px-4 py-2.5 transition-colors hover:bg-milsaca-dourado/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex min-w-0 items-center gap-2 text-body-sm text-milsaca-cafezal">
        <Sparkles className="h-4 w-4 shrink-0 text-dourado-texto" />
        <span className="truncate">
          <strong>Plano gratuito.</strong> Ative o {PREMIUM_PITCH} e libere
          tudo.
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-dourado-texto transition-all group-hover:gap-2">
        Liberar
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
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
            <p className="text-body-sm font-semibold text-milsaca-cafezal">
              Seu trial termina em {days} dia{days === 1 ? "" : "s"}.
            </p>
            <p className="mt-0.5 text-caption text-neutral-600">
              Garanta o acesso completo antes do vencimento.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/corretora/assinatura"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-4 text-label font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver planos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={WHATSAPP_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-milsaca-cafezal transition-colors hover:bg-milsaca-cream-escuro/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    <section className="rounded-card border border-warning-100 bg-warning-50/70 p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-100 text-warning-700 ring-1 ring-inset ring-warning-100">
            <Clock className="h-4 w-4" />
          </span>
          <p className="text-body-sm text-warning-700">
            Seu plano vence em{" "}
            <strong>
              {daysUntilExpiry} dia{daysUntilExpiry === 1 ? "" : "s"}
            </strong>
            . Renove pra evitar interrupção.
          </p>
        </div>
        <Link
          href="/painel/corretora/assinatura"
          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-warning-600 px-4 text-label font-semibold text-white transition-colors hover:bg-warning-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    <section className="rounded-card border border-danger-100 bg-danger-50/70 p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-700 ring-1 ring-inset ring-danger-100">
            {status === "canceled" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-body-sm font-semibold text-danger-700">{title}</p>
            <p className="mt-1 max-w-xl text-caption leading-relaxed text-danger-700">
              {description} Leitura de dados continua liberada.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/corretora/assinatura"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-danger-600 px-4 text-label font-semibold text-white transition-colors hover:bg-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {status === "canceled" ? "Reativar" : "Regularizar"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={WHATSAPP_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-danger-100 bg-white px-4 text-label font-semibold text-danger-700 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Suporte
          </Link>
        </div>
      </div>
    </section>
  );
}

