import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Negociações — Painel do produtor" };

export default function NegociacoesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Negociações
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Propostas em andamento com suas corretoras.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Aceitar, recusar e contraproposta direto pelo painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Por enquanto, as propostas chegam pelo WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
