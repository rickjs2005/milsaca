import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Handshake,
  Plus,
  Store,
} from "lucide-react";
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
import { getProfile } from "@/lib/auth";
import { listPropostasDoLote } from "../../propostas/_lib/queries";
import { PropostasBlock } from "../../propostas/_components/propostas-block";
import {
  listOfertasDoLote,
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_COLOR,
} from "../../ofertas/_lib/queries";
import { DocumentosSection } from "../../documentos/_components/documentos-section";
import { EudrSection } from "../_components/eudr-section";

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

/**
 * Origem comercial do lote: o contrato que o referencia (contratos.lote_id) e,
 * por ele, o lead que originou a venda. Lead e Lote só se conectam pelo contrato.
 */
async function loadOrigemComercial(loteId: string, corretoraId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select("id, codigo, lead_id")
    .eq("lote_id", loteId)
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as
    | { id: string; codigo: string | null; lead_id: string | null }
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
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const lote = await loadLote(id);
  if (!lote) notFound();

  const [classificacoes, propostas, ofertas, origem] = await Promise.all([
    loadClassificacoes(id),
    listPropostasDoLote(profile.corretora_id, id),
    listOfertasDoLote(id),
    loadOrigemComercial(id, profile.corretora_id),
  ]);
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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            {lote.codigo}
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            {SPECIE_LABEL[lote.specie]}
            {lote.processo
              ? ` · ${PROCESSO_LABEL[lote.processo] ?? lote.processo}`
              : ""}
            {lote.safra ? ` · safra ${lote.safra}` : ""}
          </p>
          {origem ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-caption">
              <span className="text-neutral-500">Origem comercial:</span>
              {origem.lead_id ? (
                <Link
                  href={`/painel/corretora/leads/${origem.lead_id}`}
                  className="inline-flex items-center gap-1 rounded-pill bg-milsaca-dourado/15 px-2.5 py-0.5 font-medium text-milsaca-dourado-texto transition-colors hover:bg-milsaca-dourado/25"
                >
                  <Handshake className="h-3.5 w-3.5" />
                  Lead
                </Link>
              ) : null}
              <Link
                href={`/painel/corretora/contratos/${origem.id}`}
                className="inline-flex items-center gap-1 rounded-pill bg-milsaca-cafezal/10 px-2.5 py-0.5 font-medium text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal/20"
              >
                <FileText className="h-3.5 w-3.5" />
                Contrato {origem.codigo ?? ""}
              </Link>
            </p>
          ) : (
            <p className="mt-1.5 text-caption text-neutral-400">
              Lote avulso — ainda sem lead/contrato vinculado.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-milsaca-cafezal text-milsaca-cafezal hover:bg-milsaca-cafezal hover:text-milsaca-cream"
          >
            <Link
              href={`/lote/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Página pública
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button
            asChild
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            <Link href={`/painel/corretora/lotes/${id}/classificar`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova classificação
            </Link>
          </Button>
        </div>
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
                      <Badge className="bg-danger-100 text-danger-700 hover:bg-danger-100">
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

      <PropostasBlock
        propostas={propostas}
        loteId={id}
        defaultBagCount={
          lote.peso_sacas != null ? Number(lote.peso_sacas) : null
        }
        /* Só lote 'classificado' (disponível) recebe proposta nova. Vendido
           (deal fechado), arquivado etc. ficam read-only — espelha o card. */
        locked={lote.status !== "classificado"}
        lockedNote={
          lote.status === "vendido"
            ? "Lote vendido — negócio fechado. Não dá pra enviar nova proposta; o histórico fica como registro."
            : "Este lote ainda não está disponível pra proposta (precisa estar classificado)."
        }
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            <Store className="h-4 w-4" />
            Oferta ao Comprador
          </h2>
          <Button
            asChild
            size="sm"
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            <Link href={`/painel/corretora/ofertas/novo?lote_id=${id}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ofertar a um comprador
            </Link>
          </Button>
        </div>
        {ofertas.length === 0 ? (
          <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
            <CardContent className="py-6 text-center text-sm text-milsaca-verde-claro">
              Nenhuma oferta registrada para este lote.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
              {ofertas.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="font-medium text-milsaca-verde">
                      {o.comprador_nome}
                    </p>
                    <p className="text-xs text-milsaca-verde-claro">
                      {o.preco_saca.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        minimumFractionDigits: 2,
                      })}
                      /saca
                      {o.bag_count != null ? ` · ${o.bag_count} sacas` : ""}
                    </p>
                  </div>
                  <Badge
                    className={`${OFERTA_STATUS_COLOR[o.status]} hover:${OFERTA_STATUS_COLOR[o.status]}`}
                  >
                    {OFERTA_STATUS_LABEL[o.status]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <EudrSection loteId={lote.id} produtorProfileId={lote.produtor_id} />

        <DocumentosSection
          ownerKind="lote"
          ownerId={lote.id}
          back={`/painel/corretora/lotes/${lote.id}`}
        />
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
