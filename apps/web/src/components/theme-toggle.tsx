"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Seletor de tema Claro | Escuro | Sistema. Persiste em localStorage
 * (`mp_theme`) e troca a classe `dark` no <html> — o script inline do
 * layout raiz reaplica no load (anti-flash). Default sem escolha = claro.
 *
 * `surface`: "dark" pra viver dentro das sidebars cafezal; "light" pra
 * cards/páginas claras (mais/perfil no mobile).
 * `compact`: só ícones (sidebar estreita não comporta os 3 rótulos).
 */
export function ThemeToggle({
  surface = "dark",
  compact = false,
  className,
}: {
  surface?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  // null até montar — evita mismatch de hidratação (localStorage só no client)
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mp_theme");
    setTheme(saved === "dark" || saved === "system" ? saved : "light");
  }, []);

  // Em "Sistema", acompanha mudança de preferência do SO ao vivo.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function select(next: Theme) {
    localStorage.setItem("mp_theme", next);
    applyTheme(next);
    setTheme(next);
  }

  const onDark = surface === "dark";

  return (
    <div className={className}>
      <p
        className={cn(
          "mb-1.5 px-1 text-caption uppercase tracking-wider",
          onDark ? "text-milsaca-cream/45" : "text-neutral-500",
        )}
      >
        Tema
      </p>
      <div
        role="radiogroup"
        aria-label="Tema da interface"
        className={cn(
          "flex gap-1 rounded-md p-1",
          onDark ? "bg-white/5" : "border border-neutral-200 bg-neutral-50",
        )}
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => select(opt.value)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado",
                onDark
                  ? active
                    ? "bg-white/10 text-milsaca-cream"
                    : "text-milsaca-cream/55 hover:bg-white/5 hover:text-milsaca-cream"
                  : active
                    ? "bg-white text-milsaca-cafezal shadow-card"
                    : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              <Icon
                aria-hidden
                className={cn("h-3.5 w-3.5 shrink-0", active && "text-milsaca-dourado")}
              />
              {compact ? null : <span className="truncate">{opt.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
