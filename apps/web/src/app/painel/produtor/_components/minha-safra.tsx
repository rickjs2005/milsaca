import Link from "next/link";
import { Wallet, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatarBags, formatarKg, sacasParaKg } from "@/lib/unidades";
import type { EstoqueProdutor } from "../_lib/estoque";

const PESO_BAG_PADRAO = 600;
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const BRL0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

// Preço de referência do valor estimado: Índice MilSaca (média das corretoras)
// como principal; CEPEA como referência secundária (não branda o herói).
export type IndiceRef = {
  preco: number | null;
  fonte: "milsaca" | "cepea";
  cepea: number | null;
  nCorretoras: number;
};

/**
 * MINHA SAFRA — herói da Início. O produtor vê a safra como o extrato do banco:
 * quanto produziu, vendeu, comprometeu e quanto AINDA PODE VENDER + quanto vale.
 * Consome a fonte única (EstoqueProdutor); invariante total = vend + neg + disp.
 */
export function MinhaSafra({
  estoque,
  indice,
}: {
  estoque: EstoqueProdutor;
  indice: IndiceRef;
}) {
  const totalKg = sacasParaKg(estoque.total);
  const pct = (n: number) =>
    estoque.total > 0 ? Math.round((n / estoque.total) * 100) : 0;
  const valorDisponivel =
    indice.preco != null ? Math.round(estoque.disponivel * indice.preco) : null;
  const fonteLabel = indice.fonte === "milsaca" ? "Índice MilSaca" : "CEPEA";

  return (
    <Card tone="premium">
      <CardContent className="p-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-milsaca-cafezal">
            Minha Safra{estoque.safra ? ` ${estoque.safra}` : ""}
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/painel/produtor/plano"
              className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Planejar venda →
            </Link>
            <Link
              href="/painel/produtor/extrato"
              className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Ver extrato →
            </Link>
          </div>
        </div>

        {estoque.total > 0 ? (
          <>
            {/* As 4 perguntas da safra */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Produção total" valor={estoque.total} />
              <Tile label="Disponíveis" valor={estoque.disponivel} destaque />
              <Tile label="Em negociação" valor={estoque.emNegociacao} />
              <Tile label="Vendidas" valor={estoque.vendido} />
            </div>

            <p className="mt-3 text-caption text-neutral-500">
              {NUM.format(estoque.total)} sacas ·{" "}
              {formatarBags(totalKg, PESO_BAG_PADRAO)} · {formatarKg(totalKg)}
            </p>

            {/* Barra proporcional: disponível · negociação · vendido = total */}
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

            {estoque.sobreComprometido ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-danger-50 px-3 py-2 text-caption text-danger-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Comprometido (vendido + em negociação) maior que a produção
                declarada — revise os lotes da safra.
              </p>
            ) : null}
            {estoque.temEstimada ? (
              <p className="mt-2 text-caption text-warning-700">
                * inclui café não beneficiado — saca estimada até o beneficiamento.
              </p>
            ) : null}

            {/* Valor estimado do DISPONÍVEL (Índice MilSaca principal) */}
            <div className="mt-4 border-t border-milsaca-cream-escuro/60 pt-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30">
                  <Wallet className="h-4 w-4" />
                </span>
                <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                  Valor estimado disponível
                </p>
              </div>
              <p className="mt-2 text-display leading-none text-milsaca-cafezal">
                {valorDisponivel != null ? BRL0.format(valorDisponivel) : "—"}
              </p>
              <p className="mt-1 text-caption text-neutral-500">
                {NUM.format(estoque.disponivel)} sacas disponíveis ×{" "}
                {indice.preco != null
                  ? `${fonteLabel} ${BRL2.format(indice.preco)}/saca`
                  : "cotação indisponível"}
              </p>
              {indice.fonte === "milsaca" && indice.cepea != null ? (
                <p className="text-caption text-neutral-400">
                  CEPEA {BRL2.format(indice.cepea)}/saca · referência
                </p>
              ) : null}
            </div>
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
          : "bg-white/60",
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
