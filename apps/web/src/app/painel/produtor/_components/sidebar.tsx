"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  Home,
  TrendingUp,
  Handshake,
  FileText,
  Users,
  User,
  LogOut,
  Repeat,
  Truck,
  FileCheck2,
  Bell,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/painel/produtor", label: "Início", icon: Home, exact: true },
  { href: "/painel/produtor/cotacoes", label: "Cotações", icon: TrendingUp },
  { href: "/painel/produtor/negociacoes", label: "Negociações", icon: Handshake },
  { href: "/painel/produtor/contratos", label: "Contratos", icon: FileText },
  { href: "/painel/produtor/laudos", label: "Laudos", icon: FileCheck2 },
  { href: "/painel/produtor/entregas", label: "Entregas", icon: Truck },
  { href: "/painel/produtor/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/painel/produtor/notificacoes", label: "Notificações", icon: Bell },
  { href: "/painel/produtor/corretoras", label: "Corretoras", icon: Users },
  { href: "/painel/produtor/perfil", label: "Perfil", icon: User },
];

export function ProdutorSidebar({
  userEmail,
  showSwitcher,
}: {
  userEmail: string;
  showSwitcher: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-milsaca-cream-escuro bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-dourado">
          <Coffee className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-milsaca-verde">
          Milsaca
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-milsaca-verde text-milsaca-cream"
                  : "text-milsaca-verde-claro hover:bg-milsaca-cream-escuro hover:text-milsaca-verde",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-milsaca-cream-escuro p-3">
        <div className="mb-2 px-3 py-1">
          <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro/70">
            Produtor
          </p>
          <p className="truncate text-sm font-medium text-milsaca-verde" title={userEmail}>
            {userEmail}
          </p>
        </div>
        {showSwitcher && (
          <Link
            href="/painel/escolher"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-milsaca-verde-claro transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-verde"
          >
            <Repeat className="h-4 w-4" />
            Trocar painel
          </Link>
        )}
        <form action="/sair" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-milsaca-verde-claro transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-verde"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
