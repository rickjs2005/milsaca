import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Coffee, MessageCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import type { LeadStatus } from "@milsaca/types";
import { IndicadoresLive } from "@/components/indicadores-live";

export const metadata = { title: "Início — Painel do produtor" };

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

type CotacaoCard = {
  coffee_type: string;
  price: number;
  variacao: number | null;
  source: string | null;
};

type PropostaRow = {
  id: string;
  corretora: string;
  bag_count: number | null;
  coffee_type: string | null;
  status: LeadStatus;
  data: string;
};

async function loadCotacoes(): Promise<CotacaoCard[]> {
  const supabase = await createClient();
  // Últimas 2 cotações de cada tipo principal pra calcular variação.
  // Promise.all em vez de for-await pra cortar 1 RTT.
  const types = ["arabica", "conillon"];
  const queries = await Promise.all(
    types.map((t) =>
      supabase
        .from("cotacoes")
        .select("coffee_type, price, source, reference_date")
        .eq("coffee_type", t)
        .order("reference_date", { ascending: false })
        .limit(2),
    ),
  );

  const result: CotacaoCard[] = [];
  for (const { data } of queries) {
    const rows = (data ?? []) as Array<{
      coffee_type: string;
      price: number;
      source: string | null;
      reference_date: string;
    }>;
    const [current, previous] = rows;
    if (!current) continue;
    const variacao = previous
      ? ((current.price - previous.price) / previous.price) * 100
      : null;
    result.push({
      coffee_type: current.coffee_type,
      price: current.price,
      variacao,
      source: current.source,
    });
  }
  return result;
}

async function loadPropostas(userId: string): Promise<PropostaRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, coffee_type, bag_count, created_at, corretoras(name)",
    )
    .eq("produtor_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (data ?? []) as Array<{
    id: string;
    status: LeadStatus;
    coffee_type: string | null;
    bag_count: number | null;
    created_at: string;
    corretoras: { name: string } | { name: string }[] | null;
  }>;
  return rows.map((r) => {
    const corretora = Array.isArray(r.corretoras)
      ? r.corretoras[0]?.name
      : r.corretoras?.name;
    return {
      id: r.id,
      corretora: corretora ?? "—",
      bag_count: r.bag_count,
      coffee_type: r.coffee_type,
      status: r.status,
      data: new Date(r.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default async function InicioProdutorPage() {
  const user = await requireUser("/painel/produtor");
  const profile = await getProfile();
  const [cotacoes, propostas] = await Promise.all([
    loadCotacoes(),
    loadPropostas(user.id),
  ]);

  const primeiroNome = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">
          {primeiroNome ? `Oi, ${primeiroNome}` : "Bem-vindo"}
        </h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Veja preços do dia e as propostas que chegaram pra você.
        </p>
      </header>

      <Link
        href="/painel/produtor/corretoras"
        className="group flex items-center justify-between gap-4 rounded-card bg-success-600 px-5 py-4 text-milsaca-cream shadow-card transition-colors hover:bg-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-body-sm font-semibold">Falar com uma corretora</p>
            <p className="text-caption text-milsaca-cream/90">
              Vê quem atende sua região e chama no WhatsApp em 1 toque.
            </p>
          </div>
        </div>
        <span className="text-body-sm font-medium opacity-90 group-hover:opacity-100">
          Ver corretoras →
        </span>
      </Link>

      <IndicadoresLive />

      <section className="space-y-3">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Cotações do café
        </h2>
        {cotacoes.length === 0 ? (
          <EmptyCard message="Nenhuma cotação registrada ainda." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cotacoes.map((c) => (
              <CotacaoCardView key={c.coffee_type} cotacao={c} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
            Últimas propostas
          </h2>
          {propostas.length > 0 ? (
            <Link
              href="/painel/produtor/negociacoes"
              className="rounded-md text-caption font-medium text-dourado-texto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <Button asChild variant="success" size="sm">
                <Link href="/painel/produtor/corretoras">
                  <MessageCircle className="h-4 w-4" />
                  Ver corretoras
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {propostas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-milsaca-cafezal">
                      {p.corretora}
                    </p>
                    <p className="mt-0.5 text-caption text-neutral-600">
                      {p.bag_count ? `${p.bag_count} sacas` : "—"} ·{" "}
                      {p.coffee_type
                        ? (COFFEE_LABEL[p.coffee_type] ?? p.coffee_type)
                        : "—"}{" "}
                      · {p.data}
                    </p>
                  </div>
                  <PropostaStatusBadge status={p.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function CotacaoCardView({ cotacao }: { cotacao: CotacaoCard }) {
  const up = (cotacao.variacao ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const label = COFFEE_LABEL[cotacao.coffee_type] ?? cotacao.coffee_type;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
            <Coffee className="h-4 w-4" />
          </span>
          <CardTitle className="text-h3">{label}</CardTitle>
        </div>
        {cotacao.variacao !== null && (
          <span
            className={
              up
                ? "flex items-center gap-0.5 text-body-sm font-medium text-success-700"
                : "flex items-center gap-0.5 text-body-sm font-medium text-danger-700"
            }
          >
            <Arrow className="h-4 w-4" />
            {up ? "+" : ""}
            {cotacao.variacao.toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-h1 text-milsaca-cafezal">
          {BRL.format(cotacao.price)}
        </p>
        <p className="mt-1 text-caption text-neutral-600">
          saca 60kg · {cotacao.source ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card tone="muted" className="border-dashed">
      <CardContent className="py-8 text-center text-body-sm text-neutral-600">
        {message}
      </CardContent>
    </Card>
  );
}

const LEAD_STATUS_BADGE: Record<LeadStatus, { tone: StatusTone; label: string }> = {
  convertido: { tone: "success", label: "Aceita" },
  perdido: { tone: "danger", label: "Recusada" },
  arquivado: { tone: "neutral", label: "Arquivada" },
  em_negociacao: { tone: "premium", label: "Em negociação" },
  novo: { tone: "neutral", label: "Nova" },
};

function PropostaStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_BADGE[status] ?? LEAD_STATUS_BADGE.novo;
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}
