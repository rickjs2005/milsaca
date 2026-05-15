import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Leads — Painel da corretora" };

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Leads
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Todos os contatos e propostas em andamento.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Tabela com filtros por status, coffee_type e produtor, com ações de
            avançar/recusar diretamente na linha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Por enquanto, leads aparecem no Início como lista simplificada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
