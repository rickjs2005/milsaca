import Link from "next/link";
import { Plus, Store, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { getProfile } from "@/lib/auth";
import {
  listOfertas,
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_COLOR,
  OFERTA_STATUS_ORDER,
  type OfertaStatus,
} from "./_lib/queries";
import { atualizarStatusOferta, deleteOferta } from "./_actions";

export const metadata = { title: "Ofertas a compradores — Painel da corretora" };

type SearchParams = Promise<{ status?: string }>;

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
  const itens = await listOfertas(profile.corretora_id, { status });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-milsaca-verde sm:text-3xl">
            Ofertas a compradores
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Registre o que você ofertou a cada cafeeira/comprador e acompanhe o
            status. A conversa acontece no WhatsApp; aqui fica o controle. Ao
            aceitar, gere o contrato em um clique.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/ofertas/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova oferta
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Filtrar:</span>
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
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {itens.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Store className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhuma oferta{status ? " com esse status" : ""}.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Ofereça um lote a um comprador para acompanhar aqui.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/ofertas/novo">Nova oferta</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Comprador</th>
                  <th className="px-5 py-3 text-left">Lote</th>
                  <th className="px-5 py-3 text-right">Preço/saca</th>
                  <th className="px-5 py-3 text-right">Sacas</th>
                  <th className="px-5 py-3 text-left">Validade</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {itens.map((o) => {
                  const aberta = o.status === "enviada" || o.status === "rascunho";
                  return (
                    <tr key={o.id} className="hover:bg-milsaca-cream-escuro/30">
                      <td className="px-5 py-3 font-medium text-milsaca-verde">
                        {o.comprador_nome}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde-claro">
                        {o.lote_codigo ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-milsaca-verde">
                        {formatBRL(o.preco_saca)}
                      </td>
                      <td className="px-5 py-3 text-right text-milsaca-verde">
                        {o.bag_count != null
                          ? o.bag_count.toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        {formatDate(o.validade_ate)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          className={`${OFERTA_STATUS_COLOR[o.status]} hover:${OFERTA_STATUS_COLOR[o.status]}`}
                        >
                          {OFERTA_STATUS_LABEL[o.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          {aberta ? (
                            <>
                              <form action={atualizarStatusOferta}>
                                <input type="hidden" name="id" value={o.id} />
                                <input type="hidden" name="status" value="aceita" />
                                <SubmitButton
                                  size="sm"
                                  pendingLabel="..."
                                  className="h-auto bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
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
                                  className="h-auto p-0 text-xs text-rose-700 hover:bg-transparent hover:underline"
                                >
                                  Recusada
                                </SubmitButton>
                              </form>
                            </>
                          ) : null}
                          {o.status === "aceita" ? (
                            <Button
                              asChild
                              size="sm"
                              className="h-auto gap-1 bg-milsaca-verde px-2 py-1 text-xs text-milsaca-cream hover:bg-milsaca-verde-claro"
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
                              className="h-auto p-0 text-xs text-milsaca-verde-claro hover:bg-transparent hover:underline"
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
    </div>
  );
}
