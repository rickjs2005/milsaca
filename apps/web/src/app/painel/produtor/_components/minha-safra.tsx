import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatarBags, formatarKg, sacasParaKg } from "@/lib/unidades";
import type { EstoqueProdutor } from "../_lib/estoque";

// Peso padrão de big bag pra exibir a safra em bags (≈, aproximado no agregado).
const PESO_BAG_PADRAO = 600;

const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/**
 * MINHA SAFRA — o bloco-âncora da Início. Responde de relance: quanto produzi,
 * quanto já vendi, quanto está comprometido e quanto AINDA POSSO VENDER.
 * Consome a fonte única (EstoqueProdutor); invariante total = vend + neg + disp.
 */
export function MinhaSafra({ estoque }: { estoque: EstoqueProdutor }) {
  const totalKg = sacasParaKg(estoque.total);
  const pct = (n: number) =>
    estoque.total > 0 ? Math.round((n / estoque.total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-milsaca-cafezal">Minha Safra</h2>
          <Link
            href="/painel/produtor/cafe/novo"
            className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            + Registrar café
          </Link>
        </div>

        {estoque.total > 0 ? (
          <>
            {/* Os 4 números que o produtor procura */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Produção total" valor={estoque.total} />
              <Tile label="Disponíveis" valor={estoque.disponivel} destaque />
              <Tile label="Em negociação" valor={estoque.emNegociacao} />
              <Tile label="Vendidas" valor={estoque.vendido} />
            </div>

            {/* A MESMA safra em sacas / bags / kg (mesma fonte) */}
            <p className="mt-3 text-caption text-neutral-500">
              {NUM.format(estoque.total)} sacas · {formatarBags(totalKg, PESO_BAG_PADRAO)} ·{" "}
              {formatarKg(totalKg)}
            </p>

            {/* Barra visual (disponível · em negociação · vendido = total) */}
            <div
              className="mt-3 flex h-3 w-full overflow-hidden rounded-pill bg-neutral-100"
              role="img"
              aria-label={`Safra: ${estoque.disponivel} disponíveis, ${estoque.emNegociacao} em negociação, ${estoque.vendido} vendidas, de ${estoque.total} sacas`}
            >
              <div className="bg-success-500" style={{ width: `${pct(estoque.disponivel)}%` }} />
              <div className="bg-warning-400" style={{ width: `${pct(estoque.emNegociacao)}%` }} />
              <div className="bg-neutral-400" style={{ width: `${pct(estoque.vendido)}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-caption">
              <Legenda cor="bg-success-500" label="Disponível" valor={estoque.disponivel} />
              <Legenda cor="bg-warning-400" label="Em negociação" valor={estoque.emNegociacao} />
              <Legenda cor="bg-neutral-400" label="Vendido" valor={estoque.vendido} />
            </div>

            {estoque.temEstimada ? (
              <p className="mt-2 text-caption text-warning-700">
                * inclui café não beneficiado — saca estimada até o beneficiamento.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-body-sm text-neutral-600">
            Você ainda não registrou café.{" "}
            <Link
              href="/painel/produtor/cafe/novo"
              className="font-medium text-milsaca-dourado-texto hover:underline"
            >
              Registrar agora
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2.5",
        destaque
          ? "bg-milsaca-dourado/15 ring-1 ring-inset ring-milsaca-dourado/30"
          : "bg-milsaca-cream/50",
      )}
    >
      <p className="text-h2 leading-none tabular-nums text-milsaca-cafezal">
        {NUM.format(valor)}
      </p>
      <p className="mt-1 text-caption text-neutral-500">{label}</p>
    </div>
  );
}

function Legenda({
  cor,
  label,
  valor,
}: {
  cor: string;
  label: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", cor)} />
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold text-milsaca-cafezal">{NUM.format(valor)}</span>
    </div>
  );
}
