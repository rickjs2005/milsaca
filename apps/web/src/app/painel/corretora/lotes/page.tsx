import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listLotes } from "./_lib/queries";
import type { Lote } from "@milsaca/types";

export const metadata = { title: "Lotes — Painel da corretora" };

const SPECIE_LABEL: Record<"arabica" | "conillon", string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const STATUS_LABEL: Record<Lote["status"], string> = {
  rascunho: "Rascunho",
  aguardando_classificacao: "Aguardando",
  classificado: "Classificado",
  fora_de_tipo: "Fora de tipo",
  rebeneficiar: "Rebeneficiar",
  vendido: "Vendido",
  arquivado: "Arquivado",
};

const STATUS_COLOR: Record<Lote["status"], string> = {
  rascunho: "bg-slate-200 text-slate-700",
  aguardando_classificacao: "bg-milsaca-dourado/20 text-milsaca-verde",
  classificado: "bg-emerald-100 text-emerald-800",
  fora_de_tipo: "bg-rose-100 text-rose-800",
  rebeneficiar: "bg-amber-100 text-amber-800",
  vendido: "bg-milsaca-verde text-milsaca-cream",
  arquivado: "bg-slate-200 text-slate-700",
};

export default async function LotesPage() {
  const lotes = await listLotes();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Lotes
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Cafés em classificação ou prontos para negociar.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/lotes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo lote
          </Link>
        </Button>
      </header>

      {lotes.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Package className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum lote registrado ainda.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Cadastre o primeiro lote para começar a classificar.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/lotes/novo">Cadastrar lote</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Código</th>
                  <th className="px-5 py-3 text-left">Produtor</th>
                  <th className="px-5 py-3 text-left">Café</th>
                  <th className="px-5 py-3 text-right">Sacas</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {lotes.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-milsaca-cream-escuro/30"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/lotes/${l.id}`}
                        className="font-medium text-milsaca-verde hover:underline"
                      >
                        {l.codigo}
                      </Link>
                      <p className="text-xs text-milsaca-verde-claro">
                        {l.safra ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-milsaca-verde">
                      {l.produtor}
                    </td>
                    <td className="px-5 py-3 text-milsaca-verde">
                      {SPECIE_LABEL[l.specie]}
                    </td>
                    <td className="px-5 py-3 text-right text-milsaca-verde">
                      {l.peso_sacas
                        ? Number(l.peso_sacas).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {l.ultimo_tipo ? (
                        <span
                          className={
                            l.ultimo_fora_de_tipo
                              ? "font-medium text-rose-700"
                              : "font-medium text-milsaca-verde"
                          }
                        >
                          {l.ultimo_fora_de_tipo
                            ? "Fora de tipo"
                            : `Tipo ${l.ultimo_tipo}`}
                        </span>
                      ) : (
                        <span className="text-milsaca-verde-claro">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={`${STATUS_COLOR[l.status]} hover:${STATUS_COLOR[l.status]}`}
                      >
                        {STATUS_LABEL[l.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
