import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Plus, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { getProfile } from "@/lib/auth";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import { Pagination } from "@/components/pagination";
import {
  ENTREGA_STATUS_TONE,
  ENTREGA_STATUS_LABEL,
  ENTREGA_STATUS_ORDER,
  ENTREGAS_PAGE_SIZE,
  countEntregasAtrasadas,
  listEntregas,
  type EntregaStatus,
} from "./_lib/queries";

export const metadata = { title: "Entregas — Milsaca" };

type SearchParams = Promise<{
  status?: string;
  page?: string;
  ok?: string;
  error?: string;
}>;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { status, page: pageParam, ok, error } = await searchParams;
  const filter = ENTREGA_STATUS_ORDER.includes(status as EntregaStatus)
    ? (status as EntregaStatus)
    : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ rows: entregas, count }, atrasadasCt, subscription] =
    await Promise.all([
      listEntregas(profile.corretora_id, { status: filter }, page),
      countEntregasAtrasadas(profile.corretora_id),
      getCorretoraSubscriptionInfo(profile.corretora_id),
    ]);
  const isPro = isProOrAbove(subscription);
  const totalPages = Math.max(1, Math.ceil(count / ENTREGAS_PAGE_SIZE));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs
      ? `/painel/corretora/entregas?${qs}`
      : "/painel/corretora/entregas";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h1 text-milsaca-verde">
            <Truck className="h-7 w-7" />
            Entregas
          </h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Programação, romaneio e ciclo de recebimento dos contratos.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/entregas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova entrega
          </Link>
        </Button>
      </header>

      {ok ? (
        <p className="rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {error}
        </p>
      ) : null}

      {!isPro ? (
        <LockedHint
          feature="entregas"
          description="Acompanhe programação, romaneio e ciclo de recebimento dos contratos. Disponível no plano Corretora Pro."
        />
      ) : null}

      {atrasadasCt > 0 && !filter ? (
        <div className="flex items-center gap-2 rounded-card border border-danger-100 bg-danger-50 px-4 py-3 text-body-sm text-danger-700">
          <AlertTriangle className="h-4 w-4" />
          {atrasadasCt} entrega{atrasadasCt > 1 ? "s" : ""} em atraso. Resolva
          essas primeiro.
        </div>
      ) : null}

      {/* Filtros pill */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Status
        </span>
        <FilterPill href="/painel/corretora/entregas" active={!filter}>
          Todas
        </FilterPill>
        {ENTREGA_STATUS_ORDER.map((s) => (
          <FilterPill
            key={s}
            href={`/painel/corretora/entregas?status=${s}`}
            active={filter === s}
          >
            {ENTREGA_STATUS_LABEL[s]}
          </FilterPill>
        ))}
      </div>

      {entregas.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Truck}
              title={
                filter
                  ? `Nenhuma entrega "${ENTREGA_STATUS_LABEL[filter]}"`
                  : "Nenhuma entrega cadastrada"
              }
              description="Programe a primeira entrega de um contrato para acompanhar o ciclo de recebimento aqui."
              cta={{
                label: "Nova entrega",
                href: "/painel/corretora/entregas/nova",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-body-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-caption font-medium uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Contrato</th>
                  <th className="px-5 py-3 font-medium">Produtor</th>
                  <th className="px-5 py-3 text-right font-medium">Sacas</th>
                  <th className="px-5 py-3 font-medium">Prevista</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {entregas.map((e) => (
                  <tr
                    key={e.id}
                    className={
                      e.is_atrasada
                        ? "bg-danger-50/60 transition-colors hover:bg-danger-50"
                        : "transition-colors hover:bg-neutral-50"
                    }
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/contratos/${e.contrato_id}`}
                        className="font-mono text-caption font-medium text-milsaca-cafezal hover:underline"
                      >
                        {e.contrato_code}
                      </Link>
                      <p className="text-caption text-neutral-500">
                        #{e.sequencia}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">
                      {e.produtor_nome}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                      {e.bag_count ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          e.is_atrasada
                            ? "font-medium text-danger-700"
                            : "text-neutral-700"
                        }
                      >
                        {fmtDate(e.data_prevista)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={ENTREGA_STATUS_TONE[e.status]}>
                        {ENTREGA_STATUS_LABEL[e.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/painel/corretora/entregas/${e.id}`}
                        className="text-caption font-medium text-milsaca-cafezal hover:underline"
                      >
                        Abrir →
                      </Link>
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

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
          : "rounded-pill border border-neutral-200 px-3 py-1 text-caption font-medium text-neutral-600 transition-colors hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal"
      }
    >
      {children}
    </Link>
  );
}
