"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Search } from "lucide-react";

// Mapeia segmentos da URL pra labels human-readable. Adicione aqui ao
// criar novos módulos. Segmentos não-mapeados são exibidos como-são
// (ou ocultos se UUID/id detectado).
const LABELS: Record<string, string> = {
  admin: "Admin",
  aprovacoes: "Aprovações",
  corretoras: "Corretoras",
  produtores: "Produtores",
  leads: "Leads WhatsApp",
  planos: "Planos",
  assinaturas: "Assinaturas",
  metricas: "Métricas",
  auditoria: "Auditoria",
  seguranca: "Segurança",
  configuracoes: "Configurações",
  automacoes: "Automações",
  "regras-leads": "Regras de leads",
  comunicacao: "Comunicação",
  "fila-eventos": "Fila & Eventos",
  marketplace: "Marketplace",
  moderacao: "Moderação",
  "lead-waitlist": "Lista de espera",
  novo: "Novo",
  nova: "Nova",
};

const UUID_LIKE = /^[0-9a-f-]{8,}$/i;

function buildCrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const p of parts) {
    acc += `/${p}`;
    // UUIDs viram "Detalhe"; pra labels mais ricas, página passa título via PageHeader.
    const label = UUID_LIKE.test(p) ? "Detalhe" : LABELS[p] ?? p;
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

type Props = {
  adminName: string;
  adminEmail: string;
};

/**
 * Topbar do admin no desktop — breadcrumb auto-gerado + busca global
 * placeholder + bloco perfil/logout. Mobile usa a barra com hamburger
 * dentro do AdminShell.
 *
 * Busca global é placeholder visual por enquanto (não está plugada em
 * endpoint). Mantida pra parecer "comand-K ready" como Linear/Stripe.
 */
export function AdminTopbar({ adminName, adminEmail }: Props) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  // Initials pra avatar dourado
  const initials =
    adminName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "A";

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur lg:flex">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1">
                {last ? (
                  <span
                    aria-current="page"
                    className="font-medium text-slate-700"
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className="rounded-sm px-0.5 transition-colors hover:text-milsaca-cafezal hover:underline underline-offset-4"
                  >
                    {c.label}
                  </Link>
                )}
                {!last ? (
                  <ChevronRight
                    aria-hidden
                    className="h-3 w-3 text-slate-300"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Busca placeholder */}
      <div className="hidden xl:block">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            disabled
            placeholder="Buscar (em breve)..."
            aria-label="Busca global (em breve)"
            className="h-9 w-64 cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-400 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Perfil + logout */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-dourado/20 text-[11px] font-semibold text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40"
          aria-hidden
        >
          {initials}
        </span>
        <div className="hidden text-right leading-tight md:block">
          <p className="text-xs font-medium text-slate-900">{adminName}</p>
          <p className="text-[11px] text-slate-500">{adminEmail}</p>
        </div>
        <form action="/sair" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-milsaca-cafezal"
            aria-label="Sair da sessão admin"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
