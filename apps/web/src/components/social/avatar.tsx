import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-8 w-8 text-caption", px: 32 },
  md: { box: "h-10 w-10 text-body-sm", px: 40 },
  lg: { box: "h-16 w-16 text-h3", px: 64 },
} as const;

/**
 * Avatar circular da Comunidade — foto quando há `avatarUrl`, senão as
 * iniciais do nome em chip dourado (mesma linguagem do EmptyState).
 */
export function SocialAvatar({
  nome,
  avatarUrl,
  size = "md",
  className,
}: {
  nome: string;
  avatarUrl: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={nome}
        width={s.px}
        height={s.px}
        className={cn("shrink-0 rounded-full object-cover", s.box, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 font-semibold text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30",
        s.box,
        className,
      )}
    >
      {iniciais || "?"}
    </span>
  );
}
