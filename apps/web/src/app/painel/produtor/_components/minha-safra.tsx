import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MobileFilterSelect } from "@/components/mobile-filter-select";
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

export type IndiceRef = {
  preco: number | null;
  fonte: "milsaca" | "cepea";
  cepea: number | null;
  nCorretoras: number;
};

/**
 * MINHA SAFRA — herói com FOCO ÚNICO: "quanto café ainda posso vender?".
 * Disponível + valor dominam; Produção/Em negociação/Vendidas são apoio.
 * Fonte única (EstoqueProdutor); invariante total = vend + neg + disp.
 */
export function MinhaSafra({
  estoque,
  indice,
  safraSelecionada,
}: {
  estoque: EstoqueProdutor;
  indice: IndiceRef;
  safraSelecionada: string;
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
        {/* Cabeçalho discreto: safra + atalhos */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-neutral-600">
            Minha Safra{estoque.safra ? ` ${estoque.safra}` : ""}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/painel/produtor/plano"
              className="rounded-md py-1 text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Planejar venda →
            </Link>
            <Link
              href="/painel/produtor/extrato"
              className="rounded-md py-1 text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Ver extrato →
            </Link>
          </div>
        </div>

        {estoque.safrasDisponiveis.length >= 2 ? (
          <div className="mt-2">
            <MobileFilterSelect
              label="Safra"
              paramName="safra"
              current={safraSelecionada}
              options={[
                { value: "", label: "Todas as safras" },
                ...estoque.safrasDisponiveis.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
        ) : null}

        {estoque.total > 0 ? (
          <>
            {/* FOCO PRINCIPAL — disponível + valor (domina a tela) */}
            <div className="mt-4">
              <p className="text-[3.25rem] font-bold leading-none tabular-nums text-milsaca-cafezal sm:text-6xl">
                {NUM.format(estoque.disponivel)}
              </p>
              <p className="mt-1 text-label font-semibold uppercase tracking-wider text-neutral-600">
                sacas disponíveis para venda
              </p>
              <p className="mt-3 text-h2 font-bold text-milsaca-cafezal">
                {valorDisponivel != null ? `≈ ${BRL0.format(valorDisponivel)}` : "—"}
                <span className="text-body-sm font-medium text-neutral-600">
                  {valorDisponivel != null ? " hoje" : ""}
                </span>
              </p>
              <p className="mt-1 text-body-sm text-neutral-600">
                {indice.preco != null
                  ? `Baseado no ${fonteLabel} · ${BRL2.format(indice.preco)}/saca`
                  : "Cotação indisponível"}
                {indice.fonte === "milsaca" && indice.cepea != null
                  ? ` · CEPEA ${BRL2.format(indice.cepea)} (ref.)`
                  : ""}
              </p>
            </div>

            {/* Barra proporcional (visual da safra) */}
            <div
              className="mt-4 flex h-2.5 w-full overflow-hidden rounded-pill bg-neutral-100"
              role="img"
              aria-label={`Safra: ${estoque.disponivel} disponíveis, ${estoque.emNegociacao} em negociação, ${estoque.vendido} vendidas, de ${estoque.total} sacas`}
            >
              <div className="bg-success-500" style={{ width: `${pct(estoque.disponivel)}%` }} />
              <div className="bg-warning-400" style={{ width: `${pct(estoque.emNegociacao)}%` }} />
              <div className="bg-neutral-400" style={{ width: `${pct(estoque.vendido)}%` }} />
            </div>

            {/* APOIO — métricas secundárias (subordinadas ao foco) */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Apoio cor="bg-success-500" label="Produção" valor={estoque.total} />
              <Apoio cor="bg-warning-400" label="Em negociação" valor={estoque.emNegociacao} />
              <Apoio cor="bg-neutral-400" label="Vendidas" valor={estoque.vendido} />
            </div>
            <p className="mt-2 text-caption text-neutral-600">
              Produção: {NUM.format(estoque.total)} sacas ·{" "}
              {formatarBags(totalKg, PESO_BAG_PADRAO)} · {formatarKg(totalKg)}
            </p>

            {estoque.sobreComprometido ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-danger-50 px-3 py-2 text-caption text-danger-700">
                <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Comprometido (vendido + em negociação) maior que a produção
                declarada — revise os lotes da safra.
              </p>
            ) : null}
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

// Métrica de apoio: pequena, subordinada ao foco (disponível).
function Apoio({
  cor,
  label,
  valor,
}: {
  cor: string;
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-md bg-white/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", cor)} aria-hidden />
        <span className="text-caption text-neutral-600">{label}</span>
      </div>
      <p className="mt-0.5 text-h3 font-semibold tabular-nums text-milsaca-cafezal">
        {NUM.format(valor)}
      </p>
    </div>
  );
}
