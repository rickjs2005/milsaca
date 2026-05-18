"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  corretoraId: string;
  /** URL wa.me já pronta (fallback caso o endpoint falhe). */
  fallbackWaUrl: string;
  className?: string;
  source?: "catalogo_corretoras" | "perfil_corretora";
};

/**
 * Abre WhatsApp e registra o lead em paralelo.
 *
 * Janela é aberta no MESMO gesture do clique (sincrono) pra não cair
 * no popup blocker. O fetch roda fire-and-forget: se o endpoint
 * retornar uma URL mais precisa (com mensagem default do servidor),
 * usamos via window.location na aba aberta; senão, a aba já tem o
 * fallback.
 */
export function WhatsAppButton({
  corretoraId,
  fallbackWaUrl,
  className,
  source = "catalogo_corretoras",
}: Props) {
  function handleClick() {
    // 1. Abre imediatamente (sincrono — passa pelo popup blocker)
    const popup = window.open(fallbackWaUrl, "_blank", "noopener,noreferrer");

    // 2. Registra em background e atualiza a aba se URL vier diferente
    fetch("/api/leads/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corretora_id: corretoraId, source }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (popup && data?.wa_url && data.wa_url !== fallbackWaUrl) {
          try {
            popup.location.href = data.wa_url;
          } catch {
            // cross-origin block é esperado; aba já tem o fallback
          }
        }
      })
      .catch(() => {
        // silencioso — UX já está completa via fallback
      });
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      size="sm"
      className={className ?? "flex-1 bg-emerald-600 text-white hover:bg-emerald-700"}
    >
      <MessageCircle className="mr-1 h-3.5 w-3.5" />
      WhatsApp
    </Button>
  );
}
