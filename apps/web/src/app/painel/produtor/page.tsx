import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Coffee, MessageCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const types = ["arabica", "conillon"];
  const result: CotacaoCard[] = [];
  for (const t of types) {
    const { data } = await supabase
      .from("cotacoes")
      .select("coffee_type, price, source, reference_date")
      .eq("coffee_type", t)
      .order("reference_date", { ascending: false })
      .limit(2);
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
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          {primeiroNome ? `Oi, ${primeiroNome}` : "Bem-vindo"}
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Veja preços do dia e as propostas que chegaram pra você.
        </p>
      </header>

      <Link
        href="/painel/produtor/corretoras"
        className="group flex items-center justify-between gap-4 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-sm transition hover:bg-emerald-700"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Falar com uma corretora</p>
            <p className="text-xs text-emerald-50/90">
              Vê quem atende sua região e chama no WhatsApp em 1 toque.
            </p>
          </div>
        </div>
        <span className="text-sm font-medium opacity-90 group-hover:opacity-100">
          Ver corretoras →
        </span>
      </Link>

      <IndicadoresLive />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            Últimas propostas
          </h2>
          {propostas.length > 0 ? (
            <Link
              href="/painel/produtor/negociacoes"
              className="text-xs text-milsaca-dourado hover:underline"
            >
              Ver todas →
            </Link>
          ) : null}
        </div>
        {propostas.length === 0 ? (
          <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
            <CardContent className="space-y-3 py-6 text-center">
              <p className="text-sm text-milsaca-verde-claro">
                Nenhuma proposta ainda. Comece chamando uma corretora.
              </p>
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Link href="/painel/produtor/corretoras">
                  <MessageCircle className="mr-1 h-3.5 w-3.5" />
                  Ver corretoras
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
              {propostas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-milsaca-verde">
                      {p.corretora}
                    </p>
                    <p className="text-xs text-milsaca-verde-claro">
                      {p.bag_count ? `${p.bag_count} sacas` : "—"} ·{" "}
                      {p.coffee_type
                        ? (COFFEE_LABEL[p.coffee_type] ?? p.coffee_type)
                        : "—"}{" "}
                      · {p.data}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
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
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
            <Coffee className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {cotacao.variacao !== null && (
          <span
            className={
              up
                ? "flex items-center gap-0.5 text-sm font-medium text-emerald-700"
                : "flex items-center gap-0.5 text-sm font-medium text-rose-700"
            }
          >
            <Arrow className="h-4 w-4" />
            {up ? "+" : ""}
            {cotacao.variacao.toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          {BRL.format(cotacao.price)}
        </p>
        <p className="mt-1 text-xs text-milsaca-verde-claro">
          saca 60kg · {cotacao.source ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
      <CardContent className="py-6 text-center text-sm text-milsaca-verde-claro">
        {message}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  if (status === "convertido") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Aceita
      </Badge>
    );
  }
  if (status === "perdido") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
        Recusada
      </Badge>
    );
  }
  if (status === "arquivado") {
    return (
      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
        Arquivada
      </Badge>
    );
  }
  if (status === "em_negociacao") {
    return (
      <Badge className="bg-milsaca-dourado/20 text-milsaca-verde hover:bg-milsaca-dourado/20">
        Em negociação
      </Badge>
    );
  }
  // novo
  return (
    <Badge className="bg-milsaca-cream-escuro text-milsaca-verde hover:bg-milsaca-cream-escuro">
      Nova
    </Badge>
  );
}
