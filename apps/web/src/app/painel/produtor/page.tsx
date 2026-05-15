import { ArrowUpRight, ArrowDownRight, Coffee } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Início — Painel do produtor" };

// TODO: substituir mocks por dados reais quando schema de cotações/propostas estiver pronto.
const COTACOES = [
  {
    tipo: "Arábica",
    preco: "R$ 1.450",
    variacao: 2.3,
    referencia: "saca 60kg · CEPEA",
  },
  {
    tipo: "Conillón",
    preco: "R$ 980",
    variacao: -1.1,
    referencia: "saca 60kg · CEPEA",
  },
];

const PROPOSTAS = [
  {
    corretora: "Cooxupé",
    sacas: 320,
    tipo: "Arábica",
    status: "Aceita" as const,
    data: "12/05",
  },
  {
    corretora: "Mineiros do Café",
    sacas: 80,
    tipo: "Arábica",
    status: "Aberta" as const,
    data: "10/05",
  },
  {
    corretora: "Carmocoffee",
    sacas: 200,
    tipo: "Conillón",
    status: "Recusada" as const,
    data: "05/05",
  },
];

export default function InicioProdutorPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Início
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Resumo do mercado e das suas negociações.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Cotações de hoje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COTACOES.map((c) => {
            const up = c.variacao >= 0;
            const Arrow = up ? ArrowUpRight : ArrowDownRight;
            return (
              <Card key={c.tipo} className="border-milsaca-cream-escuro">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
                      <Coffee className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-base">{c.tipo}</CardTitle>
                  </div>
                  <span
                    className={
                      up
                        ? "flex items-center gap-0.5 text-sm font-medium text-emerald-700"
                        : "flex items-center gap-0.5 text-sm font-medium text-rose-700"
                    }
                  >
                    <Arrow className="h-4 w-4" />
                    {up ? "+" : ""}
                    {c.variacao.toFixed(1)}%
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-milsaca-verde">
                    {c.preco}
                  </p>
                  <p className="mt-1 text-xs text-milsaca-verde-claro">
                    {c.referencia}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Últimas propostas
        </h2>
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
            {PROPOSTAS.map((p) => (
              <div
                key={`${p.corretora}-${p.data}`}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-milsaca-verde">
                    {p.corretora}
                  </p>
                  <p className="text-xs text-milsaca-verde-claro">
                    {p.sacas} sacas · {p.tipo} · {p.data}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Próximos passos
        </h2>
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardHeader>
            <CardTitle className="text-base">Conecte sua corretora</CardTitle>
            <CardDescription>
              Em breve você poderá ver propostas em tempo real, registrar
              entregas e acompanhar contratos por aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "Aceita" | "Aberta" | "Recusada";
}) {
  if (status === "Aceita") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Aceita
      </Badge>
    );
  }
  if (status === "Recusada") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
        Recusada
      </Badge>
    );
  }
  return (
    <Badge className="bg-milsaca-dourado/20 text-milsaca-verde hover:bg-milsaca-dourado/20">
      Aberta
    </Badge>
  );
}
