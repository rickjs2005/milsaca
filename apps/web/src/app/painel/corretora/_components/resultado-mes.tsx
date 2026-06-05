import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  Wallet,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fmtMoney0, fmtMoney } from "@/lib/format";
import type { ResultadoMes as ResultadoMesData } from "../_lib/dashboard";

/**
 * "Resultado do mês" — dá CONTEXTO ao dinheiro (substitui o R$ solto).
 * Receita prevista (ativos + em negociação), confirmada (finalizados),
 * comissão gerada e ticket médio por saca.
 */
export function ResultadoMes({
  resultado,
  valorEmNegociacao,
}: {
  resultado: ResultadoMesData;
  valorEmNegociacao: number;
}) {
  const receitaPrevista = resultado.receitaAtivos + valorEmNegociacao;

  return (
    <section aria-label="Resultado do mês" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label font-semibold uppercase tracking-wider text-neutral-600">
          Resultado do mês
        </h2>
        <Link
          href="/painel/corretora/analytics"
          className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Ver analytics →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Receita prevista"
          value={fmtMoney0(receitaPrevista)}
          hint="Ativos + em negociação"
          icon={TrendingUp}
          href="/painel/corretora/contratos?status=ativo"
        />
        <Kpi
          label="Receita confirmada"
          value={fmtMoney0(resultado.receitaConfirmada)}
          hint="Contratos finalizados"
          icon={CheckCircle2}
          href="/painel/corretora/contratos?status=finalizado"
        />
        <Kpi
          label="Comissão gerada"
          value={fmtMoney0(resultado.comissaoMes)}
          hint="Ativos + finalizados"
          icon={Wallet}
          href="/painel/corretora/contratos"
          premium
        />
        <Kpi
          label="Ticket médio"
          value={
            resultado.ticketMedio > 0
              ? `${fmtMoney(resultado.ticketMedio)}/sc`
              : "—"
          }
          hint="Por saca negociada"
          icon={Tag}
          href="/painel/corretora/analytics"
        />
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  href,
  premium,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  href: string;
  premium?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card tone={premium ? "premium" : "default"} interactive className="h-full">
        <CardContent className="p-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
              {label}
            </p>
            <Icon
              className={
                premium
                  ? "h-4 w-4 shrink-0 text-milsaca-dourado-texto"
                  : "h-4 w-4 shrink-0 text-milsaca-cafezal/60"
              }
            />
          </div>
          <p className="mt-2 text-h2 leading-none tabular-nums text-milsaca-cafezal">
            {value}
          </p>
          <p className="mt-1.5 text-caption text-neutral-500">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
