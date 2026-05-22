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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Cotações
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Acompanhe o preço da saca pelo mercado e pelas corretoras que você
            segue.
          </p>
        </div>
        <Link
          href="/painel/produtor/cotacoes/alvos"
          className="inline-flex items-center gap-1.5 rounded-md border border-milsaca-cream-escuro bg-white px-3 py-2 text-sm text-milsaca-verde transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream"
        >
          <Bell className="h-4 w-4 text-milsaca-dourado" />
          Meus alvos
        </Link>
      </header>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-milsaca-verde-claro">Café:</span>
          {SPECIE_FILTERS.map((f) => {
            const active = (specie ?? "") === f.value;
            return (
              <Link
                key={f.value || "all"}
                href={buildHref({ specie: f.value })}
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

        {data.pracasDisponiveis.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-milsaca-verde-claro">Praça:</span>
            <Link
              href={buildHref({ praca: "" })}
              className={
                !praca
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
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
                      ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                      : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
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
          <h2 className="flex items-center gap-2 text-base font-semibold text-milsaca-verde">
            <Activity className="h-4 w-4 text-milsaca-dourado" />
            Mercado
          </h2>
          <p className="text-xs text-milsaca-verde-claro">
            Atualizado automaticamente — CEPEA/ESALQ, ICE NY e Banco Central.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.market.map((m) => (
            <MarketCard key={`${m.source}-${m.symbol}`} m={m} />
          ))}
        </div>
        <p className="text-[11px] text-milsaca-verde-claro/80">
          Robusta/Conilon de mercado: fonte automática indisponível no
          momento — veja seções abaixo se uma corretora postou manualmente.
        </p>
      </section>

      {/* 2. Minha corretora (favoritas) */}
      <section className="space-y-3">
        <header>
          <h2 className="flex items-center gap-2 text-base font-semibold text-milsaca-verde">
            <Star className="h-4 w-4 text-milsaca-dourado" />
            {data.minhasCorretoras.length > 0
              ? `Minhas corretoras (${data.minhasCorretoras.length})`
              : "Minhas corretoras"}
          </h2>
          <p className="text-xs text-milsaca-verde-claro">
            Cotações das corretoras que você favoritou. Favorite mais corretoras
            em{" "}
            <Link
              href="/painel/produtor/corretoras"
              className="font-medium underline-offset-2 hover:underline"
            >
              Corretoras
            </Link>
            .
          </p>
        </header>

        {data.minhasCorretoras.length === 0 ? (
          <Card className="border-dashed border-milsaca-cream-escuro bg-milsaca-dourado/5">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Star className="h-8 w-8 text-milsaca-dourado/60" />
              <p className="text-sm text-milsaca-verde">
                Você ainda não tem corretoras favoritas.
              </p>
              <p className="max-w-md text-xs text-milsaca-verde-claro">
                Favorite uma corretora no diretório pra ver as cotações dela
                aqui em destaque.
              </p>
              <Link
                href="/painel/produtor/corretoras"
                className="rounded-md bg-milsaca-verde px-3 py-1.5 text-xs font-medium text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Ver corretoras
              </Link>
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
            <h2 className="flex items-center gap-2 text-base font-semibold text-milsaca-verde">
              <MapPin className="h-4 w-4 text-milsaca-dourado" />
              Outras praças ({data.outrasPracas.length})
            </h2>
            <p className="text-xs text-milsaca-verde-claro">
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
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Coffee className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Sem cotações disponíveis ainda.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
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
    <Card
      className={`${
        m.stale
          ? "border-amber-200 bg-amber-50/40"
          : "border-milsaca-cream-escuro bg-white"
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-milsaca-verde">
          {m.label}
        </CardTitle>
        <CardDescription className="text-xs">{m.sublabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {m.price == null ? (
          <p className="text-sm italic text-amber-700">
            Fonte automática indisponível
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-milsaca-verde">
                {fmtFn(m.price)}
              </span>
              {m.variation_pct != null ? (
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-medium ${
                    up
                      ? "text-emerald-700"
                      : down
                        ? "text-rose-700"
                        : "text-milsaca-verde-claro"
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
              className={`text-[11px] ${
                m.stale ? "text-amber-700" : "text-milsaca-verde-claro"
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
  const sparkColor = up ? "#047857" : down ? "#be123c" : "#2D3A2E";
  const stale = c.status === "stale";

  return (
    <Card
      className={
        accent
          ? "border-milsaca-dourado/40 bg-milsaca-dourado/5"
          : "border-milsaca-cream-escuro"
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-1.5 text-base text-milsaca-verde">
              {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
              {accent ? (
                <Sparkles className="h-3.5 w-3.5 text-milsaca-dourado" />
              ) : null}
            </CardTitle>
            <CardDescription className="text-xs">
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
          <span className="text-2xl font-semibold text-milsaca-verde">
            {fmtBRL(c.current_price)}
          </span>
          {v != null ? (
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                up
                  ? "text-emerald-700"
                  : down
                    ? "text-rose-700"
                    : "text-milsaca-verde-claro"
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
        <div className="flex flex-wrap gap-3 border-t border-milsaca-cream-escuro/60 pt-2 text-[11px]">
          <Janela label="dia" value={c.variacao_pct} />
          <Janela label="7d" value={c.variacao_7d_pct} />
          <Janela label="30d" value={c.variacao_30d_pct} />
        </div>

        <footer className="flex items-center justify-between gap-2 text-[11px]">
          <span
            className={
              stale
                ? "font-medium text-amber-700"
                : "text-milsaca-verde-claro"
            }
          >
            {stale ? "Desatualizada · " : ""}
            {timeAgo(c.current_date)} · {fmtDate(c.current_date)}
          </span>
          {c.corretora_name ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-verde">
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
      <span className="text-milsaca-verde-claro/60">
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
          ? "font-medium text-emerald-700"
          : down
            ? "font-medium text-rose-700"
            : "text-milsaca-verde-claro"
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
