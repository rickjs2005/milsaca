import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmSubmit } from "../../_components/confirm-submit";
import { SubmitButton } from "../../_components/submit-button";
import {
  cancelSubscription,
  markSubscriptionPaid,
  updateSubscription,
} from "../_actions";

export const metadata = { title: "Assinatura · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function AssinaturaDetalhePage({
  params,
  searchParams,
}: PageProps) {
  await requireAppAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();

  const [{ data: sub }, { data: plans }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        plan_id,
        started_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        canceled_at,
        notes,
        corretora_id,
        corretoras(id, name, city, state, cnpj),
        plans(id, name, billing_period, price_cents)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("id, name, slug, active, price_cents, billing_period")
      .order("active", { ascending: false })
      .order("price_cents", { ascending: true }),
  ]);

  if (!sub) notFound();

  type SubFull = {
    id: string;
    status: "trial" | "active" | "past_due" | "canceled" | "expired";
    plan_id: string | null;
    started_at: string;
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string | null;
    canceled_at: string | null;
    notes: string | null;
    corretora_id: string;
    corretoras: { id: string; name: string; city: string | null; state: string | null; cnpj: string | null } | null;
    plans: { id: string; name: string; billing_period: "monthly" | "yearly"; price_cents: number } | null;
  };
  const s = sub as unknown as SubFull;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/assinaturas"
        className="text-xs text-milsaca-dourado hover:underline"
      >
        ← Assinaturas
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {s.corretoras?.name ?? "—"}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {[s.corretoras?.city, s.corretoras?.state].filter(Boolean).join("/")}
            {s.corretoras?.cnpj ? ` · CNPJ ${s.corretoras.cnpj}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="text-slate-600">
          Desde {fmtDateTime(s.started_at)}
        </Badge>
      </header>

      {saved ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Salvo.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <Stat label="Status" value={s.status} />
        <Stat label="Plano" value={s.plans?.name ?? "—"} />
        <Stat
          label={s.status === "trial" ? "Trial até" : "Período até"}
          value={fmtDateTime(
            s.status === "trial" ? s.trial_ends_at : s.current_period_end,
          )}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ações rápidas
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={markSubscriptionPaid}>
            <input type="hidden" name="id" value={s.id} />
            <SubmitButton
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              pendingLabel="Renovando..."
            >
              Marcar como paga · +1 período
            </SubmitButton>
          </form>
          {s.status !== "canceled" ? (
            <form action={cancelSubscription}>
              <input type="hidden" name="id" value={s.id} />
              <ConfirmSubmit
                variant="outline"
                className="text-destructive hover:text-destructive"
                confirmTitle="Cancelar assinatura?"
                confirmMessage={
                  <>
                    <p>
                      <strong>{s.corretoras?.name ?? "Esta corretora"}</strong>{" "}
                      terá a assinatura marcada como cancelada agora. O acesso
                      ao painel pode parar de funcionar dependendo do gate
                      configurado.
                    </p>
                    <p className="mt-2">
                      Reverter exige criar nova assinatura ou editar o status
                      manualmente.
                    </p>
                  </>
                }
                confirmButtonLabel="Cancelar assinatura"
                pendingLabel="Cancelando..."
              >
                Cancelar
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      </section>

      <form
        action={updateSubscription}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="id" value={s.id} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Editar manualmente
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan_id">Plano</Label>
            <select
              id="plan_id"
              name="plan_id"
              defaultValue={s.plan_id ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— sem plano —</option>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.active ? "" : "(inativo)"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={s.status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="trial">Trial</option>
              <option value="active">Ativa</option>
              <option value="past_due">Vencida</option>
              <option value="canceled">Cancelada</option>
              <option value="expired">Expirada</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trial_ends_at">Trial termina em</Label>
            <Input
              id="trial_ends_at"
              name="trial_ends_at"
              type="date"
              defaultValue={toInputDate(s.trial_ends_at)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="current_period_end">Período termina em</Label>
            <Input
              id="current_period_end"
              name="current_period_end"
              type="date"
              defaultValue={toInputDate(s.current_period_end)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas internas</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={s.notes ?? ""}
            placeholder="Pagou via PIX em DD/MM, próxima cobrança..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <SubmitButton
            className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            pendingLabel="Salvando..."
          >
            Salvar
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
