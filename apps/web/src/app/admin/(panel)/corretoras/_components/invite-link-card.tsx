"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/**
 * Card mostrado após gerar um convite. Recebe a URL pronta e oferece
 * botões pra copiar, abrir e mandar via WhatsApp.
 */
export function InviteLinkCard({
  inviteUrl,
  corretoraName,
  whatsappPrefill,
}: {
  inviteUrl: string;
  corretoraName: string;
  whatsappPrefill?: string;
}) {
  const { copied, copy } = useCopyToClipboard(2500);

  const onCopy = () => {
    void copy(inviteUrl);
  };

  const waText = encodeURIComponent(
    whatsappPrefill ??
      `Olá! Aqui é da Milsaca. Esse é o link pra você criar sua conta como corretora "${corretoraName}": ${inviteUrl}\n\nO link expira em 7 dias.`,
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  return (
    <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
        Link de convite gerado
      </p>
      <p className="mt-1 text-sm text-emerald-900">
        Compartilhe esse link com o dono da{" "}
        <strong>{corretoraName}</strong>. Ele expira em 7 dias e só pode ser
        usado uma vez.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded bg-white px-3 py-2 font-mono text-xs text-slate-800 ring-1 ring-inset ring-slate-200">
          {inviteUrl}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}
