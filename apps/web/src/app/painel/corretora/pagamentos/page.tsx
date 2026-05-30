import Link from "next/link";
import { Plus, Wallet, CheckCircle2, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  PAGAMENTO_STATUS_COLOR,
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
          <h1 className="text-2xl font-semibold tracking-tight text-milsaca-verde sm:text-3xl">
            Pagamentos ao produtor
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Controle do repasse — registre o que deve e marque como pago. O
            pagamento em si é feito direto com o produtor (a Milsaca não
            movimenta dinheiro). O produtor vê o status no Financeiro dele.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/pagamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar pagamento
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
              A pagar (líquido)
            </p>
            <p className="text-2xl font-semibold text-milsaca-verde sm:text-3xl">
              {formatBRL(aPagar)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
              Já pago (líquido)
            </p>
            <p className="text-2xl font-semibold text-milsaca-verde sm:text-3xl">
              {formatBRL(pago)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Filtrar:</span>
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
              <Wallet className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum pagamento{status ? " com esse status" : ""}.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Registre o repasse de um contrato para acompanhar aqui.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/pagamentos/novo">
                Registrar pagamento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Produtor</th>
                  <th className="px-5 py-3 text-left">Contrato</th>
                  <th className="px-5 py-3 text-right">Bruto</th>
                  <th className="px-5 py-3 text-right">Líquido</th>
                  <th className="px-5 py-3 text-left">Previsto</th>
                  <th className="px-5 py-3 text-left">Pago em</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {itens.map((p) => {
                  const aberto =
                    p.status === "pendente" || p.status === "vencido";
                  return (
                    <tr key={p.id} className="hover:bg-milsaca-cream-escuro/30">
                      <td className="px-5 py-3 font-medium text-milsaca-verde">
                        {p.produtor_nome}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde-claro">
                        {p.contrato_code ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-milsaca-verde">
                        {formatBRL(p.valor_bruto)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-milsaca-verde">
                        {formatBRL(p.valor_liquido)}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        {formatDate(p.data_prevista)}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        {formatDate(p.data_paga)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          className={`${PAGAMENTO_STATUS_COLOR[p.status]} hover:${PAGAMENTO_STATUS_COLOR[p.status]}`}
                        >
                          {PAGAMENTO_STATUS_LABEL[p.status]}
                        </Badge>
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
                                className="max-w-[10rem] text-xs text-milsaca-verde-claro file:mr-2 file:rounded-md file:border-0 file:bg-milsaca-cream-escuro file:px-2 file:py-1 file:text-xs file:text-milsaca-verde hover:file:bg-milsaca-cream-claro"
                              />
                              <SubmitButton
                                size="sm"
                                pendingLabel="..."
                                className="h-auto gap-1 bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
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
                                className="h-auto p-0 text-xs text-rose-700 hover:bg-transparent hover:underline"
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
                              className="inline-flex items-center gap-1 text-xs text-milsaca-verde hover:underline"
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

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
