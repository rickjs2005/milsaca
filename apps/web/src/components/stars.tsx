import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estrelas read-only com média + contagem de avaliações.
 * Não renderiza nada quando não há avaliação (count = 0) — evita "0 estrelas".
 */
export function StarsDisplay({
  value,
  count,
  size = "sm",
  tone = "light",
}: {
  value: number | null;
  count: number;
  size?: "sm" | "md";
  /** "dark" = texto claro pra fundo escuro (ex.: header cafezal). */
  tone?: "light" | "dark";
}) {
  if (!count || value == null) return null;
  const rounded = Math.round(value);
  const starCls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const emptyStar = tone === "dark" ? "text-milsaca-cream/30" : "text-neutral-300";
  const numberCls =
    tone === "dark" ? "text-milsaca-cream" : "text-milsaca-cafezal";
  const countCls =
    tone === "dark" ? "text-milsaca-cream/70" : "text-neutral-500";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              starCls,
              n <= rounded
                ? "fill-milsaca-dourado text-milsaca-dourado"
                : cn("fill-none", emptyStar),
            )}
          />
        ))}
      </span>
      <span className={cn("text-body-sm font-semibold", numberCls)}>
        {value.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}
      </span>
      <span className={cn("text-caption", countCls)}>
        ({count} avaliaç{count === 1 ? "ão" : "ões"})
      </span>
    </span>
  );
}
