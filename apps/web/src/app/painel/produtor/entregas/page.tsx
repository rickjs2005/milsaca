import Link from "next/link";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import {
  ENTREGA_STATUS_TONE,
  ENTREGA_STATUS_LABEL,
  type EntregaStatus,
} from "../../corretora/entregas/_lib/queries";

export const metadata = { title: "Entregas — Milsaca" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

type Row = {
  id: string;
  sequencia: number;
  bag_count: number | null;
  status: EntregaStatus;
  data_prevista: string | null;
  data_realizada: string | null;
  peso_liquido_kg: number | string | null;
  contrato:
    | { id: string; code: string; corretora: { name: string } | { name: string }[] | null }
    | { id: string; code: string; corretora: { name: string } | { name: string }[] | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function MinhasEntregasPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data } = await supabase
    .from("entregas")
    .select(
      `id, sequencia, bag_count, status, data_prevista, data_realizada, peso_liquido_kg,
       contrato:contratos!entregas_contrato_id_fkey(id, code, corretora:corretoras!contratos_corretora_id_fkey(name))`,
    )
    .eq("produtor_id", profile.id)
    .order("data_prevista", { ascending: false, nullsFirst: false })
    .limit(200);

  const rows = (data ?? []) as Row[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Minhas entregas</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Acompanhe as entregas programadas e recebidas pelas corretoras.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega ainda"
              description="Quando a corretora programar uma entrega para você, ela aparece aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-200 p-0">
            {rows.map((r) => {
              const c = pickOne(r.contrato);
              const cor = c ? pickOne(c.corretora) : null;
              const pendente = ["programada", "em_transito"].includes(r.status);
              const atrasada =
                pendente && r.data_prevista != null && r.data_prevista < today;
              const liquido =
                r.peso_liquido_kg != null ? Number(r.peso_liquido_kg) : null;
              return (
                <div
                  key={r.id}
                  className={
                    atrasada
                      ? "flex items-center justify-between gap-4 bg-danger-50/40 px-5 py-4"
                      : "flex items-center justify-between gap-4 px-5 py-4"
                  }
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c?.id ? (
                        <Link
                          href={`/painel/produtor/contratos/${c.id}`}
                          className="font-mono text-caption text-milsaca-dourado-texto hover:underline"
                        >
                          {c.code}
                        </Link>
                      ) : (
                        <p className="font-mono text-caption text-milsaca-dourado-texto">
                          {c?.code ?? "—"}
                        </p>
                      )}
                      <span className="text-caption text-neutral-500">
                        · #{r.sequencia}
                      </span>
                    </div>
                    <p className="mt-0.5 text-body-sm text-neutral-600">
                      {cor?.name ?? "—"}
                    </p>
                    <p className="mt-1 text-caption text-neutral-500">
                      {r.bag_count ? `${r.bag_count} sacas · ` : ""}
                      Prevista{" "}
                      <span
                        className={
                          atrasada ? "font-medium text-danger-700" : undefined
                        }
                      >
                        {fmtDate(r.data_prevista)}
                      </span>
                      {r.data_realizada
                        ? ` · Entregue ${fmtDate(r.data_realizada)}`
                        : ""}
                      {liquido ? ` · ${liquido.toLocaleString("pt-BR")} kg` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone={ENTREGA_STATUS_TONE[r.status]}>
                      {ENTREGA_STATUS_LABEL[r.status]}
                    </StatusBadge>
                    {atrasada ? (
                      <StatusBadge tone="danger" withDot>
                        Em atraso
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-caption text-neutral-500">
        Quer reagendar ou tirar dúvida?{" "}
        <Link
          href="/painel/produtor/corretoras"
          className="font-medium text-milsaca-cafezal hover:underline"
        >
          Fale com a corretora
        </Link>
        .
      </p>
    </div>
  );
}
