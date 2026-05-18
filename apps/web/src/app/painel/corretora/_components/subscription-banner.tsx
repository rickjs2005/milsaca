import Link from "next/link";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import type { SubscriptionInfo } from "../_lib/corretora";

/**
 * Banner discreto no topo do painel da corretora informando o estado
 * da assinatura. Não aparece se ela está saudável (active sem urgência
 * ou trial com mais de 7 dias).
 */
export function SubscriptionBanner({ info }: { info: SubscriptionInfo }) {
  // Sem assinatura: situação rara (admin não criou trial). Mostra alerta.
  if (info.effectiveStatus === "none") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p>
          Sua corretora ainda não tem assinatura. Fale com o suporte da Milsaca
          pra liberar o painel completo.
        </p>
      </div>
    );
  }

  // Trial vigente — só mostra se faltar 7 dias ou menos
  if (info.effectiveStatus === "trial") {
    if (info.daysUntilExpiry == null || info.daysUntilExpiry > 7) return null;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Clock className="h-4 w-4 shrink-0" />
        <p>
          Seu trial termina em{" "}
          <strong>
            {info.daysUntilExpiry} dia{info.daysUntilExpiry === 1 ? "" : "s"}
          </strong>
          . Pra continuar usando após o vencimento, fale com o suporte e
          escolha um plano.
        </p>
      </div>
    );
  }

  // Active OK: nada
  if (info.effectiveStatus === "active") {
    // Aviso suave se faltar 7 dias ou menos pro fim do período
    if (info.daysUntilExpiry != null && info.daysUntilExpiry <= 7) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Clock className="h-4 w-4 shrink-0" />
          <p>
            Seu plano vence em{" "}
            <strong>
              {info.daysUntilExpiry} dia
              {info.daysUntilExpiry === 1 ? "" : "s"}
            </strong>
            . Renove pra evitar interrupção.
          </p>
        </div>
      );
    }
    return null;
  }

  // past_due / expired / canceled — bloqueio
  const isCanceled = info.effectiveStatus === "canceled";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <Lock className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold">
          {isCanceled
            ? "Assinatura cancelada"
            : info.effectiveStatus === "expired"
              ? "Trial expirado"
              : "Pagamento em atraso"}
        </p>
        <p>
          Você ainda pode <strong>visualizar</strong> seus dados, mas{" "}
          <strong>criar contratos, lotes e entregas está bloqueado</strong> até
          regularizar. Fale com o suporte pra renovar.
        </p>
        <p className="text-xs">
          <Link
            href="https://wa.me/5533999999999?text=Olá! Quero renovar minha assinatura no Milsaca."
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
          >
            Falar com o suporte →
          </Link>
        </p>
      </div>
    </div>
  );
}
