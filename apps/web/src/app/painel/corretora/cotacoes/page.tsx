import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Cotações — Painel da corretora" };

export default function CotacoesCorretoraPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Cotações
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Preço de Arábica e Conillón em tempo real.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Histórico, comparação entre praças e alertas por faixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Integração com CEPEA/B3 prevista para os próximos sprints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
