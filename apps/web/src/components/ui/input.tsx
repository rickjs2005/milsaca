import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Classes base do controle de formulário Milsaca (Input / Select nativo).
 * Exportado pra que `Select` e selects estilizados reusem exatamente os
 * mesmos tokens de altura/borda/foco/estado.
 *
 * Estados cobertos:
 *   - foco: ring dourado (`ring-ring` já é #C9A961) com offset.
 *   - erro: via `aria-invalid` → borda + ring `danger-500`.
 *   - disabled: opacidade reduzida + cursor bloqueado.
 *   - altura touch-friendly: h-11 no mobile, h-10 a partir de sm (desktop).
 */
export const inputBaseClassName = cn(
  "flex h-11 w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 sm:h-10",
  "ring-offset-background placeholder:text-neutral-400",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus-visible:ring-danger-500",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(inputBaseClassName, className)}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
