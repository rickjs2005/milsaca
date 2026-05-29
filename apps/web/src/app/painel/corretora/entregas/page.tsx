import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Plus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import {
  ENTREGA_STATUS_COLOR,
  ENTREGA_STATUS_LABEL,
  ENTREGA_STATUS_ORDER,
  listEntregas,
  type EntregaStatus,
} from "./_lib/queries";

export const metadata = { title: "Entregas — Milsaca" };

type SearchParams = Promise<{ status?: string; ok?: string; error?: string }>;

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
  const { status, ok, error } = await searchParams;
  const filter = ENTREGA_STATUS_ORDER.includes(status as EntregaStatus)
    ? (status as EntregaStatus)
    : undefined;

  const [entregas, subscription] = await Promise.all([
    listEntregas(profile.corretora_id, { status: filter }),
    getCorretoraSubscriptionInfo(profile.corretora_id),
  ]);
  const atrasadasCt = entregas.filter((e) => e.is_atrasada).length;
  const isPro = isProOrAbove(subscription);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-milsaca-verde">
            <Truck className="h-7 w-7" />
            Entregas
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Programação, romaneio e ciclo de recebimento dos contratos.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/entregas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova entrega
          </Link>
        </Button>
      </header>

      {ok ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
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
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          {atrasadasCt} entrega{atrasadasCt > 1 ? "s" : ""} em atraso. Resolva
          essas primeiro.
        </div>
      ) : null}

      {/* Filtros pill */}
      <div className="flex flex-wrap gap-2">
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
        <div className="rounded-2xl border border-milsaca-cream-escuro bg-white p-8 text-center text-sm text-milsaca-verde-claro">
          Nenhuma entrega {filter ? `com status "${ENTREGA_STATUS_LABEL[filter]}"` : "cadastrada"}.{" "}
          <Link
            href="/painel/corretora/entregas/nova"
            className="text-milsaca-dourado hover:underline"
          >
            Criar a primeira
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-milsaca-cream-escuro bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-milsaca-cream-escuro/30 text-left text-xs uppercase tracking-wide text-milsaca-verde-claro">
              <tr>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Produtor</th>
                <th className="px-4 py-3">Sacas</th>
                <th className="px-4 py-3">Prevista</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((e) => (
                <tr
                  key={e.id}
                  className={
                    e.is_atrasada
                      ? "border-t border-rose-200/40 bg-rose-50/40"
                      : "border-t border-milsaca-verde/5"
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/painel/corretora/contratos/${e.contrato_id}`}
                      className="font-mono text-xs text-milsaca-verde hover:underline"
                    >
                      {e.contrato_code}
                    </Link>
                    <p className="text-[10px] text-milsaca-verde-claro">
                      #{e.sequencia}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-milsaca-verde">
                    {e.produtor_nome}
                  </td>
                  <td className="px-4 py-3 text-milsaca-verde-claro">
                    {e.bag_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        e.is_atrasada
                          ? "font-medium text-rose-700"
                          : "text-milsaca-verde-claro"
                      }
                    >
                      {fmtDate(e.data_prevista)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`${ENTREGA_STATUS_COLOR[e.status]} hover:${ENTREGA_STATUS_COLOR[e.status]}`}
                    >
                      {ENTREGA_STATUS_LABEL[e.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/painel/corretora/entregas/${e.id}`}
                      className="text-xs text-milsaca-dourado hover:underline"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
          ? "rounded-full bg-milsaca-verde px-4 py-1.5 text-xs font-medium text-milsaca-cream"
          : "rounded-full border border-milsaca-verde/20 px-4 py-1.5 text-xs font-medium text-milsaca-verde-claro hover:border-milsaca-verde hover:text-milsaca-verde"
      }
    >
      {children}
    </Link>
  );
}
