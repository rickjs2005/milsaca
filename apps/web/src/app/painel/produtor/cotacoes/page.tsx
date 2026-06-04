import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  Coffee,
  Flame,
  MapPin,
  Activity,
  Star,
  Calculator,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { DemoModeBadge } from "@/components/demo-mode-badge";
import { Sparkline } from "@/components/sparkline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadProdutorCotacoes } from "./_lib/queries";
import { loadMarketTrend, type MarketTrend } from "@/lib/market-trend";
import { CotacoesFiltros } from "./_components/cotacoes-filtros";
import { CalculadoraUnidades } from "@/components/produtor/CalculadoraUnidades/CalculadoraUnidades";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";
import type { CotacaoCard, MarketIndicator } from "./_lib/queries";

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

type SearchParams = Promise<{ specie?: string; praca?: string }>;

type InsightTone = "oportunidade" | "favoravel" | "atencao" | "estavel";

type Insight = {
  tone: InsightTone;
  emoji: string;
  title: string;
  detail: string;
};

function isSpecie(v: string | undefined): v is CoffeeSpecie {
  return v === "arabica" || v === "conillon";
}

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function fmtUSD(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default async function CotacoesProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const specie = isSpecie(sp.specie) ? sp.specie : undefined;
  const praca = sp.praca?.trim() || undefined;

  const data = await loadProdutorCotacoes({
    produtorId: user.id,
    specie,
    praca,
  });

  const trend = await loadMarketTrend(data.market.map((m) => m.symbol));

  // "Melhor preço hoje" — a maior oferta entre as corretoras (favoritas +
  // outras). É a resposta nº 1 do produtor: quem está pagando mais?
  const ofertas = [...data.minhasCorretoras, ...data.outrasPracas];
  const best =
    ofertas.length > 0
      ? ofertas.reduce((b, c) => (c.current_price > b.current_price ? c : b))
      : null;

  // "% acima da média" compara MAÇÃ COM MAÇÃ: só ofertas do mesmo café
  // (espécie + processo) da melhor. Misturar arábica natural × CD × conilon
  // dava uma média sem sentido.
  const peerKey = (c: { specie: string | null; process: string | null; coffee_type: string }) =>
    `${c.specie ?? c.coffee_type}|${c.process ?? ""}`;
  const peers = best ? ofertas.filter((o) => peerKey(o) === peerKey(best)) : [];
  const mediaPares =
    peers.length > 0
      ? peers.reduce((s, c) => s + c.current_price, 0) / peers.length
      : null;
  const bestAcimaMedia =
    best && mediaPares && mediaPares > 0 && peers.length >= 2
      ? ((best.current_price - mediaPares) / mediaPares) * 100
      : null;

  // Referência CEPEA por espécie — pra mostrar o ganho/perda de cada oferta
  // vs o mercado (#1). Arábica e Conilon têm indicador próprio.
  const cepeaBySpecie: Record<string, number | null> = {
    arabica:
      data.market.find((m) => m.symbol === "arabica_bica_corrida_esalq")
        ?.price ?? null,
    conillon:
      data.market.find((m) => m.symbol === "conilon_es_esalq")?.price ?? null,
  };
  const cepeaRefDe = (c: { specie: string | null }) =>
    c.specie ? cepeaBySpecie[c.specie] ?? null : null;

  // Insight automático no topo: a leitura do dia em uma frase, por prioridade.
  const bestCepea = best ? cepeaRefDe(best) : null;
  const bestVsCepeaPct =
    best && bestCepea && bestCepea > 0
      ? ((best.current_price - bestCepea) / bestCepea) * 100
      : null;
  const riser = ofertas
    .filter((o) => o.variacao_pct != null)
    .reduce<(typeof ofertas)[number] | null>(
      (top, o) =>
        (o.variacao_pct ?? 0) > (top?.variacao_pct ?? -Infinity) ? o : top,
      null,
    );

  const insight: Insight | null = !best
    ? null
    : riser && riser.variacao_pct! >= 3
      ? {
          tone: "oportunidade",
          emoji: "🔥",
          title: "Oportunidade",
          detail: `${riser.corretora_name ?? "Uma corretora"} subiu a oferta +${riser.variacao_pct!.toFixed(1)}% — pode ser hora de negociar.`,
        }
      : bestVsCepeaPct != null && bestVsCepeaPct >= 2
        ? {
            tone: "favoravel",
            emoji: "🟢",
            title: "Mercado favorável",
            detail: `O melhor preço (${fmtBRL(best.current_price)}) está +${bestVsCepeaPct.toFixed(1)}% acima do CEPEA.`,
          }
        : bestVsCepeaPct != null && bestVsCepeaPct <= -2
          ? {
              tone: "atencao",
              emoji: "🟡",
              title: "Preços abaixo do mercado",
              detail: `O melhor preço está ${bestVsCepeaPct.toFixed(1)}% abaixo do CEPEA — talvez valha esperar.`,
            }
          : {
              tone: "estavel",
              emoji: "⚪",
              title: "Mercado estável",
              detail: "O melhor preço está em linha com o CEPEA hoje.",
            };

  const insightToneClass: Record<InsightTone, string> = {
    oportunidade: "border-milsaca-dourado/40 bg-milsaca-dourado/10",
    favoravel: "border-success-100 bg-success-50",
    atencao: "border-warning-100 bg-warning-50",
    estavel: "border-neutral-200 bg-neutral-50",
  };

  // Mercado: só cards COM dado (sem "fonte indisponível" frustrando o produtor)
  const marketComDado = data.market.filter((m) => m.price != null);
  const marketNacional = marketComDado.filter((m) => m.source === "cepea_esalq");
  const marketInternacional = marketComDado.filter(
    (m) => m.source !== "cepea_esalq",
  );

  return (
    <div className="space-y-8">
      <DemoModeBadge />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Cotações</h1>
          <p className="text-body-sm text-neutral-600">
            Quanto as corretoras estão pagando pelo seu café hoje.
          </p>
        </div>
        <Link
          href="/painel/produtor/cotacoes/alvos"
          title="Te avisamos no WhatsApp quando o preço bater no seu alvo"
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="h-4 w-4 text-milsaca-dourado" />
          Alertas de preço · WhatsApp
        </Link>
      </header>

      {/* Filtros enxutos (2 dropdowns) */}
      <CotacoesFiltros
        specie={specie}
        praca={praca}
        pracas={data.pracasDisponiveis}
      />

      {/* Insight automático — a leitura do dia em uma frase */}
      {insight ? (
        <div
          className={`flex items-start gap-3 rounded-card border px-4 py-3 ${insightToneClass[insight.tone]}`}
        >
          <span className="text-lg leading-none" aria-hidden>
            {insight.emoji}
          </span>
          <div>
            <p className="text-body-sm font-semibold text-milsaca-cafezal">
              {insight.title}
            </p>
            <p className="text-caption text-neutral-600">{insight.detail}</p>
          </div>
        </div>
      ) : null}

      {/* 🔥 Melhor preço hoje — resposta imediata "quem paga mais?" */}
      {best ? (
        <Card tone="premium">
          <CardContent className="flex flex-wrap items-end justify-between gap-4 p-card">
            <div>
              <p className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-milsaca-dourado-texto">
                <Flame className="h-4 w-4" />
                Melhor preço hoje
              </p>
              <p className="mt-2 text-display leading-none text-milsaca-cafezal">
                {fmtBRL(best.current_price)}
              </p>
              <p className="mt-2 text-body-sm text-neutral-600">
                {best.corretora_name ?? best.region ?? "—"}
                {" · "}
                {best.specie ? SPECIE_LABEL[best.specie] : best.coffee_type}
                {best.process ? ` ${PROCESS_LABEL[best.process]}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {bestAcimaMedia != null && bestAcimaMedia > 0.05 ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-success-50 px-3 py-1 text-body-sm font-semibold text-success-700">
                  <ArrowUpRight className="h-4 w-4" />
                  {bestAcimaMedia.toFixed(1)}% acima da média
                </span>
              ) : null}
              {bestVsCepeaPct != null ? (
                <span
                  className={`inline-flex items-center gap-1 text-body-sm font-semibold ${
                    bestVsCepeaPct >= 0 ? "text-success-700" : "text-danger-700"
                  }`}
                >
                  {bestVsCepeaPct >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {bestVsCepeaPct >= 0 ? "+" : ""}
                  {bestVsCepeaPct.toFixed(1)}% vs CEPEA
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 1. Minhas corretoras — quem compra o MEU café (vem antes do mercado) */}
      <section className="space-y-3">
        <header>
          <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
            <Star className="h-4 w-4 text-milsaca-dourado" />
            {data.minhasCorretoras.length > 0
              ? `Minhas corretoras (${data.minhasCorretoras.length})`
              : "Minhas corretoras"}
          </h2>
          <p className="text-caption text-neutral-600">
            Cotações das corretoras que você favoritou.
          </p>
        </header>

        {data.minhasCorretoras.length === 0 ? (
          <Card tone="premium" className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Star className="h-8 w-8 text-milsaca-dourado/60" />
              <p className="text-body-sm font-medium text-milsaca-cafezal">
                Você ainda não tem corretoras favoritas.
              </p>
              <p className="max-w-md text-caption text-neutral-600">
                Favorite uma corretora no diretório pra ver as cotações dela
                aqui em destaque.
              </p>
              <Button asChild size="sm" variant="primary">
                <Link href="/painel/produtor/corretoras">Ver corretoras</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.minhasCorretoras.map((c) => (
              <CotacaoCardView
                key={c.key}
                c={c}
                accent
                isBest={best?.key === c.key}
                cepeaRef={cepeaRefDe(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Outras praças */}
      {data.outrasPracas.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
              <MapPin className="h-4 w-4 text-milsaca-dourado" />
              Outras corretoras ({data.outrasPracas.length})
            </h2>
            <p className="text-caption text-neutral-600">
              Compare antes de fechar negócio.
            </p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.outrasPracas.map((c) => (
              <CotacaoCardView
                key={c.key}
                c={c}
                isBest={best?.key === c.key}
                cepeaRef={cepeaRefDe(c)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. Mercado (referência) — separado em Nacional × Internacional */}
      {marketNacional.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
              <Activity className="h-4 w-4 text-milsaca-dourado" />
              Mercado nacional
            </h2>
            <p className="text-caption text-neutral-600">
              Referência CEPEA/ESALQ — preço médio do café no Brasil.
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {marketNacional.map((m) => (
              <MarketCard key={`${m.source}-${m.symbol}`} m={m} trend={trend[m.symbol]} />
            ))}
          </div>
        </section>
      ) : null}

      {marketInternacional.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
              <Activity className="h-4 w-4 text-milsaca-dourado" />
              Mercado internacional
            </h2>
            <p className="text-caption text-neutral-600">
              Bolsa de NY (ICE) e dólar (Banco Central) — movem o preço aqui.
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {marketInternacional.map((m) => (
              <MarketCard key={`${m.source}-${m.symbol}`} m={m} trend={trend[m.symbol]} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Calculadora de unidades — "se informa sobre o peso do café" */}
      <section className="space-y-3">
        <header>
          <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
            <Calculator className="h-4 w-4 text-milsaca-dourado" />
            Calculadora de unidades
          </h2>
          <p className="text-caption text-neutral-600">
            Converta entre bags, sacas (60 kg) e quilos na hora.
          </p>
        </header>
        <Card>
          <CardContent className="p-card">
            <CalculadoraUnidades />
          </CardContent>
        </Card>
      </section>

      {/* Vazio total */}
      {data.minhasCorretoras.length === 0 &&
      data.outrasPracas.length === 0 &&
      marketComDado.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
              <Coffee className="h-6 w-6" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              Sem cotações disponíveis ainda.
            </p>
            <p className="text-caption text-neutral-600">
              Assim que uma corretora publicar, aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// =================================================================
// Subcomponentes
// =================================================================

function MarketCard({ m, trend }: { m: MarketIndicator; trend?: MarketTrend }) {
  const fmtFn = m.currency === "USD" ? fmtUSD : fmtBRL;
  const up = m.variation_pct != null && m.variation_pct > 0.001;
  const down = m.variation_pct != null && m.variation_pct < -0.001;

  return (
    <Card className={m.stale ? "border-warning-100 bg-warning-50/40" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-body-sm font-semibold text-milsaca-cafezal">
          {m.label}
        </CardTitle>
        <CardDescription className="text-caption">{m.sublabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-h2 font-semibold text-milsaca-cafezal">
            {m.price != null ? fmtFn(m.price) : "—"}
          </span>
          {m.variation_pct != null ? (
            <span
              className={`inline-flex items-center gap-0.5 text-body-sm font-medium ${
                up
                  ? "text-success-700"
                  : down
                    ? "text-danger-700"
                    : "text-neutral-500"
              }`}
            >
              {up && <ArrowUpRight className="h-3.5 w-3.5" />}
              {down && <ArrowDownRight className="h-3.5 w-3.5" />}
              {m.variation_pct > 0 ? "+" : ""}
              {m.variation_pct.toFixed(2)}%
            </span>
          ) : null}
        </div>
        {trend ? (
          <span
            className={`inline-flex items-center gap-1 text-caption font-medium ${
              trend.direction === "alta"
                ? "text-success-700"
                : trend.direction === "baixa"
                  ? "text-danger-700"
                  : "text-neutral-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                trend.direction === "alta"
                  ? "bg-success-500"
                  : trend.direction === "baixa"
                    ? "bg-danger-500"
                    : "bg-warning-500"
              }`}
            />
            {trend.direction === "alta"
              ? "Alta"
              : trend.direction === "baixa"
                ? "Baixa"
                : "Estável"}
            {trend.pct != null
              ? ` ${trend.pct >= 0 ? "+" : ""}${trend.pct.toFixed(1)}%`
              : ""}{" "}
            · {trend.label}
          </span>
        ) : null}
        {trend?.series && trend.series.length >= 2 ? (
          <Sparkline data={trend.series} className="h-7 w-full text-neutral-400" />
        ) : null}
        <p
          className={`text-caption ${
            m.stale ? "text-warning-700" : "text-neutral-500"
          }`}
        >
          {m.stale ? "Desatualizado · " : ""}
          {timeAgo(m.fetched_at)}
        </p>
      </CardContent>
    </Card>
  );
}

function CotacaoCardView({
  c,
  accent,
  isBest,
  cepeaRef,
}: {
  c: CotacaoCard;
  accent?: boolean;
  /** Marca a oferta de maior preço do dia (a "Melhor oferta"). */
  isBest?: boolean;
  /** Preço CEPEA da mesma espécie, pra mostrar o ganho/perda vs mercado. */
  cepeaRef?: number | null;
}) {
  const v = c.variacao_pct;
  const up = v != null && v > 0.001;
  const down = v != null && v < -0.001;
  const stale = c.status === "stale";

  // Ganho/perda vs CEPEA (#1): quanto essa oferta paga acima/abaixo do mercado.
  const diffCepea =
    cepeaRef != null && cepeaRef > 0 ? c.current_price - cepeaRef : null;
  const pctCepea =
    diffCepea != null && cepeaRef ? (diffCepea / cepeaRef) * 100 : null;
  const acimaCepea = diffCepea != null && diffCepea > 0.5;
  const abaixoCepea = diffCepea != null && diffCepea < -0.5;

  return (
    <Card tone={accent ? "premium" : "default"} interactive>
      <CardContent className="space-y-3 p-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Corretora = âncora visual do card */}
            <p className="truncate text-body font-semibold text-milsaca-cafezal">
              {c.corretora_name ?? c.region ?? "Corretora"}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-caption text-neutral-600">
              {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
              {c.process ? ` · ${PROCESS_LABEL[c.process]}` : ""}
            </p>
            {isBest ? (
              <span className="mt-1.5 inline-flex items-center rounded-pill bg-milsaca-dourado/20 px-2 py-0.5 text-[10px] font-semibold text-milsaca-cafezal">
                🔥 Melhor oferta
              </span>
            ) : null}
          </div>
          {accent ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal">
              <Star className="h-3 w-3" />
              Favorita
            </span>
          ) : c.region ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-caption text-neutral-500">
              <Building2 className="h-3 w-3" />
              {c.region}
            </span>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-h1 leading-none text-milsaca-cafezal">
            {fmtBRL(c.current_price)}
          </span>
          {v != null ? (
            <span
              className={`inline-flex items-center gap-0.5 text-body-sm font-semibold ${
                up
                  ? "text-success-700"
                  : down
                    ? "text-danger-700"
                    : "text-neutral-500"
              }`}
            >
              {up && <ArrowUpRight className="h-3.5 w-3.5" />}
              {down && <ArrowDownRight className="h-3.5 w-3.5" />}
              {v > 0 ? "+" : ""}
              {v.toFixed(1)}%
            </span>
          ) : null}
        </div>

        {diffCepea != null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-medium ${
              acimaCepea
                ? "bg-success-50 text-success-700"
                : abaixoCepea
                  ? "bg-danger-50 text-danger-700"
                  : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {acimaCepea ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
            {abaixoCepea ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            {diffCepea >= 0 ? "+" : "−"}
            {fmtBRL(Math.abs(diffCepea))}/sc
            {pctCepea != null
              ? ` (${pctCepea >= 0 ? "+" : ""}${pctCepea.toFixed(1)}%)`
              : ""}{" "}
            vs CEPEA
          </span>
        ) : null}

        {c.series && c.series.length >= 2 ? (
          <Sparkline data={c.series} className="h-7 w-full text-milsaca-dourado-texto/50" />
        ) : null}

        <p
          className={`text-caption ${stale ? "font-medium text-warning-700" : "text-neutral-500"}`}
        >
          {stale ? "Desatualizada · " : ""}saca 60kg · {fmtDate(c.current_date)}
        </p>
      </CardContent>
    </Card>
  );
}
