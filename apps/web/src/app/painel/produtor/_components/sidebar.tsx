"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  Home,
  Handshake,
  MessagesSquare,
  User,
  LogOut,
  Repeat,
  Package,
  Wallet,
  Receipt,
  FolderOpen,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSupportLink } from "@/components/sidebar-support-link";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

// Menu enxuto, organizado pelos objetivos do produtor (não por features do
// sistema). Cotações/Corretoras são alcançadas pelo dashboard (cards + CTA);
// Entregas/Notificações ficam aninhadas nas áreas correspondentes.
const NAV_ITEMS: NavItem[] = [
  { href: "/painel/produtor", label: "Início", icon: Home, exact: true },
  { href: "/painel/produtor/laudos", label: "Meu Café", icon: Package },
  { href: "/painel/produtor/talhoes", label: "Minha lavoura", icon: MapPin },
  { href: "/painel/produtor/negociacoes", label: "Propostas", icon: Handshake },
  { href: "/painel/produtor/vendas", label: "Vendas", icon: Receipt },
  { href: "/painel/produtor/financeiro", label: "Financeiro", icon: Wallet },
  {
    href: "/painel/produtor/documentos",
    label: "Meus documentos",
    icon: FolderOpen,
  },
  {
    href: "/painel/produtor/comunidade",
    label: "Comunidade",
    icon: MessagesSquare,
  },
  { href: "/painel/produtor/perfil", label: "Perfil", icon: User },
];

export function ProdutorSidebar({
  producerName,
  producerEmail,
  fazendaNome,
  showSwitcher,
  support,
}: {
  producerName: string;
  producerEmail: string;
  fazendaNome: string | null;
  showSwitcher: boolean;
  support: { waHref: string | null; mailHref: string | null };
}) {
  const pathname = usePathname();

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
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset",
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
              <Icon
                aria-hidden
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? "text-milsaca-dourado"
                    : "text-milsaca-cream/60 group-hover:text-milsaca-cream",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer com produtor */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 py-1">
          <p
            className="truncate text-body-sm font-semibold text-milsaca-cream"
            title={producerEmail || producerName}
          >
            {producerName}
          </p>
          {fazendaNome ? (
            <p
              className="mt-1 truncate text-caption text-milsaca-cream/55"
              title={fazendaNome}
            >
              {fazendaNome}
            </p>
          ) : (
            <p className="mt-1 text-caption uppercase tracking-wider text-milsaca-cream/45">
              Produtor
            </p>
          )}
        </div>
        {showSwitcher && (
          <Link
            href="/painel/escolher"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-milsaca-cream/65 transition-colors hover:bg-white/5 hover:text-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset"
          >
            <Repeat aria-hidden className="h-4 w-4" />
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
            <LogOut aria-hidden className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
