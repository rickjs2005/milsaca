import Link from "next/link";
import {
  FileText,
  Handshake,
  Package,
  Store,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineFunnel as PipelineData } from "../_lib/dashboard";

type Stage = {
  key: keyof PipelineData;
  label: string;
  icon: LucideIcon;
  href: string;
};

const STAGES: Stage[] = [
  { key: "leads", label: "Leads", icon: Handshake, href: "/painel/corretora/leads" },
  { key: "lotes", label: "Lotes", icon: Package, href: "/painel/corretora/lotes" },
  { key: "ofertas", label: "Ofertas", icon: Store, href: "/painel/corretora/ofertas" },
  { key: "contratos", label: "Contratos", icon: FileText, href: "/painel/corretora/contratos" },
  { key: "entregas", label: "Entregas", icon: Truck, href: "/painel/corretora/entregas" },
  { key: "pagamentos", label: "Pagamentos", icon: Wallet, href: "/painel/corretora/pagamentos" },
];

/**
 * Carga por etapa — quantos registros estão em cada estágio AGORA (não é funil
 * de conversão: os números não precisam cair ao descer). Barras horizontais
 * proporcionais ao maior estágio, pra ver de relance onde está o acúmulo.
 * Cada etapa abre a tela correspondente.
 */
export function PipelineFunnel({ data }: { data: PipelineData }) {
  const max = Math.max(1, ...STAGES.map((s) => data[s.key]));

  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="pb-3">
        <CardTitle className="text-h3 text-milsaca-cafezal">
          Carga por etapa
        </CardTitle>
        <p className="text-caption text-neutral-500">
          Quantos registros estão em cada etapa agora — não é funil de
          conversão. Clique pra abrir.
        </p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const count = data[stage.key];
          const pct = Math.round((count / max) * 100);
          return (
            <Link
              key={stage.key}
              href={stage.href}
              className="group flex items-center gap-3 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex w-28 shrink-0 items-center gap-2 text-body-sm font-medium text-milsaca-cafezal">
                <Icon className="h-4 w-4 shrink-0 text-milsaca-cafezal/60" />
                {stage.label}
              </span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-md bg-milsaca-cream">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-md bg-milsaca-cafezal/80 transition-all duration-500 group-hover:bg-milsaca-cafezal"
                  style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-body-sm font-semibold tabular-nums text-milsaca-cafezal">
                {count}
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
