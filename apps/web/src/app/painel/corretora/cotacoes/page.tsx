import Link from "next/link";
import { Plus, TrendingDown, TrendingUp, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { listCotacoes } from "./_lib/queries";
import { deleteCotacao } from "./_actions";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";

export const metadata = { title: "Cotações — Painel da corretora" };

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

type SearchParams = Promise<{
  specie?: string;
  process?: string;
}>;

function isSpecie(v: string | undefined): v is CoffeeSpecie {
  return v === "arabica" || v === "conillon";
}

function isProcess(v: string | undefined): v is CoffeeProcesso {
  return (
    v === "natural" ||
    v === "cereja_descascado" ||
    v === "cd_desmucilado" ||
    v === "despolpado" ||
    v === "fermentacao_induzida"
  );
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  // iso 'YYYY-MM-DD' (date col), evita criar Date com timezone
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default async function CotacoesCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const specie = isSpecie(sp.specie) ? sp.specie : undefined;
  const process = isProcess(sp.process) ? sp.process : undefined;
  const cotacoes = await listCotacoes({ specie, process });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            Cotações
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Histórico de preços que alimenta o painel do produtor. Cadastre as
            referências da praça enquanto a integração CEPEA/B3 não chega.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/cotacoes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova cotação
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Filtrar:</span>
        {SPECIE_FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("specie", f.value);
          const href = params.toString()
            ? `/painel/corretora/cotacoes?${params.toString()}`
            : "/painel/corretora/cotacoes";
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

      {cotacoes.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <LineChart className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhuma cotação cadastrada{specie ? " com esse filtro" : ""}.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Cadastre a primeira para começar o histórico.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/cotacoes/novo">Nova cotação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
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
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {cotacoes.map((c) => {
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
                      <td className="px-5 py-3 text-milsaca-verde-claro">
                        {c.source ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={deleteCotacao}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmSubmit
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-rose-700 hover:bg-transparent hover:underline"
                            confirmTitle="Apagar cotação?"
                            confirmMessage={
                              <p>
                                Essa cotação manual será removida do histórico
                                e não aparece mais pro produtor.
                              </p>
                            }
                            confirmButtonLabel="Apagar"
                            pendingLabel="Apagando..."
                          >
                            Apagar
                          </ConfirmSubmit>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
