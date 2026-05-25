"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão de copiar URL pra clipboard. Feedback visual (checkmark) por 2s.
 *
 * Fallback: alguns browsers + iframes bloqueiam `navigator.clipboard`.
 * Nesse caso o catch só deixa o estado neutro, sem alert nem toast —
 * usuário pode copiar manualmente da URL exibida ao lado.
 */
export function CopyLinkButton({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silencioso — UI já mostra a URL ao lado pra cópia manual.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors",
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-milsaca-cream-escuro text-milsaca-cafezal hover:bg-milsaca-cream-escuro/40",
        className,
      )}
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copiar link
        </>
      )}
    </button>
  );
}
