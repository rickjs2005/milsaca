import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Wallet,
  Handshake,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { IndicadoresLive } from "@/components/indicadores-live";
import { UnidadeToggle } from "@/components/produtor/UnidadeToggle/UnidadeToggle";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
} from "./negociacoes/_lib/lead-labels";
import { cn } from "@/lib/utils";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import type { LeadStatus } from "@milsaca/types";
import { coffeeLabel } from "@/lib/coffee";
import { formatarKg, sacasParaKg } from "@/lib/unidades";
import { loadEstoqueProdutor } from "./_lib/estoque";
import { getProdutorByProfileId } from "./_lib/produtor";
import { loadProdutorCotacoes } from "./cotacoes/_lib/queries";

export const metadata = { title: "Início — Painel do produtor" };

// Peso padrão de big bag pra exibir o estoque agregado em bags (≈, aproximado —
// no nível agregado os lotes podem ter pesos diferentes; o toggle mostra "≈").
const PESO_BAG_PADRAO = 600;

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

type Proposta = {
  id: string;
  corretora: string;
  bag_count: number | null;
  coffee_type: string | null;
  proposed_price: number | null;
  total: number | null;
  status: LeadStatus;
  data: string;
};

async function loadPropostas(userId: string): Promise<Proposta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, coffee_type, bag_count, proposed_price, created_at, corretoras(name)",
    )
    .eq("produtor_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  const rows = (data ?? []) as Array<{
    id: string;
    status: LeadStatus;
    coffee_type: string | null;
    bag_count: number | null;
    proposed_price: number | null;
    created_at: string;
    corretoras: { name: string } | { name: string }[] | null;
  }>;

  return rows.map((r) => {
    const corretora = Array.isArray(r.corretoras)
      ? r.corretoras[0]?.name
      : r.corretoras?.name;
    const bag = r.bag_count != null ? Number(r.bag_count) : null;
    const total = bag && r.proposed_price ? bag * r.proposed_price : null;
    return {
      id: r.id,
      corretora: corretora ?? "Corretora",
      bag_count: bag,
      coffee_type: r.coffee_type,
      proposed_price: r.proposed_price,
      total,
      status: r.status,
      data: new Date(r.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

// Status terminais negativos não disputam "melhor proposta".
const STATUS_DESCARTADO: ReadonlySet<LeadStatus> = new Set<LeadStatus>([
  "perdido",
  "arquivado",
]);

function melhorPropostaId(propostas: Proposta[]): string | null {
  let melhorId: string | null = null;
  let melhorValor = -Infinity;
  for (const p of propostas) {
    if (STATUS_DESCARTADO.has(p.status)) continue;
    const valor = p.total ?? p.proposed_price;
    if (valor == null) continue;
    if (valor > melhorValor) {
      melhorValor = valor;
      melhorId = p.id;
    }
  }
  return melhorId;
}

function saudacaoAgora(): string {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function InicioProdutorPage() {
  const user = await requireUser("/painel/produtor");
  const profile = await getProfile();
  const produtor = await getProdutorByProfileId(profile?.id ?? user.id);

  const [estoque, propostas, cot] = await Promise.all([
    loadEstoqueProdutor(user.id),
    loadPropostas(user.id),
    loadProdutorCotacoes({ produtorId: user.id }),
  ]);

  // Cotação PRINCIPAL = índice CEPEA da espécie do produtor (não a da corretora).
  const specie = produtor?.specie === "conilon" ? "conilon" : "arabica";
  const principalSymbol =
    specie === "conilon" ? "conilon_es_esalq" : "arabica_bica_corrida_esalq";
  const principal = cot.market.find((m) => m.symbol === principalSymbol) ?? null;
  const precoPrincipal = principal?.price ?? null;
  const principalLabel = specie === "conilon" ? "Conilon CEPEA" : "Arábica CEPEA";

  const valorDisponivel =
    precoPrincipal != null ? Math.round(estoque.naoVendido * precoPrincipal) : null;
  const valorVendido = estoque.valorVendido > 0 ? estoque.valorVendido : null;
  const totalKg = sacasParaKg(estoque.total);
  const pct = (n: number) =>
    estoque.total > 0 ? Math.round((n / estoque.total) * 100) : 0;

  const primeiroNome = profile?.full_name?.split(" ")[0] ?? null;
  const idMelhorProposta = melhorPropostaId(propostas);
  const favoritas = cot.minhasCorretoras.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 1. Saudação + resumo do estoque */}
      <header>
        <h1 className="text-h2 text-milsaca-cafezal">
          {saudacaoAgora()}
          {primeiroNome ? `, ${primeiroNome}` : ""}
        </h1>
        <p className="mt-0.5 text-body-sm text-neutral-600">
          {estoque.total > 0
            ? `${estoque.naoVendido} disponíveis · ${estoque.emNegociacao} em negociação · ${estoque.vendido} vendidas`
            : "Cadastre seu café e receba propostas das corretoras."}
        </p>
      </header>

      {/* 2. HERÓI: valor disponível pela cotação principal (índice CEPEA) */}
      <Card tone="premium">
        <CardContent className="p-card">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30">
              <Wallet className="h-5 w-5" />
            </span>
            <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
              Valor disponível para venda
            </p>
          </div>
          <p className="mt-3 text-display leading-none text-milsaca-cafezal">
            {valorDisponivel != null ? BRL0.format(valorDisponivel) : "—"}
          </p>
          <p className="mt-2 text-caption text-neutral-500">
            {estoque.naoVendido} sacas disponíveis ×{" "}
            {precoPrincipal != null
              ? `${principalLabel} ${BRL2.format(precoPrincipal)}/saca`
              : "cotação indisponível"}
          </p>
          <p className="text-caption text-neutral-500">
            Já vendido: {estoque.vendido} sacas
            {valorVendido != null ? ` · ${BRL0.format(valorVendido)}` : ""}
          </p>
        </CardContent>
      </Card>

      {/* 3. Estoque com unidade alternável (sacas / bags / kg) */}
      <Card>
        <CardContent className="p-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              Meu estoque de café
            </p>
            <Link
              href="/painel/produtor/cafe/novo"
              className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              + Registrar café
            </Link>
          </div>

          {estoque.total > 0 ? (
            <>
              <div className="mt-2">
                <UnidadeToggle
                  valorKg={totalKg}
                  pesoPorBagKg={PESO_BAG_PADRAO}
                />
                <p className="mt-0.5 text-caption text-neutral-500">
                  no total · {formatarKg(totalKg)}
                </p>
              </div>

              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-pill bg-neutral-100">
                <div
                  className="bg-success-500"
                  style={{ width: `${pct(estoque.livre)}%` }}
                />
                <div
                  className="bg-warning-400"
                  style={{ width: `${pct(estoque.emNegociacao)}%` }}
                />
                <div
                  className="bg-neutral-400"
                  style={{ width: `${pct(estoque.vendido)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-caption">
                <Legenda cor="bg-success-500" label="Disponível" valor={estoque.livre} />
                <Legenda cor="bg-warning-400" label="Em negociação" valor={estoque.emNegociacao} />
                <Legenda cor="bg-neutral-400" label="Vendido" valor={estoque.vendido} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-body-sm text-neutral-600">
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

      {/* 4. CTA vender */}
      <Link
        href="/painel/produtor/corretoras"
        className="group flex items-center justify-between gap-4 rounded-card bg-success-600 px-6 py-6 text-milsaca-cream shadow-card transition-colors hover:bg-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <p className="text-h3 font-semibold">Vender meu café</p>
            <p className="text-body-sm text-milsaca-cream/90">
              Receba propostas das corretoras da sua região no WhatsApp.
            </p>
          </div>
        </div>
        <ArrowRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>

      {/* 5. Principais cotações (índices de mercado, ao vivo) */}
      <IndicadoresLive />

      {/* 6. Corretoras favoritas — preço do dia */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
            <Star className="h-4 w-4" />
            Suas corretoras · preço de hoje
          </h2>
          <Link
            href="/painel/produtor/corretoras"
            className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver corretoras →
          </Link>
        </div>
        {favoritas.length === 0 ? (
          <Card tone="muted" className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-body-sm text-neutral-600">
                Favorite corretoras pra acompanhar o preço que elas pagam aqui no
                seu painel.
              </p>
              <Link
                href="/painel/produtor/corretoras"
                className="inline-flex items-center gap-2 rounded-md bg-success-600 px-4 py-2 text-body-sm font-medium text-milsaca-cream transition-colors hover:bg-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Ver corretoras
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {favoritas.map((c) => {
              const up = c.variacao_pct != null && c.variacao_pct >= 0;
              const Arrow = up ? ArrowUpRight : ArrowDownRight;
              return (
                <Card key={c.key} interactive>
                  <CardContent className="p-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-milsaca-cafezal">
                          {c.corretora_name ?? "Corretora"}
                        </p>
                        <p className="mt-0.5 text-caption text-neutral-500">
                          {coffeeLabel(c.specie ?? c.coffee_type)}
                          {c.region ? ` · ${c.region}` : ""}
                        </p>
                      </div>
                      {c.variacao_pct != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-caption font-semibold",
                            up
                              ? "bg-success-50 text-success-700"
                              : "bg-danger-50 text-danger-700",
                          )}
                        >
                          <Arrow className="h-3.5 w-3.5" />
                          {up ? "+" : ""}
                          {c.variacao_pct.toFixed(1)}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-h3 font-bold text-milsaca-cafezal">
                      {BRL2.format(c.current_price)}
                      <span className="text-caption font-normal text-neutral-500">
                        /saca
                      </span>
                    </p>
                    <p className="mt-0.5 text-caption text-neutral-500">
                      {new Date(c.current_date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Propostas recebidas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
            <Handshake className="h-4 w-4" />
            Propostas recebidas
          </h2>
          {propostas.length > 0 ? (
            <Link
              href="/painel/produtor/negociacoes"
              className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Ver todas →
            </Link>
          ) : null}
        </div>
        {propostas.length === 0 ? (
          <Card tone="muted" className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-body-sm text-neutral-600">
                Nenhuma proposta ainda. Comece chamando uma corretora.
              </p>
              <Link
                href="/painel/produtor/corretoras"
                className="inline-flex items-center gap-2 rounded-md bg-success-600 px-4 py-2 text-body-sm font-medium text-milsaca-cream transition-colors hover:bg-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Ver corretoras
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {propostas.map((p) => (
              <PropostaCard key={p.id} p={p} melhor={p.id === idMelhorProposta} />
            ))}
          </div>
        )}
      </section>
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
      <span className="font-semibold text-milsaca-cafezal">{valor}</span>
    </div>
  );
}

function PropostaCard({ p, melhor }: { p: Proposta; melhor: boolean }) {
  return (
    <Card interactive>
      <CardContent className="space-y-4 p-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-h3 font-semibold text-milsaca-cafezal">
              {p.corretora}
            </p>
            {melhor ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-pill bg-milsaca-dourado/20 px-2 py-0.5 text-[10px] font-semibold text-milsaca-cafezal">
                🔥 Melhor proposta
              </span>
            ) : null}
            <p className="mt-1 text-caption text-neutral-600">
              {p.bag_count ? `${p.bag_count} sacas` : "—"} ·{" "}
              {p.coffee_type ? coffeeLabel(p.coffee_type) : "—"} · {p.data}
            </p>
          </div>
          <StatusBadge tone={LEAD_STATUS_TONE[p.status]}>
            {LEAD_STATUS_LABEL[p.status]}
          </StatusBadge>
        </div>
        <div className="flex items-end justify-between gap-2 rounded-md bg-milsaca-cream/60 px-3 py-2.5">
          <div>
            <p className="text-caption text-neutral-500">Preço por saca</p>
            <p className="text-body font-semibold text-milsaca-cafezal">
              {p.proposed_price != null ? BRL2.format(p.proposed_price) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-neutral-500">Total</p>
            <p className="text-body-lg font-bold text-milsaca-cafezal">
              {p.total != null ? BRL0.format(p.total) : "—"}
            </p>
          </div>
        </div>
        <Link
          href={`/painel/produtor/negociacoes/${p.id}`}
          className="flex items-center justify-center gap-1 rounded-md border border-neutral-200 py-2 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:bg-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Ver proposta <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
