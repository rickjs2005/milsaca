import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Wallet,
  Handshake,
  Star,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ShoppingCart,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { IndicadoresLive } from "@/components/indicadores-live";
import { MinhaSafra, type IndiceRef } from "./_components/minha-safra";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
} from "./negociacoes/_lib/lead-labels";
import { cn } from "@/lib/utils";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import type { LeadStatus } from "@milsaca/types";
import { coffeeLabel } from "@/lib/coffee";
import { loadEstoqueProdutor } from "./_lib/estoque";
import { loadCarteira } from "./_lib/carteira";
import { getProdutorByProfileId } from "./_lib/produtor";
import { loadProdutorCotacoes } from "./cotacoes/_lib/queries";

export const metadata = { title: "Início — Painel do produtor" };

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
    .in("status", ["novo", "em_negociacao"])
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

function melhorPropostaId(propostas: Proposta[]): string | null {
  let melhorId: string | null = null;
  let melhorValor = -Infinity;
  for (const p of propostas) {
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

  const specie = produtor?.specie === "conilon" ? "conilon" : "arabica";
  const cepeaSymbol =
    specie === "conilon" ? "conilon_es_esalq" : "arabica_bica_corrida_esalq";

  const [estoque, propostas, cot, carteira] = await Promise.all([
    loadEstoqueProdutor(user.id),
    loadPropostas(user.id),
    loadProdutorCotacoes({ produtorId: user.id }),
    loadCarteira(user.id),
  ]);

  // ÍNDICE MILSACA = média do preço das corretoras na plataforma (da espécie).
  // É dado próprio (white-label). CEPEA fica como referência secundária; se não
  // houver corretora cotando, cai no CEPEA.
  const cepea =
    cot.market.find((m) => m.symbol === cepeaSymbol)?.price ?? null;
  const normSpecie = (s: string | null) =>
    s === "conillon" ? "conilon" : s ?? "";
  const candidatas = [...cot.minhasCorretoras, ...cot.outrasPracas].filter(
    (c) => normSpecie(c.specie) === specie,
  );
  const indiceMilsaca =
    candidatas.length > 0
      ? candidatas.reduce((s, c) => s + c.current_price, 0) / candidatas.length
      : null;
  const indice: IndiceRef = {
    preco: indiceMilsaca ?? cepea,
    fonte: indiceMilsaca != null ? "milsaca" : "cepea",
    cepea,
    nCorretoras: candidatas.length,
  };

  // Melhor oportunidade: corretora pagando acima da referência (índice).
  let melhorCorretora: (typeof candidatas)[number] | null = null;
  for (const c of candidatas) {
    if (!melhorCorretora || c.current_price > melhorCorretora.current_price)
      melhorCorretora = c;
  }
  const ganho =
    melhorCorretora &&
    indice.preco != null &&
    melhorCorretora.current_price > indice.preco &&
    estoque.disponivel > 0
      ? {
          corretora: melhorCorretora.corretora_name ?? "uma corretora",
          preco: melhorCorretora.current_price,
          extra: Math.round(
            estoque.disponivel * (melhorCorretora.current_price - indice.preco),
          ),
        }
      : null;

  const primeiroNome = profile?.full_name?.split(" ")[0] ?? null;
  const idMelhorProposta = melhorPropostaId(propostas);
  const favoritas = cot.minhasCorretoras.slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h2 text-milsaca-cafezal">
          {saudacaoAgora()}
          {primeiroNome ? `, ${primeiroNome}` : ""}
        </h1>
        <p className="mt-0.5 text-body-sm text-neutral-600">
          {estoque.total > 0
            ? `${estoque.disponivel} disponíveis · ${estoque.emNegociacao} em negociação · ${estoque.vendido} vendidas`
            : "Cadastre seu café e receba propostas das corretoras."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PRINCIPAL — a safra e o que fazer com ela */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Minha Safra (herói) */}
          <MinhaSafra estoque={estoque} indice={indice} />

          {/* 2. Ações rápidas — alvos grandes, uma mão */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AcaoRapida href="/painel/produtor/cafe/novo" icon={Plus} label="Registrar café" destaque />
            <AcaoRapida href="/painel/produtor/corretoras" icon={ShoppingCart} label="Vender café" />
            <AcaoRapida href="/painel/produtor/contratos" icon={FileText} label="Contratos" />
            <AcaoRapida href="/painel/produtor/financeiro" icon={Wallet} label="Financeiro" />
          </div>

          {/* Melhor oportunidade de venda */}
          {ganho ? (
            <Card className="border-success-100 bg-success-50/40">
              <CardContent className="flex items-center gap-3 p-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <p className="text-body-sm text-milsaca-cafezal">
                  <span className="font-semibold">{ganho.corretora}</span> está
                  pagando{" "}
                  <span className="font-semibold">
                    {BRL2.format(ganho.preco)}/saca
                  </span>{" "}
                  — acima da média. Pelas suas {estoque.disponivel} sacas
                  disponíveis, são{" "}
                  <span className="font-semibold text-success-700">
                    +{BRL0.format(ganho.extra)}
                  </span>
                  .
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* 4. Corretoras pagando hoje (melhor preço) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
                <Star className="h-4 w-4" />
                Corretoras · preço de hoje
              </h2>
              <Link
                href="/painel/produtor/corretoras"
                className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Ver →
              </Link>
            </div>
            {favoritas.length === 0 ? (
              <Card tone="muted" className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-body-sm text-neutral-600">
                    Favorite corretoras pra ver o preço que elas pagam aqui.
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Propostas em aberto */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
                <Handshake className="h-4 w-4" />
                Propostas em aberto
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
                    Nenhuma proposta em aberto. Comece chamando uma corretora.
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
                  <PropostaCard
                    key={p.id}
                    p={p}
                    melhor={p.id === idMelhorProposta}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SECUNDÁRIA — dinheiro e mercado (referência) */}
        <div className="space-y-6">
          {/* Financeiro — a receber × recebido */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
                <Wallet className="h-4 w-4" />
                Financeiro
              </h2>
              <Link
                href="/painel/produtor/financeiro"
                className="rounded-md text-caption font-medium text-milsaca-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Ver →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/painel/produtor/financeiro"
                className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card interactive className="h-full">
                  <CardContent className="p-card">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-50 text-warning-700">
                        <Clock className="h-4 w-4" />
                      </span>
                      <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                        A receber
                      </p>
                    </div>
                    <p className="mt-2 text-h3 tabular-nums text-milsaca-cafezal">
                      {BRL0.format(carteira.aReceber)}
                    </p>
                    {carteira.vencido > 0 ? (
                      <p className="text-caption font-medium text-danger-700">
                        {BRL0.format(carteira.vencido)} em atraso
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
              <Link
                href="/painel/produtor/financeiro"
                className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card interactive className="h-full">
                  <CardContent className="p-card">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-50 text-success-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                        Recebido
                      </p>
                    </div>
                    <p className="mt-2 text-h3 tabular-nums text-milsaca-cafezal">
                      {BRL0.format(carteira.recebido)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Indicadores de mercado (referência) — sempre por último */}
          <IndicadoresLive />
        </div>
      </div>
    </div>
  );
}

function AcaoRapida({
  href,
  icon: Icon,
  label,
  destaque,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border px-3 py-4 text-center text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        destaque
          ? "border-transparent bg-success-600 text-milsaca-cream hover:bg-success-700"
          : "border-neutral-200 bg-white text-milsaca-cafezal hover:border-milsaca-dourado",
      )}
    >
      <Icon className="h-6 w-6" />
      {label}
    </Link>
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
