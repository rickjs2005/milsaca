import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Corretoras — Painel do produtor" };

export default function CorretorasPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Corretoras
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Corretoras parceiras que enviam propostas para você.
        </p>
      </header>

      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Lista de corretoras, contato e histórico de operações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Convide uma corretora a entrar em contato pelo WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
