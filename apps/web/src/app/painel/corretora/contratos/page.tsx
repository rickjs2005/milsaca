import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import { Pagination } from "@/components/pagination";
import {
  listContratos,
  CONTRATOS_PAGE_SIZE,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_TONE,
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
} from "./_lib/queries";

export const metadata = { title: "Contratos — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

const FILTERS: { value: "" | ContratoStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...CONTRATO_STATUS_ORDER.map((s) => ({
    value: s,
    label: CONTRATO_STATUS_LABEL[s],
  })),
];

function isContratoStatus(v: string | undefined): v is ContratoStatus {
  return !!v && (CONTRATO_STATUS_ORDER as readonly string[]).includes(v);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function ContratosCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isContratoStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: contratos, count }, subscription] = await Promise.all([
    listContratos(profile.corretora_id, { status }, page),
    getCorretoraSubscriptionInfo(profile.corretora_id),
  ]);
  const isPro = isProOrAbove(subscription);
  const totalPages = Math.max(1, Math.ceil(count / CONTRATOS_PAGE_SIZE));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs
      ? `/painel/corretora/contratos?${qs}`
      : "/painel/corretora/contratos";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-verde">Contratos</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Operações fechadas. Crie a partir de um lead convertido ou direto.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/contratos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo contrato
          </Link>
        </Button>
      </header>

      {!isPro ? (
        <LockedHint
          feature="contratos"
          description="Gerencie contratos completos com comissão automática, status e timeline. Disponível no plano Corretora Pro."
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Status
        </span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/corretora/contratos?${params.toString()}`
            : "/painel/corretora/contratos";
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={
                active
                  ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption font-medium text-neutral-600 transition-colors hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {contratos.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileText}
              title={`Nenhum contrato${status ? " com esse status" : ""}`}
              description="Crie o primeiro a partir de um lead convertido."
              cta={{
                label: "Novo contrato",
                href: "/painel/corretora/contratos/novo",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-body-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Código</th>
                  <th className="px-5 py-3 text-left font-medium">Produtor</th>
                  <th className="px-5 py-3 text-left font-medium">Café</th>
                  <th className="px-5 py-3 text-right font-medium">Sacas</th>
                  <th className="px-5 py-3 text-right font-medium">Valor total</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Assinado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {contratos.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-neutral-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/contratos/${c.id}`}
                        className="font-medium text-milsaca-cafezal hover:underline"
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">
                      {c.produtor_nome}
                    </td>
                    <td className="px-5 py-3 text-neutral-700">
                      {c.coffee_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                      {c.bag_count != null
                        ? c.bag_count.toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-milsaca-verde">
                      {c.total_value != null ? formatBRL(c.total_value) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={CONTRATO_STATUS_TONE[c.status]}>
                        {CONTRATO_STATUS_LABEL[c.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-caption text-neutral-500">
                      {c.signed_at ? formatDate(c.signed_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="border-t border-neutral-200 pt-4">
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </div>
      ) : null}
    </div>
  );
}
