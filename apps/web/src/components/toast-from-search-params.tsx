"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Lê `?ok=` / `?error=` / `?saved=` do URL atual, dispara o toast
 * correspondente e remove o param (sem deixar refresh re-disparar).
 *
 * Convenção:
 *   - ok=<msg>      → toast.success(msg)
 *   - error=<msg>   → toast.error(msg)
 *   - saved=1       → toast.success("Alterações salvas")
 *
 * Monte uma vez por área (admin, painel corretora, painel produtor) —
 * funciona pra qualquer página filha porque escuta `useSearchParams`.
 */
export function ToastFromSearchParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;

    const ok = params.get("ok");
    const error = params.get("error");
    const saved = params.get("saved");

    if (!ok && !error && !saved) return;

    consumed.current = true;

    if (error) toast.error(error);
    else if (ok) toast.success(ok);
    else if (saved) toast.success("Alterações salvas");

    // Limpa o param sem entrar no histórico
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    next.delete("saved");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}
