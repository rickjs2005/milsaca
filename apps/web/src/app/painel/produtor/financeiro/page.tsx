import { redirect } from "next/navigation";
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { signedComprovanteUrl } from "../../corretora/pagamentos/_lib/queries";

export const metadata = { title: "Financeiro — Milsaca" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-milsaca-dourado/20 text-milsaca-verde",
  pago: "bg-emerald-100 text-emerald-700",
  vencido: "bg-rose-100 text-rose-700",
  cancelado: "bg-slate-200 text-slate-700",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

type DescObj = Record<string, unknown>;

function fmtDesconto(d: unknown): string | null {
  if (!d || typeof d !== "object") return null;
  const desc = d as DescObj;
  const items = Object.entries(desc)
    .filter(([, v]) => typeof v === "number" && (v as number) > 0)
    .map(
      ([k, v]) =>
        `${k}: ${BRL.format(v as number)}`,
    );
  return items.length > 0 ? items.join(" · ") : null;
}

export default async function FinanceiroPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_pagamentos")
    .select(
      `id, valor_bruto, descontos, valor_liquido, status,
       data_prevista, data_paga, comprovante_url, observacoes,
       contrato:contratos!produtor_pagamentos_contrato_id_fkey(code),
       corretora:corretoras!produtor_pagamentos_corretora_id_fkey(name)`,
    )
    .eq("produtor_id", profile.id)
    .order("data_prevista", { ascending: false, nullsFirst: false })
    .limit(200);

  type Row = {
    id: string;
    valor_bruto: number | string;
    descontos: unknown;
    valor_liquido: number | string;
    status: string;
    data_prevista: string | null;
    data_paga: string | null;
    comprovante_url: string | null;
    observacoes: string | null;
    contrato: { code: string } | { code: string }[] | null;
    corretora: { name: string } | { name: string }[] | null;
  };
  const rows = (data ?? []) as Row[];

  // Signed URLs (5 min) para comprovantes dos pagamentos já pagos.
  const comprovanteUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.status === "pago" && r.comprovante_url)
      .map(async (r) => {
        const url = await signedComprovanteUrl(r.comprovante_url);
        if (url) comprovanteUrls.set(r.id, url);
      }),
  );

  function pickOne<T>(v: T | T[] | null | undefined): T | null {
    if (v == null) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const totals = rows.reduce(
    (acc, r) => {
      const liq = Number(r.valor_liquido);
      if (r.status === "pago") acc.pago += liq;
      else if (r.status === "pendente") acc.pendente += liq;
      else if (r.status === "vencido") acc.vencido += liq;
      return acc;
    },
    { pago: 0, pendente: 0, vencido: 0 },
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          <Wallet className="h-7 w-7" />
          Financeiro
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Repasses das corretoras pelos seus contratos.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="A receber"
          value={totals.pendente}
          icon={<Clock className="h-4 w-4" />}
          tone="info"
        />
        <KpiCard
          label="Recebido"
          value={totals.pago}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <KpiCard
          label="Em atraso"
          value={totals.vencido}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="warn"
        />
      </section>

      {rows.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Sem repasses por aqui ainda. Quando uma entrega for conferida e a
            corretora lançar o pagamento, vai aparecer nesta página.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
            {rows.map((r) => {
              const cor = pickOne(r.corretora);
              const con = pickOne(r.contrato);
              const desc = fmtDesconto(r.descontos);
              return (
                <div key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-milsaca-dourado">
                          {con?.code ?? "—"}
                        </p>
                        <span className="text-xs text-milsaca-verde-claro">
                          · {cor?.name ?? "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-milsaca-verde-claro">
                        Prevista {fmtDate(r.data_prevista)}
                        {r.data_paga ? ` · Paga ${fmtDate(r.data_paga)}` : ""}
                      </p>
                    </div>
                    <Badge
                      className={`${STATUS_COLOR[r.status] ?? "bg-slate-100"} hover:${STATUS_COLOR[r.status] ?? "bg-slate-100"}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Money label="Bruto" value={Number(r.valor_bruto)} />
                    {desc ? (
                      <div className="sm:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-milsaca-verde-claro">
                          Descontos
                        </p>
                        <p className="text-xs text-milsaca-verde-claro/80">
                          {desc}
                        </p>
                      </div>
                    ) : null}
                    <Money
                      label="Líquido"
                      value={Number(r.valor_liquido)}
                      strong
                    />
                  </div>
                  {r.observacoes ? (
                    <p className="mt-2 text-xs italic text-milsaca-verde-claro/70">
                      “{r.observacoes}”
                    </p>
                  ) : null}
                  {comprovanteUrls.has(r.id) ? (
                    <a
                      href={comprovanteUrls.get(r.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-milsaca-verde hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ver comprovante
                    </a>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "info" | "success" | "warn";
}) {
  const className =
    tone === "warn" && value > 0
      ? "border-rose-200 bg-rose-50/40"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50/40"
        : "border-milsaca-cream-escuro";
  const valClass =
    tone === "warn" && value > 0
      ? "text-rose-700"
      : tone === "success" && value > 0
        ? "text-emerald-700"
        : "text-milsaca-verde";
  return (
    <Card className={className}>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
            {label}
          </p>
          <span className="text-milsaca-verde-claro">{icon}</span>
        </div>
        <p className={`text-2xl font-semibold tracking-tight ${valClass}`}>
          {BRL.format(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function Money({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-milsaca-verde-claro">
        {label}
      </p>
      <p
        className={
          strong
            ? "text-sm font-semibold text-milsaca-verde"
            : "text-sm text-milsaca-verde-claro"
        }
      >
        {BRL.format(value)}
      </p>
    </div>
  );
}
