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
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { DemoModeBadge } from "@/components/demo-mode-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadProdutorCotacoes } from "./_lib/queries";
import { CotacoesFiltros } from "./_components/cotacoes-filtros";
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

  // "Melhor preço hoje" — a maior oferta entre as corretoras (favoritas +
  // outras), com o quanto está acima da média. É a resposta nº 1 do produtor:
  // quem está pagando mais?
  const ofertas = [...data.minhasCorretoras, ...data.outrasPracas];
  const best =
    ofertas.length > 0
      ? ofertas.reduce((b, c) => (c.current_price > b.current_price ? c : b))
      : null;
  const media =
    ofertas.length > 0
      ? ofertas.reduce((s, c) => s + c.current_price, 0) / ofertas.length
      : null;
  const bestAcimaMedia =
    best && media && media > 0
      ? ((best.current_price - media) / media) * 100
      : null;

  // Mercado: só cards COM dado (sem "fonte indisponível" frustrando o produtor)
  const marketComDado = data.market.filter((m) => m.price != null);

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
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="h-4 w-4 text-milsaca-dourado" />
          Meus alvos
        </Link>
      </header>

      {/* Filtros enxutos (2 dropdowns) */}
      <CotacoesFiltros
        specie={specie}
        praca={praca}
        pracas={data.pracasDisponiveis}
      />

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
            {bestAcimaMedia != null && bestAcimaMedia > 0.05 ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-success-50 px-3 py-1 text-body-sm font-semibold text-success-700">
                <ArrowUpRight className="h-4 w-4" />
                {bestAcimaMedia.toFixed(1)}% acima da média
              </span>
            ) : null}
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
              <CotacaoCardView key={c.key} c={c} accent />
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
              <CotacaoCardView key={c.key} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. Mercado (referência) — por último, só com dado disponível */}
      {marketComDado.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
              <Activity className="h-4 w-4 text-milsaca-dourado" />
              Mercado
            </h2>
            <p className="text-caption text-neutral-600">
              Referência — CEPEA/ESALQ, ICE NY e Banco Central.
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            {marketComDado.map((m) => (
              <MarketCard key={`${m.source}-${m.symbol}`} m={m} />
            ))}
          </div>
        </section>
      ) : null}

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

function MarketCard({ m }: { m: MarketIndicator }) {
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

function CotacaoCardView({ c, accent }: { c: CotacaoCard; accent?: boolean }) {
  const v = c.variacao_pct;
  const up = v != null && v > 0.001;
  const down = v != null && v < -0.001;
  const stale = c.status === "stale";

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

        <p
          className={`text-caption ${stale ? "font-medium text-warning-700" : "text-neutral-500"}`}
        >
          {stale ? "Desatualizada · " : ""}saca 60kg · {fmtDate(c.current_date)}
        </p>
      </CardContent>
    </Card>
  );
}
