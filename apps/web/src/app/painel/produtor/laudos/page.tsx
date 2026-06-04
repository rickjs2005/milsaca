import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getProfile } from "@/lib/auth";
import { loadMeusCafes } from "./_lib/queries";
import { MeuCafeView } from "./_components/meu-cafe-view";

export const metadata = { title: "Meu Café — Milsaca" };

export default async function MeuCafePage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const rows = await loadMeusCafes(profile.id);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Meu Café</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Sua planilha de lotes: quantidade, classificação de cada corretora e
            valor estimado pela cotação CEPEA de hoje.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/painel/produtor/amostras">Amostras</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/painel/produtor/cafe/novo">Registrar café</Link>
          </Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileCheck2}
              title="Você ainda não tem café registrado"
              description="Registre seu café pra ele entrar na sua planilha. Quando uma corretora classificar, o resultado aparece aqui pra você comparar."
            />
            <div className="mt-4 flex justify-center">
              <Button asChild variant="primary" size="sm">
                <Link href="/painel/produtor/cafe/novo">Registrar meu café</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <MeuCafeView rows={rows} />
      )}
    </div>
  );
}
