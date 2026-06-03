import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  whatsappLinkForUpgrade,
  type PlanCatalogItem,
  type PlanTier,
} from "../_lib/plans-catalog";

export function PlanCard({
  plan,
  currentTier,
  corretoraName,
}: {
  plan: PlanCatalogItem;
  currentTier: PlanTier;
  corretoraName: string | null;
}) {
  const isCurrent = plan.tier === currentTier;
  const isRecommended = plan.highlight === "recommended";
  const isEnterprise = plan.highlight === "enterprise";

  const containerClass = cn(
    "relative flex flex-col rounded-2xl border bg-white p-6 shadow-card transition-all sm:p-7",
    // Premium é o alvo: aparece PRIMEIRO no mobile empilhado; no desktop volta
    // pra ordem natural (Gratuito à esquerda, Premium à direita).
    plan.tier === "premium" && "order-first sm:order-none",
    isCurrent
      ? "border-milsaca-cafezal/40 ring-2 ring-milsaca-cafezal/20"
      : isRecommended
        ? "border-milsaca-dourado/60 shadow-card-hover ring-2 ring-milsaca-dourado/30"
        : "border-milsaca-cream-escuro hover:border-milsaca-dourado/40 hover:shadow-card-hover",
  );

  const ctaHref = whatsappLinkForUpgrade(plan.tier, corretoraName);
  const ctaIsExternal = !isCurrent;

  return (
    <article className={containerClass}>
      {/* Badge canto superior */}
      {isCurrent ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-milsaca-cafezal px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-milsaca-cream">
          <Sparkles className="h-3 w-3" />
          Plano atual
        </span>
      ) : isRecommended ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-milsaca-dourado px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-milsaca-preto shadow-[0_4px_18px_-6px_rgba(201,169,97,0.5)]">
          <Sparkles className="h-3 w-3" />
          Recomendado
        </span>
      ) : null}

      {/* Header */}
      <div className="space-y-1 pb-5">
        <h3 className="text-lg font-semibold text-milsaca-verde">
          {plan.name}
        </h3>
        <p className="text-xs text-milsaca-verde-claro">{plan.tagline}</p>
      </div>

      {/* Preço */}
      <div className="border-y border-milsaca-cream-escuro py-5">
        <p
          className={cn(
            "text-2xl sm:text-3xl font-semibold tracking-tight",
            isEnterprise ? "text-milsaca-cafezal" : "text-milsaca-verde",
          )}
        >
          {plan.priceLabel}
        </p>
        <p className="mt-1 text-xs text-milsaca-verde-claro">
          {plan.pricePeriod}
        </p>
        {plan.priceAnchor ? (
          <p className="mt-2 text-xs font-medium text-success-700">
            {plan.priceAnchor}
          </p>
        ) : null}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2.5 py-5 text-sm">
        {plan.features.map((f) => (
          <li
            key={f.label}
            className={cn(
              "flex items-start gap-2",
              f.included ? "text-milsaca-verde" : "text-milsaca-verde-claro/50",
            )}
          >
            {f.included ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
            ) : (
              <Minus className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-verde-claro/40" />
            )}
            <span className={cn(!f.included && "line-through")}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-milsaca-cafezal/30 bg-milsaca-cafezal/10 px-4 text-sm font-semibold text-milsaca-cafezal"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {plan.ctaLabel}
        </button>
      ) : (
        <Link
          href={ctaHref}
          target={ctaIsExternal ? "_blank" : undefined}
          rel={ctaIsExternal ? "noopener noreferrer" : undefined}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-all",
            isRecommended
              ? "bg-milsaca-dourado text-milsaca-preto shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(201,169,97,0.45)] hover:brightness-105"
              : isEnterprise
                ? "border border-milsaca-cafezal text-milsaca-cafezal hover:bg-milsaca-cafezal hover:text-milsaca-cream"
                : "bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {plan.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
}
