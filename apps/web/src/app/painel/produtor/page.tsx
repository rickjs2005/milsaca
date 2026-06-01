import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Coffee,
  Wallet,
  Handshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
} from "./negociacoes/_lib/lead-labels";
import { cn } from "@/lib/utils";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import type { LeadStatus } from "@milsaca/types";
import { coffeeLabel } from "@/lib/coffee";

export const metadata = { title: "Início — Painel do produtor" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Resumo = {
  cotacao: { price: number; variacao: number | null } | null;
  estoqueSacas: number;
  valorEstimado: number | null;
  propostasCount: number;
};

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

async function loadResumo(userId: string): Promise<Resumo> {
  const supabase = await createClient();
  const [cotRes, lotesRes, leadsRes] = await Promise.all([
    supabase
      .from("cotacoes")
      .select("price, reference_date")
      .eq("specie", "arabica")
      .order("reference_date", { ascending: false })
      .limit(2),
    supabase.from("lotes").select("peso_sacas, status").eq("produtor_id", userId),
    supabase.from("leads").select("status").eq("produtor_id", userId),
  ]);

  const cot = (cotRes.data ?? []) as Array<{
    price: number;
    reference_date: string;
  }>;
  let cotacao: Resumo["cotacao"] = null;
  if (cot[0]) {
    const cur = cot[0];
    const prev = cot[1];
    cotacao = {
      price: cur.price,
      variacao: prev ? ((cur.price - prev.price) / prev.price) * 100 : null,
    };
  }

  const lotes = (lotesRes.data ?? []) as Array<{
    peso_sacas: number | string | null;
    status: string;
  }>;
  const estoqueSacas = lotes
    .filter((l) => l.status !== "vendido" && l.status !== "arquivado")
    .reduce((s, l) => s + Number(l.peso_sacas ?? 0), 0);

  const valorEstimado = cotacao ? Math.round(estoqueSacas * cotacao.price) : null;
  const propostasCount = (leadsRes.data ?? []).length;

  return { cotacao, estoqueSacas, valorEstimado, propostasCount };
}

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
    const total =
      r.bag_count && r.proposed_price ? r.bag_count * r.proposed_price : null;
    return {
      id: r.id,
      corretora: corretora ?? "Corretora",
      bag_count: r.bag_count,
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
  const [resumo, propostas] = await Promise.all([
    loadResumo(user.id),
    loadPropostas(user.id),
  ]);

  const primeiroNome = profile?.full_name?.split(" ")[0] ?? null;
  const up = (resumo.cotacao?.variacao ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="space-y-6">
      {/* 1. Saudação compacta */}
      <header>
        <h1 className="text-h2 text-milsaca-cafezal">
          {saudacaoAgora()}
          {primeiroNome ? `, ${primeiroNome}` : ""}
        </h1>
        <p className="mt-0.5 text-body-sm text-neutral-600">
          {resumo.estoqueSacas > 0
            ? `${resumo.estoqueSacas} sacas disponíveis pra vender`
            : "Cadastre seu café e receba propostas das corretoras."}
        </p>
      </header>

      {/* 2-4. KPIs — Valor do meu café é o herói (2 colunas) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* HERÓI: valor total do café */}
        <Card tone="premium" className="col-span-2">
          <CardContent className="p-card">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30">
                <Wallet className="h-5 w-5" />
              </span>
              <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                Valor do meu café
              </p>
            </div>
            <p className="mt-3 text-display leading-none text-milsaca-cafezal">
              {resumo.valorEstimado != null
                ? BRL.format(resumo.valorEstimado)
                : "—"}
            </p>
            <p className="mt-2 text-caption text-neutral-500">
              {resumo.estoqueSacas} sacas × cotação de hoje
            </p>
          </CardContent>
        </Card>

        {/* Cotação hoje — preço grande + variação "hoje" */}
        <Link
          href="/painel/produtor/cotacoes"
          className="col-span-1 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card interactive className="h-full">
            <CardContent className="p-card">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
                  <Coffee className="h-5 w-5" />
                </span>
                <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                  Cotação hoje
                </p>
              </div>
              <p className="mt-3 text-h1 leading-none text-milsaca-cafezal">
                {resumo.cotacao ? BRL.format(resumo.cotacao.price) : "—"}
              </p>
              {resumo.cotacao?.variacao != null ? (
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 text-caption font-semibold",
                    up ? "text-success-700" : "text-danger-700",
                  )}
                >
                  <Arrow className="h-3.5 w-3.5" />
                  {up ? "+" : ""}
                  {resumo.cotacao.variacao.toFixed(1)}% hoje
                </p>
              ) : (
                <p className="mt-2 text-caption text-neutral-500">
                  Arábica · saca 60kg
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Propostas */}
        <Link
          href="/painel/produtor/negociacoes"
          className="col-span-1 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card interactive className="h-full">
            <CardContent className="p-card">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
                  <Handshake className="h-5 w-5" />
                </span>
                <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
                  Propostas
                </p>
              </div>
              <p className="mt-3 text-h1 leading-none text-milsaca-cafezal">
                {resumo.propostasCount}
              </p>
              <p className="mt-2 text-caption text-neutral-500">recebidas</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 5. CTA gigante: vender */}
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

      {/* Propostas recebidas — corretora é o herói do card */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
            Propostas recebidas
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
              <PropostaCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PropostaCard({ p }: { p: Proposta }) {
  // Rótulo + tone da fonte única da persona produtor (negociacoes/_lib/lead-labels).
  return (
    <Card interactive>
      <CardContent className="space-y-4 p-card">
        {/* Corretora = elemento visual mais forte */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-h3 font-semibold text-milsaca-cafezal">
              {p.corretora}
            </p>
            <p className="mt-1 text-caption text-neutral-600">
              {p.bag_count ? `${p.bag_count} sacas` : "—"} ·{" "}
              {p.coffee_type ? coffeeLabel(p.coffee_type) : "—"}{" "}
              · {p.data}
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
              {p.proposed_price != null ? BRL.format(p.proposed_price) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-neutral-500">Total</p>
            <p className="text-body-lg font-bold text-milsaca-cafezal">
              {p.total != null ? BRL.format(p.total) : "—"}
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
