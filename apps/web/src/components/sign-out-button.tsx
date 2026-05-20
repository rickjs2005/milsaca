"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  children: React.ReactNode;
  className?: string;
  /** Pra onde mandar após o logout. Default: /entrar */
  redirectTo?: string;
};

/**
 * Logout via POST /sair sem form aninhado.
 *
 * Por que existe: várias telas (onboarding, mfa) precisam de um botão
 * "Sair" dentro de um form principal de submit. Form aninhado em HTML é
 * inválido. Então fazemos fetch POST direto pra /sair e redirecionamos
 * client-side. Mantém a invariante "logout só por POST" pra evitar
 * prefetch acidental queimar a sessão.
 */
export function SignOutButton({
  children,
  className,
  redirectTo = "/entrar",
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/sair", { method: "POST", redirect: "manual" });
        } catch {
          // ignore — local network falha, ainda assim levamos pra tela de login
        }
        window.location.assign(redirectTo);
      }}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
