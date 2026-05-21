"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { AdminSidebar } from "./sidebar";
import { AdminTopbar } from "./admin-topbar";

type Props = {
  adminName: string;
  adminEmail: string;
  pendentesCount: number;
  children: React.ReactNode;
};

/**
 * Casco do admin com sidebar responsiva + topbar desktop.
 *   - lg+: sidebar fixa lateral 256px + AdminTopbar com breadcrumb/perfil
 *   - <lg: header com hamburger que abre drawer overlay
 *
 * Fecha o drawer automaticamente quando muda de rota (navegação).
 */
export function AdminShell({
  adminName,
  adminEmail,
  pendentesCount,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha drawer ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Trava scroll do body quando drawer aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-milsaca-cream">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AdminSidebar
          adminName={adminName}
          adminEmail={adminEmail}
          pendentesCount={pendentesCount}
        />
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-milsaca-cafezal/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={
          "fixed inset-y-0 left-0 z-50 transform transition-transform lg:hidden " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="relative">
          <AdminSidebar
            adminName={adminName}
            adminEmail={adminEmail}
            pendentesCount={pendentesCount}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="absolute right-3 top-3 rounded-md p-1 text-milsaca-cream/80 hover:bg-milsaca-folha/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar (lg+) */}
        <AdminTopbar adminName={adminName} adminEmail={adminEmail} />

        {/* Mobile topbar (<lg) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-dourado text-milsaca-cafezal">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-milsaca-cafezal">
              Milsaca Admin
            </span>
          </div>
          <form action="/sair" method="post">
            <button
              type="submit"
              aria-label="Sair da sessão"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-milsaca-cafezal"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
