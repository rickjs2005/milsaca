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
  MessagesSquare,
  User,
  LogOut,
  Repeat,
  Package,
  FlaskConical,
  Truck,
  Wallet,
  Store,
  Building2,
  BarChart3,
  Sparkles,
  CheckSquare,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSupportLink } from "@/components/sidebar-support-link";
import { ThemeToggle } from "@/components/theme-toggle";
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
  /** Só o dono vê (Pagamentos, Assinatura, Equipe). Operador não. */
  ownerOnly?: boolean;
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
        href: "/painel/corretora/tarefas",
        label: "Tarefas",
        icon: CheckSquare,
        badgeKey: "acoesPendentes",
        badgeTone: "warn",
      },
      {
        href: "/painel/corretora/agenda",
        label: "Agenda",
        icon: CalendarDays,
      },
      {
        href: "/painel/corretora/leads",
        label: "Central de Leads",
        icon: Handshake,
        badgeKey: "leadsNovos",
        badgeTone: "primary",
      },
      {
        href: "/painel/corretora/lotes",
        label: "Lotes de café",
        icon: Package,
        badgeKey: "lotesParados",
        badgeTone: "warn",
      },
      {
        href: "/painel/corretora/amostras",
        label: "Amostras",
        icon: FlaskConical,
      },
      {
        href: "/painel/corretora/ofertas",
        label: "Oferta ao Comprador",
        icon: Store,
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
      {
        href: "/painel/corretora/pagamentos",
        label: "Pagamento ao Produtor",
        icon: Wallet,
        ownerOnly: true,
      },
    ],
  },
  {
    title: "Mercado",
    items: [
      {
        href: "/painel/corretora/cotacoes",
        label: "Cotações",
        icon: TrendingUp,
      },
      {
        href: "/painel/corretora/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
      {
        href: "/painel/corretora/comunidade",
        label: "Comunidade",
        icon: MessagesSquare,
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
    ],
  },
  {
    title: "Conta",
    items: [
      {
        href: "/painel/corretora/assinatura",
        label: "Assinatura",
        icon: Sparkles,
        ownerOnly: true,
      },
      {
        href: "/painel/corretora/equipe",
        label: "Equipe",
        icon: Users,
        ownerOnly: true,
      },
      { href: "/painel/corretora/perfil", label: "Perfil", icon: User },
    ],
  },
];

const EMPTY_BADGES: SidebarBadges = {
  leadsNovos: 0,
  emNegociacao: 0,
  lotesParados: 0,
  acoesPendentes: 0,
};

export function CorretoraSidebar({
  operatorName,
  operatorEmail,
  corretoraLabel,
  showSwitcher,
  badges,
  isDono = true,
  support,
}: {
  operatorName: string;
  operatorEmail: string;
  corretoraLabel: string | null;
  showSwitcher: boolean;
  badges?: SidebarBadges;
  /** Dono vê tudo; operador não vê Pagamentos/Assinatura/Equipe. */
  isDono?: boolean;
  support: { waHref: string | null; mailHref: string | null };
}) {
  const pathname = usePathname();
  const b = badges ?? EMPTY_BADGES;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-milsaca-cafezal text-milsaca-cream">
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
          <p className="text-body font-semibold tracking-tight text-milsaca-cream">
            Milsaca
          </p>
          <p className="text-caption uppercase tracking-[0.18em] text-milsaca-cream/55">
            Painel da corretora
          </p>
        </div>
      </div>

      {/* Nav agrupada */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((it) => !it.ownerOnly || isDono);
          if (items.length === 0) return null;
          return (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-caption font-semibold uppercase tracking-[0.16em] text-milsaca-cream/45">
              {group.title}
            </p>
            {items.map((item) => {
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center justify-between gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset",
                    active
                      ? "bg-white/10 text-milsaca-cream"
                      : "text-milsaca-cream/65 hover:bg-white/5 hover:text-milsaca-cream",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-milsaca-dourado"
                    />
                  ) : null}
                  <span className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-milsaca-dourado"
                          : "text-milsaca-cream/60 group-hover:text-milsaca-cream",
                      )}
                    />
                    {item.label}
                  </span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill px-1.5 text-caption font-semibold",
                        item.badgeTone === "warn"
                          ? "bg-warning-500 text-white"
                          : "bg-milsaca-dourado text-milsaca-cafezal",
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Footer com operador */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 py-1">
          <p
            className="truncate text-body-sm font-semibold text-milsaca-cream"
            title={corretoraLabel ?? "Corretora não vinculada"}
          >
            {corretoraLabel ?? "Corretora não vinculada"}
          </p>
          <p className="mt-1 text-caption uppercase tracking-wider text-milsaca-cream/45">
            {isDono ? "Dono" : "Operador"}
          </p>
          <p
            className="truncate text-caption text-milsaca-cream/55"
            title={operatorEmail || operatorName}
          >
            {operatorName}
          </p>
        </div>
        {showSwitcher && (
          <Link
            href="/painel/escolher"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-milsaca-cream/65 transition-colors hover:bg-white/5 hover:text-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset"
          >
            <Repeat className="h-4 w-4" />
            Trocar painel
          </Link>
        )}
        <ThemeToggle surface="dark" compact className="mb-2 px-3" />
        <SidebarSupportLink waHref={support.waHref} mailHref={support.mailHref} />
        <form action="/sair" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-milsaca-cream/65 transition-colors hover:bg-white/5 hover:text-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
