import type { LucideIcon } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";

// O KpiCard não exporta seu tipo `Tone`, então reaproveitamos aqui o
// mesmo union de strings pra manter a tipagem alinhada.
type Tone = "default" | "premium" | "info" | "warning" | "danger" | "success";

/**
 * Formata um valor EM REAIS (não centavos) como BRL.
 *
 * - `compact = false` (padrão): BRL cheio sem casas decimais. Ex.: "R$ 634.000".
 * - `compact = true`: notação curta pra valores grandes. Ex.: "R$ 634 mil", "R$ 1,2 mi".
 */
function formatBRLValue(value: number, compact?: boolean): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }),
  }).format(value);
}

type Props = {
  /** Label curto (1-3 palavras). Ex.: "Receita estimada". */
  label: string;
  /** Valor principal em REAIS (não centavos). Ex.: 634000. */
  value: number;
  /** Ícone Lucide na lateral. Opcional. */
  icon?: LucideIcon;
  /** Tom do ícone — `premium` (dourado) destaca KPIs principais. */
  tone?: Tone;
  /** Texto auxiliar abaixo do valor (1 linha). */
  hint?: string;
  /** Usa notação curta pra valores grandes (ex.: "R$ 634 mil"). */
  compact?: boolean;
  className?: string;
};

/**
 * Wrapper fino sobre o `KpiCard` que formata o valor em BRL.
 * Recebe um número em reais e cuida da formatação monetária, repassando
 * o resto das props pro KpiCard.
 */
export function KpiMoneyCard({
  label,
  value,
  icon,
  tone,
  hint,
  compact,
  className,
}: Props) {
  return (
    <KpiCard
      label={label}
      value={formatBRLValue(value, compact)}
      icon={icon}
      tone={tone}
      hint={hint}
      className={className}
    />
  );
}
