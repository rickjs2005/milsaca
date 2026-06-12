"use client";

import { useState, useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/lib/social/actions";

/**
 * Seguir/deixar de seguir com UI otimista (mesmo padrão do LikeButton).
 */
export function FollowButton({
  perfilId,
  seguindo,
  size = "sm",
}: {
  perfilId: string;
  seguindo: boolean;
  size?: "sm" | "default";
}) {
  const [sigo, setSigo] = useState(seguindo);
  const [, startTransition] = useTransition();

  function onClick() {
    const novo = !sigo;
    setSigo(novo);
    startTransition(() => toggleFollow(perfilId, novo));
  }

  return (
    <Button
      type="button"
      size={size}
      variant={sigo ? "outline" : "default"}
      onClick={onClick}
      className="gap-1.5"
    >
      {sigo ? (
        <>
          <UserMinus aria-hidden className="h-4 w-4" />
          Seguindo
        </>
      ) : (
        <>
          <UserPlus aria-hidden className="h-4 w-4" />
          Seguir
        </>
      )}
    </Button>
  );
}
