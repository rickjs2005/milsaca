import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSignature,
  PackageCheck,
  Reply,
  Repeat2,
  TimerReset,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Triagem as TriagemData } from "../_lib/dashboard";

type Tone = "danger" | "warning";

type Item = {
  count: number;
  label: string;
  acao: string;
  icon: LucideIcon;
  href: string;
  tone: Tone;
};

const TONE: Record<Tone, { tile: string; icon: string; num: string }> = {
  danger: {
    tile: "border-danger-100 bg-danger-50/40 hover:bg-danger-50",
    icon: "bg-danger-100 text-danger-700",
    num: "text-danger-700",
  },
  warning: {
    tile: "border-warning-100 bg-warning-50/40 hover:bg-warning-50",
    icon: "bg-warning-100 text-warning-700",
    num: "text-warning-700",
  },
};

/**
 * Triagem — fila de trabalho da corretora ("o que precisa de você agora").
 * Consolida o antigo "Ação hoje" + "Automação comercial". Sempre visível
 * (é a própria fila da corretora, não feature premium). Só mostra itens > 0.
 */
export function Triagem({ triagem }: { triagem: TriagemData }) {
  const items: Item[] = [
    {
      count: triagem.contrapropostas,
      label: "Contrapropostas a responder",
      acao: "Responder o produtor",
      icon: Reply,
      href: "/painel/corretora/leads?status=em_negociacao",
      tone: "danger",
    },
    {
      count: triagem.aguardandoResposta,
      label: "Aguardando resposta",
      acao: "Fazer 1º contato",
      icon: Clock,
      href: "/painel/corretora/leads?status=novo",
      tone: "danger",
    },
    {
      count: triagem.negociacoesParadas,
      label: "Negociações paradas",
      acao: "Follow-up (+3 dias)",
      icon: TimerReset,
      href: "/painel/corretora/leads?status=em_negociacao",
      tone: "danger",
    },
    {
      count: triagem.pagamentosVencidos,
      label: "Pagamentos vencidos",
      acao: "Registrar repasse",
      icon: Wallet,
      href: "/painel/corretora/pagamentos?status=vencido",
      tone: "danger",
    },
    {
      count: triagem.semAssinatura,
      label: "Contratos sem assinatura",
      acao: "Enviar p/ assinar",
      icon: FileSignature,
      href: "/painel/corretora/contratos?status=rascunho",
      tone: "warning",
    },
    {
      count: triagem.entregasHojeAmanha,
      label: "Entregas hoje/amanhã",
      acao: "Acompanhar",
      icon: Truck,
      href: "/painel/corretora/entregas",
      tone: "warning",
    },
    {
      count: triagem.conferirEntrega,
      label: "Conferir entrega",
      acao: "Conferir peso",
      icon: PackageCheck,
      href: "/painel/corretora/entregas",
      tone: "warning",
    },
    {
      count: triagem.lotesParados,
      label: "Lotes parados",
      acao: "Recompartilhar (+7 dias)",
      icon: Repeat2,
      href: "/painel/corretora/lotes?status=classificado",
      tone: "warning",
    },
  ];
  const ativos = items.filter((i) => i.count > 0);
  const total = ativos.reduce((s, i) => s + i.count, 0);

  return (
    <section aria-label="O que precisa de você agora" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-neutral-600">
          <AlertTriangle className="h-4 w-4 text-danger-600" />
          O que precisa de você agora
          {total > 0 ? (
            <span className="rounded-pill bg-danger-100 px-2 py-0.5 text-caption font-semibold text-danger-700">
              {total}
            </span>
          ) : null}
        </h2>
        <Link
          href="/painel/corretora/tarefas"
          className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Central de tarefas →
        </Link>
      </div>

      {ativos.length === 0 ? (
        <Card tone="muted">
          <CardContent className="flex items-center gap-3 p-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              Nada parado — fila de trabalho zerada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {ativos.map((it) => {
            const Icon = it.icon;
            const t = TONE[it.tone];
            return (
              <Link
                key={it.href + it.label}
                href={it.href}
                className={cn(
                  "group flex flex-col gap-2 rounded-card border p-card shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  t.tile,
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      t.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={cn("text-h2 leading-none tabular-nums", t.num)}>
                    {it.count}
                  </span>
                </div>
                <p className="text-body-sm font-semibold leading-tight text-milsaca-preto">
                  {it.label}
                </p>
                <p className="text-caption font-medium text-milsaca-cafezal opacity-70 transition-opacity group-hover:opacity-100">
                  {it.acao} →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
