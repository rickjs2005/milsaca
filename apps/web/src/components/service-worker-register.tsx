"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (só em produção, escopado ao painel do produtor)
 * pra resiliência de campo: offline mostra o último estado salvo em vez de tela
 * branca. Em dev não registra (evita cache atrapalhar o desenvolvimento).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/painel/produtor" })
        .catch(() => {
          /* best-effort: sem SW, o app segue normal (só sem offline). */
        });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
