import { requireUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Painel da corretora" };

export default async function PainelCorretoraPage() {
  const user = await requireUser("/painel/corretora");

  return (
    <main className="min-h-screen bg-milsaca-cream p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
              Painel da corretora
            </h1>
            <p className="text-sm text-milsaca-verde-claro">
              Bem-vinda, {user.email}.
            </p>
          </div>
          <form action="/sair" method="post">
            <Button variant="outline" type="submit">
              Sair
            </Button>
          </form>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Em construção</CardTitle>
            <CardDescription>
              Em breve: leads, contratos, cotações e relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta área receberá os módulos da corretora ao longo dos próximos sprints.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
