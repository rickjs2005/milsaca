import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Assinaturas · Admin Milsaca" };

type SubStatus = "trial" | "active" | "past_due" | "canceled" | "expired";

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function effectiveStatus(sub: {
  status: SubStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}): SubStatus {
  const now = Date.now();
  if (
    sub.status === "trial" &&
    sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() < now
  ) {
    return "expired";
  }
  if (
    sub.status === "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() < now
  ) {
    return "past_due";
  }
  return sub.status;
}

const STATUS_META: Record<SubStatus, { label: string; className: string }> = {
  trial: { label: "Trial", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  active: { label: "Ativa", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  past_due: { label: "Vencida", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  canceled: { label: "Cancelada", className: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
  expired: { label: "Expirada", className: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
};

export default async function AssinaturasAdminPage({
  searchParams: _searchParams,
}: PageProps) {
  await requireAppAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      started_at,
      trial_ends_at,
      current_period_end,
      corretora_id,
      corretoras(id, name, city, state),
      plans(id, name, slug, price_cents, billing_period)
    `)
    .order("started_at", { ascending: false });

  type Row = {
    id: string;
    status: SubStatus;
    started_at: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    corretora_id: string;
    corretoras: { id: string; name: string; city: string | null; state: string | null } | null;
    plans: { id: string; name: string; slug: string; price_cents: number; billing_period: "monthly" | "yearly" } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Assinaturas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} corretora{rows.length === 1 ? "" : "s"} com assinatura.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Corretora</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Período / Trial</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const eff = effectiveStatus(r);
              const meta = STATUS_META[eff];
              const endRef =
                eff === "trial"
                  ? r.trial_ends_at
                  : r.current_period_end;
              const ufCidade = [r.corretoras?.city, r.corretoras?.state]
                .filter(Boolean)
                .join("/");
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {r.corretoras?.name ?? "—"}
                    </p>
                    {ufCidade ? (
                      <p className="text-xs text-slate-500">{ufCidade}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.plans?.name ?? (
                      <span className="text-slate-400">sem plano</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={meta.className}>{meta.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p>
                      {eff === "trial" ? "Trial até " : "Vence em "}
                      <span className="font-medium">{fmtDate(endRef)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/assinaturas/${r.id}`}
                      className="text-xs font-medium text-milsaca-dourado hover:underline"
                    >
                      Gerenciar →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma assinatura ainda. Toda corretora aprovada ganha trial automaticamente.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
