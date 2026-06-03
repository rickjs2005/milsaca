import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Coffee, LineChart, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { IndicadoresLive } from "@/components/indicadores-live";
import { getProfile } from "@/lib/auth";
import {
  listCotacoes,
  loadCotacoesKpis,
  loadPosicaoMercado,
  type CotacaoUltima,
  type PosicaoEspecie,
} from "./_lib/queries";
import {
  formatBRL,
  formatDateShort,
  isProcess,
  isSpecie,
} from "./_lib/cotacao-meta";
import { CotacoesView } from "./_components/cotacoes-view";

export const metadata = { title: "Cotações — Painel da corretora" };

type SearchParams = Promise<{ specie?: string; process?: string }>;

function ultimaHint(u: CotacaoUltima): string {
  if (!u) return "Nenhuma registrada ainda";
  const praca = u.region ? ` · ${u.region}` : "";
  return `em ${formatDateShort(u.reference_date)}${praca}`;
}

function frescorLabel(dias: number | null): string {
  if (dias == null) return "—";
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `Há ${dias} dias`;
}

export default async function CotacoesCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const corretoraId = profile.corretora_id;

  const sp = await searchParams;
  const specie = isSpecie(sp.specie) ? sp.specie : undefined;
  const process = isProcess(sp.process) ? sp.process : undefined;

  const [cotacoes, kpis, posicao] = await Promise.all([
    listCotacoes(corretoraId, { specie, process }),
    loadCotacoesKpis(corretoraId),
    loadPosicaoMercado(corretoraId),
  ]);

  const filtroAtivo = Boolean(specie || process);
  const frescorTone =
    kpis.diasDesdeUltima == null
      ? "default"
      : kpis.diasDesdeUltima > 7
        ? "warning"
        : "success";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Cotações</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Suas cotações manuais por praça — são elas que alimentam o painel do
            produtor. Os indicadores de mercado (CEPEA, NY, dólar) aparecem como
            referência pra precificar quando sincronizados.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/cotacoes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova cotação
          </Link>
        </Button>
      </header>

      <IndicadoresLive />

      <div className="space-y-4 pt-2">
        <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
          <LineChart className="h-4 w-4" />
          Suas cotações manuais
        </h2>

        <section
          aria-label="Resumo das cotações manuais"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <KpiCard
            label="Arábica (última)"
            value={kpis.arabica ? formatBRL(kpis.arabica.price) : "—"}
            icon={Coffee}
            tone="premium"
            hint={ultimaHint(kpis.arabica)}
          />
          <KpiCard
            label="Conillón (última)"
            value={kpis.conillon ? formatBRL(kpis.conillon.price) : "—"}
            icon={Coffee}
            tone="info"
            hint={ultimaHint(kpis.conillon)}
          />
          <KpiCard
            label="Atualização"
            value={frescorLabel(kpis.diasDesdeUltima)}
            icon={CalendarClock}
            tone={frescorTone}
            hint={
              kpis.diasDesdeUltima != null && kpis.diasDesdeUltima > 7
                ? "Desatualizada — registre uma nova"
                : `${kpis.total} ${kpis.total === 1 ? "cotação" : "cotações"} no histórico`
            }
          />
        </section>

        {posicao.arabica || posicao.conillon ? (
          <div className="flex flex-wrap gap-2">
            {posicao.arabica ? (
              <PosicaoChip specie="Arábica" p={posicao.arabica} />
            ) : null}
            {posicao.conillon ? (
              <PosicaoChip specie="Conillón" p={posicao.conillon} />
            ) : null}
          </div>
        ) : null}

        {cotacoes.length === 0 ? (
          <Card tone="muted" className="border-dashed">
            <CardContent className="p-card">
              <EmptyState
                icon={LineChart}
                title={`Nenhuma cotação${filtroAtivo ? " com esse filtro" : ""}`}
                description={
                  filtroAtivo
                    ? "Ajuste o filtro ou cadastre uma cotação pra essa combinação."
                    : "Cadastre a primeira pra começar o histórico que o produtor acompanha."
                }
                cta={{
                  label: "Nova cotação",
                  href: "/painel/corretora/cotacoes/novo",
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <CotacoesView cotacoes={cotacoes} current={{ specie, process }} />
        )}
      </div>
    </div>
  );
}

/** Onde a cotação da corretora se posiciona vs as outras (inteligência #6). */
function PosicaoChip({
  specie,
  p,
}: {
  specie: string;
  p: NonNullable<PosicaoEspecie>;
}) {
  const lider = p.rank === 1;
  const delta = p.deltaVsMediaPct;
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-milsaca-cream-escuro bg-white px-3 py-2 text-caption shadow-card">
      <span className="font-semibold text-milsaca-cafezal">{specie}</span>
      <span
        className={
          lider
            ? "inline-flex items-center gap-1 rounded-pill bg-success-50 px-2 py-0.5 font-medium text-success-700"
            : "text-neutral-600"
        }
      >
        {lider ? <Trophy className="h-3.5 w-3.5" /> : null}
        {p.rank}ª melhor de {p.total} corretora{p.total === 1 ? "" : "s"}
      </span>
      {delta != null ? (
        <span
          className={
            delta >= 0
              ? "font-medium text-success-700"
              : "font-medium text-danger-700"
          }
        >
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% vs média da praça
        </span>
      ) : null}
    </div>
  );
}
