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
  MessageCircle,
  Lock,
  LogOut,
  Cpu,
  Filter,
  MessageSquare,
  ListChecks,
  Settings,
  Store,
  ShieldAlert,
  Users,
  TrendingUp,
  Leaf,
  FileSignature,
  Coffee,
  MapPin,
  Database,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  /** Label da seção (eyebrow uppercase). null = sem rótulo. */
  label: string | null;
  items: NavItem[];
};

// Menu organizado por seção semântica — facilita scanear o admin em
// uso diário e prepara terreno pra módulos futuros (EUDR, Fiscal,
// Contratos, Usuários, Configurações) sem reorganizar nada.
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/aprovacoes", label: "Aprovações", icon: Inbox },
      { href: "/admin/corretoras-espera", label: "Espera de corretora", icon: Hourglass },
      { href: "/admin/corretoras", label: "Corretoras", icon: Building2 },
      { href: "/admin/produtores", label: "Produtores", icon: Sprout },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/admin/leads", label: "Leads WhatsApp", icon: MessageCircle },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { href: "/admin/automacoes", label: "Automações", icon: Cpu },
      { href: "/admin/regras-leads", label: "Regras de leads", icon: Filter },
      { href: "/admin/comunicacao", label: "Comunicação", icon: MessageSquare },
      { href: "/admin/fila-eventos", label: "Fila & Eventos", icon: ListChecks },
      { href: "/admin/lead-waitlist", label: "Lista de espera", icon: Users },
      { href: "/admin/marketplace", label: "Marketplace", icon: Store },
      { href: "/admin/moderacao", label: "Moderação", icon: ShieldAlert },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/admin/planos", label: "Planos", icon: Wallet },
      { href: "/admin/assinaturas", label: "Assinaturas", icon: Receipt },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/admin/cotacoes", label: "Cotações", icon: TrendingUp },
      { href: "/admin/cotacoes/tipos", label: "Tipos de café", icon: Coffee },
      { href: "/admin/cotacoes/pracas", label: "Praças", icon: MapPin },
      { href: "/admin/cotacoes/fontes", label: "Fontes", icon: Database },
      { href: "/admin/eudr", label: "EUDR", icon: Leaf },
      { href: "/admin/fiscal", label: "Fiscal", icon: FileSignature },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/metricas", label: "Métricas", icon: BarChart3 },
      { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
    ],
  },
  {
    label: "Configuração",
    items: [
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { href: "/admin/seguranca", label: "Segurança", icon: Lock },
    ],
  },
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
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-milsaca-cafezal/40 bg-milsaca-cafezal text-milsaca-cream">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-dourado text-milsaca-cafezal shadow-card">
          <Shield className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <span className="block text-base font-semibold tracking-tight text-milsaca-cream">
            Milsaca
          </span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-milsaca-dourado">
            Admin
          </span>
        </div>
      </div>

      {/* Nav scroll area */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={group.label ?? `group-${gIdx}`} className={gIdx > 0 ? "mt-5" : ""}>
            {group.label ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-milsaca-cream/50">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const badge =
                  item.href === "/admin/aprovacoes" && pendentesCount > 0
                    ? pendentesCount
                    : null;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-milsaca-dourado text-milsaca-cafezal shadow-card"
                          : "text-milsaca-cream/85 hover:bg-milsaca-folha/70 hover:text-white",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          !active && "text-milsaca-cream/60 group-hover:text-white",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {badge != null ? (
                        <span
                          aria-label={`${badge} pendentes`}
                          className={cn(
                            "inline-flex min-w-[1.25rem] items-center justify-center rounded-pill px-1.5 text-[10px] font-semibold",
                            active
                              ? "bg-milsaca-cafezal text-milsaca-dourado"
                              : "bg-milsaca-dourado text-milsaca-cafezal",
                          )}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer perfil + logout */}
      <div className="mt-auto border-t border-milsaca-cream/10 px-5 py-4 text-xs">
        <p className="font-medium text-milsaca-cream">{adminName}</p>
        <p className="mt-0.5 text-milsaca-cream/60">{adminEmail}</p>
        <form action="/sair" method="post" className="mt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-milsaca-cream/75 transition-colors hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
