import {
  ArrowUpRight,
  ArrowDownRight,
  Coffee,
  Handshake,
  TrendingUp as TrendingUpIcon,
  CheckCircle2,
  FileSignature,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@milsaca/db/web/server";
import type { LeadStatus } from "@milsaca/types";

export const metadata = { title: "Início — Painel da corretora" };

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Kpi = {
  label: string;
  value: number;
  hint: string;
  icon: typeof Handshake;
};

type LeadRow = {
  id: string;
  produtor: string;
  bag_count: number | null;
  coffee_type: string | null;
  status: LeadStatus;
  data: string;
};

type CotacaoCard = {
  coffee_type: string;
  price: number;
  variacao: number | null;
  source: string | null;
};

async function loadKpis(): Promise<Kpi[]> {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [novos, emNegociacao, convertidosMes, contratosAtivos] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "novo"),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "em_negociacao"),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "convertido")
        .gte("updated_at", monthStartIso),
      supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo"),
    ]);

  return [
    {
      label: "Leads novos",
      value: novos.count ?? 0,
      hint: "aguardando contato",
      icon: Handshake,
    },
    {
      label: "Em negociação",
      value: emNegociacao.count ?? 0,
      hint: "propostas abertas",
      icon: TrendingUpIcon,
    },
    {
      label: "Convertidos no mês",
      value: convertidosMes.count ?? 0,
      hint: "leads fechados",
      icon: CheckCircle2,
    },
    {
      label: "Contratos ativos",
      value: contratosAtivos.count ?? 0,
      hint: "em execução",
      icon: FileSignature,
    },
  ];
}

async function loadLeadsRecentes(): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, coffee_type, bag_count, created_at, produtor:profiles!leads_produtor_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(6);

  const rows = (data ?? []) as Array<{
    id: string;
    status: LeadStatus;
    coffee_type: string | null;
    bag_count: number | null;
    created_at: string;
    produtor: { full_name: string | null } | { full_name: string | null }[] | null;
  }>;

  return rows.map((r) => {
    const produtor = Array.isArray(r.produtor)
      ? r.produtor[0]?.full_name
      : r.produtor?.full_name;
    return {
      id: r.id,
      produtor: produtor ?? "Produtor sem nome",
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

async function loadCotacoes(): Promise<CotacaoCard[]> {
  const supabase = await createClient();
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

export default async function InicioCorretoraPage() {
  const [kpis, leads, cotacoes] = await Promise.all([
    loadKpis(),
    loadLeadsRecentes(),
    loadCotacoes(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Início
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Resumo da operação e do mercado.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-milsaca-cream-escuro">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">
                  {k.label}
                </CardDescription>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-milsaca-verde">
                  {k.value}
                </p>
                <p className="mt-1 text-xs text-milsaca-verde-claro">
                  {k.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Leads recentes
        </h2>
        {leads.length === 0 ? (
          <EmptyCard message="Nenhum lead na sua corretora ainda." />
        ) : (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
              {leads.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-milsaca-verde">
                      {l.produtor}
                    </p>
                    <p className="text-xs text-milsaca-verde-claro">
                      {l.bag_count ? `${l.bag_count} sacas` : "—"} ·{" "}
                      {l.coffee_type
                        ? (COFFEE_LABEL[l.coffee_type] ?? l.coffee_type)
                        : "—"}{" "}
                      · {l.data}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Cotações de hoje
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
        Convertido
      </Badge>
    );
  }
  if (status === "perdido") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
        Perdido
      </Badge>
    );
  }
  if (status === "arquivado") {
    return (
      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
        Arquivado
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
  return (
    <Badge className="bg-milsaca-cream-escuro text-milsaca-verde hover:bg-milsaca-cream-escuro">
      Novo
    </Badge>
  );
}
