import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtMoney0, fmtMoney, fmtInt } from "@/lib/format";
import type { ResultadoMes } from "../_lib/dashboard";

/**
 * Faixa de comando — KPIs do mês em linha densa, full-width (central de
 * operações, não cartão grande). Comissão do mês em leve destaque dourado.
 * Cada célula é clicável pro destino certo.
 */
export function Comando({
  resultado,
  valorEmNegociacao,
  sacasEmNegociacao,
  emNegociacao,
}: {
  resultado: ResultadoMes;
  valorEmNegociacao: number;
  sacasEmNegociacao: number;
  emNegociacao: number;
}) {
  const cells: {
    label: string;
    value: string;
    sub?: string;
    href: string;
    accent?: boolean;
  }[] = [
    {
      label: "Comissão do mês",
      value: fmtMoney0(resultado.comissaoMes),
      sub: "o que você ganha",
      href: "/painel/corretora/contratos",
      accent: true,
    },
    {
      label: "Receita confirmada",
      value: fmtMoney0(resultado.receitaConfirmada),
      sub: "contratos finalizados",
      href: "/painel/corretora/contratos?status=finalizado",
    },
    {
      label: "Receita prevista",
      value: fmtMoney0(resultado.receitaAtivos + valorEmNegociacao),
      sub: "ativos + em negociação",
      href: "/painel/corretora/contratos?status=ativo",
    },
    {
      label: "Ticket médio",
      value: resultado.ticketMedio > 0 ? `${fmtMoney(resultado.ticketMedio)}/sc` : "—",
      sub: "por saca negociada",
      href: "/painel/corretora/analytics",
    },
    {
      label: "Em negociação",
      value: fmtMoney0(valorEmNegociacao),
      sub: `${fmtInt(emNegociacao)} proposta${emNegociacao === 1 ? "" : "s"} aberta${emNegociacao === 1 ? "" : "s"}`,
      href: "/painel/corretora/leads?status=em_negociacao",
    },
    {
      label: "Potencial de compra",
      value: `${fmtInt(sacasEmNegociacao)} sc`,
      sub: "sacas em negociação",
      href: "/painel/corretora/leads?status=em_negociacao",
    },
  ];

  return (
    <section
      aria-label="Resultado do mês"
      className="grid grid-cols-2 overflow-hidden rounded-card border border-neutral-200 bg-white shadow-card md:grid-cols-3 xl:grid-cols-6"
    >
      {cells.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className={cn(
            "group relative border-b border-r border-neutral-200 p-card transition-colors last:border-r-0 hover:bg-milsaca-cream/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:border-b-0",
            c.accent && "bg-milsaca-dourado/[0.07]",
          )}
        >
          {c.accent ? (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 bg-milsaca-dourado"
            />
          ) : null}
          <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
            {c.label}
          </p>
          <p
            className={cn(
              "mt-1.5 text-h3 leading-none tabular-nums",
              c.accent ? "text-milsaca-dourado-texto" : "text-milsaca-cafezal",
            )}
          >
            {c.value}
          </p>
          {c.sub ? (
            <p className="mt-1 truncate text-caption text-neutral-500">{c.sub}</p>
          ) : null}
        </Link>
      ))}
    </section>
  );
}
