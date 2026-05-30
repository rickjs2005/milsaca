import * as React from "react";
import { cn } from "./cn";

type Variant = "default" | "verde" | "dourado" | "outline";

// As variantes já usam tokens de marca (milsaca-*), não cores cruas.
// API/variantes preservadas por retrocompat. Mapa separado da lógica.
const variantClasses: Record<Variant, string> = {
  default: "bg-milsaca-cream-escuro text-milsaca-verde",
  verde: "bg-milsaca-verde text-milsaca-cream",
  dourado: "bg-milsaca-dourado text-milsaca-verde",
  outline: "border border-milsaca-verde text-milsaca-verde",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
