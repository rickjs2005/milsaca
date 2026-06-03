import { Fragment } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
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
 * Funil/pipeline do ciclo da corretagem no dashboard. Mostra quantos registros
 * a corretora tem em cada etapa, ligados pelas setas do fluxo — pra um corretor
 * novo entender de cara como uma venda anda (do lead até o pagamento).
 */
export function PipelineFunnel({ data }: { data: PipelineData }) {
  return (
    <Card className="border-milsaca-cream-escuro shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-milsaca-cafezal">
          Fluxo da corretagem
        </CardTitle>
        <p className="text-caption text-neutral-500">
          Do primeiro contato ao pagamento. Clique numa etapa pra abrir.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col sm:flex-row sm:items-center">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const count = data[stage.key];
            return (
              <Fragment key={stage.key}>
                <li className="sm:flex-1">
                  <Link
                    href={stage.href}
                    className="group flex w-full items-center gap-3 rounded-lg border border-milsaca-cream-escuro bg-white px-3 py-2.5 transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-col sm:items-start sm:gap-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal transition-colors group-hover:bg-milsaca-cafezal group-hover:text-milsaca-cream">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-h3 font-semibold tabular-nums text-milsaca-cafezal">
                        {count}
                      </span>
                      <span className="block text-caption text-neutral-500">
                        {stage.label}
                      </span>
                    </span>
                  </Link>
                </li>
                {i < STAGES.length - 1 ? (
                  <li
                    aria-hidden
                    className="flex items-center justify-center py-0.5 text-neutral-300 sm:px-1 sm:py-0"
                  >
                    <ChevronRight className="hidden h-4 w-4 sm:block" />
                    <ChevronDown className="h-4 w-4 sm:hidden" />
                  </li>
                ) : null}
              </Fragment>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
