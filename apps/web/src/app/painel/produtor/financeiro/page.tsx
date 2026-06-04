import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
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
  pendente: "A receber",
  pago: "Recebido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<string, StatusTone> = {
  pendente: "warning",
  pago: "success",
  vencido: "danger",
  cancelado: "neutral",
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
       contrato:contratos!produtor_pagamentos_contrato_id_fkey(id, code),
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
    contrato: { id: string; code: string } | { id: string; code: string }[] | null;
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
        <h1 className="text-h1 text-milsaca-cafezal">Financeiro</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Pagamentos que você recebe das corretoras pelos seus contratos.
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
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Wallet}
              title="Sem repasses por aqui ainda"
              description="Quando uma entrega for conferida e a corretora lançar o repasse, ele aparece nesta página."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-200 p-0">
            {rows.map((r) => {
              const cor = pickOne(r.corretora);
              const con = pickOne(r.contrato);
              const desc = fmtDesconto(r.descontos);
              return (
                <div key={r.id} className="p-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {con?.id ? (
                          <Link
                            href={`/painel/produtor/contratos/${con.id}`}
                            className="font-mono text-caption text-milsaca-dourado-texto hover:underline"
                          >
                            {con.code}
                          </Link>
                        ) : (
                          <p className="font-mono text-caption text-milsaca-dourado-texto">
                            {con?.code ?? "—"}
                          </p>
                        )}
                        <span className="text-caption text-neutral-600">
                          · {cor?.name ?? "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-neutral-600">
                        Prevista {fmtDate(r.data_prevista)}
                        {r.data_paga ? ` · Recebido ${fmtDate(r.data_paga)}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[r.status] ?? "neutral"}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Money label="Bruto" value={Number(r.valor_bruto)} />
                    {desc ? (
                      <div className="sm:col-span-1">
                        <p className="text-caption uppercase tracking-wide text-neutral-500">
                          Descontos
                        </p>
                        <p className="text-caption text-neutral-600">
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
                    <p className="mt-2 text-caption italic text-neutral-500">
                      “{r.observacoes}”
                    </p>
                  ) : null}
                  {comprovanteUrls.has(r.id) ? (
                    <a
                      href={comprovanteUrls.get(r.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-milsaca-cafezal hover:underline"
                    >
                      <FileText aria-hidden className="h-3.5 w-3.5" />
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
      ? "border-danger-100 bg-danger-50/40"
      : tone === "success"
        ? "border-success-100 bg-success-50/40"
        : undefined;
  const valClass =
    tone === "warn" && value > 0
      ? "text-danger-700"
      : tone === "success" && value > 0
        ? "text-success-700"
        : "text-milsaca-cafezal";
  return (
    <Card className={className}>
      <CardContent className="space-y-2 p-card">
        <div className="flex items-center justify-between">
          <p className="text-caption font-medium uppercase tracking-wider text-neutral-600">
            {label}
          </p>
          <span className="text-neutral-500">{icon}</span>
        </div>
        <p className={`text-h2 tabular-nums ${valClass}`}>
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
      <p className="text-caption uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={
          strong
            ? "text-body-sm font-semibold tabular-nums text-milsaca-cafezal"
            : "text-body-sm tabular-nums text-neutral-600"
        }
      >
        {BRL.format(value)}
      </p>
    </div>
  );
}
