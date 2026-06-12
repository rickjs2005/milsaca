"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLike } from "@/lib/social/actions";

/**
 * Curtir com UI otimista: o coração e o contador respondem na hora; a
 * server action persiste e revalida em background. Estado local é a
 * verdade até a próxima renderização server.
 */
export function LikeButton({
  postId,
  liked,
  count,
}: {
  postId: string;
  liked: boolean;
  count: number;
}) {
  const [curtido, setCurtido] = useState(liked);
  const [total, setTotal] = useState(count);
  const [, startTransition] = useTransition();

  function onClick() {
    const novo = !curtido;
    setCurtido(novo);
    setTotal((t) => Math.max(0, t + (novo ? 1 : -1)));
    startTransition(() => toggleLike(postId, novo));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={curtido}
      aria-label={curtido ? "Descurtir" : "Curtir"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        curtido
          ? "text-danger-600 hover:bg-danger-50"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-milsaca-cafezal",
      )}
    >
      <Heart
        aria-hidden
        className={cn("h-4 w-4", curtido && "fill-danger-500 text-danger-500")}
      />
      {total}
    </button>
  );
}
