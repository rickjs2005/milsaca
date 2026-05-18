import Link from "next/link";
import { Lock } from "lucide-react";
import { getCorretoraSubscriptionInfo } from "./corretora";

/**
 * Componente "trava" — chame no topo de páginas com ações custosas
 * (criar contrato, lote, entrega). Se a assinatura não está usável
 * (trial vigente ou active), renderiza placeholder com call-to-action
 * pra renovar e o caller deve fazer `return <BlockedPlaceholder />`.
 *
 * Uso:
 *   const block = await blockIfNoActiveSubscription(corretoraId);
 *   if (block) return block;
 */
export async function blockIfNoActiveSubscription(
  corretoraId: string,
  options?: { action?: string; backHref?: string },
) {
  const info = await getCorretoraSubscriptionInfo(corretoraId);
  if (info.isUsable) return null;

  const action = options?.action ?? "esta ação";
  const backHref = options?.backHref ?? "/painel/corretora";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-rose-900">
          {info.effectiveStatus === "canceled"
            ? "Assinatura cancelada"
            : info.effectiveStatus === "expired"
              ? "Trial expirado"
              : info.effectiveStatus === "past_due"
                ? "Pagamento em atraso"
                : "Sem assinatura ativa"}
        </h2>
        <p className="mt-2 text-sm text-rose-800">
          {action.charAt(0).toUpperCase() + action.slice(1)} está bloqueada até
          sua assinatura ser regularizada.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="https://wa.me/5533999999999?text=Olá! Quero renovar minha assinatura no Milsaca."
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-milsaca-verde px-4 py-2 text-sm font-medium text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Falar com o suporte
          </Link>
          <Link
            href={backHref}
            className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
          >
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
