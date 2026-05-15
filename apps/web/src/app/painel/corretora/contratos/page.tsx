import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Contratos — Painel da corretora" };

export default function ContratosCorretoraPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Contratos
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Contratos assinados, entregas e pagamentos.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Listagem de contratos com status, vencimento e link para o PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Integração com Clicksign prevista para os próximos sprints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
