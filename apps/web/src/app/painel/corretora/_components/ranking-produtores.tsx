import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fmtMoney0, fmtInt } from "@/lib/format";
import type { RankingProdutor } from "../_lib/dashboard";

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Ranking dos produtores por receita — quem move dinheiro pra corretora.
 * Top 5 com posição, sacas e R$ comprado. Linka pro detalhe do produtor.
 */
export function RankingProdutores({ ranking }: { ranking: RankingProdutor[] }) {
  if (ranking.length === 0) return null;

  return (
    <section aria-label="Ranking de produtores" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-neutral-600">
          <Trophy className="h-4 w-4 text-milsaca-dourado-texto" />
          Top produtores
        </h2>
        <Link
          href="/painel/corretora/produtores"
          className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Ver todos →
        </Link>
      </div>
      <Card>
        <CardContent className="divide-y divide-neutral-200 p-0">
          {ranking.map((p, i) => (
            <Link
              key={p.produtor_id}
              href={`/painel/corretora/produtores/${p.produtor_id}`}
              className="flex items-center gap-3 px-card py-3 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex w-6 shrink-0 justify-center text-body">
                {MEDAL[i] ?? (
                  <span className="text-caption font-semibold text-neutral-400">
                    {i + 1}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-semibold text-milsaca-cafezal">
                  {p.nome}
                </span>
                <span className="block text-caption text-neutral-500">
                  {fmtInt(p.sacas)} sacas
                </span>
              </span>
              <span className="shrink-0 text-body-sm font-semibold tabular-nums text-milsaca-cafezal">
                {fmtMoney0(p.receita)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
