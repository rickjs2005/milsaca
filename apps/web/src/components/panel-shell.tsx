"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Coffee, LogOut, Menu, X } from "lucide-react";

type Props = {
  /** A sidebar do painel (renderizada no desktop e dentro do drawer mobile). */
  sidebar: React.ReactNode;
  /** Rótulo curto no header mobile ("Corretora" | "Produtor"). */
  brandLabel: string;
  children: React.ReactNode;
};

/**
 * Casco responsivo dos painéis (corretora/produtor). Espelha o AdminShell:
 *   - lg+: sidebar fixa lateral (escondida no mobile).
 *   - <lg: header com hambúrguer que abre a MESMA sidebar num drawer overlay.
 * Fecha o drawer ao trocar de rota e trava o scroll do body quando aberto.
 */
export function PanelShell({ sidebar, brandLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Trava o scroll do body enquanto o drawer está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden bg-milsaca-cream">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Overlay do drawer (mobile) */}
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-milsaca-cafezal/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Drawer (mobile) */}
      <div
        className={
          "fixed inset-y-0 left-0 z-50 transform transition-transform lg:hidden " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="relative">
          {sidebar}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="absolute right-3 top-3 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile (<lg) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-milsaca-cream-escuro bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1.5 text-milsaca-cafezal transition-colors hover:bg-milsaca-cream-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #C9A961 0%, #8a6d34 100%)" }}
            >
              <Coffee className="h-3.5 w-3.5 text-milsaca-cafezal" strokeWidth={2.5} />
            </span>
            <span className="text-body-sm font-semibold text-milsaca-cafezal">
              Milsaca{" "}
              <span className="font-normal text-neutral-500">
                · {brandLabel}
              </span>
            </span>
          </div>
          <form action="/sair" method="post">
            <button
              type="submit"
              aria-label="Sair da sessão"
              className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
