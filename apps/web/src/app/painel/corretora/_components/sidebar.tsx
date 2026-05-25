"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  Home,
  Handshake,
  FileText,
  Users,
  TrendingUp,
  User,
  LogOut,
  Repeat,
  Package,
  Truck,
  Building2,
  BarChart3,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarBadges } from "../_lib/dashboard";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Chave do badge — bate com o objeto badges. */
  badgeKey?: keyof SidebarBadges;
  /** Tom do badge quando > 0. */
  badgeTone?: "primary" | "warn";
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { href: "/painel/corretora", label: "Início", icon: Home, exact: true },
      {
        href: "/painel/corretora/leads",
        label: "Central de Leads",
        icon: Handshake,
        badgeKey: "leadsNovos",
        badgeTone: "primary",
      },
      {
        href: "/painel/corretora/leads-whatsapp",
        label: "Leads WhatsApp",
        icon: MessageCircle,
      },
      {
        href: "/painel/corretora/lotes",
        label: "Lotes de café",
        icon: Package,
        badgeKey: "lotesParados",
        badgeTone: "warn",
      },
      {
        href: "/painel/corretora/contratos",
        label: "Contratos",
        icon: FileText,
        badgeKey: "emNegociacao",
        badgeTone: "primary",
      },
      {
        href: "/painel/corretora/entregas",
        label: "Entregas",
        icon: Truck,
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      {
        href: "/painel/corretora/produtores",
        label: "Produtores",
        icon: Users,
      },
      {
        href: "/painel/corretora/compradores",
        label: "Compradores",
        icon: Building2,
      },
      {
        href: "/painel/corretora/cotacoes",
        label: "Cotações",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        href: "/painel/corretora/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Conta",
    items: [
      {
        href: "/painel/corretora/assinatura",
        label: "Assinatura",
        icon: Sparkles,
      },
      { href: "/painel/corretora/perfil", label: "Perfil", icon: User },
    ],
  },
];

const EMPTY_BADGES: SidebarBadges = {
  leadsNovos: 0,
  emNegociacao: 0,
  lotesParados: 0,
};

export function CorretoraSidebar({
  operatorName,
  operatorEmail,
  corretoraLabel,
  showSwitcher,
  badges,
}: {
  operatorName: string;
  operatorEmail: string;
  corretoraLabel: string | null;
  showSwitcher: boolean;
  badges?: SidebarBadges;
}) {
  const pathname = usePathname();
  const b = badges ?? EMPTY_BADGES;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-milsaca-cream-escuro bg-white">
      {/* Header com brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shadow-[0_4px_18px_-6px_rgba(201,169,97,0.5)]"
          style={{
            background:
              "linear-gradient(135deg, #C9A961 0%, #8a6d34 100%)",
          }}
        >
          <Coffee className="h-4 w-4 text-milsaca-cafezal" strokeWidth={2.5} />
        </span>
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight text-milsaca-verde">
            Milsaca
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-milsaca-verde-claro/70">
            Painel da corretora
          </p>
        </div>
      </div>

      {/* Nav agrupada */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-milsaca-verde-claro/60">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const count = item.badgeKey ? b[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-milsaca-verde text-milsaca-cream"
                      : "text-milsaca-verde-claro hover:bg-milsaca-cream-escuro hover:text-milsaca-verde",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                        active
                          ? "bg-milsaca-cream/20 text-milsaca-cream"
                          : item.badgeTone === "warn"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-milsaca-dourado/25 text-milsaca-cafezal",
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer com operador */}
      <div className="border-t border-milsaca-cream-escuro p-3">
        <div className="mb-2 px-3 py-1">
          <p
            className="truncate text-sm font-semibold text-milsaca-verde"
            title={corretoraLabel ?? "Corretora não vinculada"}
          >
            {corretoraLabel ?? "Corretora não vinculada"}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-milsaca-verde-claro/70">
            Operador
          </p>
          <p
            className="truncate text-xs text-milsaca-verde-claro"
            title={operatorEmail || operatorName}
          >
            {operatorName}
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
