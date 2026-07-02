import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CTA = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
};

type Props = {
  /** Ícone Lucide pra ilustrar o estado. Sem ícone = layout texto-only. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Ação primária (Link interno). */
  cta?: CTA;
  /** Ação secundária (texto link). */
  secondaryCta?: CTA;
  /** Visual mais compacto pra usar dentro de cards/tabelas. */
  compact?: boolean;
  className?: string;
};

/**
 * Substitui strings inline "Nenhum X encontrado". Padrão:
 *   - ícone em chip dourado
 *   - título curto (4-6 palavras)
 *   - descrição honesta (~12-20 palavras)
 *   - CTA explícito quando aplicável
 *
 * Microcopy diretriz:
 *   - Não use "Sem dados", "Clique aqui", "Erro".
 *   - Prefira "Você ainda não...", "Crie o primeiro X pra...".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  secondaryCta,
  compact,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-14",
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-full bg-milsaca-dourado/10 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30",
            compact ? "h-10 w-10" : "h-14 w-14",
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </span>
      ) : null}

      <h3
        className={cn(
          "font-semibold text-milsaca-cafezal",
          compact ? "text-sm" : "text-base",
        )}
      >
        {title}
      </h3>

      {description ? (
        <p
          className={cn(
            "max-w-md text-neutral-500",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}

      {cta || secondaryCta ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {cta ? (
            <Link
              href={cta.href}
              className={cn(
                "inline-flex items-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                (cta.variant ?? "primary") === "primary"
                  ? "bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
                  : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50",
              )}
            >
              {cta.label}
            </Link>
          ) : null}
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="text-sm font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
