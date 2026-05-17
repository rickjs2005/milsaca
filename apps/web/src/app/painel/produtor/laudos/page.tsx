import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck2, QrCode, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";

export const metadata = { title: "Meus laudos — Milsaca" };

type Row = {
  id: string;
  lote_id: string;
  tipo: string | null;
  pontuacao: number | null;
  fora_de_tipo: boolean;
  bebida: string | null;
  classe: string | null;
  peneira_dominante: string | null;
  pva: number | string | null;
  created_at: string;
  lote:
    | { codigo: string; specie: string; processo: string | null; safra: string | null; peso_sacas: number | string | null }
    | { codigo: string; specie: string; processo: string | null; safra: string | null; peso_sacas: number | string | null }[]
    | null;
  corretora:
    | { name: string }
    | { name: string }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function MeusLaudosPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data } = await supabase
    .from("classificacoes_cob")
    .select(
      `id, lote_id, tipo, pontuacao, fora_de_tipo, bebida, classe,
       peneira_dominante, pva, created_at,
       lote:lotes!classificacoes_cob_lote_id_fkey(codigo, specie, processo, safra, peso_sacas),
       corretora:corretoras!classificacoes_cob_corretora_id_fkey(name)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // RLS filtra pra produtor só ver os próprios laudos (via lote.produtor_id)
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-milsaca-verde">
          <FileCheck2 className="h-7 w-7" />
          Meus laudos
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Classificações COB (IN 8/2003) dos seus lotes pelas corretoras.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Você ainda não tem laudos. Quando a corretora classificar um dos
            seus lotes, aparece aqui — com PDF e QR público pra você
            compartilhar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const lote = pickOne(r.lote);
            const cor = pickOne(r.corretora);
            const pva = r.pva != null ? Number(r.pva) : null;
            return (
              <Card key={r.id} className="border-milsaca-cream-escuro">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-milsaca-dourado">
                        {lote?.codigo ?? "—"}
                      </p>
                      <p className="text-sm font-medium text-milsaca-verde">
                        {lote?.specie === "arabica" ? "Arábica" : lote?.specie === "conillon" ? "Conilón" : "—"}
                        {lote?.processo ? ` · ${lote.processo}` : ""}
                        {lote?.safra ? ` · safra ${lote.safra}` : ""}
                      </p>
                    </div>
                    {r.fora_de_tipo ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                        Fora de tipo
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Tipo {r.tipo ?? "—"}
                      </Badge>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs text-milsaca-verde-claro">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide">
                        Pontuação
                      </dt>
                      <dd className="font-medium text-milsaca-verde">
                        {r.pontuacao ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide">
                        Peneira dom.
                      </dt>
                      <dd className="font-medium text-milsaca-verde">
                        {r.peneira_dominante ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide">
                        Bebida
                      </dt>
                      <dd className="font-medium text-milsaca-verde">
                        {r.bebida ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide">
                        PVA
                      </dt>
                      <dd className="font-medium text-milsaca-verde">
                        {pva != null ? `${pva.toFixed(1)}%` : "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-xs text-milsaca-verde-claro/70">
                    Classificado por {cor?.name ?? "—"} em {fmtDate(r.created_at)}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/laudos/${r.id}`}
                      target="_blank"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-milsaca-verde px-3 py-2 text-xs font-medium text-milsaca-verde hover:bg-milsaca-verde hover:text-milsaca-cream"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Link público
                    </Link>
                    <Link
                      href={`/laudos/${r.id}/pdf`}
                      target="_blank"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-milsaca-verde px-3 py-2 text-xs font-medium text-milsaca-cream hover:bg-milsaca-verde-claro"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar PDF
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
