import { Receipt, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { coffeeLabel } from "@/lib/coffee";

export const metadata = { title: "Vendas — Painel do produtor" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** Formata valor numérico em BRL (pt-BR). */
function fmtBRL(value: number): string {
  return BRL.format(value);
}

/** Formata ISO/timestamp em dd/mm/aaaa (pt-BR). `—` se ausente/ inválido. */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type VendaRow = {
  id: string;
  bag_count: number | null;
  coffee_type: string | null;
  proposed_price: number | string | null;
  updated_at: string | null;
  corretoras: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function VendasProdutorPage() {
  const user = await requireUser("/painel/produtor/vendas");

  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, bag_count, coffee_type, proposed_price, updated_at, corretoras(name)",
    )
    .eq("produtor_id", user.id)
    .eq("status", "convertido")
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as VendaRow[];

  const totals = rows.reduce(
    (acc, r) => {
      const sacas = r.bag_count ?? 0;
      const preco = r.proposed_price != null ? Number(r.proposed_price) : 0;
      acc.sacas += sacas;
      acc.valor += sacas * preco;
      return acc;
    },
    { sacas: 0, valor: 0 },
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Vendas</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Tudo que você já vendeu pelas corretoras.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Receipt}
              title="Nenhuma venda ainda"
              description="Quando uma proposta for aceita e o negócio fechar, ele aparece aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label="Sacas vendidas"
              value={totals.sacas.toLocaleString("pt-BR")}
            />
            <KpiCard label="Valor total" value={fmtBRL(totals.valor)} />
          </section>

          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {rows.map((r) => {
                const cor = pickOne(r.corretoras);
                const sacas = r.bag_count ?? 0;
                const preco =
                  r.proposed_price != null ? Number(r.proposed_price) : 0;
                const total = sacas * preco;
                const cafe = coffeeLabel(r.coffee_type);
                return (
                  <div key={r.id} className="p-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal">
                            <Coffee className="h-4 w-4" />
                          </span>
                          <p className="truncate text-h3 font-semibold text-milsaca-cafezal">
                            {cor?.name ?? "—"}
                          </p>
                        </div>
                        <p className="mt-1 text-body-sm text-neutral-600">
                          {sacas.toLocaleString("pt-BR")} sacas
                          {cafe ? ` · ${cafe}` : ""}
                          {` · ${fmtBRL(preco)}/saca`}
                        </p>
                        <p className="mt-1 text-caption text-neutral-500">
                          Fechada em {fmtDate(r.updated_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-caption uppercase tracking-wide text-neutral-500">
                          Total
                        </p>
                        <p className="text-h3 font-semibold tabular-nums text-milsaca-cafezal">
                          {fmtBRL(total)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-card">
        <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <p className="text-h2 tabular-nums text-milsaca-cafezal">{value}</p>
      </CardContent>
    </Card>
  );
}
