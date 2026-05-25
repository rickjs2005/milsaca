"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Botão de submit dourado (Ouro Champanhe) do /admin/login.
 *
 * Por que não usar o <SubmitButton> compartilhado:
 *   o SubmitButton herda do shadcn Button, que aplica bg-primary via cva.
 *   Em testes, classes Tailwind com arbitrary values (bg-[#C9A961]) não
 *   sobrescrevem com confiabilidade no JIT do Turbopack — o resultado é
 *   um botão "apagado" sem cor. Aqui usamos style inline pra garantir
 *   que a cor de marca seja sempre aplicada, indiferente ao build mode.
 *
 * Mantém o mesmo contrato: useFormStatus pra desabilitar enquanto pending
 * e mostrar spinner com texto "Entrando...".
 */
export function GoldenSubmitButton({
  children,
  pendingLabel = "Entrando...",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        backgroundColor: "#C9A961",
        color: "#1A1A1A",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 24px -8px rgba(201,169,97,0.45)",
      }}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold tracking-tight outline-none transition-all duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-4 focus-visible:ring-[#C9A961]/35"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
