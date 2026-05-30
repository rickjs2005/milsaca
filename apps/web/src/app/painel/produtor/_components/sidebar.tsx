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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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
  producerName,
  producerEmail,
  fazendaNome,
  showSwitcher,
}: {
  producerName: string;
  producerEmail: string;
  fazendaNome: string | null;
  showSwitcher: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-milsaca-cream-escuro bg-white">
      {/* Header com brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shadow-[0_4px_18px_-6px_rgba(201,169,97,0.5)]"
          style={{
            background: "linear-gradient(135deg, #C9A961 0%, #8a6d34 100%)",
          }}
        >
          <Coffee className="h-4 w-4 text-milsaca-cafezal" strokeWidth={2.5} />
        </span>
        <div className="leading-tight">
          <p className="text-body font-semibold tracking-tight text-milsaca-cafezal">
            Milsaca
          </p>
          <p className="text-caption uppercase tracking-[0.18em] text-neutral-500">
            Painel do produtor
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                active
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "text-neutral-600 hover:bg-milsaca-cream-escuro hover:text-milsaca-cafezal",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer com produtor */}
      <div className="border-t border-milsaca-cream-escuro p-3">
        <div className="mb-2 px-3 py-1">
          <p
            className="truncate text-body-sm font-semibold text-milsaca-cafezal"
            title={producerEmail || producerName}
          >
            {producerName}
          </p>
          {fazendaNome ? (
            <p
              className="mt-1 truncate text-caption text-neutral-600"
              title={fazendaNome}
            >
              {fazendaNome}
            </p>
          ) : (
            <p className="mt-1 text-caption uppercase tracking-wider text-neutral-500">
              Produtor
            </p>
          )}
        </div>
        {showSwitcher && (
          <Link
            href="/painel/escolher"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-neutral-600 transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Repeat className="h-4 w-4" />
            Trocar painel
          </Link>
        )}
        <form action="/sair" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-neutral-600 transition-colors hover:bg-milsaca-cream-escuro hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
