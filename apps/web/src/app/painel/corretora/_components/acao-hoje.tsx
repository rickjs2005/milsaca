import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSignature,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AcoesHoje } from "../_lib/dashboard";

type Tone = "danger" | "warning";

type Item = {
  count: number;
  label: (n: number) => string;
  icon: LucideIcon;
  href: string;
  tone: Tone;
};

const TONE: Record<
  Tone,
  { dot: string; iconWrap: string; badge: string }
> = {
  danger: {
    dot: "bg-danger-500",
    iconWrap: "bg-danger-50 text-danger-700",
    badge: "bg-danger-100 text-danger-700",
  },
  warning: {
    dot: "bg-warning-500",
    iconWrap: "bg-warning-50 text-warning-700",
    badge: "bg-warning-100 text-warning-700",
  },
};

/**
 * "Ação necessária hoje" — a fila de prioridades da corretora, acima de tudo.
 * Só renderiza as linhas com count > 0; se está tudo zerado, mostra "em dia".
 */
export function AcaoHoje({ acoes }: { acoes: AcoesHoje }) {
  const items: Item[] = [
    {
      count: acoes.aguardandoResposta,
      label: (n) =>
        `${n} produtor${n === 1 ? "" : "es"} aguardando resposta`,
      icon: Clock,
      href: "/painel/corretora/leads?status=novo",
      tone: "danger",
    },
    {
      count: acoes.contratosSemAssinatura,
      label: (n) => `${n} contrato${n === 1 ? "" : "s"} sem assinatura`,
      icon: FileSignature,
      href: "/painel/corretora/contratos?status=rascunho",
      tone: "warning",
    },
    {
      count: acoes.pagamentosAtrasados,
      label: (n) => `${n} pagamento${n === 1 ? "" : "s"} atrasado${n === 1 ? "" : "s"}`,
      icon: Wallet,
      href: "/painel/corretora/pagamentos?status=vencido",
      tone: "danger",
    },
    {
      count: acoes.entregasHojeAmanha,
      label: (n) =>
        `${n} entrega${n === 1 ? "" : "s"} prevista${n === 1 ? "" : "s"} (hoje/amanhã)`,
      icon: Truck,
      href: "/painel/corretora/entregas",
      tone: "warning",
    },
  ];
  const ativos = items.filter((i) => i.count > 0);

  return (
    <section aria-label="Ação necessária hoje" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-neutral-600">
          <AlertTriangle className="h-4 w-4 text-danger-600" />
          Ação necessária hoje
        </h2>
        {ativos.length > 0 ? (
          <Link
            href="/painel/corretora/tarefas"
            className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Central de tarefas →
          </Link>
        ) : null}
      </div>

      {ativos.length === 0 ? (
        <Card tone="muted">
          <CardContent className="flex items-center gap-3 p-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              Nada pendente — você está em dia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-danger-100">
          <CardContent className="divide-y divide-neutral-200 p-0">
            {ativos.map((it) => {
              const Icon = it.icon;
              const t = TONE[it.tone];
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="group flex items-center gap-3 px-card py-3.5 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      t.iconWrap,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-body-sm font-medium text-milsaca-preto">
                    {it.label(it.count)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
