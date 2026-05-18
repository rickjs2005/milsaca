"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Shield, X } from "lucide-react";
import { AdminSidebar } from "./sidebar";

type Props = {
  adminName: string;
  adminEmail: string;
  pendentesCount: number;
  children: React.ReactNode;
};

/**
 * Casco do admin com sidebar responsiva.
 *   - lg+: sidebar fixa lateral 256px
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
    <div className="flex min-h-screen bg-slate-50">
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
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
            className="absolute right-3 top-3 rounded-md p-1 text-slate-300 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-dourado text-slate-900">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-slate-900">
              Milsaca Admin
            </span>
          </div>
          <div className="w-7" />
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
