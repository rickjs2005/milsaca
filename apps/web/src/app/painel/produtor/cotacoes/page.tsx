import Link from "next/link";
import { TrendingDown, TrendingUp, LineChart, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCotacoes, agruparCotacoes } from "./_lib/queries";
import { Sparkline } from "./_components/sparkline";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";

export const metadata = { title: "Cotações — Painel do produtor" };

const SPECIE_LABEL: Record<CoffeeSpecie, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const PROCESS_LABEL: Record<CoffeeProcesso, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

const SPECIE_FILTERS: { value: "" | CoffeeSpecie; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "arabica", label: "Arábica" },
  { value: "conillon", label: "Conillón" },
];

type SearchParams = Promise<{ specie?: string }>;

function isSpecie(v: string | undefined): v is CoffeeSpecie {
  return v === "arabica" || v === "conillon";
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default async function CotacoesProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const specie = isSpecie(sp.specie) ? sp.specie : undefined;
  const rows = await listCotacoes({ specie });
  const cards = agruparCotacoes(rows);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Cotações
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Acompanhe o preço da saca por espécie e processo. As cotações são
          publicadas pelas corretoras parceiras.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Espécie:</span>
        {SPECIE_FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("specie", f.value);
          const href = params.toString()
            ? `/painel/produtor/cotacoes?${params.toString()}`
            : "/painel/produtor/cotacoes";
          const active = (specie ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={
                active
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <LineChart className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Sem cotações disponíveis ainda.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Assim que uma corretora publicar, aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de preço atual por grupo (specie + process + region) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => {
              const v = c.variacao_pct;
              const up = v != null && v > 0.001;
              const down = v != null && v < -0.001;
              const sparkColor = up ? "#047857" : down ? "#be123c" : "#2D3A2E";
              return (
                <Card key={c.key} className="border-milsaca-cream-escuro">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base text-milsaca-verde">
                      <span>
                        {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
                      </span>
                      <Sparkline values={c.series} color={sparkColor} />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {c.process ? PROCESS_LABEL[c.process] : "Sem processo"}
                      {c.region && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.region}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-semibold text-milsaca-verde">
                        {formatBRL(c.current_price)}
                      </span>
                      {v != null && (
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            up
                              ? "text-emerald-700"
                              : down
                                ? "text-rose-700"
                                : "text-milsaca-verde-claro"
                          }`}
                        >
                          {up && <TrendingUp className="h-3.5 w-3.5" />}
                          {down && <TrendingDown className="h-3.5 w-3.5" />}
                          {v > 0 ? "+" : ""}
                          {v.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-milsaca-verde-claro">
                      <span>Atualizado em {formatDate(c.current_date)}</span>
                      {c.source && (
                        <span className="rounded bg-milsaca-cream-escuro/60 px-2 py-0.5">
                          {c.source}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabela histórica detalhada */}
          <Card className="border-milsaca-cream-escuro">
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
              <CardDescription>
                Últimas {rows.length} cotações disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                  <tr>
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-left">Café</th>
                    <th className="px-5 py-3 text-left">Processo</th>
                    <th className="px-5 py-3 text-left">Praça</th>
                    <th className="px-5 py-3 text-right">Preço (saca 60kg)</th>
                    <th className="px-5 py-3 text-right">Variação</th>
                    <th className="px-5 py-3 text-left">Fonte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-milsaca-cream-escuro">
                  {rows.map((c) => {
                    const v = c.variacao_pct;
                    const up = v != null && v > 0.001;
                    const down = v != null && v < -0.001;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-milsaca-cream-escuro/30"
                      >
                        <td className="px-5 py-3 text-milsaca-verde">
                          {formatDate(c.reference_date)}
                        </td>
                        <td className="px-5 py-3 font-medium text-milsaca-verde">
                          {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
                        </td>
                        <td className="px-5 py-3 text-milsaca-verde">
                          {c.process ? PROCESS_LABEL[c.process] : "—"}
                        </td>
                        <td className="px-5 py-3 text-milsaca-verde">
                          {c.region ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-milsaca-verde">
                          {formatBRL(c.price)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {v == null ? (
                            <span className="text-milsaca-verde-claro">—</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                up
                                  ? "text-emerald-700"
                                  : down
                                    ? "text-rose-700"
                                    : "text-milsaca-verde-claro"
                              }`}
                            >
                              {up && <TrendingUp className="h-3.5 w-3.5" />}
                              {down && <TrendingDown className="h-3.5 w-3.5" />}
                              {v > 0 ? "+" : ""}
                              {v.toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-milsaca-verde-claro">
                          {c.source ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
