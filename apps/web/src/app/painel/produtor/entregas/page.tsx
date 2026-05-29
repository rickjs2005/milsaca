import Link from "next/link";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import {
  ENTREGA_STATUS_COLOR,
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
    | { code: string; corretora: { name: string } | { name: string }[] | null }
    | { code: string; corretora: { name: string } | { name: string }[] | null }[]
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
       contrato:contratos!entregas_contrato_id_fkey(code, corretora:corretoras!contratos_corretora_id_fkey(name))`,
    )
    .eq("produtor_id", profile.id)
    .order("data_prevista", { ascending: false, nullsFirst: false })
    .limit(200);

  const rows = (data ?? []) as Row[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          <Truck className="h-7 w-7" />
          Minhas entregas
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Acompanhe as entregas programadas e recebidas pelas corretoras.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Nenhuma entrega ainda. Quando a corretora programar, aparece aqui.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
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
                      ? "flex items-center justify-between gap-4 bg-rose-50/40 px-5 py-4"
                      : "flex items-center justify-between gap-4 px-5 py-4"
                  }
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-milsaca-verde">
                        {c?.code ?? "—"}
                      </p>
                      <span className="text-[10px] text-milsaca-verde-claro">
                        · #{r.sequencia}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-milsaca-verde-claro">
                      {cor?.name ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-milsaca-verde-claro/80">
                      {r.bag_count ? `${r.bag_count} sacas · ` : ""}
                      Prevista{" "}
                      <span
                        className={
                          atrasada ? "font-medium text-rose-700" : undefined
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
                    <Badge
                      className={`${ENTREGA_STATUS_COLOR[r.status]} hover:${ENTREGA_STATUS_COLOR[r.status]}`}
                    >
                      {ENTREGA_STATUS_LABEL[r.status]}
                    </Badge>
                    {atrasada ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                        Em atraso
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-milsaca-verde-claro/70">
        Quer reagendar ou tirar dúvida?{" "}
        <Link
          href="/painel/produtor/corretoras"
          className="text-milsaca-dourado hover:underline"
        >
          Fale com a corretora
        </Link>
        .
      </p>
    </div>
  );
}
