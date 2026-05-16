import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import type { Lote } from "@milsaca/types";

export const metadata = { title: "Detalhe do lote — Milsaca" };

const SPECIE_LABEL = {
  arabica: "Arábica",
  conillon: "Conillón",
} as const;

const PROCESSO_LABEL: Record<string, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

const STATUS_LABEL: Record<Lote["status"], string> = {
  rascunho: "Rascunho",
  aguardando_classificacao: "Aguardando classificação",
  classificado: "Classificado",
  fora_de_tipo: "Fora de tipo",
  rebeneficiar: "Rebeneficiar",
  vendido: "Vendido",
  arquivado: "Arquivado",
};

type Params = Promise<{ id: string }>;

type ClassificacaoRow = {
  id: string;
  tipo: string | null;
  pontuacao: number | null;
  total_defeitos: number;
  fora_de_tipo: boolean;
  bebida: string | null;
  classe: string | null;
  peneira_dominante: string | null;
  bica_corrida: boolean;
  umidade: number | null;
  pva: number | null;
  anulada: boolean;
  created_at: string;
};

async function loadLote(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes")
    .select(
      `*, produtor:profiles!lotes_produtor_id_fkey(full_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  return data as
    | (Lote & { produtor: { full_name: string | null } | null })
    | null;
}

async function loadClassificacoes(
  loteId: string,
): Promise<ClassificacaoRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classificacoes_cob")
    .select(
      "id, tipo, pontuacao, total_defeitos, fora_de_tipo, bebida, classe, peneira_dominante, bica_corrida, umidade, pva, anulada, created_at",
    )
    .eq("lote_id", loteId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ClassificacaoRow[];
}

export default async function LoteDetalhePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const lote = await loadLote(id);
  if (!lote) notFound();

  const classificacoes = await loadClassificacoes(id);
  const vigente = classificacoes.find((c) => !c.anulada);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/lotes"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lotes
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            {lote.codigo}
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            {SPECIE_LABEL[lote.specie]}
            {lote.processo
              ? ` · ${PROCESSO_LABEL[lote.processo] ?? lote.processo}`
              : ""}
            {lote.safra ? ` · safra ${lote.safra}` : ""}
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href={`/painel/corretora/lotes/${id}/classificar`}>
            <Plus className="mr-2 h-4 w-4" />
            Nova classificação
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados do lote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Produtor" value={lote.produtor?.full_name ?? "—"} />
            <Field
              label="Peso (sacas)"
              value={
                lote.peso_sacas
                  ? Number(lote.peso_sacas).toLocaleString("pt-BR")
                  : "—"
              }
            />
            <Field
              label="Umidade inicial"
              value={
                lote.umidade_inicial
                  ? `${Number(lote.umidade_inicial).toLocaleString("pt-BR")} %`
                  : "—"
              }
            />
            <Field label="Status" value={STATUS_LABEL[lote.status]} />
          </CardContent>
        </Card>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Classificação vigente</CardTitle>
            <CardDescription>
              Último laudo COB ativo deste lote.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!vigente ? (
              <p className="text-milsaca-verde-claro">
                Nenhuma classificação ainda. Clique em
                <span className="font-medium"> &quot;Nova classificação&quot; </span>
                para criar.
              </p>
            ) : (
              <>
                <Field
                  label="Tipo"
                  value={
                    vigente.fora_de_tipo
                      ? "Fora de tipo"
                      : `Tipo ${vigente.tipo ?? "?"}`
                  }
                />
                <Field
                  label="Total de defeitos"
                  value={String(vigente.total_defeitos)}
                />
                <Field
                  label="Pontuação"
                  value={
                    vigente.pontuacao !== null
                      ? `${vigente.pontuacao > 0 ? "+" : ""}${vigente.pontuacao}`
                      : "—"
                  }
                />
                <Field label="Bebida" value={vigente.bebida ?? "—"} />
                <Field
                  label="Peneira dominante"
                  value={
                    vigente.bica_corrida
                      ? "Bica Corrida"
                      : (vigente.peneira_dominante ?? "—")
                  }
                />
                {vigente.umidade !== null && (
                  <Field
                    label="Umidade"
                    value={`${Number(vigente.umidade).toLocaleString("pt-BR")} %`}
                  />
                )}
                {vigente.pva !== null && (
                  <Field
                    label="PVA"
                    value={`${Number(vigente.pva).toLocaleString("pt-BR")} %`}
                  />
                )}
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button
                    asChild
                    size="sm"
                    className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                  >
                    <a
                      href={`/laudos/${vigente.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Baixar PDF
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-milsaca-cream-escuro text-milsaca-verde"
                  >
                    <Link
                      href={`/laudos/${vigente.id}`}
                      target="_blank"
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Link público
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Histórico de classificações
        </h2>
        {classificacoes.length === 0 ? (
          <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <FileSearch className="h-5 w-5 text-milsaca-verde-claro" />
              <p className="text-sm text-milsaca-verde-claro">
                Sem laudos registrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
              {classificacoes.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="font-medium text-milsaca-verde">
                      {c.fora_de_tipo
                        ? "Fora de tipo"
                        : `Tipo ${c.tipo ?? "?"}`}{" "}
                      <span className="text-xs font-normal text-milsaca-verde-claro">
                        · {c.total_defeitos} defeitos
                      </span>
                    </p>
                    <p className="text-xs text-milsaca-verde-claro">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                      {c.anulada ? " · anulada" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {c.anulada && (
                      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                        Anulada
                      </Badge>
                    )}
                    {c.fora_de_tipo && !c.anulada && (
                      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                        Fora de tipo
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-milsaca-verde-claro">{label}</span>
      <span className="font-medium text-milsaca-verde">{value}</span>
    </div>
  );
}
