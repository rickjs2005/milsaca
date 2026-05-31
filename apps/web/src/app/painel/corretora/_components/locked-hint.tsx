import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRO_FEATURES, type ProFeatureKey } from "../_lib/plan-gate";

/**
 * Banner pra topo de telas Pro-only quando a corretora está no Gratuito.
 *
 * Tom: oportunidade, não erro. Mostra o nome amigável da feature,
 * descreve valor, e leva pra `/painel/corretora/assinatura`.
 *
 * Variant "subtle" pra ficar inline em blocos menores (ex.: dentro
 * de um dashboard que já tem outros KPIs visíveis).
 */
export function LockedHint({
  feature,
  variant = "banner",
  description,
}: {
  feature: ProFeatureKey | string;
  variant?: "banner" | "subtle";
  description?: string;
}) {
  const label =
    typeof feature === "string" && feature in PRO_FEATURES
      ? PRO_FEATURES[feature as ProFeatureKey]
      : feature;

  const defaultDesc =
    "Esta área faz parte do plano Premium. Você pode visualizar o que já existe; criar novos itens fica liberado depois do upgrade.";

  if (variant === "subtle") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/10 px-3 py-2 text-caption text-milsaca-cafezal">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="flex-1">
          <strong>{label}</strong> está disponível no plano Premium.{" "}
          <Link
            href="/painel/corretora/assinatura"
            className="rounded-sm font-semibold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver planos →
          </Link>
        </span>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border border-milsaca-dourado/40 bg-gradient-to-br from-milsaca-cream-claro/60 via-white to-milsaca-cream-claro/30 p-5 shadow-card sm:p-6",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-milsaca-dourado/15 blur-3xl"
      />
      <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-caption font-semibold uppercase tracking-[0.16em] text-milsaca-cafezal">
              Recurso do plano Premium
            </span>
          </div>
          <h3 className="text-h3 text-milsaca-cafezal">
            {label}
          </h3>
          <p className="text-body-sm leading-relaxed text-neutral-600">
            {description ?? defaultDesc}
          </p>
        </div>
        <Link
          href="/painel/corretora/assinatura"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-milsaca-dourado px-4 text-label font-semibold text-milsaca-preto shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_18px_-8px_rgba(201,169,97,0.5)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Liberar agora
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
