import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "premium" | "info" | "warning" | "danger" | "success";

const ICON_TONE: Record<Tone, string> = {
  default: "bg-slate-100 text-slate-600 ring-slate-200",
  premium:
    "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
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
  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              ICON_TONE[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-milsaca-preto">
          {value}
        </p>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta.direction === "up" && "text-emerald-600",
              delta.direction === "down" && "text-rose-600",
              delta.direction === "flat" && "text-slate-500",
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
        <p className="text-xs text-slate-500">{hint ?? delta?.hint}</p>
      ) : null}
    </div>
  );
}
