"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Handshake,
  Wallet,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

// Mesmos 5 destinos da sidebar — navegação primária no celular (estilo app).
const ITEMS: Item[] = [
  { href: "/painel/produtor", label: "Início", icon: Home, exact: true },
  { href: "/painel/produtor/laudos", label: "Sacas", icon: Package },
  { href: "/painel/produtor/negociacoes", label: "Propostas", icon: Handshake },
  { href: "/painel/produtor/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/painel/produtor/perfil", label: "Perfil", icon: User },
];

export function ProdutorBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-milsaca-cream-escuro bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map((item) => {
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
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active ? "text-milsaca-cafezal" : "text-neutral-500",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-milsaca-dourado" : "text-neutral-400",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
