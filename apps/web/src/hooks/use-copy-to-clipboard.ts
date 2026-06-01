"use client";

// useCopyToClipboard — copia texto pro clipboard com feedback visual temporário
// (`copied` vira true e volta pra false depois de `resetMs`). Encapsula o par
// `navigator.clipboard.writeText` + `setTimeout(() => setCopied(false), ms)` que
// estava reimplementado em copy-link-button e invite-link-card.
//
// O motivo de existir: as cópias soltas não limpavam o timer. Se o componente
// desmontasse dentro da janela de reset, o `setCopied(false)` disparava após o
// unmount (warning de setState em componente desmontado). Aqui o id do timer
// vive num ref, é limpo no cleanup do useEffect e antes de cada novo agendamento.
//
// `writeText` que falha (browser/iframe sem permissão de clipboard) não marca
// `copied` — o catch deixa o estado neutro, igual ao comportamento antigo.

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copia texto pro clipboard com feedback `copied` que se auto-reseta.
 * @param resetMs tempo (ms) até `copied` voltar a false. Default 2000.
 */
export function useCopyToClipboard(resetMs = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        // Silencioso — alguns browsers/iframes bloqueiam clipboard sem HTTPS.
        // Não marca `copied`; a UI segue mostrando a URL pra cópia manual.
      }
    },
    [resetMs],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { copied, copy };
}
