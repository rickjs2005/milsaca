import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSignature,
  MessageCircle,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { coffeeLabel } from "@/lib/coffee";
import { fmtMoney0, timeAgo, fmtDate } from "@/lib/format";
import { loadTarefas } from "./_lib/queries";

export const metadata = { title: "Tarefas — Painel da corretora" };

export default async function TarefasPage() {
  const profile = await getProfile();
  const corretoraId = profile?.corretora_id ?? "";
  const tarefas = await loadTarefas(corretoraId);

  const total =
    tarefas.responderProdutor.length +
    tarefas.assinarContrato.length +
    tarefas.cobrarPagamento.length +
    tarefas.conferirEntrega.length;

  return (
    <div className="space-y-section">
      <header>
        <h1 className="text-h1 tracking-tight text-milsaca-cafezal">
          Central de tarefas
        </h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Tudo que espera uma ação sua, num lugar só — responder, assinar,
          cobrar, conferir.
        </p>
      </header>

      {total === 0 ? (
        <Card tone="muted">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-body font-medium text-milsaca-cafezal">
              Nenhuma tarefa pendente.
            </p>
            <p className="max-w-sm text-body-sm text-neutral-600">
              Você está em dia. Novas tarefas aparecem aqui conforme negócios
              avançam.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-section">
          <Grupo
            icon={MessageCircle}
            tone="danger"
            titulo="Responder produtor"
            count={tarefas.responderProdutor.length}
            verHref="/painel/corretora/leads"
          >
            {tarefas.responderProdutor.map((l) => (
              <Linha
                key={l.id}
                href={`/painel/corretora/leads/${l.id}`}
                titulo={l.produtor_nome}
                sub={[
                  l.bag_count ? `${l.bag_count} sacas` : null,
                  l.coffee_type ? coffeeLabel(l.coffee_type) : null,
                  l.status === "novo"
                    ? `novo · ${timeAgo(l.updated_at)}`
                    : `em negociação · ${timeAgo(l.updated_at)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                acao={l.status === "novo" ? "Fazer contato" : "Follow-up"}
              />
            ))}
          </Grupo>

          <Grupo
            icon={FileSignature}
            tone="warning"
            titulo="Assinar contrato"
            count={tarefas.assinarContrato.length}
            verHref="/painel/corretora/contratos"
          >
            {tarefas.assinarContrato.map((c) => (
              <Linha
                key={c.id}
                href={`/painel/corretora/contratos/${c.id}`}
                titulo={`${c.code} · ${c.produtor_nome}`}
                sub={[
                  c.status === "rascunho" ? "rascunho" : "em análise",
                  c.total_value != null ? fmtMoney0(c.total_value) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                acao={
                  c.status === "rascunho"
                    ? "Enviar p/ assinatura"
                    : "Acompanhar"
                }
              />
            ))}
          </Grupo>

          <Grupo
            icon={Wallet}
            tone="danger"
            titulo="Cobrar / repassar pagamento"
            count={tarefas.cobrarPagamento.length}
            verHref="/painel/corretora/pagamentos"
          >
            {tarefas.cobrarPagamento.map((p) => (
              <Linha
                key={p.id}
                href="/painel/corretora/pagamentos"
                titulo={p.produtor_nome}
                sub={[
                  p.contrato_code,
                  fmtMoney0(p.valor_liquido),
                  p.status === "vencido"
                    ? "vencido"
                    : p.data_prevista
                      ? `vence ${fmtDate(p.data_prevista)}`
                      : "a repassar",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                acao="Registrar repasse"
                alerta={p.status === "vencido"}
              />
            ))}
          </Grupo>

          <Grupo
            icon={Truck}
            tone="warning"
            titulo="Conferir entrega"
            count={tarefas.conferirEntrega.length}
            verHref="/painel/corretora/entregas"
          >
            {tarefas.conferirEntrega.map((e) => (
              <Linha
                key={e.id}
                href={`/painel/corretora/entregas/${e.id}`}
                titulo={`${e.contrato_code} · ${e.produtor_nome}`}
                sub={[
                  e.bag_count ? `${e.bag_count} sacas` : null,
                  "recebida — conferir peso",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                acao="Conferir peso"
              />
            ))}
          </Grupo>
        </div>
      )}
    </div>
  );
}

type Tone = "danger" | "warning";

const TONE_ICON: Record<Tone, string> = {
  danger: "bg-danger-50 text-danger-700",
  warning: "bg-warning-50 text-warning-700",
};

function Grupo({
  icon: Icon,
  tone,
  titulo,
  count,
  verHref,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  titulo: string;
  count: number;
  verHref: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-label font-semibold text-milsaca-cafezal">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${TONE_ICON[tone]}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          {titulo}
          <span className="rounded-pill bg-neutral-100 px-2 py-0.5 text-caption font-semibold text-neutral-600">
            {count}
          </span>
        </h2>
        <Link
          href={verHref}
          className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Abrir →
        </Link>
      </div>
      <Card>
        <CardContent className="divide-y divide-neutral-200 p-0">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function Linha({
  href,
  titulo,
  sub,
  acao,
  alerta,
}: {
  href: string;
  titulo: string;
  sub: string;
  acao: string;
  alerta?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-card py-3.5 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-milsaca-cafezal">
          {titulo}
        </p>
        <p
          className={
            alerta
              ? "mt-0.5 truncate text-caption font-medium text-danger-700"
              : "mt-0.5 truncate text-caption text-neutral-600"
          }
        >
          {alerta ? (
            <Clock className="mr-1 inline h-3 w-3 align-[-1px]" />
          ) : null}
          {sub}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-caption font-semibold text-milsaca-cafezal group-hover:gap-1.5 sm:inline-flex">
        {acao}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 sm:hidden" />
    </Link>
  );
}
