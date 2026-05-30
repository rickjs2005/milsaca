import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  Coffee,
  MapPin,
  Sparkles,
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
import { Sparkline } from "./_components/sparkline";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";
import type {
  CotacaoCard,
  MarketIndicator,
} from "./_lib/queries";

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

  function buildHref(next: { specie?: string; praca?: string }) {
    const params = new URLSearchParams();
    if (next.specie !== undefined) {
      if (next.specie) params.set("specie", next.specie);
    } else if (specie) {
      params.set("specie", specie);
    }
    if (next.praca !== undefined) {
      if (next.praca) params.set("praca", next.praca);
    } else if (praca) {
      params.set("praca", praca);
    }
    const qs = params.toString();
    return qs
      ? `/painel/produtor/cotacoes?${qs}`
      : "/painel/produtor/cotacoes";
  }

  return (
    <div className="space-y-8">
      <DemoModeBadge />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Cotações</h1>
          <p className="text-body-sm text-neutral-600">
            Acompanhe o preço da saca pelo mercado e pelas corretoras que você
            segue.
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

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm text-neutral-600">Café:</span>
          {SPECIE_FILTERS.map((f) => {
            const active = (specie ?? "") === f.value;
            return (
              <Link
                key={f.value || "all"}
                href={buildHref({ specie: f.value })}
                className={
                  active
                    ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                    : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {data.pracasDisponiveis.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-sm text-neutral-600">Praça:</span>
            <Link
              href={buildHref({ praca: "" })}
              className={
                !praca
                  ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
              }
            >
              Todas
            </Link>
            {data.pracasDisponiveis.map((p) => {
              const active = praca === p.slug;
              return (
                <Link
                  key={p.slug}
                  href={buildHref({ praca: p.slug })}
                  className={
                    active
                      ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                      : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
                  }
                >
                  {p.name}/{p.state}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* 1. Mercado */}
      <section className="space-y-3">
        <header>
          <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
            <Activity className="h-4 w-4 text-milsaca-dourado" />
            Mercado
          </h2>
          <p className="text-caption text-neutral-600">
            Atualizado automaticamente — CEPEA/ESALQ, ICE NY e Banco Central.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.market.map((m) => (
            <MarketCard key={`${m.source}-${m.symbol}`} m={m} />
          ))}
        </div>
        <p className="text-caption text-neutral-500">
          Robusta/Conilon de mercado: fonte automática indisponível no
          momento — veja seções abaixo se uma corretora postou manualmente.
        </p>
      </section>

      {/* 2. Minha corretora (favoritas) */}
      <section className="space-y-3">
        <header>
          <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
            <Star className="h-4 w-4 text-milsaca-dourado" />
            {data.minhasCorretoras.length > 0
              ? `Minhas corretoras (${data.minhasCorretoras.length})`
              : "Minhas corretoras"}
          </h2>
          <p className="text-caption text-neutral-600">
            Cotações das corretoras que você favoritou. Favorite mais corretoras
            em{" "}
            <Link
              href="/painel/produtor/corretoras"
              className="font-medium text-milsaca-cafezal underline-offset-2 hover:underline"
            >
              Corretoras
            </Link>
            .
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

      {/* 3. Outras praças */}
      {data.outrasPracas.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h2 className="flex items-center gap-2 text-h3 text-milsaca-cafezal">
              <MapPin className="h-4 w-4 text-milsaca-dourado" />
              Outras praças ({data.outrasPracas.length})
            </h2>
            <p className="text-caption text-neutral-600">
              Cotações de outras corretoras na plataforma — comparar antes de
              fechar.
            </p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.outrasPracas.map((c) => (
              <CotacaoCardView key={c.key} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {data.minhasCorretoras.length === 0 && data.outrasPracas.length === 0 ? (
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
        {m.price == null ? (
          <p className="text-body-sm italic text-warning-700">
            Fonte automática indisponível
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-milsaca-cafezal">
                {fmtFn(m.price)}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CotacaoCardView({ c, accent }: { c: CotacaoCard; accent?: boolean }) {
  const v = c.variacao_pct;
  const up = v != null && v > 0.001;
  const down = v != null && v < -0.001;
  // Cores de marca: success (#2E7D52) pra alta, danger (#B23B2E) pra baixa,
  // cafezal (#0F3D2E) pra estável — em vez de emerald/rose crus.
  const sparkColor = up ? "#2E7D52" : down ? "#B23B2E" : "#0F3D2E";
  const stale = c.status === "stale";

  return (
    <Card tone={accent ? "premium" : "default"} interactive>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-1.5 text-milsaca-cafezal">
              {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
              {accent ? (
                <Sparkles className="h-3.5 w-3.5 text-milsaca-dourado" />
              ) : null}
            </CardTitle>
            <CardDescription className="text-caption">
              {c.process ? PROCESS_LABEL[c.process] : "Sem processo"}
              {c.region ? (
                <span className="ml-2 inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {c.region}
                </span>
              ) : null}
            </CardDescription>
          </div>
          <Sparkline values={c.series} color={sparkColor} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold text-milsaca-cafezal">
            {fmtBRL(c.current_price)}
          </span>
          {v != null ? (
            <span
              className={`inline-flex items-center gap-1 text-body-sm font-medium ${
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
              {v.toFixed(2)}%
            </span>
          ) : null}
        </div>

        {/* Janelas 1d/7d/30d */}
        <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-2 text-caption">
          <Janela label="dia" value={c.variacao_pct} />
          <Janela label="7d" value={c.variacao_7d_pct} />
          <Janela label="30d" value={c.variacao_30d_pct} />
        </div>

        <footer className="flex items-center justify-between gap-2 text-caption">
          <span
            className={stale ? "font-medium text-warning-700" : "text-neutral-500"}
          >
            {stale ? "Desatualizada · " : ""}
            {timeAgo(c.current_date)} · {fmtDate(c.current_date)}
          </span>
          {c.corretora_name ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal">
              <Building2 className="h-3 w-3" />
              {c.corretora_name}
            </span>
          ) : null}
        </footer>
      </CardContent>
    </Card>
  );
}

function Janela({ label, value }: { label: string; value: number | null }) {
  if (value == null) {
    return (
      <span className="text-neutral-400">
        {label}: <span className="font-mono">—</span>
      </span>
    );
  }
  const up = value > 0.001;
  const down = value < -0.001;
  return (
    <span
      className={
        up
          ? "font-medium text-success-700"
          : down
            ? "font-medium text-danger-700"
            : "text-neutral-500"
      }
    >
      {label}:{" "}
      <span className="font-mono">
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}%
      </span>
    </span>
  );
}
