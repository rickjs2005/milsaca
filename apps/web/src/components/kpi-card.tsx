import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "premium" | "info" | "warning" | "danger" | "success";

const ICON_TONE: Record<Tone, string> = {
  default: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  premium:
    "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40",
  info: "bg-info-50 text-info-700 ring-info-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  success: "bg-success-50 text-success-700 ring-success-100",
};

type Delta = {
  /** Valor numérico já formatado (ex.: "+12%", "-3.4%"). */
  label: string;
  direction: "up" | "down" | "flat";
  /** Texto pequeno explicando o período. Ex.: "vs. mês anterior". */
  hint?: string;
};

type Props = {
  /** Label curto (1-3 palavras). Ex.: "Receita estimada". */
  label: string;
  /** Valor principal — pode ser número ou string já formatada (R$ 12.4k). */
  value: React.ReactNode;
  /** Ícone Lucide na lateral. Opcional. */
  icon?: LucideIcon;
  /** Tom do ícone — `premium` (dourado) destaca KPIs principais. */
  tone?: Tone;
  /** Comparação com período anterior. */
  delta?: Delta;
  /** Texto auxiliar abaixo do valor (1 linha). */
  hint?: string;
  className?: string;
};

/**
 * Card de métrica padrão dos dashboards. Visual premium (sombra suave,
 * radius generoso, espaçamento Vercel-ish). Tom `premium` reserva o
 * dourado pros KPIs de maior importância (MRR, corretoras ativas).
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  delta,
  hint,
  className,
}: Props) {
  // KPI primário (premium) ganha realce dourado + número maior; os
  // secundários ficam visualmente mais leves pra criar hierarquia real.
  const isPremium = tone === "premium";
  return (
    <div
      className={cn(
        "group flex flex-col rounded-card border bg-white transition-shadow hover:shadow-card-hover",
        isPremium
          ? "gap-3 border-milsaca-dourado/30 p-card shadow-card ring-1 ring-inset ring-milsaca-dourado/15"
          : "gap-2 border-neutral-200 p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              isPremium ? "h-9 w-9" : "h-8 w-8",
              ICON_TONE[tone],
            )}
          >
            <Icon className={isPremium ? "h-[18px] w-[18px]" : "h-4 w-4"} />
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "font-semibold tracking-tight text-milsaca-preto",
            isPremium ? "text-h2" : "text-h3",
          )}
        >
          {value}
        </p>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-caption font-medium",
              delta.direction === "up" && "text-success-600",
              delta.direction === "down" && "text-danger-600",
              delta.direction === "flat" && "text-neutral-500",
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : delta.direction === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : null}
            {delta.label}
          </span>
        ) : null}
      </div>

      {hint || delta?.hint ? (
        <p className="text-caption text-neutral-500">{hint ?? delta?.hint}</p>
      ) : null}
    </div>
  );
}
