"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Inbox,
  Building2,
  Sprout,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Inbox;
  exact?: boolean;
};

// Itens visíveis na sidebar. "Usuários", "Produtores", "Leads" e
// "Auditoria" estão no roadmap (auditoria-admin-completa.md, Etapas 4-6)
// — adicionar aqui APENAS quando a rota correspondente existir.
const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/aprovacoes", label: "Aprovações", icon: Inbox },
  { href: "/admin/corretoras", label: "Corretoras", icon: Building2 },
  { href: "/admin/produtores", label: "Produtores", icon: Sprout },
  { href: "/admin/planos", label: "Planos", icon: Wallet },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: Receipt },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
];

export function AdminSidebar({
  adminName,
  adminEmail,
  pendentesCount,
}: {
  adminName: string;
  adminEmail: string;
  pendentesCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-dourado text-slate-900">
          <Shield className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <span className="block text-base font-semibold tracking-tight">
            Milsaca
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-milsaca-dourado">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const badge =
            item.href === "/admin/aprovacoes" && pendentesCount > 0
              ? pendentesCount
              : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-milsaca-dourado text-slate-900"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {badge != null ? (
                <span
                  className={cn(
                    "min-w-[1.25rem] rounded-full px-1.5 text-center text-[10px] font-semibold",
                    active
                      ? "bg-slate-900 text-milsaca-dourado"
                      : "bg-milsaca-dourado text-slate-900",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 px-5 py-4 text-xs">
        <p className="font-medium text-slate-100">{adminName}</p>
        <p className="mt-0.5 text-slate-400">{adminEmail}</p>
        <form action="/sair" method="post" className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
