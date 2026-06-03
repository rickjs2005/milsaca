"use client";

import { Check, Copy, Link2, MessageCircle, Lightbulb } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

/**
 * Copiar link + mensagem pronta + abrir no WhatsApp. Sem disparo automático
 * (Milsaca não tem WhatsApp Business API) — a corretora envia pela lista de
 * transmissão do próprio WhatsApp dela.
 */
export function ConviteProdutores({
  link,
  message,
}: {
  link: string;
  message: string;
}) {
  const linkCopy = useCopyToClipboard();
  const msgCopy = useCopyToClipboard();
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-5">
      {/* Link */}
      <section className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
        <h2 className="flex items-center gap-2 text-label text-milsaca-cafezal">
          <Link2 className="h-4 w-4" /> Seu link de convite
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-body-sm text-milsaca-preto">
            {link}
          </code>
          <button
            type="button"
            onClick={() => void linkCopy.copy(link)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-body-sm font-semibold transition-colors",
              linkCopy.copied
                ? "border-success-100 bg-success-50 text-success-700"
                : "border-milsaca-cream-escuro text-milsaca-cafezal hover:bg-milsaca-cream-escuro/40",
            )}
            aria-live="polite"
          >
            {linkCopy.copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar link
              </>
            )}
          </button>
        </div>
      </section>

      {/* Mensagem pronta */}
      <section className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
        <h2 className="flex items-center gap-2 text-label text-milsaca-cafezal">
          <MessageCircle className="h-4 w-4" /> Mensagem pronta
        </h2>
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-body-sm text-milsaca-preto">
          {message}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void msgCopy.copy(message)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-body-sm font-semibold transition-colors",
              msgCopy.copied
                ? "border-success-100 bg-success-50 text-success-700"
                : "border-milsaca-cream-escuro text-milsaca-cafezal hover:bg-milsaca-cream-escuro/40",
            )}
            aria-live="polite"
          >
            {msgCopy.copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar mensagem
              </>
            )}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-body-sm font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-cafezal/90"
          >
            <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
          </a>
        </div>
      </section>

      {/* Dica de envio em massa */}
      <div className="flex items-start gap-2 rounded-card border border-milsaca-dourado/30 bg-milsaca-cream-claro/50 p-card text-body-sm text-milsaca-cafezal">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-dourado-texto" />
        <p>
          <strong>Pra mandar pra muitos de uma vez:</strong> copie a mensagem,
          abra o WhatsApp → <em>Nova transmissão</em>, selecione seus contatos de
          produtores e cole. Todos recebem como mensagem individual sua.
        </p>
      </div>
    </div>
  );
}
