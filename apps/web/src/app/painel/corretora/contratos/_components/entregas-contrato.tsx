import Link from "next/link";
import { ArrowRight, FileSignature, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { gerarEntregaDoContrato } from "../../entregas/_actions";
import {
  ENTREGA_STATUS_LABEL,
  ENTREGA_STATUS_TONE,
  sacasRecebidas,
  type EntregaListItem,
  type EntregaStatus,
} from "../../entregas/_lib/entrega-meta";
import { fmtInt } from "@/lib/format";

const DOT_BG: Record<EntregaStatus, string> = {
  programada: "bg-warning-500",
  em_transito: "bg-info-500",
  recebida: "bg-success-500",
  conferida: "bg-milsaca-cafezal",
  cancelada: "bg-neutral-300",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/**
 * Timeline de entregas DENTRO do detalhe do contrato — deixa claro que entrega
 * é parte do contrato (Contrato -> Entrega 1 -> 2 -> ...), com progresso de
 * sacas entregues vs contratadas.
 */
export function EntregasContrato({
  entregas,
  contratado,
  contratoId,
  canCreate,
}: {
  entregas: EntregaListItem[];
  contratado: number | null;
  contratoId: string;
  /** Premium + contrato em estado que aceita entrega. */
  canCreate: boolean;
}) {
  const ativas = entregas.filter((e) => e.status !== "cancelada");
  const entregue = ativas
    .filter((e) => e.status === "recebida" || e.status === "conferida")
    .reduce((s, e) => s + (sacasRecebidas(e) ?? 0), 0);
  const pct =
    contratado && contratado > 0
      ? Math.min(100, Math.round((entregue / contratado) * 100))
      : null;

  const gerarBtn = canCreate ? (
    <form action={gerarEntregaDoContrato} className="inline">
      <input type="hidden" name="contrato_id" value={contratoId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-milsaca-cafezal bg-transparent px-3 text-caption font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Truck className="h-4 w-4" />
        Nova entrega
      </button>
    </form>
  ) : null;

  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-milsaca-cafezal" />
            Entregas
          </CardTitle>
          <CardDescription>
            O romaneio deste contrato. Conferir uma entrega libera o pagamento ao
            produtor.
          </CardDescription>
        </div>
        {gerarBtn}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Progresso de sacas entregues vs contratadas */}
        {contratado && contratado > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-caption">
              <span className="font-medium text-milsaca-cafezal">
                {fmtInt(entregue)} de {fmtInt(contratado)} sacas entregues
              </span>
              {pct != null ? (
                <span className="tabular-nums text-neutral-500">{pct}%</span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-neutral-100">
              <div
                className="h-full rounded-pill bg-milsaca-cafezal transition-all"
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Timeline */}
        {ativas.length === 0 ? (
          <div className="rounded-md border border-dashed border-milsaca-cream-escuro bg-milsaca-cream/40 px-4 py-6 text-center text-caption text-neutral-500">
            {canCreate
              ? "Nenhuma entrega ainda. Gere a primeira pra começar o romaneio."
              : "Nenhuma entrega registrada."}
          </div>
        ) : (
          <ol>
            {/* Nó de origem — o contrato */}
            <li className="relative flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-milsaca-cafezal text-milsaca-cream ring-2 ring-milsaca-cafezal/20">
                  <FileSignature className="h-2.5 w-2.5" />
                </span>
                <span className="w-px flex-1 bg-neutral-200" />
              </div>
              <div className="pb-4">
                <p className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
                  Contrato
                </p>
                <p className="text-body-sm text-neutral-600">
                  início do romaneio
                </p>
              </div>
            </li>

            {ativas.map((e, i) => {
              const last = i === ativas.length - 1;
              const sacas = sacasRecebidas(e) ?? e.bag_count;
              return (
                <li key={e.id} className="relative flex items-stretch gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-4 w-4 rounded-full ring-2 ring-white ${DOT_BG[e.status]}`}
                    />
                    {!last ? (
                      <span className="w-px flex-1 bg-neutral-200" />
                    ) : null}
                  </div>
                  <Link
                    href={`/painel/corretora/entregas/${e.id}`}
                    className="group flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-4 focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-semibold text-milsaca-cafezal group-hover:underline">
                          Entrega #{e.sequencia}
                        </span>
                        <StatusBadge tone={ENTREGA_STATUS_TONE[e.status]}>
                          {ENTREGA_STATUS_LABEL[e.status]}
                        </StatusBadge>
                        {e.is_atrasada ? (
                          <StatusBadge tone="danger">atrasada</StatusBadge>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-caption text-neutral-500">
                        {sacas != null ? `${fmtInt(sacas)} sacas · ` : ""}
                        prevista {fmtDate(e.data_prevista)}
                        {e.data_realizada
                          ? ` · entregue ${fmtDate(e.data_realizada)}`
                          : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-milsaca-cafezal" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
