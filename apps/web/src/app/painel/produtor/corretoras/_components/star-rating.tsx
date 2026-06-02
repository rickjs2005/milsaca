import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { avaliarCorretora, removerAvaliacao } from "../_actions";

/**
 * Widget de avaliação (1-5 estrelas) — form com server action, sem JS no
 * cliente. Só é renderizado pelo catálogo quando o produtor já negociou com
 * a corretora (gate de "avaliação verificada", reforçado pela RLS).
 */
export function StarRating({
  corretoraId,
  current,
}: {
  corretoraId: string;
  current: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={avaliarCorretora} className="flex items-center">
        <input type="hidden" name="corretora_id" value={corretoraId} />
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="submit"
            name="rating"
            value={n}
            title={`Dar ${n} estrela${n === 1 ? "" : "s"}`}
            aria-label={`Dar ${n} estrela${n === 1 ? "" : "s"}`}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "h-4 w-4",
                current != null && n <= current
                  ? "fill-milsaca-dourado text-milsaca-dourado"
                  : "fill-none text-neutral-300 hover:text-milsaca-dourado",
              )}
            />
          </button>
        ))}
      </form>
      {current != null ? (
        <form action={removerAvaliacao}>
          <input type="hidden" name="corretora_id" value={corretoraId} />
          <button
            type="submit"
            className="text-caption text-neutral-400 transition-colors hover:text-neutral-600 hover:underline"
          >
            limpar
          </button>
        </form>
      ) : null}
    </div>
  );
}
