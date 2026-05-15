import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@milsaca/db/web/server";
import type { Lote } from "@milsaca/types";
import { ClassificarForm } from "./_form";

export const metadata = { title: "Classificar lote — Milsaca" };

type Params = Promise<{ id: string }>;

async function loadLote(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes")
    .select("id, codigo, specie, processo, safra")
    .eq("id", id)
    .maybeSingle();
  return data as Pick<
    Lote,
    "id" | "codigo" | "specie" | "processo" | "safra"
  > | null;
}

export default async function ClassificarPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const lote = await loadLote(id);
  if (!lote) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/painel/corretora/lotes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o lote
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Classificar {lote.codigo}
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          {lote.specie === "arabica" ? "Arábica" : "Conillón"}
          {lote.safra ? ` · safra ${lote.safra}` : ""} · IN 8/2003 (MAPA)
        </p>
      </header>

      <ClassificarForm loteId={id} specie={lote.specie} />
    </div>
  );
}
