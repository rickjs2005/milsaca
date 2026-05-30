import Link from "next/link";
import { Plus, Wallet, CheckCircle2, FileText } from "lucide-react";
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
  listPagamentos,
  sumPagamentosLiquido,
  signedComprovanteUrl,
  PAGAMENTOS_PAGE_SIZE,
  PAGAMENTO_STATUS_LABEL,
  PAGAMENTO_STATUS_TONE,
  PAGAMENTO_STATUS_ORDER,
  type PagamentoStatus,
} from "./_lib/queries";
import { marcarPago, cancelarPagamento } from "./_actions";

export const metadata = { title: "Pagamentos — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

const FILTERS: { value: "" | PagamentoStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...PAGAMENTO_STATUS_ORDER.map((s) => ({ value: s, label: PAGAMENTO_STATUS_LABEL[s] })),
];

function isStatus(v: string | undefined): v is PagamentoStatus {
  return (PAGAMENTO_STATUS_ORDER as readonly string[]).includes(v ?? "");
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

export default async function PagamentosPage({
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

  const [{ rows: itens, count }, { aPagar, pago }] = await Promise.all([
    listPagamentos(profile.corretora_id, { status }, page),
    sumPagamentosLiquido(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PAGAMENTOS_PAGE_SIZE));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs
      ? `/painel/corretora/pagamentos?${qs}`
      : "/painel/corretora/pagamentos";
  }

  // Signed URLs (5 min) para comprovantes dos pagamentos já pagos.
  const comprovanteUrls = new Map<string, string>();
  await Promise.all(
    itens
      .filter((p) => p.status === "pago" && p.comprovante_url)
      .map(async (p) => {
        const url = await signedComprovanteUrl(p.comprovante_url);
        if (url) comprovanteUrls.set(p.id, url);
      }),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-verde">Pagamentos ao produtor</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Controle do repasse — registre o que deve e marque como pago. O
            pagamento em si é feito direto com o produtor (a Milsaca não
            movimenta dinheiro). O produtor vê o status no Financeiro dele.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/pagamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar pagamento
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-card">
            <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
              A pagar (líquido)
            </p>
            <p className="mt-1 text-h2 tabular-nums text-milsaca-verde">
              {formatBRL(aPagar)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-card">
            <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
              Já pago (líquido)
            </p>
            <p className="mt-1 text-h2 tabular-nums text-milsaca-verde">
              {formatBRL(pago)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Status
        </span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/corretora/pagamentos?${params.toString()}`
            : "/painel/corretora/pagamentos";
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
              icon={Wallet}
              title={`Nenhum pagamento${status ? " com esse status" : ""}`}
              description="Registre o repasse de um contrato para acompanhar aqui."
              cta={{
                label: "Registrar pagamento",
                href: "/painel/corretora/pagamentos/novo",
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
                  <th className="px-5 py-3 text-left font-medium">Produtor</th>
                  <th className="px-5 py-3 text-left font-medium">Contrato</th>
                  <th className="px-5 py-3 text-right font-medium">Bruto</th>
                  <th className="px-5 py-3 text-right font-medium">Líquido</th>
                  <th className="px-5 py-3 text-left font-medium">Previsto</th>
                  <th className="px-5 py-3 text-left font-medium">Pago em</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {itens.map((p) => {
                  const aberto =
                    p.status === "pendente" || p.status === "vencido";
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-5 py-3 font-medium text-milsaca-verde">
                        {p.produtor_nome}
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {p.contrato_code ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                        {formatBRL(p.valor_bruto)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-milsaca-verde">
                        {formatBRL(p.valor_liquido)}
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        {formatDate(p.data_prevista)}
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        {formatDate(p.data_paga)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={PAGAMENTO_STATUS_TONE[p.status]}>
                          {PAGAMENTO_STATUS_LABEL[p.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3">
                        {aberto ? (
                          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                            <form
                              action={marcarPago}
                              encType="multipart/form-data"
                              className="flex items-center gap-2"
                            >
                              <input type="hidden" name="id" value={p.id} />
                              <input
                                type="file"
                                name="comprovante"
                                accept="image/*,application/pdf"
                                title="Anexar comprovante (foto ou PDF do PIX) — opcional"
                                className="max-w-[10rem] text-caption text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-caption file:text-neutral-700 hover:file:bg-neutral-200"
                              />
                              <SubmitButton
                                variant="success"
                                size="sm"
                                pendingLabel="..."
                                className="h-auto gap-1 px-2 py-1 text-caption"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Marcar pago
                              </SubmitButton>
                            </form>
                            <form action={cancelarPagamento}>
                              <input type="hidden" name="id" value={p.id} />
                              <ConfirmSubmit
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-caption text-danger-700 hover:bg-transparent hover:underline"
                                confirmTitle="Cancelar pagamento?"
                                confirmMessage={
                                  <p>
                                    O registro fica como cancelado (não some do
                                    histórico).
                                  </p>
                                }
                                confirmButtonLabel="Cancelar pagamento"
                                pendingLabel="Cancelando..."
                              >
                                Cancelar
                              </ConfirmSubmit>
                            </form>
                          </div>
                        ) : p.status === "pago" &&
                          comprovanteUrls.has(p.id) ? (
                          <div className="flex items-center justify-end whitespace-nowrap">
                            <a
                              href={comprovanteUrls.get(p.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-caption font-medium text-milsaca-cafezal hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ver comprovante
                            </a>
                          </div>
                        ) : null}
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
