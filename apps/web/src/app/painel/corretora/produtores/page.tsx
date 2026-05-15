import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Produtores — Painel da corretora" };

export default function ProdutoresPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Produtores
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Sua carteira de produtores e histórico de operações.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Lista de produtores com fazenda, cidade, volume já negociado e
            ações rápidas (WhatsApp, nova proposta).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hoje os produtores chegam via Leads.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
