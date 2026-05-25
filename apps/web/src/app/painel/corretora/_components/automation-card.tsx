import Link from "next/link";
import {
  ArrowRight,
  PhoneCall,
  Repeat2,
  Sparkles,
  TimerReset,
} from "lucide-react";
import type { AutomationSuggestion } from "../_lib/dashboard";

const COPY: Record<
  AutomationSuggestion["id"],
  {
    title: string;
    description: (count: number) => string;
    cta: string;
    icon: typeof PhoneCall;
  }
> = {
  "leads-frios": {
    title: "Leads sem contato há mais de 24h",
    description: (n) =>
      n === 1
        ? "1 produtor está esperando seu primeiro retorno."
        : `${n} produtores estão esperando seu primeiro retorno.`,
    cta: "Contatar agora",
    icon: PhoneCall,
  },
  "lotes-parados": {
    title: "Lotes parados há mais de 7 dias",
    description: (n) =>
      n === 1
        ? "1 lote classificado pode ser recompartilhado com compradores."
        : `${n} lotes classificados podem ser recompartilhados com compradores.`,
    cta: "Ver lotes",
    icon: Repeat2,
  },
  "negociacoes-paradas": {
    title: "Negociações sem update há mais de 3 dias",
    description: (n) =>
      n === 1
        ? "1 lead em negociação está esfriando."
        : `${n} leads em negociação estão esfriando.`,
    cta: "Fazer follow-up",
    icon: TimerReset,
  },
};

/**
 * Bloco de automação comercial do dashboard. Mostra apenas regras com
 * count > 0 — quando tudo estiver fluindo, vira um cartão de "tudo em dia".
 */
export function AutomationCard({
  suggestions,
}: {
  suggestions: AutomationSuggestion[];
}) {
  const active = suggestions.filter((s) => s.count > 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            Automação comercial
          </h2>
        </div>
        <span className="text-[11px] text-milsaca-verde-claro/70">
          Sugestões baseadas no seu ritmo
        </span>
      </div>

      {active.length === 0 ? (
        <div className="rounded-card border border-dashed border-milsaca-cream-escuro bg-white/50 px-5 py-6 text-center">
          <p className="text-sm font-medium text-milsaca-verde">
            Tudo em dia.
          </p>
          <p className="mt-1 text-xs text-milsaca-verde-claro">
            Nenhum lead frio, lote parado ou negociação esquecida agora.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((s) => {
            const c = COPY[s.id];
            const Icon = c.icon;
            return (
              <Link
                key={s.id}
                href={s.href}
                className="group flex flex-col gap-3 rounded-card border border-milsaca-cream-escuro bg-white p-5 shadow-card transition-all hover:border-milsaca-dourado/50 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-milsaca-cafezal/95 px-2.5 py-0.5 text-xs font-semibold text-milsaca-cream">
                    {s.count}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-milsaca-verde">
                    {c.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-milsaca-verde-claro">
                    {c.description(s.count)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-milsaca-cafezal group-hover:gap-2 transition-all">
                  {c.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
