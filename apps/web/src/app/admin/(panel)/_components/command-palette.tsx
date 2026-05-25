"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Building2,
  Cpu,
  FileSignature,
  Filter,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Lock,
  MessageCircle,
  MessageSquare,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  Sprout,
  Store,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  searchAdmin,
  type CommandResult,
} from "./command-palette-search";

type StaticAction = {
  group: string;
  title: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Páginas + atalhos catalogados do admin. Aparecem mesmo sem query
 * (zero-state) e funcionam como teleporte rápido. Atualizar quando
 * criar rota nova.
 */
const STATIC_ACTIONS: StaticAction[] = [
  // Visão
  { group: "Navegação", title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  // Gestão
  { group: "Gestão", title: "Aprovações", href: "/admin/aprovacoes", icon: Inbox, hint: "pendentes" },
  { group: "Gestão", title: "Corretoras", href: "/admin/corretoras", icon: Building2 },
  { group: "Gestão", title: "Nova corretora", href: "/admin/corretoras/nova", icon: Building2 },
  { group: "Gestão", title: "Produtores", href: "/admin/produtores", icon: Sprout },
  // Operação
  { group: "Operação", title: "Leads WhatsApp", href: "/admin/leads", icon: MessageCircle },
  // Plataforma
  { group: "Plataforma", title: "Automações", href: "/admin/automacoes", icon: Cpu },
  { group: "Plataforma", title: "Regras de leads", href: "/admin/regras-leads", icon: Filter },
  { group: "Plataforma", title: "Comunicação", href: "/admin/comunicacao", icon: MessageSquare },
  { group: "Plataforma", title: "Fila & Eventos", href: "/admin/fila-eventos", icon: ListChecks },
  { group: "Plataforma", title: "Lista de espera", href: "/admin/lead-waitlist", icon: Users },
  { group: "Plataforma", title: "Marketplace", href: "/admin/marketplace", icon: Store },
  { group: "Plataforma", title: "Moderação", href: "/admin/moderacao", icon: ShieldAlert },
  // Compliance
  { group: "Compliance", title: "Cotações", href: "/admin/cotacoes", icon: TrendingUp },
  { group: "Compliance", title: "Nova cotação manual", href: "/admin/cotacoes/nova", icon: TrendingUp },
  { group: "Compliance", title: "Tipos de café", href: "/admin/cotacoes/tipos", icon: TrendingUp },
  { group: "Compliance", title: "Praças", href: "/admin/cotacoes/pracas", icon: TrendingUp },
  { group: "Compliance", title: "Fontes de cotação", href: "/admin/cotacoes/fontes", icon: TrendingUp },
  { group: "Compliance", title: "EUDR", href: "/admin/eudr", icon: Sprout },
  { group: "Compliance", title: "Fiscal", href: "/admin/fiscal", icon: FileSignature },
  // Comercial
  { group: "Comercial", title: "Planos", href: "/admin/planos", icon: Wallet },
  { group: "Comercial", title: "Novo plano", href: "/admin/planos/novo", icon: Wallet },
  { group: "Comercial", title: "Assinaturas", href: "/admin/assinaturas", icon: Receipt },
  // Insights
  { group: "Insights", title: "Métricas", href: "/admin/metricas", icon: TrendingUp },
  { group: "Insights", title: "Auditoria", href: "/admin/auditoria", icon: ListChecks },
  // Configuração
  { group: "Configuração", title: "Configurações", href: "/admin/configuracoes", icon: Settings },
  { group: "Configuração", title: "Segurança", href: "/admin/seguranca", icon: Lock },
];

const ENTITY_ICON: Record<CommandResult["kind"], LucideIcon> = {
  corretora: Building2,
  produtor: Sprout,
  page: Search,
};

const ENTITY_GROUP: Record<CommandResult["kind"], string> = {
  corretora: "Corretoras",
  produtor: "Produtores",
  page: "Páginas",
};

/**
 * Busca global tipo Vercel/Linear. Abre com Cmd/Ctrl+K (ou clicando na
 * busca placeholder do topbar). Mostra atalhos estáticos zero-state +
 * resultados do banco com debounce 250ms.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Listener custom pro botão do topbar acionar
  useEffect(() => {
    function onTrigger() {
      setOpen(true);
    }
    window.addEventListener("milsaca:open-command-palette", onTrigger);
    return () =>
      window.removeEventListener("milsaca:open-command-palette", onTrigger);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await searchAdmin(q);
          setResults(r);
        } catch {
          setResults([]);
        }
      });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, StaticAction[]>();
    for (const a of STATIC_ACTIONS) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return Array.from(map.entries());
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-milsaca-cafezal/40 backdrop-blur-sm px-4 pt-24 sm:pt-32"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Busca global do admin"
        className="w-full max-w-xl overflow-hidden rounded-card border border-slate-200 bg-white shadow-elevated"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 text-slate-400" aria-hidden />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar páginas, corretoras, produtores..."
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">
            {query.length < 2
              ? "Digite ao menos 2 letras pra buscar entidades."
              : isPending
                ? "Buscando..."
                : "Nenhum resultado."}
          </Command.Empty>

          {/* Resultados de entidades (apenas com query >= 2) */}
          {results.length > 0
            ? (
              Array.from(
                results.reduce((m, r) => {
                  const g = ENTITY_GROUP[r.kind];
                  if (!m.has(g)) m.set(g, []);
                  m.get(g)!.push(r);
                  return m;
                }, new Map<string, CommandResult[]>()),
              ).map(([g, items]) => (
                <Command.Group key={g} heading={g} className="text-[10px] uppercase tracking-widest text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {items.map((r, i) => {
                    const Icon = ENTITY_ICON[r.kind];
                    return (
                      <Command.Item
                        key={`${r.kind}-${i}-${r.href}`}
                        value={`${r.title} ${r.subtitle ?? ""}`}
                        onSelect={() => go(r.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 data-[selected=true]:bg-milsaca-cream data-[selected=true]:text-milsaca-cafezal"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-milsaca-cafezal" />
                        <span className="min-w-0 flex-1 truncate">
                          {r.title}
                        </span>
                        {r.subtitle ? (
                          <span className="shrink-0 truncate text-xs text-slate-500">
                            {r.subtitle}
                          </span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))
            ) : null}

          {/* Zero-state: páginas e atalhos */}
          {query.length < 2
            ? grouped.map(([group, items]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="text-[10px] uppercase tracking-widest text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {items.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Command.Item
                        key={a.href}
                        value={`${a.title} ${a.hint ?? ""}`}
                        onSelect={() => go(a.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 data-[selected=true]:bg-milsaca-cream data-[selected=true]:text-milsaca-cafezal"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">
                          {a.title}
                        </span>
                        {a.hint ? (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {a.hint}
                          </span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))
            : null}
        </Command.List>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
              ↑↓
            </kbd>{" "}
            navegar
            <kbd className="ml-2 rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
              ⏎
            </kbd>{" "}
            abrir
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
              ⌘K
            </kbd>{" "}
            pra abrir
          </span>
        </div>
      </Command>
    </div>
  );
}
