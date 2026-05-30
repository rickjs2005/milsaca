import Link from "next/link";
import { Plus, Store, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { getProfile } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
import {
  listOfertas,
  OFERTAS_PAGE_SIZE,
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_TONE,
  OFERTA_STATUS_ORDER,
  type OfertaStatus,
} from "./_lib/queries";
import { atualizarStatusOferta, deleteOferta } from "./_actions";

export const metadata = { title: "Ofertas a compradores — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

const FILTERS: { value: "" | OfertaStatus; label: string }[] = [
  { value: "", label: "Todas" },
  ...OFERTA_STATUS_ORDER.map((s) => ({ value: s, label: OFERTA_STATUS_LABEL[s] })),
];

function isStatus(v: string | undefined): v is OfertaStatus {
  return (OFERTA_STATUS_ORDER as readonly string[]).includes(v ?? "");
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function gerarContratoHref(o: {
  comprador_id: string;
  lote_id: string | null;
  preco_saca: number;
  bag_count: number | null;
}) {
  const p = new URLSearchParams({ comprador_id: o.comprador_id });
  if (o.lote_id) p.set("lote_id", o.lote_id);
  p.set("preco", String(o.preco_saca));
  if (o.bag_count != null) p.set("bag_count", String(o.bag_count));
  return `/painel/corretora/contratos/novo?${p.toString()}`;
}

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows: itens, count } = await listOfertas(
    profile.corretora_id,
    { status },
    page,
  );
  const totalPages = Math.max(1, Math.ceil(count / OFERTAS_PAGE_SIZE));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs
      ? `/painel/corretora/ofertas?${qs}`
      : "/painel/corretora/ofertas";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-verde">Ofertas a compradores</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Registre o que você ofertou a cada cafeeira/comprador e acompanhe o
            status. A conversa acontece no WhatsApp; aqui fica o controle. Ao
            aceitar, gere o contrato em um clique.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/ofertas/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova oferta
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Status
        </span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/corretora/ofertas?${params.toString()}`
            : "/painel/corretora/ofertas";
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

      {itens.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Store}
              title={`Nenhuma oferta${status ? " com esse status" : ""}`}
              description="Ofereça um lote a um comprador para acompanhar aqui."
              cta={{
                label: "Nova oferta",
                href: "/painel/corretora/ofertas/novo",
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
                  <th className="px-5 py-3 text-left font-medium">Comprador</th>
                  <th className="px-5 py-3 text-left font-medium">Lote</th>
                  <th className="px-5 py-3 text-right font-medium">Preço/saca</th>
                  <th className="px-5 py-3 text-right font-medium">Sacas</th>
                  <th className="px-5 py-3 text-left font-medium">Validade</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {itens.map((o) => {
                  const aberta = o.status === "enviada" || o.status === "rascunho";
                  return (
                    <tr
                      key={o.id}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-5 py-3 font-medium text-milsaca-verde">
                        {o.comprador_nome}
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {o.lote_codigo ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-milsaca-verde">
                        {formatBRL(o.preco_saca)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                        {o.bag_count != null
                          ? o.bag_count.toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        {formatDate(o.validade_ate)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={OFERTA_STATUS_TONE[o.status]}>
                          {OFERTA_STATUS_LABEL[o.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          {aberta ? (
                            <>
                              <form action={atualizarStatusOferta}>
                                <input type="hidden" name="id" value={o.id} />
                                <input type="hidden" name="status" value="aceita" />
                                <SubmitButton
                                  variant="success"
                                  size="sm"
                                  pendingLabel="..."
                                  className="h-auto px-2 py-1 text-caption"
                                >
                                  Aceita
                                </SubmitButton>
                              </form>
                              <form action={atualizarStatusOferta}>
                                <input type="hidden" name="id" value={o.id} />
                                <input type="hidden" name="status" value="recusada" />
                                <SubmitButton
                                  size="sm"
                                  variant="ghost"
                                  pendingLabel="..."
                                  className="h-auto p-0 text-caption text-danger-700 hover:bg-transparent hover:underline"
                                >
                                  Recusada
                                </SubmitButton>
                              </form>
                            </>
                          ) : null}
                          {o.status === "aceita" ? (
                            <Button
                              asChild
                              variant="primary"
                              size="sm"
                              className="h-auto gap-1 px-2 py-1 text-caption"
                            >
                              <Link href={gerarContratoHref(o)}>
                                <FileText className="h-3.5 w-3.5" />
                                Gerar contrato
                              </Link>
                            </Button>
                          ) : null}
                          <form action={deleteOferta}>
                            <input type="hidden" name="id" value={o.id} />
                            <ConfirmSubmit
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-caption text-neutral-500 hover:bg-transparent hover:underline"
                              confirmTitle="Remover oferta?"
                              confirmMessage={<p>A oferta sai do histórico.</p>}
                              confirmButtonLabel="Remover"
                              pendingLabel="Removendo..."
                            >
                              Remover
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
